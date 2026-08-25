const fs = require('fs');
let code = fs.readFileSync('src/components/ArticleReaderPane.tsx', 'utf-8');

const oldSnippet = `          ) : (
            <div className="space-y-4">
              <p>{article.contentSnippet || article.content}</p>
              <p className="text-slate-400 italic">
                Полный текст статьи и интерактивные медиа-материалы доступны на официальном сайте источника.
              </p>
            </div>
          )}`;

const newSnippet = `          ) : (
            <div className="space-y-4">
              <p>{article.contentSnippet || article.content}</p>
              
              {article.extractionStatus === 'partial' && (
                <div className="text-xs font-mono text-amber-400 bg-amber-500/10 p-3 rounded border border-amber-500/20">
                  ⚠ Статья была загружена лишь частично (ограничения сайта или структуры).
                </div>
              )}
              
              {article.extractionStatus === 'failed' && (
                <div className="text-xs font-mono text-rose-400 bg-rose-500/10 p-3 rounded border border-rose-500/20">
                  ⚠ Не удалось загрузить полный текст (Scraping Blocked). {article.extractionError ? \`Ошибка: \${article.extractionError}\` : ''}
                </div>
              )}
              
              <p className="text-slate-400 italic">
                Полный текст статьи и интерактивные медиа-материалы доступны на официальном сайте источника.
              </p>
            </div>
          )}`;

code = code.replace(oldSnippet, newSnippet);
fs.writeFileSync('src/components/ArticleReaderPane.tsx', code);
console.log('patched');
