import { describe, it, expect } from 'vitest';
import { 
  applyKeywordsFilter, 
  deduplicateArticles, 
  normalizeUrl, 
  normalizeTitle, 
  generateContentHash,
  searchArticles 
} from './filterUtils';

describe('applyKeywordsFilter', () => {
  const mockArticles = [
    { id: 1, title: 'Breakthrough in AI', content: 'Researchers found a new way to train models.', categories: ['Technology'] },
    { id: 2, title: 'Apple releases new iPhone', content: 'The new iPhone has a better camera and battery.', categories: ['Tech', 'Mobile'] },
    { id: 3, title: 'Healthy eating habits', content: 'Eat more vegetables and fruits.', categories: ['Health'] },
    { id: 4, title: 'AI and medicine', content: 'Artificial intelligence is transforming healthcare.', categories: ['Health', 'Technology'] }
  ];

  it('should return all articles if no keywords are provided', () => {
    const result = applyKeywordsFilter(mockArticles);
    expect(result).toHaveLength(4);
  });

  it('should filter articles by ANY keyword', () => {
    const keywords = ['AI', 'apple'];
    const result = applyKeywordsFilter(mockArticles, keywords, [], 'ANY');
    expect(result).toHaveLength(3); // id 1 (AI), id 2 (apple), id 4 (AI)
    expect(result.map(r => r.id)).toEqual([1, 2, 4]);
  });

  it('should filter articles by ALL keywords', () => {
    const keywords = ['AI', 'medicine'];
    const result = applyKeywordsFilter(mockArticles, keywords, [], 'ALL');
    expect(result).toHaveLength(1); // Only id 4 has both
    expect(result[0].id).toBe(4);
  });

  it('should exclude articles with excludeKeywords', () => {
    const keywords = ['AI'];
    const excludeKeywords = ['medicine']; // Exclude article 4
    const result = applyKeywordsFilter(mockArticles, keywords, excludeKeywords, 'ANY');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should handle empty results if no match', () => {
    const keywords = ['Quantum computing'];
    const result = applyKeywordsFilter(mockArticles, keywords, [], 'ANY');
    expect(result).toHaveLength(0);
  });
});

describe('deduplicateArticles', () => {
  const currentArticles = [
    { id: '1', title: 'Article One', link: 'https://example.com/1', content: 'This is the first article with enough content length to hash properly and uniquely.' },
    { id: '2', title: 'Article Two', link: 'https://example.com/2', content: 'This is the second article with enough content length to hash properly and uniquely.' }
  ];

  it('should deduplicate by exact title', () => {
    const newArticles = [
      { id: '3', title: 'Article One', link: 'https://example.com/3', content: 'Different content here' },
      { id: '4', title: 'Article Three', link: 'https://example.com/4', content: 'Totally new article here.' }
    ];
    const result = deduplicateArticles(newArticles, currentArticles);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('should deduplicate by exact link', () => {
    const newArticles = [
      { id: '3', title: 'Different Title', link: 'https://example.com/1', content: 'Different content here' },
      { id: '4', title: 'Article Three', link: 'https://example.com/4', content: 'Totally new article here.' }
    ];
    const result = deduplicateArticles(newArticles, currentArticles);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('should deduplicate items within the new batch itself', () => {
    const newArticles = [
      { id: '3', title: 'New Batch Article', link: 'https://example.com/3', content: 'Different content here' },
      { id: '4', title: 'New Batch Article', link: 'https://example.com/4', content: 'Totally new article here.' }
    ];
    const result = deduplicateArticles(newArticles, currentArticles);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });
});

describe('normalizeUrl', () => {
  it('should normalize URLs correctly', () => {
    expect(normalizeUrl('https://www.example.com/path/')).toBe('example.com/path');
    expect(normalizeUrl('http://example.com/path')).toBe('example.com/path');
    expect(normalizeUrl('https://youtube.com/watch?v=12345')).toBe('youtube.com/watch?v=12345');
  });
});

describe('normalizeTitle', () => {
  it('should normalize titles ignoring case and punctuation', () => {
    expect(normalizeTitle('Hello, World!')).toBe('helloworld');
    expect(normalizeTitle('Привет, МИР')).toBe('приветмир');
  });
});

describe('searchArticles', () => {
  const mockArticles = [
    { id: 1, title: 'Breakthrough in AI', content: 'Researchers found a new way to train models.' },
    { id: 2, title: 'Apple releases new iPhone', summaryOneLine: 'The new iPhone has a better camera and battery.' },
    { id: 3, title: 'Healthy eating habits', titleRu: 'Здоровое питание', contentSnippet: 'Eat more vegetables and fruits.' },
  ];

  it('should return all articles if query is empty', () => {
    const result = searchArticles(mockArticles, '');
    expect(result).toHaveLength(3);
  });

  it('should search by title', () => {
    const result = searchArticles(mockArticles, 'Apple');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('should search by summaryOneLine', () => {
    const result = searchArticles(mockArticles, 'camera');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('should search by titleRu (Russian text)', () => {
    const result = searchArticles(mockArticles, 'здоровое');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('should return empty result if nothing matches', () => {
    const result = searchArticles(mockArticles, 'Mars rover');
    expect(result).toHaveLength(0); // tests empty result logic
  });
});
