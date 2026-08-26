import { Article, FeedConfig, NewsCard } from '../types';

export function normalizeFeedText(text?: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[.,!?;:()[\]{}"']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeFeedUrl(u?: string): string {
  if (!u) return '';
  try {
    const parsed = new URL(u);
    let host = parsed.hostname.replace(/^www\./i, '');
    let path = parsed.pathname.replace(/\/$/, '');
    if (host.includes('youtube.com') && parsed.searchParams.has('v')) {
      path += '?v=' + parsed.searchParams.get('v');
    }
    return (host + path).toLowerCase();
  } catch {
    return u.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase();
  }
}

/**
 * Robust association check between an Article/NewsCard and a FeedConfig.
 * Priority:
 * 1. Direct ID matching:
 *    - feed.id === article.feedId
 *    - or any source.id within feed.sources === article.sourceId
 * 2. Feed / Source Name matching (legacy fallback):
 *    - feed.name === article.feedTitle
 *    - or any source.name within feed.sources === article.sourceName
 * 3. URL matching against configured feed sources (last legacy fallback):
 *    - URL matching only as a final fallback, because article page URL is distinct from RSS endpoint URL.
 */
export function isArticleInFeed(article: Article | NewsCard, feed: FeedConfig): boolean {
  if (!article || !feed) return false;

  const feedId = (feed.id || '').trim();
  const artFeedId = (article.feedId || '').trim();
  const artSourceId = (article.sourceId || '').trim();

  // 1. Priority: Direct ID matching
  if (feedId && artFeedId && artFeedId === feedId) {
    return true;
  }

  if (artSourceId && Array.isArray(feed.sources) && feed.sources.length > 0) {
    for (const src of feed.sources) {
      if (!src) continue;
      const srcId = (src.id || '').trim();
      if (srcId && srcId === artSourceId) {
        return true;
      }
    }
  }

  // 2. Priority: Feed / Source Name matching (legacy fallback)
  const feedName = normalizeFeedText(feed.name || (feed as any).title);
  const artFeedTitle = normalizeFeedText(article.feedTitle);
  const artSourceName = normalizeFeedText(article.sourceName);

  if (feedName && artFeedTitle) {
    if (artFeedTitle === feedName || artFeedTitle.includes(feedName) || feedName.includes(artFeedTitle)) {
      return true;
    }
  }

  if (artSourceName && Array.isArray(feed.sources) && feed.sources.length > 0) {
    for (const src of feed.sources) {
      if (!src) continue;
      const srcName = normalizeFeedText(src.name);
      if (srcName && (srcName === artSourceName || srcName.includes(artSourceName) || artSourceName.includes(srcName))) {
        return true;
      }
    }
  }

  // 3. Priority: URL matching against source URLs (last legacy fallback)
  const artUrl = normalizeFeedUrl((article as any).link || article.url);
  if (artUrl && Array.isArray(feed.sources) && feed.sources.length > 0) {
    for (const src of feed.sources) {
      if (!src || !src.url) continue;
      const srcUrl = normalizeFeedUrl(src.url);
      if (srcUrl) {
        if (artUrl === srcUrl || artUrl.startsWith(srcUrl) || srcUrl.startsWith(artUrl)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Resolves the matching FeedConfig for an Article or legacy NewsCard.
 */
export function resolveFeedForCard(card: Partial<NewsCard | Article>, feeds: FeedConfig[]): FeedConfig | undefined {
  if (!card || !Array.isArray(feeds) || feeds.length === 0) return undefined;

  // 1. Direct feedId match
  if (card.feedId) {
    const directFeed = feeds.find((f) => f.id === card.feedId);
    if (directFeed) return directFeed;
  }

  // 2. Source ID match in feed sources
  if (card.sourceId) {
    const sourceFeed = feeds.find((f) => Array.isArray(f.sources) && f.sources.some((s) => s.id === card.sourceId));
    if (sourceFeed) return sourceFeed;
  }

  // 3. Name match (feedTitle or sourceName)
  const feedTitle = normalizeFeedText(card.feedTitle);
  if (feedTitle) {
    const nameFeed = feeds.find((f) => {
      const fn = normalizeFeedText(f.name || (f as any).title);
      return fn && (fn === feedTitle || fn.includes(feedTitle) || feedTitle.includes(fn));
    });
    if (nameFeed) return nameFeed;
  }

  const sourceName = normalizeFeedText(card.sourceName);
  if (sourceName) {
    const srcNameFeed = feeds.find((f) => {
      const fn = normalizeFeedText(f.name || (f as any).title);
      if (fn && (fn === sourceName || fn.includes(sourceName) || sourceName.includes(fn))) return true;
      return Array.isArray(f.sources) && f.sources.some((s) => {
        const sn = normalizeFeedText(s.name);
        return sn && (sn === sourceName || sn.includes(sourceName) || sourceName.includes(sn));
      });
    });
    if (srcNameFeed) return srcNameFeed;
  }

  // 4. Last legacy fallback: URL matching against source URLs
  const artUrl = normalizeFeedUrl(card.url || (card as any).link);
  if (artUrl) {
    const urlFeed = feeds.find((f) =>
      Array.isArray(f.sources) && f.sources.some((s) => {
        if (!s.url) return false;
        const su = normalizeFeedUrl(s.url);
        return su && (artUrl === su || artUrl.startsWith(su) || su.startsWith(artUrl));
      })
    );
    if (urlFeed) return urlFeed;
  }

  return undefined;
}

