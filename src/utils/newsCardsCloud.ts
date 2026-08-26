import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { db, auth, logFirestoreError } from './firebase';
import { Article, NewsCard } from '../types';
import { getStoredArticles, getSeenArticlesList } from './storage';

/**
 * Normalizes an Article or NewsCard object into a clean NewsCard for Firestore persistence.
 * Prevents repeating user profile data or unnecessary bloated fields.
 */
export function mapToNewsCard(input: NewsCard | Article): NewsCard {
  const now = new Date().toISOString();
  
  const id = getStableCardId(input);
  const title = input.title || '';
  const url = input.url || input.link || '';
  const sourceId = input.sourceId || input.feedId || 'custom';
  const sourceName = input.sourceName || input.feedTitle || 'Новостная лента';
  const publishedAt = input.publishedAt || input.isoDate || input.pubDate || now;
  const fetchedAt = input.fetchedAt || input.firstSeenAt || now;
  const firstSeenAt = input.firstSeenAt || input.fetchedAt || now;
  const lastSeenAt = input.lastSeenAt || now;
  const summary = input.summary || input.summaryOneLine || input.contentSnippet || '';
  const description = input.description || input.content || '';
  const imageUrl = input.imageUrl || (input.imageUrls && input.imageUrls[0]) || '';
  const category = input.category || input.feedCategory || (input.categories && input.categories[0]) || '';
  const isRead = Boolean(input.isRead);
  const isStarred = Boolean(input.isStarred);
  const isHidden = Boolean(input.isHidden);
  const savedLater = Boolean(input.savedLater || input.isSavedLater);
  const userNote = input.userNote || '';
  const updatedAt = input.updatedAt || now;

  const card: NewsCard = {
    id,
    title,
    url,
    sourceId,
    sourceName,
    publishedAt,
    fetchedAt,
    firstSeenAt,
    lastSeenAt,
    summary,
    description,
    imageUrl,
    category,
    isRead,
    isStarred,
    isHidden,
    savedLater,
    userNote,
    updatedAt,
  };

  // Optional lightweight metadata preservation
  if (input.feedIcon) card.feedIcon = input.feedIcon;
  if (input.author) card.author = input.author;
  if (input.aiSummary || input.ai?.aiSummary) card.aiSummary = input.aiSummary || input.ai?.aiSummary;
  if (input.keyTerms || input.ai?.keyTerms) card.keyTerms = input.keyTerms || input.ai?.keyTerms;
  if (input.extractionStatus) card.extractionStatus = input.extractionStatus;

  return card;
}

/**
 * Save or update a single NewsCard document for the current authenticated user in Firestore.
 * Path: /users/{firebaseUser.uid}/newsCards/{cardId}
 */
export async function saveNewsCardToFirestore(item: NewsCard | Article): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.warn('[NewsCards Firestore] Operation blocked: No authenticated Firebase user.');
    return;
  }

  const card = mapToNewsCard(item);
  const cardPath = `users/${uid}/newsCards/${card.id}`;

  try {
    const cardRef = doc(db, 'users', uid, 'newsCards', card.id);
    await setDoc(cardRef, card, { merge: true });
  } catch (err) {
    logFirestoreError('SAVE_NEWS_CARD', cardPath, err);
    throw err;
  }
}

/**
 * Batch save multiple NewsCards for the current authenticated user in Firestore.
 * Handles Firestore 500-write batch limit automatically.
 * Path: /users/{firebaseUser.uid}/newsCards/{cardId}
 */
export async function saveNewsCardsBatchToFirestore(items: (NewsCard | Article)[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !Array.isArray(items) || items.length === 0) return;

  const chunkSize = 450;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const rawItem of chunk) {
      const card = mapToNewsCard(rawItem);
      const cardRef = doc(db, 'users', uid, 'newsCards', card.id);
      batch.set(cardRef, card, { merge: true });
    }

    try {
      await batch.commit();
    } catch (err) {
      logFirestoreError('BATCH_SAVE_NEWS_CARDS', `users/${uid}/newsCards (batch)`, err);
      throw err;
    }
  }
}

