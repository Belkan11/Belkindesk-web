const fs = require('fs');
let code = fs.readFileSync('src/components/ArticleReaderPane.tsx', 'utf-8');

const snippetDiv = `<div className="text-sm text-slate-300 leading-relaxed max-w-none break-words whitespace-pre-wrap font-serif">
              <p>{article.contentSnippet || article.content}</p>
            </div>`;

const newSnippetDiv = `<div className="text-sm text-slate-300 leading-relaxed max-w-none break-words whitespace-pre-wrap font-serif">
              <p>{article.contentSnippet || article.content}</p>
            </div>
            
            {article.extractionStatus === 'partial' && (
              <div className="mt-4 text-xs font-mono text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                ⚠ Статья была загружена лишь частично (ограничения сайта или структуры).
              </div>
            )}
            
            {article.extractionStatus === 'failed' && (
              <div className="mt-4 text-xs font-mono text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                ⚠ Не удалось загрузить полный текст (Scraping Blocked). {article.extractionError ? \`Ошибка: \${article.extractionError}\` : ''}
              </div>
            )}`;

code = code.replace(snippetDiv, newSnippetDiv);
fs.writeFileSync('src/components/ArticleReaderPane.tsx', code);
console.log('ArticleReaderPane patched again');
