const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const oldEnrich = `        const currentText = (article.content || article.contentSnippet || '').trim();
        if (currentText.length < 1500 && article.link && /^https?:\\/\\//i.test(article.link)) {
          if (!article.link.includes('youtube.com/') && !article.link.includes('youtu.be/')) {
            const scraped = await scrapeWebArticle(article.link);
            if (scraped.text && scraped.text.length > currentText.length) {
              article.content = scraped.text;
              if (currentText.length < 50) {
                 article.contentSnippet = scraped.text.slice(0, 300) + '...';
              }
            }
            if (scraped.images && scraped.images.length > 0) {
              article.imageUrls = [...(article.imageUrls || []), ...scraped.images];
              if (!article.imageUrl) article.imageUrl = scraped.images[0];
            }
          }
        }`;

const newEnrich = `        const currentText = (article.content || article.contentSnippet || '').trim();
        
        // Some RSS feeds put a large snippet or even entire layout fragments in description, 
        // but rarely the actual full article text. We raise the threshold to 5000 to catch these.
        // Also if we suspect it's an RSS snippet (contains '...', 'read more', etc) we can scrape.
        const looksLikeSnippet = currentText.includes('...') || currentText.includes('[...]') || currentText.includes('Читать далее');
        const shouldScrape = (currentText.length < 5000 || looksLikeSnippet) && article.link && /^https?:\\/\\//i.test(article.link);
        
        if (shouldScrape) {
          if (!article.link.includes('youtube.com/') && !article.link.includes('youtu.be/')) {
            const scraped = await scrapeWebArticle(article.link);
            if (scraped.text && scraped.text.length > currentText.length) {
              article.content = scraped.text;
              if (currentText.length < 50) {
                 article.contentSnippet = scraped.text.slice(0, 300) + '...';
              }
            }
            if (scraped.images && scraped.images.length > 0) {
              article.imageUrls = [...(article.imageUrls || []), ...scraped.images];
              if (!article.imageUrl) article.imageUrl = scraped.images[0];
            }
            
            // Map extraction statuses from previous fix
            article.extractionStatus = scraped.extractionStatus;
            if (scraped.extractionError) {
              article.extractionError = scraped.extractionError;
            }
          }
        }`;

code = code.replace(oldEnrich, newEnrich);

const oldAiProcess = `    let articleText = (article.content || article.contentSnippet || '').trim();
    let allImages = Array.isArray(article.imageUrls) ? [...article.imageUrls] : (article.imageUrl ? [article.imageUrl] : []);

    // If text is short (< 300 chars) and link is valid web page, scrape full web page
    if (articleText.length < 300 && article.link && /^https?:\\/\\//i.test(article.link)) {
      const scraped = await scrapeWebArticle(article.link);`;

const newAiProcess = `    let articleText = (article.content || article.contentSnippet || '').trim();
    let allImages = Array.isArray(article.imageUrls) ? [...article.imageUrls] : (article.imageUrl ? [article.imageUrl] : []);

    // If text is short (< 5000 chars) and link is valid web page, scrape full web page
    const looksLikeSnippet = articleText.includes('...') || articleText.includes('[...]') || articleText.includes('Читать далее');
    if ((articleText.length < 5000 || looksLikeSnippet) && article.link && /^https?:\\/\\//i.test(article.link)) {
      const scraped = await scrapeWebArticle(article.link);`;
      
code = code.replace(oldAiProcess, newAiProcess);

fs.writeFileSync('server.ts', code);
console.log('patched');