/**
 * Fetch all NewsCards for the current authenticated user from Firestore.
 * Path: /users/{firebaseUser.uid}/newsCards
 */
export async function loadNewsCardsFromFirestore(): Promise<NewsCard[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  const path = `users/${uid}/newsCards`;
  try {
    const cardsColRef = collection(db, 'users', uid, 'newsCards');
    const snapshot = await getDocs(cardsColRef);
    const cards: NewsCard[] = [];
    
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.id && data.title) {
          cards.push(data as NewsCard);
        }
      }
    });

    return cards;
  } catch (err) {
    logFirestoreError('LOAD_NEWS_CARDS', path, err);
    return [];
  }
}

/**
 * Delete a specific NewsCard from Firestore for the current authenticated user.
 * Path: /users/{firebaseUser.uid}/newsCards/{cardId}
 */
export async function deleteNewsCardFromFirestore(cardId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !cardId) return;

  const cardPath = `users/${uid}/newsCards/${cardId}`;
  try {
    const cardRef = doc(db, 'users', uid, 'newsCards', cardId);
    await deleteDoc(cardRef);
  } catch (err) {
    logFirestoreError('DELETE_NEWS_CARD', cardPath, err);
    throw err;
  }
}

/**
 * Realtime listener for the current user's newsCards collection.
 * Path: /users/{firebaseUser.uid}/newsCards
 */
export function subscribeToNewsCardsFromFirestore(
  onUpdate: (cards: NewsCard[]) => void,
  explicitUid?: string
): () => void {
  const uid = explicitUid || auth.currentUser?.uid;
  if (!uid) return () => {};

  const path = `users/${uid}/newsCards`;
  try {
    const cardsColRef = collection(db, 'users', uid, 'newsCards');
    return onSnapshot(
      cardsColRef,
      (snapshot) => {
        const cards: NewsCard[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.id && data.title) {
              cards.push(data as NewsCard);
            }
          }
        });
        onUpdate(cards);
      },
      (err) => {
        logFirestoreError('SUBSCRIBE_NEWS_CARDS', path, err);
      }
    );
  } catch (err) {
    logFirestoreError('SUBSCRIBE_NEWS_CARDS', path, err);
    return () => {};
  }
}

/**
 * Generates a stable ID for an article.
 * If the article has an existing valid ID (not generic placeholder), returns it.
 * Otherwise, generates a deterministic string hash from the URL/link.
 */
