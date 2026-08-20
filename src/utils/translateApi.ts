export async function translateText(text: string, targetLang = 'ru'): Promise<string> {
  if (!text) return '';
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    const data = await res.json();
    return data.translatedText || text;
  } catch (err) {
    console.error('Translation failed:', err);
    return text;
  }
}

export async function translateBatch(texts: string[], targetLang = 'ru'): Promise<string[]> {
  if (!texts || texts.length === 0) return [];
  try {
    const res = await fetch('/api/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, targetLang }),
    });
    const data = await res.json();
    return data.translations || texts;
  } catch (err) {
    console.error('Batch translation failed:', err);
    return texts;
  }
}
