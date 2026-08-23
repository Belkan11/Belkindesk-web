import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const badCode = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Список статей для обработки и форматирования:\\n\\n\${formattedList}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
    });

    res.json({ articles: merged });`;

const goodCode = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Список статей для обработки и форматирования:\\n\\n\${formattedList}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
          properties: {
            articles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  titleRu: { type: Type.STRING },
                  summaryOneLine: { type: Type.STRING },
                  summaryThreeLines: { type: Type.STRING },
                  detailedContent: { type: Type.STRING },
                  keyTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sentiment: { type: Type.STRING },
                  symptom: { type: Type.STRING },
                  diagnosis: { type: Type.STRING },
                  solution: { type: Type.STRING }
                }
              }
            }
          }
      }
    });

    const parsedData = JSON.parse(responseText || "{}");
    const generatedArticles = parsedData.articles || [];
    const merged = itemsToProcess.map((item: any) => {
      const gen = generatedArticles.find((g: any) => g.id === item.id) || {};
      return { ...item, ...gen };
    });

    res.json({ articles: merged });`;

if (code.includes(badCode)) {
  console.log("Found badCode 2");
  code = code.replace(badCode, goodCode);
} else {
  console.log("Could not find exact match for badCode 2, trying regex...");
  code = code.replace(/const provider = getAiProvider\(req\);\s*const responseText = await provider\.generateContent\(\{\s*prompt: `Список статей для обработки и форматирования:\\n\\n\$\{formattedList\}`,\s*systemInstruction: systemInstruction,\s*responseSchema: \{\s*type: Type\.OBJECT,\s*\}\);\s*res\.json\(\{ articles: merged \}\);/g, goodCode);
}
fs.writeFileSync('server.ts', code);
