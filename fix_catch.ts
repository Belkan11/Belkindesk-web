import fs from 'fs';

let content = fs.readFileSync('src/components/ControlCenterModal.tsx', 'utf-8');

// Find handleSaveAll end
content = content.replace(
  /return updated;\n  };\n\n  const handleAddNewFeed = \(\) => {/g,
  `return updated;\n    } catch (err) {\n      console.error(err);\n      return localFeeds;\n    }\n  };\n\n  const handleAddNewFeed = () => {`
);

fs.writeFileSync('src/components/ControlCenterModal.tsx', content);
console.log('Fixed catch block');
