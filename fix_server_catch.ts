import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// For process-articles
content = content.replace(
  /const error = err as Error;\n\s*console\.error\("Gemini batch process articles error:", error\);/m,
  `const error = err as Error;\n    console.error("Gemini batch process articles error:", error);\n    if (error.message.includes('Лимит') || error.message.includes('429')) {\n      res.status(429).json({ error: error.message });\n      return;\n    }`
);

// For summarize-article
content = content.replace(
  /const error = err as Error;\n\s*console\.error\("Gemini summarize article error:", error\);/m,
  `const error = err as Error;\n    console.error("Gemini summarize article error:", error);\n    if (error.message.includes('Лимит') || error.message.includes('429') || error.message.includes('OpenAI')) {\n      res.status(429).json({ error: error.message });\n      return;\n    }`
);

fs.writeFileSync('server.ts', content);
console.log('Fixed server.ts catches');
