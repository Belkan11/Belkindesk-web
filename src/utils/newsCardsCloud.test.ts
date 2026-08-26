import { describe, it, expect } from 'vitest';
import { mapToNewsCard, convertCloudCardToArticle, mergeCloudAndRssArticles } from './newsCardsCloud';
import { Article, FeedConfig, NewsCard } from '../types';

describe('newsCardsCloud - Feed and Source separation', () => {
  const sampleFeeds: FeedConfig[] = [
    {
      id: 'feed-tech',
      name: 'Технологии',
      enabled: true,
      sources: [
        {
          id: 'src-habr',
          name: 'Хабр',
          type: 'rss',
          url: 'https://habr.com/ru/rss/all/v20/',
          enabled: true,
        },
      ],
    },
  ];

  it('preserves distinct feedId/feedTitle and sourceId/sourceName in mapToNewsCard', () => {
    const article: Partial<Article> = {
      id: 'card-1',
      title: 'Новость о микросхемах',
      link: 'https://habr.com/ru/articles/12345/',
      feedId: 'feed-tech',
      feedTitle: 'Технологии',
      sourceId: 'src-habr',
      sourceName: 'Хабр',
    };

    const card = mapToNewsCard(article as Article);
    expect(card.feedId).toBe('feed-tech');
    expect(card.feedTitle).toBe('Технологии');
    expect(card.sourceId).toBe('src-habr');
    expect(card.sourceName).toBe('Хабр');
  });

  it('restores distinct feedId/feedTitle and sourceId/sourceName in convertCloudCardToArticle', () => {
    const card: NewsCard = {
      id: 'card-2',
      title: 'Статья',
      url: 'https://habr.com/ru/articles/555/',
      feedId: 'feed-tech',
      feedTitle: 'Технологии',
      sourceId: 'src-habr',
      sourceName: 'Хабр',
      publishedAt: '2026-08-26T00:00:00Z',
      fetchedAt: '2026-08-26T00:00:00Z',
      updatedAt: '2026-08-26T00:00:00Z',
    };

    const art = convertCloudCardToArticle(card);
    expect(art.feedId).toBe('feed-tech');
    expect(art.feedTitle).toBe('Технологии');
    expect(art.sourceId).toBe('src-habr');
    expect(art.sourceName).toBe('Хабр');
  });

  it('migrates legacy cards without feedId by resolving against feeds', () => {
    const legacyCard: NewsCard = {
      id: 'card-legacy',
      title: 'Старая статья',
      url: 'https://habr.com/ru/articles/777/',
      sourceId: 'src-habr',
      sourceName: 'Хабр',
      publishedAt: '2026-08-26T00:00:00Z',
      fetchedAt: '2026-08-26T00:00:00Z',
      updatedAt: '2026-08-26T00:00:00Z',
    };

    const art = convertCloudCardToArticle(legacyCard, sampleFeeds);
    expect(art.feedId).toBe('feed-tech');
    expect(art.feedTitle).toBe('Технологии');
    expect(art.sourceId).toBe('src-habr');
    expect(art.sourceName).toBe('Хабр');
  });

  it('does NOT clobber feedId with sourceId when feedId already exists on the card', () => {
    const cardWithCustomFeed: NewsCard = {
      id: 'card-custom',
      title: 'Статья в кастомном фиде',
      url: 'https://habr.com/ru/articles/888/',
      feedId: 'custom-feed-99',
      feedTitle: 'Мой кастомный фид',
      sourceId: 'src-habr',
      sourceName: 'Хабр',
      publishedAt: '2026-08-26T00:00:00Z',
      fetchedAt: '2026-08-26T00:00:00Z',
      updatedAt: '2026-08-26T00:00:00Z',
    };

    const art = convertCloudCardToArticle(cardWithCustomFeed, sampleFeeds);
    expect(art.feedId).toBe('custom-feed-99');
    expect(art.feedTitle).toBe('Мой кастомный фид');
    expect(art.sourceId).toBe('src-habr');
    expect(art.sourceName).toBe('Хабр');
  });

  it('preserves sourceId and leaves feedId undefined when legacy card does not match any Feed', () => {
    const unmappedLegacyCard: NewsCard = {
      id: 'card-unmapped-legacy',
      title: 'Автономная новость без канала',
      url: 'https://random-unknown-site.org/post/123',
      sourceId: 'src-random-unknown',
      sourceName: 'Random Unknown Blog',
      publishedAt: '2026-08-26T00:00:00Z',
      fetchedAt: '2026-08-26T00:00:00Z',
      updatedAt: '2026-08-26T00:00:00Z',
    };

    // Feeds list has no matching feed
    const art = convertCloudCardToArticle(unmappedLegacyCard, sampleFeeds);
    expect(art.sourceId).toBe('src-random-unknown');
    expect(art.sourceName).toBe('Random Unknown Blog');
    // feedId/feedTitle MUST NOT be clobbered with sourceId/sourceName
    expect(art.feedId).toBeUndefined();
    expect(art.feedTitle).toBeUndefined();
  });
});
