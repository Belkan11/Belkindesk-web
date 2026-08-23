import fs from 'fs';

let content = fs.readFileSync('src/components/ControlCenterModal.tsx', 'utf-8');

// I need to split the current giant handleSaveAll into handleApplyFeed and handleSaveAll.
// Currently it starts at line 192: const handleSaveAll = () => { try { let feedsToSave = localFeeds; if (...)

// Let's replace the whole section from line 192 to 260
const startStr = "const handleSaveAll = () => {";
const endStr = "const handleAddNewFeed = () => {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newMiddle = `
  const handleApplyFeed = () => {
    if (selectedFeedIndex < 0 || selectedFeedIndex >= localFeeds.length || !feedName.trim()) return localFeeds;
    
    let updated = [...localFeeds];
    const tags = feedHashtagsText.split('\\n').map(t => t.trim()).filter(Boolean);
    let generatedUrl = '';
    
    if (feedType === 'youtube') {
      generatedUrl = \`https://www.youtube.com/results?search_query=\${encodeURIComponent(feedSearchQuery.trim())}\`;
    } else if (feedType === 'pikabu') {
      generatedUrl = \`https://pikabu.ru/tag/\${encodeURIComponent(feedSearchQuery.trim() || 'Ремонт техники')}/hot\`;
    } else if (feedType === '4pda') {
      generatedUrl = 'https://4pda.to/feed/';
    } else if (feedType === 'reddit') {
      generatedUrl = 'https://www.reddit.com/r/mobilerepair/.rss';
    } else {
      generatedUrl = feedSearchQuery.trim().startsWith('http') ? feedSearchQuery.trim() : \`https://\${feedSearchQuery.trim()}\`;
    }
    
    const currentFeed = updated[selectedFeedIndex] as any;
    updated[selectedFeedIndex] = {
      ...currentFeed,
      name: feedName.trim(),
      title: feedName.trim(),
      category: currentFeed.category || 'Инженерия',
      sources: [
        {
          id: (currentFeed.sources && currentFeed.sources[0]?.id) || \`src-\${Date.now()}\`,
          name: feedName.trim(),
          type: feedType as any,
          url: generatedUrl,
          query: feedSearchQuery.trim(),
          searchQuery: feedSearchQuery.trim(),
          keywords: tags,
          hashtags: tags,
          enabled: true
        }
      ]
    };
    
    setLocalFeeds(updated);
    onPlaySound?.('click');
    return updated;
  };

  const handleSaveAll = () => {
    try {
      let feedsToSave = localFeeds;
      // If the user has an active edit but hasn't clicked apply, auto-apply it:
      if (selectedFeedIndex >= 0 && selectedFeedIndex < localFeeds.length && feedName.trim()) {
        feedsToSave = handleApplyFeed();
      }
      
      onUpdateFeeds(feedsToSave.length > 0 ? feedsToSave : []);
      onUpdateTimers(localTimers);
      if (accessibility && onUpdateAccessibility) {
        onUpdateAccessibility({
          ...accessibility,
          scalePercent: localScale,
          visualAcuity: localAcuity
        });
      }
      
      onChangeCustomAiPrompt?.(localPrompt);
      onChangeAppStyle?.(localStyle);
      onChangeCustomWallpaper?.(localWallpaper);
      onChangeScheduledHours?.(localHours);
      
      localStorage.setItem('belkin_weather_city', localCity);
      localStorage.setItem('belkin_weather_tz', localTimeZone);
      
      setSavedSuccess(true);
      onPlaySound?.('ping');
      setTimeout(() => setSavedSuccess(false), 2000);
      
      // Trigger a refresh if they changed feeds
      onTriggerRefresh?.(feedsToSave.length > 0 ? feedsToSave : []);
      
    } catch (err) {
      console.error(err);
    }
  };

  `;
  
  content = content.substring(0, startIndex) + newMiddle + content.substring(endIndex);
  fs.writeFileSync('src/components/ControlCenterModal.tsx', content);
  console.log('Fixed handleSaveAll and handleApplyFeed');
} else {
  console.log('Could not find boundaries');
}
