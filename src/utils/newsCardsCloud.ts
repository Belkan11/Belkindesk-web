import { 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { db, auth, logFirestoreError, testAuthApiCall } from './firebase';
import { Article, NewsCard, FeedConfig } from '../types';
import { getStoredArticles, getSeenArticlesList } from './storage';
import { isRetryableError, addPendingOperation } from './pendingSync';
import { resolveFeedForCard } from './feedUtils';

/**
 * Normalizes an Article or NewsCard object into a clean NewsCard for Firestore persistence.
 * Prevents repeating user profile data or unnecessary bloated fields.
 */
export function mapToNewsCard(input: NewsCard | Article): NewsCard {
  const now = new Date().toISOString();
  
  const id = getStableCardId(input);
  const title = input.title || '';
  const url = input.url || input.link || '';
  const feedId = input.feedId || undefined;
  const feedTitle = input.feedTitle || undefined;
  const sourceId = input.sourceId || (input as any).sourceId || (feedId ? feedId : 'custom');
  const sourceName = input.sourceName || (input as any).sourceName || (feedTitle ? feedTitle : 'Новостная лента');
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

  // Explicitly persist feedId and feedTitle
  if (feedId) card.feedId = feedId;
  if (feedTitle) card.feedTitle = feedTitle;
  if (input.feedCategory) card.feedCategory = input.feedCategory;
  if (input.feedIcon) card.feedIcon = input.feedIcon;
  if (input.author) card.author = input.author;
  if (input.aiSummary || input.ai?.aiSummary) card.aiSummary = input.aiSummary || input.ai?.aiSummary;
  if (input.keyTerms || input.ai?.keyTerms) card.keyTerms = input.keyTerms || input.ai?.keyTerms;
  if (input.extractionStatus) card.extractionStatus = input.extractionStatus;
  if (input.deleted !== undefined) card.deleted = input.deleted;
  if (input.deletedAt) card.deletedAt = input.deletedAt;
  if (input.version !== undefined) card.version = input.version;

  return card;
}

/**
 * Save or update a single NewsCard document for the current authenticated user in Firestore.
 * Path: /users/{firebaseUser.uid}/newsCards/{cardId}
 */
export async function saveNewsCardToFirestore(item: NewsCard | Article): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem('belkindesk_use_test_auth') === 'true') {
    try {
      const card = mapToNewsCard(item);
      await testAuthApiCall('POST', '/api/test-auth/news-cards', { card });
      return;
    } catch (err) {
      console.error('[TestAuth Client] Failed to save news card:', err);
      throw err;
    }
  }
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.warn('[NewsCards Firestore] Operation blocked: No authenticated Firebase user.');
    return;
  }

  const card = mapToNewsCard(item);
  const cardPath = `users/${uid}/newsCards/${card.id}`;

  try {
    const cardRef = doc(db, 'users', uid, 'newsCards', card.id);
    const snap = await getDoc(cardRef);
    if (snap.exists()) {
      const cloudCard = snap.data() as NewsCard;
      const cloudTime = cloudCard.updatedAt ? new Date(cloudCard.updatedAt).getTime() : 0;
      const localTime = card.updatedAt ? new Date(card.updatedAt).getTime() : 0;

      if (cloudTime > localTime) {
        // Cloud card is newer: perform safe flag merge to prevent overwriting newer user flags or notes from another device
        const merged: NewsCard = {
          ...cloudCard,
          ...card,
          isRead: localTime >= cloudTime ? Boolean(card.isRead) : Boolean(cloudCard.isRead),
          isStarred: localTime >= cloudTime ? Boolean(card.isStarred) : Boolean(cloudCard.isStarred),
          isHidden: localTime >= cloudTime ? Boolean(card.isHidden) : Boolean(cloudCard.isHidden),
          savedLater: localTime >= cloudTime ? Boolean(card.savedLater) : Boolean(cloudCard.savedLater),
          userNote: localTime >= cloudTime ? (card.userNote || '') : (cloudCard.userNote || ''),
          updatedAt: cloudCard.updatedAt,
        };
        await setDoc(cardRef, merged, { merge: true });
        return;
      }
    }
    await setDoc(cardRef, card, { merge: true });
  } catch (err) {
    logFirestoreError('SAVE_NEWS_CARD', cardPath, err);
    if (uid && isRetryableError(err)) {
      addPendingOperation({
        userId: uid,
        entityType: 'newsCards',
        entityId: card.id,
        operation: 'update',
        payload: card,
        baseUpdatedAt: card.updatedAt,
        localUpdatedAt: new Date().toISOString(),
      });
    }
    throw err;
  }
}

/**
 * Batch save multiple NewsCards for the current authenticated user in Firestore.
 * Handles Firestore 500-write batch limit automatically.
 * Path: /users/{firebaseUser.uid}/newsCards/{cardId}
 */
