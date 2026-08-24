const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanelModal.tsx', 'utf-8');

const actStr = '{/* Activity & Online Status */}';
const firstAct = code.indexOf(actStr);
const lastAct = code.lastIndexOf(actStr);

if (firstAct !== lastAct) {
  // It's duplicated. We can remove from the first occurrence to the end of that <td>
  // The structure is: {/* Activity & Online Status */} \n <td ... \n </div> \n </td>
  const tdEndStr = '</td>';
  const firstTdEnd = code.indexOf(tdEndStr, firstAct);
  
  if (firstTdEnd !== -1) {
    // Remove the first occurrence
    code = code.slice(0, firstAct) + code.slice(firstTdEnd + tdEndStr.length);
  }
}

fs.writeFileSync('src/components/AdminPanelModal.tsx', code);
