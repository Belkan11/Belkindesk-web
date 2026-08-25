const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');
code = code.replace(
  '  imageUrls?: string[];',
  '  imageUrls?: string[];\n  extractionStatus?: \'full\' | \'partial\' | \'failed\';\n  extractionError?: string;'
);
fs.writeFileSync('src/types.ts', code);
console.log('types patched');
