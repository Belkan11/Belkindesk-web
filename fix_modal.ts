import fs from 'fs';

let content = fs.readFileSync('src/components/ControlCenterModal.tsx', 'utf-8');

// Fix useEffect that populates the form fields
const useEffectRegex = /if \(localFeeds\.length > 0 && selectedFeedIndex >= 0 && selectedFeedIndex < localFeeds\.length\) \{\s*const f = localFeeds\[selectedFeedIndex\];\s*setFeedType\(([\s\S]*?)\);\s*setFeedName\(([\s\S]*?)\);\s*setFeedSearchQuery\(([\s\S]*?)\);\s*setFeedHashtagsText\(([\s\S]*?)\);\s*\}/m;
const useEffectReplacement = `if (localFeeds.length > 0 && selectedFeedIndex >= 0 && selectedFeedIndex < localFeeds.length) {
      const f = localFeeds[selectedFeedIndex] as any;
      const primarySource = (f.sources && f.sources[0]) || f;
      setFeedType(primarySource.type || (primarySource.url?.includes('youtube.com') ? 'youtube' : primarySource.url?.includes('pikabu.ru') ? 'pikabu' : primarySource.url?.includes('4pda') ? '4pda' : primarySource.url?.includes('reddit') ? 'reddit' : 'rss'));
      setFeedName(f.name || f.title || '');
      setFeedSearchQuery(primarySource.searchQuery || primarySource.query || '');
      setFeedHashtagsText(primarySource.hashtags?.join('\\n') || primarySource.keywords?.join('\\n') || '');
    }`;
content = content.replace(useEffectRegex, useEffectReplacement);

// Fix handleApplyFeed
const handleApplyRegex = /updated\[selectedFeedIndex\] = \{\s*\.\.\.updated\[selectedFeedIndex\],\s*name: feedName\.trim\(\),[\s\S]*?category: updated\[selectedFeedIndex\]\.category \|\| 'Инженерия',\s*\};\s*setLocalFeeds\(updated\);/m;
const handleApplyReplacement = `
      const currentFeed = updated[selectedFeedIndex] as any;
      updated[selectedFeedIndex] = {
        ...currentFeed,
        name: feedName.trim(),
        title: feedName.trim(), // backward compat
        category: currentFeed.category || 'Инженерия',
        sources: [
          {
            id: (currentFeed.sources && currentFeed.sources[0]?.id) || \`src-\${Date.now()}\`,
            name: feedName.trim(),
            type: feedType as any,
            url: generatedUrl,
            query: feedSearchQuery.trim(),
            searchQuery: feedSearchQuery.trim(), // backward compat
            keywords: tags,
            hashtags: tags, // backward compat
            enabled: true
          }
        ]
      };
      setLocalFeeds(updated);
`;
content = content.replace(handleApplyRegex, handleApplyReplacement);

fs.writeFileSync('src/components/ControlCenterModal.tsx', content);
console.log('Fixed ControlCenterModal');
