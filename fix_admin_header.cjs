const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanelModal.tsx', 'utf-8');

// Fix headers: ensure only one Активность
code = code.replace(
  '<th className="p-3 font-semibold">Активность</th>\n                      <th className="p-3 font-semibold">Активность</th>',
  '<th className="p-3 font-semibold">Активность</th>'
);

fs.writeFileSync('src/components/AdminPanelModal.tsx', code);
