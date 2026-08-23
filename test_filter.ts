import fs from 'fs';

async function testFilter() {
  console.log('Testing Include/Exclude Keywords...');
  
  // Get all first
  const res = await fetch('http://localhost:3000/api/rss/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://lenta.ru/rss/news',
      feedId: 'test-feed',
      limit: 10
    })
  });
  const data = await res.json();
  const title1 = data.articles[0].title;
  console.log('First article title:', title1);
  const firstWord = title1.split(' ')[0];
  console.log('Testing include:', firstWord);
  
  const res2 = await fetch('http://localhost:3000/api/rss/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://lenta.ru/rss/news',
      feedId: 'test-feed',
      limit: 10,
      keywords: [firstWord],
      excludeKeywords: ['somethingthatdoesnotexist']
    })
  });
  const data2 = await res2.json();
  console.log('Included articles:', data2.articles.length, 'Original count:', data.articles.length);
  
  const res3 = await fetch('http://localhost:3000/api/rss/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://lenta.ru/rss/news',
      feedId: 'test-feed',
      limit: 10,
      excludeKeywords: [firstWord]
    })
  });
  const data3 = await res3.json();
  console.log('Excluded articles:', data3.articles.length);
}
testFilter();