export async function saveNewsCardsBatchToFirestore(items: (NewsCard | Article)[]): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem('belkindesk_use_test_auth') === 'true') {
    try {
      const mapped = items.map(mapToNewsCard);
      await testAuthApiCall('POST', '/api/test-auth/news-cards/batch', { cards: mapped });
      return;
    } catch (err) {
      console.error('[TestAuth Client] Failed to batch save news cards:', err);
      throw err;
    }
  }
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
      if (uid && isRetryableError(err)) {
        for (const rawItem of chunk) {
          const card = mapToNewsCard(rawItem);
          addPendingOperation({
            userId: uid,
            entityType: 'newsCards',
            entityId: card.id,
            operation: 'update',
            payload: card,
            baseUpdatedAt: card.updatedAt,
            localUpdatedAt: new Date().toISOString(),
          });
        }
      }
      throw err;
    }
  }
}

/**
 * Fetch all NewsCards for the current authenticated user from Firestore.
 * Path: /users/{firebaseUser.uid}/newsCards
 */
export async function loadNewsCardsFromFirestore(): Promise<NewsCard[]> {
  if (typeof window !== 'undefined' && localStorage.getItem('belkindesk_use_test_auth') === 'true') {
    try {
      const res = await testAuthApiCall('GET', '/api/test-auth/news-cards');
      return res.newsCards || [];
    } catch (err) {
      console.error('[TestAuth Client] Failed to load news cards:', err);
      return [];
    }
  }
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
 * Delete a specific NewsCard from Firestore for the current authenticated user using tombstones.
 * Path: /users/{firebaseUser.uid}/newsCards/{cardId}
 */
export async function deleteNewsCardFromFirestore(cardId: string, itemPayload?: Article | NewsCard): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem('belkindesk_use_test_auth') === 'true') {
    try {
      await testAuthApiCall('DELETE', `/api/test-auth/news-cards/${cardId}`);
      return;
    } catch (err) {
      console.error('[TestAuth Client] Failed to delete news card:', err);
      throw err;
    }
  }
  const uid = auth.currentUser?.uid;
  if (!uid || !cardId) return;

  const cardPath = `users/${uid}/newsCards/${cardId}`;
  const nowIso = new Date().toISOString();

  const tombstone: NewsCard = {
    id: cardId,
    title: itemPayload?.title || '',
    url: itemPayload?.url || (itemPayload as any)?.link || '',
    sourceId: itemPayload?.sourceId || (itemPayload as any)?.feedId || 'custom',
    sourceName: itemPayload?.sourceName || (itemPayload as any)?.feedTitle || '',
    publishedAt: itemPayload?.publishedAt || (itemPayload as any)?.pubDate || nowIso,
    fetchedAt: itemPayload?.fetchedAt || nowIso,
    deleted: true,
    deletedAt: itemPayload?.deletedAt || nowIso,
    updatedAt: itemPayload?.updatedAt || nowIso,
    version: ((itemPayload as any)?.version || 0) + 1,
  };

  try {
    const cardRef = doc(db, 'users', uid, 'newsCards', cardId);
    await setDoc(cardRef, tombstone, { merge: true });
  } catch (err) {
    logFirestoreError('DELETE_NEWS_CARD', cardPath, err);
    if (uid && isRetryableError(err)) {
      addPendingOperation({
        userId: uid,
        entityType: 'newsCards',
        entityId: cardId,
        operation: 'delete',
        payload: tombstone,
        baseUpdatedAt: tombstone.updatedAt,
        localUpdatedAt: nowIso,
      });
    }
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
  if (typeof window !== 'undefined' && localStorage.getItem('belkindesk_use_test_auth') === 'true') {
    let isCancelled = false;
    const poll = async () => {
      try {
        const res = await testAuthApiCall('GET', '/api/test-auth/news-cards');
        if (!isCancelled && res.newsCards) {
          onUpdate(res.newsCards);
        }
      } catch (err) {
        console.warn('[TestAuth Client] News cards subscription poll error:', err);
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }
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

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a stable deterministic ID for an article.
 * Algorithm:
 * 1. If URL/link exists -> deterministic hash ID (`card_url_<hash>`).
 * 2. If URL is missing, but valid stable ID exists -> use ID.
 * 3. Otherwise -> deterministic hash ID from combination of stable fields
 *    (`source/feed + title + publishedAt/pubDate`).
 */
export function getStableCardId(item: Article | NewsCard): string {
  const rawUrl = (item.url || item.link || '').trim();
  if (rawUrl) {
    return `card_url_${hashString(rawUrl)}`;
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

  // Fallback deterministic combination of stable fields (source/feed + title + publishedAt/pubDate)
  const source = (item.sourceId || item.sourceName || (item as any).feedId || (item as any).feedTitle || '').trim();
  const title = (item.title || '').trim();
  const pubDate = (item.publishedAt || (item as any).pubDate || (item as any).isoDate || '').trim();
  const combo = `${source}|${title}|${pubDate}`.trim();

  if (combo.replace(/\|/g, '').length > 0) {
    return `card_combo_${hashString(combo)}`;
  }

  // Absolute fallback if title/pubDate/source are all empty
  const content = ((item as any).content || (item as any).contentSnippet || item.summary || item.description || '').trim();
  return `card_combo_${hashString(content || 'empty_news_card')}`;
}

/**
 * Converts a stored NewsCard back into a full Article runtime object.
 * Restores:
 *   feedId -> feedId
 *   feedTitle -> feedTitle
 *   sourceId -> sourceId
 *   sourceName -> sourceName
 * For legacy cards where feedId is missing, performs safe fallback via feeds without clobbering feedId with sourceId when feedId already exists.
 */
export function convertCloudCardToArticle(card: NewsCard, feeds?: FeedConfig[]): Article {
  const cardId = getStableCardId(card);

  let feedId = card.feedId;
  let feedTitle = card.feedTitle;

  // Legacy fallback for older NewsCards without feedId: attempt genuine resolution against configured feeds
  if (!feedId && feeds && feeds.length > 0) {
    const matchedFeed = resolveFeedForCard(card, feeds);
    if (matchedFeed) {
      feedId = matchedFeed.id;
      feedTitle = matchedFeed.name || (matchedFeed as any).title;
    }
  }

  // If still no feedId (no matching Feed found), DO NOT clobber feedId with sourceId. Leave feedId/feedTitle undefined.

  return {
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
    feedId: feedId,
    feedTitle: feedTitle,
    content: card.description || card.summary || '',
    contentSnippet: card.summary || '',
    summaryOneLine: card.summary || '',
    summaryThreeLines: card.description || card.summary || '',
    imageUrl: card.imageUrl,
    category: card.category,
    feedCategory: card.feedCategory || card.category,
    isRead: Boolean(card.isRead),
    isStarred: Boolean(card.isStarred),
    isHidden: Boolean(card.isHidden),
    savedLater: Boolean(card.savedLater),
    isSavedLater: Boolean(card.savedLater),
    userNote: card.userNote || '',
    updatedAt: card.updatedAt || new Date().toISOString(),
    deleted: Boolean(card.deleted),
    deletedAt: card.deletedAt,
    version: card.version || 1,
    aiSummary: card.aiSummary,
    keyTerms: card.keyTerms,
    author: card.author,
    feedIcon: card.feedIcon,
  };
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
  freshRssArticles: Article[],
  feeds?: FeedConfig[]
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

      const matchedFeed = (!cloudCard.feedId && feeds && feeds.length > 0) ? resolveFeedForCard(cloudCard, feeds) : undefined;
      const cloudResolvedFeedId = cloudCard.feedId || matchedFeed?.id;
      const cloudResolvedFeedTitle = cloudCard.feedTitle || matchedFeed?.name || (matchedFeed as any)?.title;

      // Card exists in both: RSS updates CONTENT STATE, cloudCard strictly maintains USER STATE
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
        feedId: rssArt.feedId || cloudResolvedFeedId,
        feedTitle: rssArt.feedTitle || cloudResolvedFeedTitle,
        feedCategory: rssArt.feedCategory || cloudCard.feedCategory || cloudCard.category,

        // USER STATES: Strictly from cloudCard (RSS metadata updates do NOT alter cloud user state)
        isRead: Boolean(cloudCard.isRead),
        isStarred: Boolean(cloudCard.isStarred),
        isHidden: Boolean(cloudCard.isHidden),
        savedLater: Boolean(cloudCard.savedLater),
        isSavedLater: Boolean(cloudCard.savedLater),
        userNote: cloudCard.userNote || '',
        updatedAt: cloudCard.updatedAt || new Date().toISOString(),
        deleted: Boolean(cloudCard.deleted),
        deletedAt: cloudCard.deletedAt,
        version: Math.max((cloudCard.version || 0), (rssArt.version || 0)),
      };

      mergedMap.set(stableId, mergedArticle);
      if (cloudCard.deleted) {
        // Do not re-save deleted cards back to cloud
      }
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
        deleted: Boolean(rssArt.deleted),
        deletedAt: rssArt.deletedAt,
        version: rssArt.version || 1,
      };

      mergedMap.set(stableId, newArticle);
      if (!newArticle.deleted) {
        cardsToSaveToCloud.push(newArticle);
      }
    }
  }

  // 2. Process cloud cards NOT present in fresh RSS (disappeared articles)
  for (const card of cloudCards) {
    const cardId = getStableCardId(card);
    if (!processedCloudIds.has(cardId) && !processedCloudIds.has(card.id)) {
      processedCloudIds.add(cardId);
      if (card.id) processedCloudIds.add(card.id);

      const archivedArticle = convertCloudCardToArticle(card, feeds);
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
