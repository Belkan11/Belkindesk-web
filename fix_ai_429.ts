import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const openAiRegex = /if \(!res\.ok\) throw new Error\(`OpenAI API Error: \$\{res\.statusText\}`\);/m;
content = content.replace(openAiRegex, `if (res.status === 429) throw new Error("Лимит AI-запросов исчерпан. Проверьте квоту или выберите другой AI provider.");\n    if (!res.ok) throw new Error(\`OpenAI API Error: \${res.statusText}\`);`);

const geminiCatchRegex = /const response = await this\.client\.models\.generateContent\(\{[\s\S]*?\}\);/m;
const geminiReplacement = `
    let response;
    try {
      response = await this.client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: responseSchema ? "application/json" : "text/plain",
          responseSchema
        }
      });
    } catch (err: any) {
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        throw new Error("Лимит AI-запросов исчерпан. Проверьте квоту или выберите другой AI provider.");
      }
      throw err;
    }
`;
content = content.replace(geminiCatchRegex, geminiReplacement);

fs.writeFileSync('server.ts', content);
console.log('Fixed 429 handling');
