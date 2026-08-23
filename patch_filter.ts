import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const filterLogic = `
function applyKeywordsFilter(articles: any[], keywords?: string[], excludeKeywords?: string[]) {
  return articles.filter(article => {
    const textContext = \`\${article.title || ''} \${article.contentSnippet || ''}\`.toLowerCase();
    
    if (excludeKeywords && excludeKeywords.length > 0) {
      const hasExclude = excludeKeywords.some(kw => textContext.includes(kw.toLowerCase()));
      if (hasExclude) return false;
    }
    
    if (keywords && keywords.length > 0) {
      const hasInclude = keywords.some(kw => textContext.includes(kw.toLowerCase()));
      if (!hasInclude) return false;
    }
    
    return true;
  });
}
`;

if (!content.includes('function applyKeywordsFilter')) {
  // Insert before app.post("/api/rss/fetch"
  content = content.replace('app.post("/api/rss/fetch", async (req, res) => {', filterLogic + '\napp.post("/api/rss/fetch", async (req, res) => {');
}

// First return block in api/rss/fetch
const returnBlock1 = `if (scrapedArticles.length > 0) {
    res.json({
      title: title || type || "Поиск",
      description: \`Поисковая выдача для \${searchQuery || type}\`,
      link: "https://google.com",
      itemCount: scrapedArticles.length,
      articles: scrapedArticles,
    });`;

const replacement1 = `if (scrapedArticles.length > 0) {
    const filteredScraped = applyKeywordsFilter(scrapedArticles, keywords, excludeKeywords).slice(0, limit);
    res.json({
      title: title || type || "Поиск",
      description: \`Поисковая выдача для \${searchQuery || type}\`,
      link: "https://google.com",
      itemCount: filteredScraped.length,
      articles: filteredScraped,
    });`;

content = content.replace(returnBlock1, replacement1);

// Second return block in api/rss/fetch
const returnBlock2 = `const finalArticles = parsedResult.articles;
    addLog("info", \`Успешно завершено обновление ленты для \${cleanUrl}. Итог: \${finalArticles.length} статей.\`);

    res.json({
      title: parsedResult.feedTitle || title || "Источник новостей",
      description: parsedResult.feedDescription || "Информационный поток",
      link: parsedResult.feedLink || cleanUrl,
      itemCount: finalArticles.length,
      articles: finalArticles.slice(0, limit),
    });`;

const replacement2 = `const finalArticles = applyKeywordsFilter(parsedResult.articles, keywords, excludeKeywords);
    addLog("info", \`Успешно завершено обновление ленты для \${cleanUrl}. Итог: \${finalArticles.length} статей после фильтрации.\`);

    res.json({
      title: parsedResult.feedTitle || title || "Источник новостей",
      description: parsedResult.feedDescription || "Информационный поток",
      link: parsedResult.feedLink || cleanUrl,
      itemCount: finalArticles.length,
      articles: finalArticles.slice(0, limit),
    });`;

content = content.replace(returnBlock2, replacement2);

fs.writeFileSync('server.ts', content);
console.log('Filters applied');
