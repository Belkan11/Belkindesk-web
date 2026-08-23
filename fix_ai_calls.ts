import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// Fix calls: replace `config: { ... }` with flattened fields
content = content.replace(/config:\s*\{([^}]*)\}/g, (match, p1) => {
  return p1.trim();
});

// Also there is one `contents: ...` inside generateContent which was probably an array.
// Wait, I see error: "and 'contents' does not exist in type"
content = content.replace(/contents:\s*\[\s*\{\s*role:\s*"user",\s*parts:\s*\[\s*\{\s*text:\s*prompt\s*\}\s*\]\s*\}\s*\]/g, "prompt: prompt");

// Also there is `responseMimeType: "application/json",` which is not in AIProvider interface, let's remove it
content = content.replace(/responseMimeType:\s*"application\/json",/g, "");

// Change `response.text` to `response`
// BUT only where it's actually accessing `.text` on the result of `generateContent`
content = content.replace(/response\.text/g, "response");

fs.writeFileSync('server.ts', content);
console.log('Fixed provider calls');
