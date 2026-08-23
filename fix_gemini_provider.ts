import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const regex = /systemInstruction,\s*responseMimeType: responseSchema \? "application\/json" : "text\/plain",\s*responseSchema/m;
content = content.replace(regex, `config: { systemInstruction, responseMimeType: responseSchema ? "application/json" : "text/plain", responseSchema }`);

fs.writeFileSync('server.ts', content);
console.log('Fixed GeminiProvider');
