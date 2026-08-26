import { describe, it, expect } from 'vitest';
import { isArticleInFeed, normalizeFeedText, normalizeFeedUrl } from './feedUtils';
import { Article, FeedConfig } from '../types';

describe('feedUtils - isArticleInFeed', () => {
  const sampleFeed: FeedConfig = {
    id: 'feed-iphone-repair',
    name: 'iPhone Repair Test',
    category: 'Технологии',
    enabled: true,
    sources: [
      {
        id: 'src-yt-iphone-repair',
        type: 'youtube',
        name: 'YouTube iPhone Repair',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC12345',
        enabled: true,
      },
      {
        id: 'src-ifixit-blog',
        type: 'rss',
        name: 'iFixit Blog',
        url: 'https://www.ifixit.com/News/feed',
        enabled: true,
      }
    ],
  };

  it('matches by feedId directly (Priority 1)', () => {
    const article: Partial<Article> = {
      id: 'art-1',
      title: 'How to replace iPhone battery',
      feedId: 'feed-iphone-repair',
    };
    expect(isArticleInFeed(article as Article, sampleFeed)).toBe(true);
  });

  it('matches by sourceId in feed.sources (Priority 1)', () => {
    const article: Partial<Article> = {
      id: 'art-2',
      title: 'New screen replacement teardown',
      sourceId: 'src-yt-iphone-repair',
      feedId: 'some-other-id',
    };
    expect(isArticleInFeed(article as Article, sampleFeed)).toBe(true);
  });

  it('matches by source URL (Priority 2)', () => {
    const article: Partial<Article> = {
      id: 'art-3',
      title: 'iFixit Latest Teardown',
      link: 'https://www.ifixit.com/News/feed/article-999',
      feedId: 'unrelated-feed',
    };
    expect(isArticleInFeed(article as Article, sampleFeed)).toBe(true);
  });

  it('matches by feed name / title fallback (Priority 3)', () => {
    const article: Partial<Article> = {
      id: 'art-4',
      title: 'iPhone repair tips',
      feedTitle: 'iPhone Repair Test',
    };
    expect(isArticleInFeed(article as Article, sampleFeed)).toBe(true);
  });

  it('returns false for unrelated article', () => {
    const article: Partial<Article> = {
      id: 'art-5',
      title: 'Unrelated Cardiology news',
      feedId: 'feed-cardiology',
      feedTitle: 'РКО Кардиология',
      link: 'https://scardio.ru/news/123',
    };
    expect(isArticleInFeed(article as Article, sampleFeed)).toBe(false);
  });
});
