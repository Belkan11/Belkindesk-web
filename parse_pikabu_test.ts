import fs from 'fs';

async function parsePikabu() {
  const res = await fetch('https://pikabu.ru/tag/%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82/hot', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  const html = await res.text();
  // We can just regex the articles
  // <article ... data-story-id="1000"> ... <h2 class="story__title"><a href="link">Title</a></h2>
  const articles = [];
  const regex = /<article.*?data-story-id="(\d+)".*?<a class="story__title-link"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>.*?<\/article>/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    articles.push({
      title: match[3].replace(/<[^>]+>/g, ''),
      link: match[2],
      guid: match[1],
      contentSnippet: 'Pikabu post',
      pubDate: new Date().toISOString()
    });
  }
  console.log(articles.slice(0, 2));
}
parsePikabu();
