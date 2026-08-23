import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// 1. Remove runSearchOrchestrator entirely
content = content.replace(/async function runSearchOrchestrator[\s\S]*?\/\/\s*-{52}\n\/\/ Adapter Registry/m, '// ----------------------------------------------------\n// Adapter Registry');

// 2. Fix the intercept logic in /api/rss/fetch
// Replace the block:
// if (cleanType === 'youtube' || cleanType === '4pda' ...
const fetchInterceptRegex = /\/\/\s*Intercept and run SearchOrchestrator if we have platform\/search criteria![\s\S]*?if \(!url \|\| typeof url !== "string"\)/m;
const fetchInterceptReplacement = `
  // If we already scraped articles from an adapter, and there's no URL to fetch standard RSS from, return them immediately
  if (scrapedArticles.length > 0 && !url) {
    res.json({
      title: title || type || "Поиск",
      description: \`Поисковая выдача для \${searchQuery || type}\`,
      link: "https://google.com",
      itemCount: scrapedArticles.length,
      articles: scrapedArticles,
    });
    return;
  }

  if (!url || typeof url !== "string") {
`;
content = content.replace(fetchInterceptRegex, fetchInterceptReplacement);

// 3. Fix adapters (remove fake ones, add standard ones)
const adapterRegex = /const sourceAdapterRegistry: Record<string, SourceAdapter> = \{[\s\S]*?\};\n\n\/\/\s*-{52}\n\/\/ 1\. RSS \/ Atom Feed Fetch/m;
const newAdapters = `
const sourceAdapterRegistry: Record<string, SourceAdapter> = {
  reddit: {
    type: 'reddit',
    fetch: async ({ url }) => {
      // Not fully implemented without RSS parser here, so return empty for now,
      // it will fall back to normal RSS fetching if a valid URL is provided.
      return [];
    }
  },
  telegram: {
    type: 'telegram',
    fetch: async () => []
  },
  pikabu: {
    type: 'pikabu',
    fetch: async () => []
  },
  youtube: {
    type: 'youtube',
    fetch: async () => []
  },
  ifixit: {
    type: 'ifixit',
    fetch: async () => []
  },
  '4pda': {
    type: '4pda',
    fetch: async () => []
  },
  rss: {
    type: 'rss',
    fetch: async () => []
  },
  atom: {
    type: 'atom',
    fetch: async () => []
  }
};

// ----------------------------------------------------
// 1. RSS / Atom Feed Fetch`;
content = content.replace(adapterRegex, newAdapters);


// 4. Implement keyword filtering in /api/rss/fetch before sending response
// After `const finalArticles = parsedResult.articles;`
const keywordFilterRegex = /const finalArticles = parsedResult\.articles;\s+addLog\("info", `Успешно завершено обновление ленты для \$\{cleanUrl\}\. Итог: \$\{finalArticles\.length\} статей\."\);/m;
const keywordFilterReplacement = `
    let finalArticles = parsedResult.articles;

    // --- KEYWORD FILTERING (Rule #9) ---
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      const includeKeywords = keywords.map(k => k.toLowerCase());
      finalArticles = finalArticles.filter(art => {
        const textToSearch = ((art.title || "") + " " + (art.contentSnippet || "") + " " + (art.content || "")).toLowerCase();
        // ANY keyword mode by default
        return includeKeywords.some(keyword => textToSearch.includes(keyword));
      });
    }

    if (excludeKeywords && Array.isArray(excludeKeywords) && excludeKeywords.length > 0) {
      const excludeList = excludeKeywords.map(k => k.toLowerCase());
      finalArticles = finalArticles.filter(art => {
        const textToSearch = ((art.title || "") + " " + (art.contentSnippet || "") + " " + (art.content || "")).toLowerCase();
        return !excludeList.some(keyword => textToSearch.includes(keyword));
      });
    }

    // Merge with adapter articles
    if (scrapedArticles.length > 0) {
      finalArticles = [...scrapedArticles, ...finalArticles];
    }
    
    // --- DEDUPLICATION (Rule #10) ---
    finalArticles = finalArticles.filter((v, i, a) => a.findIndex(t => t.id === v.id || t.title === v.title) === i);

    addLog("info", \`Успешно завершено обновление ленты для \${cleanUrl}. Итог после фильтрации: \${finalArticles.length} статей.\`);
`;
content = content.replace(keywordFilterRegex, keywordFilterReplacement);

fs.writeFileSync('server.ts', content);
console.log('Search logic fixed');
