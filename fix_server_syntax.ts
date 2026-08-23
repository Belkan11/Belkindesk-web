import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

// Fix contents -> prompt
content = content.replace(/contents: `Заголовок/g, "prompt: `Заголовок");

// Fix rogue `},` closing config
content = content.replace(/required: \["content"\],\s*\},/m, `required: ["content"],`);
content = content.replace(/required: \["content"\],\s*\},\s*\},\s*\}\);/m, `required: ["content"]\n    }\n  });`);

fs.writeFileSync('server.ts', content);
