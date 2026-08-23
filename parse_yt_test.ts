import fs from 'fs';

async function parseYt() {
  const res = await fetch('https://www.youtube.com/results?search_query=apple+repair', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  const html = await res.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    const items = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];
    const articles = [];
    for (const item of items) {
      if (item.videoRenderer) {
        articles.push({
          title: item.videoRenderer.title.runs[0].text,
          link: 'https://www.youtube.com/watch?v=' + item.videoRenderer.videoId,
          contentSnippet: item.videoRenderer.descriptionSnippet?.runs?.map(r=>r.text).join('') || '',
          pubDate: new Date().toISOString(),
          guid: item.videoRenderer.videoId,
          imageUrl: item.videoRenderer.thumbnail?.thumbnails?.[0]?.url || ''
        });
      }
    }
    console.log(articles.slice(0, 2));
  } else {
    console.log('no match');
  }
}
parseYt();
