const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// 1. Update scrapeWebArticle signature and catch block
code = code.replace(
  'async function scrapeWebArticle(url: string): Promise<{ text: string; images: string[]; title?: string }> {',
  'async function scrapeWebArticle(url: string): Promise<{ text: string; images: string[]; title?: string; extractionStatus?: \'full\' | \'partial\' | \'failed\'; extractionError?: string }> {'
);

code = code.replace(
  '    if (!response.ok) return { text: \'\', images: [] };',
  '    if (!response.ok) return { text: \'\', images: [], extractionStatus: \'failed\', extractionError: `HTTP status ${response.status}` };'
);

code = code.replace(
  '    return { text: mainContent.slice(0, 10000), images, title };',
  '    return { text: mainContent.slice(0, 10000), images, title, extractionStatus: mainContent.length > 200 ? \'full\' : \'partial\' };'
);

code = code.replace(
  '    return { text: \'\', images: [] };',
  '    return { text: \'\', images: [], extractionStatus: \'failed\', extractionError: e instanceof Error ? e.message : String(e) };'
);

code = code.replace(
  '  } catch {',
  '  } catch (e) {'
);


// 2. Update the caller inside /api/rss
// Old code:
// const scraped = await scrapeWebArticle(article.link);
// if (scraped.text && scraped.text.length > currentText.length) {
//   article.content = scraped.text;
//   if (currentText.length < 50) {
//      article.contentSnippet = scraped.text.slice(0, 300) + '...';
//   }
// }
// if (scraped.images && scraped.images.length > 0) {
//   article.imageUrls = scraped.images;
//   if (!article.imageUrl) article.imageUrl = scraped.images[0];
// }

const oldCaller = `            const scraped = await scrapeWebArticle(article.link);
            if (scraped.text && scraped.text.length > currentText.length) {
              article.content = scraped.text;
              if (currentText.length < 50) {
                 article.contentSnippet = scraped.text.slice(0, 300) + '...';
              }
            }
            if (scraped.images && scraped.images.length > 0) {
              article.imageUrls = scraped.images;
              if (!article.imageUrl) article.imageUrl = scraped.images[0];
            }`;

const newCaller = `            const scraped = await scrapeWebArticle(article.link);
            if (scraped.text && scraped.text.length > currentText.length) {
              article.content = scraped.text;
              if (currentText.length < 50) {
                 article.contentSnippet = scraped.text.slice(0, 300) + '...';
              }
            }
            if (scraped.images && scraped.images.length > 0) {
              article.imageUrls = scraped.images;
              if (!article.imageUrl) article.imageUrl = scraped.images[0];
            }
            article.extractionStatus = scraped.extractionStatus;
            if (scraped.extractionError) {
              article.extractionError = scraped.extractionError;
            }`;

code = code.replace(oldCaller, newCaller);

// 3. Update the caller inside /api/ai/process-articles (if applicable, but there it just extracts text and images to prompt)
// Let's check where else scrapeWebArticle is called
const oldProcessCaller = `      const scraped = await scrapeWebArticle(article.link);
      if (scraped.text && scraped.text.length > articleText.length) {
        articleText = scraped.text;
      }
      if (scraped.images && scraped.images.length > 0) {
        scraped.images.forEach(img => {
          if (!allImages.includes(img)) allImages.push(img);
        });
      }`;

const newProcessCaller = `      const scraped = await scrapeWebArticle(article.link);
      if (scraped.text && scraped.text.length > articleText.length) {
        articleText = scraped.text;
      }
      if (scraped.images && scraped.images.length > 0) {
        scraped.images.forEach(img => {
          if (!allImages.includes(img)) allImages.push(img);
        });
      }
      // Log extraction status
      console.log(\`Article \${article.id} extraction: \${scraped.extractionStatus}\`, scraped.extractionError ? scraped.extractionError : '');
`;

code = code.replace(oldProcessCaller, newProcessCaller);

fs.writeFileSync('server.ts', code);
console.log('server patched');
