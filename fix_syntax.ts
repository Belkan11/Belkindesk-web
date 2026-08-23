import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const badCode = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: systemPrompt,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.ARRAY,
    });`;

const goodCode = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: systemPrompt,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              content: { type: Type.STRING },
              contentSnippet: { type: Type.STRING },
              link: { type: Type.STRING },
              pubDate: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              categories: { type: Type.ARRAY, items: { type: Type.STRING } },
              isFRP: { type: Type.BOOLEAN },
            },
            required: ["title", "description", "content", "link"]
          }
      }
    });`;

if (code.includes(badCode)) {
  console.log("Found badCode block exactly");
  code = code.replace(badCode, goodCode);
} else {
  // Try regex replace
  code = code.replace(/const provider = getAiProvider\(req\);\n\s*const responseText = await provider\.generateContent\(\{\n\s*prompt: systemPrompt,\n\s*systemInstruction: systemInstruction,\n\s*responseSchema: \{\n\s*type: Type\.ARRAY,\n\s*\}\);\n/s, goodCode + "\n");
}
fs.writeFileSync('server.ts', code);
