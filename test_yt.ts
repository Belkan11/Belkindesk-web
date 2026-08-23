import fs from 'fs';

async function testYt() {
  console.log('Testing Youtube...');
  const res = await fetch('http://localhost:3000/api/rss/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://www.youtube.com/results?search_query=apple+repair',
      feedId: 'test-feed-yt',
      feedTitle: 'YT Apple',
      limit: 2, type: 'youtube'
    })
  });
  
  const data = await res.json();
  console.log("Received " + data.articles?.length + " articles");
  if (data.articles?.length > 0) {
    console.log('Sample article URL: ' + data.articles[0].link);
  }
}

testYt();
