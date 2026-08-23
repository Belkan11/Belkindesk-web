import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const regex = /if \(scrapedArticles\.length > 0 && !url\) \{/g;
const replacement = `if (scrapedArticles.length > 0) {`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content);
console.log('Fixed adapter return logic');
