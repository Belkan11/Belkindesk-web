import { Article, FeedConfig } from '../types';

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
 * Robust association check between an Article and a FeedConfig.
 * Priority:
 * 1. Direct ID matching: feedId or sourceId (feed.id or any source.id within feed.sources)
 * 2. URL matching against configured feed sources
 * 3. Stable feed name / title matching (legacy fallback)
 */
export function isArticleInFeed(article: Article, feed: FeedConfig): boolean {
  if (!article || !feed) return false;

  const feedId = (feed.id || '').trim();
  const artFeedId = (article.feedId || '').trim();
  const artSourceId = (article.sourceId || '').trim();

  // 1. Priority: Direct ID matching (feedId or sourceId)
  if (feedId) {
    if (artFeedId && artFeedId === feedId) {
      return true;
    }
    if (artSourceId && artSourceId === feedId) {
      return true;
    }
  }

  if (Array.isArray(feed.sources) && feed.sources.length > 0) {
    for (const src of feed.sources) {
      if (!src) continue;
      const srcId = (src.id || '').trim();
      if (srcId && (srcId === artSourceId || srcId === artFeedId)) {
        return true;
      }
    }
  }

  // 2. Priority: URL matching against source URLs
  const artUrl = normalizeFeedUrl(article.link || article.url);
  if (artUrl && Array.isArray(feed.sources) && feed.sources.length > 0) {
    for (const src of feed.sources) {
      if (!src || !src.url) continue;
      const srcUrl = normalizeFeedUrl(src.url);
      if (srcUrl) {
        if (artUrl === srcUrl || artUrl.includes(srcUrl) || srcUrl.includes(artUrl)) {
          return true;
        }
      }
    }
  }

  // 3. Priority: Feed Name / Title matching (legacy fallback)
  const feedName = normalizeFeedText(feed.name || (feed as any).title);
  const artFeedTitle = normalizeFeedText(article.feedTitle);
  const artSourceName = normalizeFeedText(article.sourceName);

  if (feedName) {
    if (artFeedTitle && (artFeedTitle === feedName || artFeedTitle.includes(feedName) || feedName.includes(artFeedTitle))) {
      return true;
    }
    if (artSourceName && (artSourceName === feedName || artSourceName.includes(feedName) || feedName.includes(artSourceName))) {
      return true;
    }
  }

  return false;
}
