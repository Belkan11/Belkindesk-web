import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const regex = /if \(provider === 'openai'\) \{/m;
content = content.replace(regex, `if (provider === 'openai' || provider === 'openrouter' || provider === 'custom') {`);

fs.writeFileSync('server.ts', content);
console.log('Fixed provider switch');
