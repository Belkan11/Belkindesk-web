import fs from 'fs';

let content = fs.readFileSync('src/utils/feedApi.ts', 'utf-8');

// In aiProcessArticles
const processRegex = /if \(!res\.ok\) \{\s*return articles;\s*\}/m;
const processReplacement = `if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || (data.error && data.error.includes('Лимит'))) {
        alert(data.error || "Лимит AI-запросов исчерпан. Проверьте квоту или выберите другой AI provider.");
      }
      return articles;
    }`;
content = content.replace(processRegex, processReplacement);

// In aiSummarizeArticleDeep
const summarizeRegex = /if \(!res\.ok\) \{\s*throw new Error\(\`HTTP \$\{res\.status\}\`\);\s*\}/m;
const summarizeReplacement = `if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || \`HTTP \${res.status}\`);
    }`;
content = content.replace(summarizeRegex, summarizeReplacement);

fs.writeFileSync('src/utils/feedApi.ts', content);
console.log('Fixed feedApi error bubbling');
