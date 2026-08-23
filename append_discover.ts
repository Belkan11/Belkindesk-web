import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `            required: ["title", "description", "content", "link"]
          }
      }
    });`;

const addition = `
    const parsedArticles = JSON.parse(responseText || "[]");
    res.json({ articles: parsedArticles });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini discover feeds error:", error);
    res.json({ articles: [] });
  }
});`;

code = code.replace(target, target + addition);
fs.writeFileSync('server.ts', code);
