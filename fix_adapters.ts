import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const replacement = `
  youtube: {
    type: 'youtube',
    fetch: async ({ url, searchQuery, limit = 10 }: any) => {
      try {
        const targetUrl = url || \`https://www.youtube.com/results?search_query=\${encodeURIComponent(searchQuery)}\`;
        const res = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();
        const match = html.match(/var ytInitialData = (\\{.*?\\});<\\/script>/);
        if (match) {
          const data = JSON.parse(match[1]);
          const items = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];
          const articles = [];
          for (const item of items) {
            if (item.videoRenderer && articles.length < limit) {
              articles.push({
                title: item.videoRenderer.title.runs[0].text,
                link: 'https://www.youtube.com/watch?v=' + item.videoRenderer.videoId,
                contentSnippet: item.videoRenderer.descriptionSnippet?.runs?.map((r: any)=>r.text).join('') || '',
                pubDate: new Date().toISOString(),
                guid: item.videoRenderer.videoId,
                imageUrl: item.videoRenderer.thumbnail?.thumbnails?.[0]?.url || ''
              });
            }
          }
          return articles;
        }
      } catch (e) {
        console.error("Youtube parsing error:", e);
      }
      return [];
    }
  },
`;

content = content.replace(/youtube:\s*\{\s*type:\s*'youtube',\s*fetch:\s*async\s*\(\)\s*=>\s*\[\]\s*\},/m, replacement);

fs.writeFileSync('server.ts', content);
console.log('Fixed youtube adapter');
