import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const badCode = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Заголовок статьи: \${article.title}\\nИсточник: \${article.feedTitle || 'Источник'}\\nСсылка: \${article.link}\\n\\nТекст публикации:\\n\${articleText.slice(0, 10000)}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
    });`;

const goodCode = `    const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: \`Заголовок статьи: \${article.title}\\nИсточник: \${article.feedTitle || 'Источник'}\\nСсылка: \${article.link}\\n\\nТекст публикации:\\n\${articleText.slice(0, 10000)}\`,
      systemInstruction: systemInstruction,
      responseSchema: {
          type: Type.OBJECT,
          properties: {
            titleRu: { type: Type.STRING },
            content: { type: Type.STRING },
            summaryOneLine: { type: Type.STRING },
            keyTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedReadMinutes: { type: Type.INTEGER },
            symptom: { type: Type.STRING },
            diagnosis: { type: Type.STRING },
            solution: { type: Type.STRING }
          }
      }
    });

    const parsedData = JSON.parse(responseText || "{}");
    res.json({
      summary: parsedData.content || parsedData.main || article.contentSnippet || "",
      content: parsedData.content || parsedData.main || article.contentSnippet || "",
      main: parsedData.content || parsedData.main || article.contentSnippet || "",
      titleRu: parsedData.titleRu || article.title,
      summaryOneLine: parsedData.summaryOneLine || '',
      keyTerms: parsedData.keyTerms || [],
      estimatedReadMinutes: parsedData.estimatedReadMinutes || 3,
      symptom: parsedData.symptom || "",
      diagnosis: parsedData.diagnosis || "",
      solution: parsedData.solution || "",
      images: allImages,
      link: article.link,
      feedTitle: article.feedTitle,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini summarize article error:", error);
    res.json({
      summary: article.contentSnippet || article.content || "",
      content: article.contentSnippet || article.content || "",
      main: article.contentSnippet || article.content || "",
      titleRu: article.title,
      summaryOneLine: "",
      keyTerms: [],
      estimatedReadMinutes: 2,
      images: typeof allImages !== 'undefined' ? allImages : [],
      link: article.link,
      feedTitle: article.feedTitle,
    });
  }
});`;

if (code.includes(badCode)) {
  console.log("Found badCode 3");
  code = code.replace(badCode, goodCode);
} else {
  console.log("Could not find exact match for badCode 3, doing regex...");
  code = code.replace(/const provider = getAiProvider\(req\);\s*const responseText = await provider\.generateContent\(\{\s*prompt: `Заголовок статьи: \$\{article\.title\}\\nИсточник: \$\{article\.feedTitle \|\| 'Источник'\}\\nСсылка: \$\{article\.link\}\\n\\nТекст публикации:\\n\$\{articleText\.slice\(0, 10000\)\}`,\s*systemInstruction: systemInstruction,\s*responseSchema: \{\s*type: Type\.OBJECT,\s*\}\);\s*(?=\/\/ -)/g, goodCode + "\n\n");
}
fs.writeFileSync('server.ts', code);
