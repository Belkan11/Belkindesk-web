import fs from 'fs';

async function testRss() {
  console.log('Testing normal RSS feed (Lenta.ru)...');
  const res = await fetch('http://localhost:3000/api/rss/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://lenta.ru/rss/news',
      feedId: 'test-feed',
      feedTitle: 'Lenta',
      limit: 3
    })
  });
  
  if (!res.ok) {
    console.error('Failed', res.status);
    console.log(await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("Received " + data.articles?.length + " articles");
  if (data.articles?.length > 0) {
    console.log('Sample article URL: ' + data.articles[0].link);
  }
}

testRss();
