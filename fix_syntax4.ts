import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const summarizeBad = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Заголовок материала: \${title || "Без заголовка"}\\n\\nТекст/сниппет публикации:\\n\${content.slice(0, 8000)}\\n\\nРежим: \${mode}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
    });`;

const summarizeGood = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Заголовок материала: \${title || "Без заголовка"}\\n\\nТекст/сниппет публикации:\\n\${content.slice(0, 8000)}\\n\\nРежим: \${mode}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            summaryOneLine: { type: Type.STRING },
            estimatedReadMinutes: { type: Type.INTEGER },
            sentiment: { type: Type.STRING },
          },
          required: ["content"],
      }
    });

    const data = JSON.parse(responseText || "{}");
    const resultText = data.content || data.main || content;
    res.json({
      summary: resultText,
      content: resultText,
      main: resultText,
      summaryOneLine: data.summaryOneLine || '',
      estimatedReadMinutes: data.estimatedReadMinutes || 3,
      sentiment: data.sentiment || "analytical",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini summarize error:", error);
    res.json({
      summary: \`Публикация «\${title}» содержит актуальные практические данные и рекомендации для специалистов.\`,
      content: \`Публикация «\${title}» содержит актуальные практические данные и рекомендации для специалистов.\`,
      main: \`Публикация «\${title}» содержит актуальные практические данные и рекомендации для специалистов.\`,
      estimatedReadMinutes: 2,
      sentiment: "analytical",
    });
  }
});`;

const digestBad = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Категория: \${category || "Все подписки"}\\n\\nСвежие публикации:\\n\${articlesList}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
    });`;

const digestGood = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Категория: \${category || "Все подписки"}\\n\\nСвежие публикации:\\n\${articlesList}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
          properties: {
            digestHtml: { type: Type.STRING }
          }
      }
    });

    const data = JSON.parse(responseText || "{}");
    res.json({ digestHtml: data.digestHtml || responseText });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini digest error:", error);
    res.status(500).json({ error: "Ошибка генерации дайджеста" });
  }
});`;

if (code.includes(summarizeBad)) {
  code = code.replace(summarizeBad, summarizeGood);
}
if (code.includes(digestBad)) {
  code = code.replace(digestBad, digestGood);
}

fs.writeFileSync('server.ts', code);