export function getStableCardId(item: Article | NewsCard): string {
  const rawUrl = item.url || item.link || '';
  if (rawUrl) {
    let hash = 0;
    for (let i = 0; i < rawUrl.length; i++) {
      const char = rawUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `card_url_${Math.abs(hash).toString(36)}`;
  }
  if (
    item.id && 
    typeof item.id === 'string' && 
    item.id.trim().length > 0 && 
    item.id !== 'art-acc-edu' && 
    !item.id.startsWith('temp_') && 
    !item.id.startsWith('art_ref_')
  ) {
    return item.id.trim();
  }
  return item.id || `card_${Date.now()}`;
}

/**
 * Merges cloud newsCards from Firestore with fresh RSS articles.
 * Rules:
 * 1. Matching via stable cardId (getStableCardId).
 * 2. If card exists in BOTH Firestore & fresh RSS:
 *    - Update article content fields (title, summary, description, imageUrl, source, publishedAt) with fresh RSS data.
 *    - User states MUST strictly come from Firestore: isRead, isStarred, isHidden, savedLater, userNote.
 * 3. If card exists ONLY in Firestore and no longer in RSS:
 *    - Do NOT auto-delete; keep it as part of personal history.
 * 4. If card exists ONLY in RSS (brand new article):
 *    - Add to state and queue for saving to Firestore.
 */
export function mergeCloudAndRssArticles(
  cloudCards: NewsCard[],
  freshRssArticles: Article[]
): { mergedArticles: Article[]; cardsToSaveToCloud: Article[] } {
  const cloudMap = new Map<string, NewsCard>();
  const cloudUrlMap = new Map<string, NewsCard>();

  for (const card of cloudCards) {
    const cardId = getStableCardId(card);
    cloudMap.set(cardId, card);
    if (card.id) cloudMap.set(card.id, card);
    if (card.url) cloudUrlMap.set(card.url, card);
  }

  const mergedMap = new Map<string, Article>();
  const cardsToSaveToCloud: Article[] = [];
  const processedCloudIds = new Set<string>();

  // 1. Process fresh RSS articles
  for (const rssArt of freshRssArticles) {
    const stableId = getStableCardId(rssArt);
    const cloudCard =
      cloudMap.get(stableId) ||
      (rssArt.link ? cloudUrlMap.get(rssArt.link) : undefined) ||
      (rssArt.url ? cloudUrlMap.get(rssArt.url) : undefined);

    if (cloudCard) {
      const cloudStableId = getStableCardId(cloudCard);
      processedCloudIds.add(cloudStableId);
      if (cloudCard.id) processedCloudIds.add(cloudCard.id);

      // Check updatedAt timestamps for Last-Write-Wins (LWW)
      const cloudTime = cloudCard.updatedAt ? new Date(cloudCard.updatedAt).getTime() : 0;
      const localTime = rssArt.updatedAt ? new Date(rssArt.updatedAt).getTime() : 0;
      const useCloudStates = cloudTime >= localTime || !rssArt.updatedAt;

      // Card exists in both: update content from RSS, strictly preserve user states from Firestore
      const mergedArticle: Article = {
        ...rssArt,
        id: stableId,
        url: rssArt.url || rssArt.link || cloudCard.url,
        link: rssArt.link || rssArt.url || cloudCard.url,
        title: rssArt.title || cloudCard.title,
        titleRu: rssArt.titleRu || rssArt.title || cloudCard.title,
        summaryOneLine: rssArt.summaryOneLine || cloudCard.summary,
        summaryThreeLines: rssArt.summaryThreeLines || cloudCard.description || cloudCard.summary,
        content: rssArt.content || cloudCard.description,
        contentSnippet: rssArt.contentSnippet || cloudCard.summary,
        imageUrl: rssArt.imageUrl || cloudCard.imageUrl,
        pubDate: rssArt.pubDate || rssArt.publishedAt || cloudCard.publishedAt,
        publishedAt: rssArt.publishedAt || rssArt.pubDate || cloudCard.publishedAt,
        sourceId: rssArt.sourceId || cloudCard.sourceId,
        sourceName: rssArt.sourceName || cloudCard.sourceName,
        feedId: rssArt.feedId || cloudCard.sourceId,
        feedTitle: rssArt.feedTitle || cloudCard.sourceName,
        feedCategory: rssArt.feedCategory || cloudCard.category,

        // USER STATES with LWW (false is a valid state)
        isRead: useCloudStates ? Boolean(cloudCard.isRead) : Boolean(rssArt.isRead),
        isStarred: useCloudStates ? Boolean(cloudCard.isStarred) : Boolean(rssArt.isStarred),
        isHidden: useCloudStates ? Boolean(cloudCard.isHidden) : Boolean(rssArt.isHidden),
        savedLater: useCloudStates ? Boolean(cloudCard.savedLater) : Boolean(rssArt.savedLater || rssArt.isSavedLater),
        isSavedLater: useCloudStates ? Boolean(cloudCard.savedLater) : Boolean(rssArt.savedLater || rssArt.isSavedLater),
        userNote: useCloudStates ? (cloudCard.userNote || '') : (rssArt.userNote || ''),
        updatedAt: useCloudStates ? (cloudCard.updatedAt || new Date().toISOString()) : (rssArt.updatedAt || new Date().toISOString()),
      };

      mergedMap.set(stableId, mergedArticle);
    } else {
      // New article from RSS only
      const newArticle: Article = {
        ...rssArt,
        id: stableId,
        isRead: Boolean(rssArt.isRead),
        isStarred: Boolean(rssArt.isStarred),
        isHidden: Boolean(rssArt.isHidden),
        savedLater: Boolean(rssArt.savedLater || rssArt.isSavedLater),
        isSavedLater: Boolean(rssArt.savedLater || rssArt.isSavedLater),
        userNote: rssArt.userNote || '',
        updatedAt: rssArt.updatedAt || new Date().toISOString(),
      };

      mergedMap.set(stableId, newArticle);
      cardsToSaveToCloud.push(newArticle);
    }
  }

  // 2. Process cloud cards NOT present in fresh RSS (disappeared articles)
  for (const card of cloudCards) {
    const cardId = getStableCardId(card);
    if (!processedCloudIds.has(cardId) && !processedCloudIds.has(card.id)) {
      processedCloudIds.add(cardId);
      if (card.id) processedCloudIds.add(card.id);

      const archivedArticle: Article = {
        id: cardId,
        title: card.title,
        titleRu: card.title,
        link: card.url,
        url: card.url,
        pubDate: card.publishedAt,
        isoDate: card.publishedAt,
        publishedAt: card.publishedAt,
        fetchedAt: card.fetchedAt,
        sourceId: card.sourceId,
        sourceName: card.sourceName,
        feedId: card.sourceId,
        feedTitle: card.sourceName,
        content: card.description || card.summary || '',
        contentSnippet: card.summary || '',
        summaryOneLine: card.summary || '',
        summaryThreeLines: card.description || card.summary || '',
        imageUrl: card.imageUrl,
        category: card.category,
        feedCategory: card.category,
        isRead: Boolean(card.isRead),
        isStarred: Boolean(card.isStarred),
        isHidden: Boolean(card.isHidden),
        savedLater: Boolean(card.savedLater),
        isSavedLater: Boolean(card.savedLater),
        userNote: card.userNote || '',
        updatedAt: card.updatedAt || new Date().toISOString(),
        aiSummary: card.aiSummary,
        keyTerms: card.keyTerms,
      };

      mergedMap.set(cardId, archivedArticle);
    }
  }

  return {
    mergedArticles: Array.from(mergedMap.values()),
    cardsToSaveToCloud,
  };
}

/**
 * One-time safe migration of local article cache into Firestore newsCards for current authenticated user.
 * Migration marker: belkindesk_news_cards_migrated_v1_${uid}
 */
export async function migrateLocalArticlesToFirestoreNewsCards(explicitUid?: string): Promise<{ migratedCount: number; skipped: boolean }> {
  const currentUid = explicitUid || auth.currentUser?.uid;
  if (!currentUid) {
    return { migratedCount: 0, skipped: true };
  }

  const migrationMarker = `belkindesk_news_cards_migrated_v1_${currentUid}`;
  if (localStorage.getItem(migrationMarker) === 'true') {
    return { migratedCount: 0, skipped: true };
  }

  // 1. Read local articles strictly for currentUid
  const localKey = `belkindesk_med_articles_v3_${currentUid}`;
  let rawLocal = localStorage.getItem(localKey);
  let localArticles: Article[] = [];

  if (rawLocal) {
    try {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        localArticles = parsed;
      }
    } catch (err) {
      console.warn('[NewsCards Migration] Error parsing local articles:', err);
    }
  }

  if (localArticles.length === 0) {
    // Fallback: try getStoredArticles for currentUid
    const fallbackArticles = getStoredArticles(currentUid);
    if (fallbackArticles && fallbackArticles.length > 0) {
      localArticles = fallbackArticles;
    }
  }

  // Read old legacy seen list ONCE during initial migration if present
  const legacySeenSet = new Set(getSeenArticlesList());
  if (legacySeenSet.size > 0) {
    localArticles = localArticles.map((art) => {
      if (!art.isRead) {
        const isSeenInLegacy =
          legacySeenSet.has(art.id) ||
          (art.link ? legacySeenSet.has(art.link) : false) ||
          (art.url ? legacySeenSet.has(art.url) : false) ||
          (art.title ? legacySeenSet.has(art.title) : false);
        if (isSeenInLegacy) {
          return { ...art, isRead: true };
        }
      }
      return art;
    });
  }

  if (localArticles.length === 0) {
    // No articles found to migrate, set marker as done
    localStorage.setItem(migrationMarker, 'true');
    return { migratedCount: 0, skipped: false };
  }

  try {
    // 2. Fetch existing cloud cards to avoid duplicates & resolve conflicts
    const cloudCards = await loadNewsCardsFromFirestore();
    const cloudMap = new Map<string, NewsCard>();
    for (const card of cloudCards) {
      cloudMap.set(card.id, card);
    }

    const cardsToSave: NewsCard[] = [];

    for (const localArt of localArticles) {
      const stableId = getStableCardId(localArt);
      const mappedLocal = mapToNewsCard({ ...localArt, id: stableId });
      const existingCloud = cloudMap.get(stableId);

      if (!existingCloud) {
        cardsToSave.push(mappedLocal);
      } else {
        // Resolve Conflict (Local vs Cloud)
        const cloudTime = new Date(existingCloud.updatedAt || existingCloud.lastSeenAt || 0).getTime();
        const localTime = new Date(mappedLocal.updatedAt || mappedLocal.lastSeenAt || 0).getTime();

        if (localTime > cloudTime) {
          // Local is newer: local flags override cloud flags
          const merged: NewsCard = {
            ...existingCloud,
            ...mappedLocal,
            isRead: Boolean(mappedLocal.isRead),
            isStarred: Boolean(mappedLocal.isStarred),
            isHidden: Boolean(mappedLocal.isHidden),
            savedLater: Boolean(mappedLocal.savedLater),
            userNote: mappedLocal.userNote || '',
            updatedAt: mappedLocal.updatedAt || new Date().toISOString(),
          };
          cardsToSave.push(merged);
        } else {
          // Cloud is newer or equal: cloud flags override local flags
          const merged: NewsCard = {
            ...mappedLocal,
            ...existingCloud,
            isRead: Boolean(existingCloud.isRead),
            isStarred: Boolean(existingCloud.isStarred),
            isHidden: Boolean(existingCloud.isHidden),
            savedLater: Boolean(existingCloud.savedLater),
            userNote: existingCloud.userNote || '',
            updatedAt: existingCloud.updatedAt || new Date().toISOString(),
          };
          // Only push if user flags changed
          if (
            merged.isStarred !== existingCloud.isStarred ||
            merged.isRead !== existingCloud.isRead ||
            merged.isHidden !== existingCloud.isHidden ||
            merged.savedLater !== existingCloud.savedLater ||
            merged.userNote !== existingCloud.userNote
          ) {
            cardsToSave.push(merged);
          }
        }
      }
    }

    if (cardsToSave.length > 0) {
      await saveNewsCardsBatchToFirestore(cardsToSave);
    }

    // Set marker ONLY on successful completion
    localStorage.setItem(migrationMarker, 'true');
    console.log(`[NewsCards Migration] Successfully migrated ${cardsToSave.length} cards for UID: ${currentUid}`);
    return { migratedCount: cardsToSave.length, skipped: false };
  } catch (err) {
    console.error('[NewsCards Migration] Migration failed (marker not set, will retry):', err);
    // Marker NOT set so it can retry later
    return { migratedCount: 0, skipped: true };
  }
}
