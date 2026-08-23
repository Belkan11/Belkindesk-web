import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

// The discover-feeds route
code = code.replace(/const client = getAiClient\(req\);\n[\s\S]*?const response = await client\.models\.generateContent\(\{[\s\S]*?contents: ([\s\S]*?),\n[\s\S]*?config: \{[\s\S]*?systemInstruction:([\s\S]*?),\n[\s\S]*?responseSchema: ([\s\S]*?),[\s\S]*?\},[\s\S]*?\}\);/g, 
`const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: $1,
      systemInstruction: $2,
      responseSchema: $3,
    });
`);
code = code.replace(/const text = response\.text \|\| "\{\}";/g, `const text = responseText;`);

// The process-articles route uses getAiClient(req)
code = code.replace(/const aiClient = getAiClient\(req\);\n[\s\S]*?const response = await aiClient\.models\.generateContent\(\{[\s\S]*?contents: ([\s\S]*?),\n[\s\S]*?config: \{[\s\S]*?systemInstruction: ([\s\S]*?),\n[\s\S]*?responseSchema: ([\s\S]*?)\n[\s\S]*?\}\n[\s\S]*?\}\);/g,
`const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: $1,
      systemInstruction: $2,
      responseSchema: $3,
    });
`);

// The summarize-article route
code = code.replace(/const aiClient = getAiClient\(req\);\n[\s\S]*?const response = await aiClient\.models\.generateContent\(\{[\s\S]*?contents: ([\s\S]*?),\n[\s\S]*?config: \{[\s\S]*?systemInstruction:([\s\S]*?),\n[\s\S]*?responseSchema: ([\s\S]*?),[\s\S]*?\}\n[\s\S]*?\}\);/g,
`const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: $1,
      systemInstruction: $2,
      responseSchema: $3,
    });
`);

// The summarize route (uses global 'ai')
code = code.replace(/const response = await ai\.models\.generateContent\(\{[\s\S]*?contents: ([\s\S]*?),\n[\s\S]*?config: \{[\s\S]*?systemInstruction,\n[\s\S]*?responseSchema: ([\s\S]*?),[\s\S]*?\}\n[\s\S]*?\}\);/g,
`const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: $1,
      systemInstruction: systemInstruction,
      responseSchema: $2,
    });
`);

// The digest route uses ai.models.generateContent
code = code.replace(/const response = await ai\.models\.generateContent\(\{[\s\S]*?contents: ([\s\S]*?),\n[\s\S]*?config: \{[\s\S]*?systemInstruction:([\s\S]*?),\n[\s\S]*?responseSchema: ([\s\S]*?),[\s\S]*?\}\n[\s\S]*?\}\);/g,
`const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: $1,
      systemInstruction: $2,
      responseSchema: $3,
    });
`);

// The ask-feeds route uses getAiClient
code = code.replace(/const aiClient = getAiClient\(req\);\n[\s\S]*?const response = await aiClient\.models\.generateContent\(\{[\s\S]*?contents: ([\s\S]*?),\n[\s\S]*?config: \{[\s\S]*?systemInstruction: ([\s\S]*?)\n[\s\S]*?\}\n[\s\S]*?\}\);/g,
`const provider = getAiProvider(req);
    const responseText = await provider.generateContent({
      prompt: $1,
      systemInstruction: $2,
    });
`);


fs.writeFileSync('server.ts', code);
