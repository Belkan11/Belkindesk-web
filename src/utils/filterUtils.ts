import { getStableCardId } from './newsCardsCloud';

export function normalizeText(text?: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[.,!?;:()[\]{}"']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function applyKeywordsFilter(articles: any[], keywords?: string[], excludeKeywords?: string[], keywordMode: 'ANY' | 'ALL' = 'ANY') {
  const cleanExcludes = (excludeKeywords || []).map(normalizeText).filter(Boolean);
  const cleanIncludes = (keywords || []).map(normalizeText).filter(Boolean);

  return articles.map(article => {
    // Check title, description, content, tags
    const cats = Array.isArray(article.categories) ? article.categories.join(' ') : '';
    const textContext = normalizeText(
      `${article.title || ''} ${article.contentSnippet || ''} ${article.content || ''} ${cats}`
    );
    
    if (cleanExcludes.length > 0) {
      const hasExclude = cleanExcludes.some(kw => textContext.includes(kw));
      if (hasExclude) return null;
    }
    
    let matchedKeywords: string[] = [];
    if (cleanIncludes.length > 0) {
      if (keywordMode === 'ALL') {
        const matchesAll = cleanIncludes.every(kw => {
          const match = textContext.includes(kw);
          if (match) matchedKeywords.push(kw);
          return match;
        });
        if (!matchesAll) return null;
      } else {
        // ANY
        const matchesAny = cleanIncludes.some(kw => {
          const match = textContext.includes(kw);
          if (match) matchedKeywords.push(kw);
          return match;
        });
        if (!matchesAny) return null;
      }
    }
    
    return {
      ...article,
      matchedKeywords
    };
  }).filter(Boolean);
}

export function normalizeUrl(u: string): string {
  if (!u) return '';
  try {
    const parsed = new URL(u);
    let host = parsed.hostname.replace(/^www\./, '');
    let path = parsed.pathname.replace(/\/$/, '');
    if (host.includes('youtube.com') && parsed.searchParams.has('v')) {
      path += '?v=' + parsed.searchParams.get('v');
    }
    return host + path;
  } catch {
    return u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }
}

export function normalizeTitle(t: string): string {
  if (!t) return '';
  try {
    return t.normalize('NFKC').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
  } catch {
    return t.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
  }
}

export function generateContentHash(c: string): string {
  if (!c || c.length < 50) return '';
  const stripped = c.replace(/<[^>]*>?/gm, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  try {
    return stripped.normalize('NFKC').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '').slice(0, 400);
  } catch {
    return stripped.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '').slice(0, 400);
  }
}

export function deduplicateArticles(newArticles: any[], currentArticles: any[]): any[] {
  const currentKeys = new Set<string>();
  const currentContents = new Set<string>();
  
  currentArticles.forEach((a) => {
    if (a.title) currentKeys.add(normalizeTitle(a.title));
    if (a.link) currentKeys.add(normalizeUrl(a.link));
    const cHash = generateContentHash(a.content || a.contentSnippet || '');
    if (cHash) currentContents.add(cHash);
  });

  const uniqueNewArticles: any[] = [];
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const seenContents = new Set<string>();

  newArticles.forEach((art, idx) => {
    const l = normalizeUrl(art.link || '');
    const t = normalizeTitle(art.title || '');
    const cHash = generateContentHash(art.content || art.contentSnippet || '');
    
    if (
      (t && currentKeys.has(t)) || 
      (l && currentKeys.has(l)) || 
      (cHash && currentContents.has(cHash)) ||
      (l && seenLinks.has(l)) || 
      (t && seenTitles.has(t)) ||
      (cHash && seenContents.has(cHash))
    ) {
      return;
    }
    
    if (l) seenLinks.add(l);
    if (t) seenTitles.add(t);
    if (cHash) seenContents.add(cHash);
    
    uniqueNewArticles.push({
      ...art,
      id: getStableCardId(art)
    });
  });

  return uniqueNewArticles;
}

export function searchArticles(articles: any[], query: string): any[] {
  if (!query || !query.trim()) return articles;
  const q = query.toLowerCase().trim();
  return articles.filter((art) => {
    return (
      (art.title && art.title.toLowerCase().includes(q)) ||
      (art.ai?.titleRu && art.ai.titleRu.toLowerCase().includes(q)) ||
      (art.titleRu && art.titleRu.toLowerCase().includes(q)) ||
      (art.ai?.summaryOneLine && art.ai.summaryOneLine.toLowerCase().includes(q)) ||
      (art.summaryOneLine && art.summaryOneLine.toLowerCase().includes(q)) ||
      (art.ai?.summaryThreeLines && art.ai.summaryThreeLines.toLowerCase().includes(q)) ||
      (art.summaryThreeLines && art.summaryThreeLines.toLowerCase().includes(q)) ||
      (art.contentSnippet && art.contentSnippet.toLowerCase().includes(q)) ||
      (art.content && art.content.toLowerCase().includes(q))
    );
  });
}
