const fs = require('fs');
let code = fs.readFileSync('src/components/ArticleReaderPane.tsx', 'utf-8');

const oldHtml = `          {article.content && article.content.includes('<') ? (
            <div
              className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-amber-400 prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (`;

const newHtml = `          {article.content && article.content.includes('<') ? (
            <>
              <div
                className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-amber-400 prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
              {article.extractionStatus === 'partial' && (
                <div className="mt-6 text-xs font-mono text-amber-400 bg-amber-500/10 p-3 rounded border border-amber-500/20">
                  ⚠ Статья была загружена лишь частично (ограничения сайта или структуры). Полный текст доступен в оригинальном источнике.
                </div>
              )}
            </>
          ) : (`;

code = code.replace(oldHtml, newHtml);
fs.writeFileSync('src/components/ArticleReaderPane.tsx', code);
console.log('patched');
