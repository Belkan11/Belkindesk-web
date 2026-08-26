import { Article, FeedConfig, AIDiscoveredFeed, AIDigestResult } from '../types';
import { getActiveSessionUserId, getStoredProfiles } from './storage';
import { auth } from './firebase';

const isDevMode = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('dev')
);

export interface FeedFetchResult {
  title: string;
  description?: string;
  link?: string;
  articles: Article[];
  itemCount: number;
}

export async function fetchFeedArticles(feed: any, limit = 50): Promise<FeedFetchResult & { error?: string }> {
  try {
    const res = await fetch('/api/rss/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: feed.url, 
        feedId: feed.feedId || feed.id, 
        limit,
        type: feed.type,
        searchQuery: feed.query || feed.searchQuery,
        keywords: feed.keywords,
        excludeKeywords: feed.excludeKeywords,
        keywordMode: feed.keywordMode,
        category: feed.feedCategory || feed.category,
        title: feed.feedTitle || feed.title || feed.name
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Статус сервера: ${res.status}`);
    }

    const rawArticles = data.articles || [];
    const articles = rawArticles.slice(0, limit).map((art: Article) => ({
      ...art,
      feedId: feed.feedId || feed.id,
      feedTitle: feed.feedTitle || feed.title || feed.name || art.feedTitle || 'Лента новостей',
      feedCategory: feed.feedCategory || feed.category,
    }));

    return {
      title: data.title || feed.title || feed.name,
      description: data.description,
      link: data.link,
      itemCount: articles.length,
      articles,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`Error loading feed ${feed.title || feed.name}:`, error.message);
    
    return {
      title: feed.title || feed.name,
      description: feed.description || 'Лента не доступна',
      articles: [],
      itemCount: 0,
      error: error.message,
    };
  }
}



export async function discoverFeedsFromUrl(url: string) {
  const res = await fetch('/api/rss/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Не удалось просканировать сайт');
  return res.json();
}

function getAiHeaders(explicitUserId?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const activeUserId = explicitUserId || auth.currentUser?.uid || (isDevMode ? getActiveSessionUserId() : null);
    if (!activeUserId) return headers;

    const providerKey = `belkin_user_ai_provider_${activeUserId}`;
    const keyKey = `belkin_user_ai_key_${activeUserId}`;
    const modelKey = `belkin_user_ai_model_${activeUserId}`;
    const urlKey = `belkin_user_ai_url_${activeUserId}`;

    let key = localStorage.getItem(keyKey);
    let provider = localStorage.getItem(providerKey);
    let model = localStorage.getItem(modelKey);
    let url = localStorage.getItem(urlKey);

    // Fallback to profile restored from Firestore if localStorage cache key is missing
    if (!key || !provider) {
      const profiles = getStoredProfiles();
      const activeUser = profiles.find((p) => p.id === activeUserId);
      if (activeUser) {
        if (!key && activeUser.aiApiKey !== undefined) key = activeUser.aiApiKey;
        if (!provider && activeUser.aiProvider) provider = activeUser.aiProvider;
        if (!model && activeUser.aiModel !== undefined) model = activeUser.aiModel;
        if (!url && activeUser.aiUrl !== undefined) url = activeUser.aiUrl;
      }
    }

    if (key) headers['x-user-ai-key'] = key;
    if (provider) headers['x-user-ai-provider'] = provider;
    if (model) headers['x-user-ai-model'] = model;
    if (url) headers['x-user-ai-url'] = url;
  } catch (e) {}
  return headers;
}

export async function aiProcessArticles(articles: Article[], customPrompt?: string): Promise<Article[]> {
  try {
    const res = await fetch('/api/ai/process-articles', {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify({ articles, customPrompt }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || (data.error && data.error.includes('Лимит'))) {
        alert(data.error || "Лимит AI-запросов исчерпан. Проверьте квоту или выберите другой AI provider.");
      }
      return articles;
    }
    const data = await res.json();
    return data.articles || articles;
  } catch (err) {
    console.warn('AI news processing fallback:', err);
    return articles;
  }
}

export async function aiSummarizeArticleDeep(article: Article, customPrompt?: string) {
  try {
    const res = await fetch('/api/ai/summarize-article', {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify({ article, customPrompt }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Deep summary fallback:', err);
    return {
      titleRu: (article.ai?.titleRu || article.titleRu) || article.title,
      main: (article.ai?.summaryOneLine || article.summaryOneLine) || article.contentSnippet || 'Публикация содержит актуальные практические данные.',
      clinicalSignificance: 'Материал имеет практическую ценность для специалистов.',
      takeaway: 'Рекомендуется изучить полный материал по ссылке.',
      keyTerms: (article.ai?.keyTerms || article.keyTerms) || article.categories || [],
      estimatedReadMinutes: 2,
      images: article.imageUrls || (article.imageUrl ? [article.imageUrl] : []),
      link: article.link,
      feedTitle: article.feedTitle,
    };
  }
}

export async function aiDiscoverFeeds(prompt: string): Promise<AIDiscoveredFeed[]> {
  const res = await fetch('/api/ai/discover-feeds', {
    method: 'POST',
    headers: getAiHeaders(),
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Ошибка ИИ при поиске подписок');
  }
  const data = await res.json();
  return data.feeds || [];
}

export async function aiSummarizeArticle(title: string, content: string, mode = 'executive') {
  const res = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: getAiHeaders(),
    body: JSON.stringify({ title, content, mode }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Ошибка создания саммари');
  }
  return res.json();
}

export async function aiGenerateDigest(articles: Article[], category?: string): Promise<AIDigestResult> {
  const res = await fetch('/api/ai/digest', {
    method: 'POST',
    headers: getAiHeaders(),
    body: JSON.stringify({ articles, category }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Ошибка создания дайджеста');
  }
  return res.json();
}

export async function aiAskFeeds(query: string, articles: Article[]): Promise<string> {
  const res = await fetch('/api/ai/ask-feeds', {
    method: 'POST',
    headers: getAiHeaders(),
    body: JSON.stringify({ query, articles }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Ошибка запроса к ИИ');
  }
  const data = await res.json();
  return data.answer || 'Ответ не получен';
}

export function parseOpmlText(opmlString: string): Array<{ title: string; url: string; category: string; siteUrl?: string }> {
  const feeds: Array<{ title: string; url: string; category: string; siteUrl?: string }> = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(opmlString, 'text/xml');
    const outlines = xmlDoc.querySelectorAll('outline');

    outlines.forEach((outline) => {
      const xmlUrl = outline.getAttribute('xmlUrl');
      const text = outline.getAttribute('text') || outline.getAttribute('title') || 'Без названия';
      const htmlUrl = outline.getAttribute('htmlUrl') || undefined;

      if (xmlUrl) {
        // Check parent outline for category
        const parent = outline.parentElement;
        const parentCategory = parent && parent.tagName.toLowerCase() === 'outline'
          ? (parent.getAttribute('text') || parent.getAttribute('title') || 'Импортированные')
          : 'Импортированные';

        feeds.push({
          title: text,
          url: xmlUrl,
          category: parentCategory,
          siteUrl: htmlUrl,
        });
      }
    });
  } catch (err) {
    console.error('Error parsing OPML string:', err);
  }
  return feeds;
}
