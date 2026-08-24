import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFeedArticles } from './feedApi';

describe('fetchFeedArticles (Source Failure Handling)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // We mock fetch globally
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should handle network errors gracefully and return an error message', async () => {
    (globalThis.fetch as any).mockRejectedValueOnce(new Error('Network error'));
    
    const feed = { url: 'https://badsource.com/rss', title: 'Bad Source' };
    const result = await fetchFeedArticles(feed);
    
    expect(result.error).toBe('Network error');
    expect(result.articles).toEqual([]);
    expect(result.title).toBe('Bad Source');
  });

  it('should handle API returning an error object gracefully', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server crashed processing feed' })
    });
    
    const feed = { url: 'https://badsource.com/rss', title: 'Bad Source' };
    const result = await fetchFeedArticles(feed);
    
    expect(result.error).toBe('Server crashed processing feed');
    expect(result.articles).toEqual([]);
  });

  it('should handle API returning non-ok without error object gracefully', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({})
    });
    
    const feed = { url: 'https://badsource.com/rss', title: 'Bad Source' };
    const result = await fetchFeedArticles(feed);
    
    expect(result.error).toBe('Статус сервера: 502');
    expect(result.articles).toEqual([]);
  });
});
