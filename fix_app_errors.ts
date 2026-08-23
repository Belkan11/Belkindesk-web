import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const feedResult = await fetchFeedArticles\(fetchConfig as any, feed\.maxArticles \|\| 50\);\s*if \(\!feedResult\.error && feedResult\.articles\.length > 0\) \{\s*rawArticles\.push\(\.\.\.feedResult\.articles\);\s*\}/m;

const replacement = `const feedResult = await fetchFeedArticles(fetchConfig as any, feed.maxArticles || 50);
            if (feedResult.error) {
              console.warn(\`Не удалось получить данные из источника \${source.name || source.url}: \${feedResult.error}\`);
            } else if (feedResult.articles && feedResult.articles.length > 0) {
              rawArticles.push(...feedResult.articles);
            }`;

content = content.replace(regex, replacement);

const catchRegex = /\} catch \(feedErr: any\) \{\s*console\.warn\(\`Source \$\{source\.name\} in feed \$\{feed\.name\} scraping failed:\`, feedErr\);\s*\}/m;
const catchReplacement = `} catch (feedErr: any) {
            console.warn(\`Не удалось получить данные из источника \${source.name || source.url}: \${feedErr.message}\`);
          }`;

content = content.replace(catchRegex, catchReplacement);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed source error handling');
