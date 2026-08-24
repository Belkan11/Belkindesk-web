const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanelModal.tsx', 'utf-8');

// The logic gets duplicated many times. Let's find the first instance and the `isMainAdmin` line and remove everything in between.
const startStr = 'const isOnline = (() => {';
const endStr = "const isMainAdmin = (p.username && p.username.toLowerCase() === 'belkin') || p.id === 'user-admin-belkin';";

if (code.includes(startStr) && code.includes(endStr)) {
  const firstIndex = code.indexOf(startStr);
  const lastIndex = code.lastIndexOf(endStr);
  
  if (firstIndex < lastIndex) {
    const freshLogic = `                      const isOnline = (() => {
                        if (!p.lastActiveAt && !p.lastLoginAt) return false;
                        const lastTime = new Date(p.lastActiveAt || p.lastLoginAt || 0).getTime();
                        return (Date.now() - lastTime) < 5 * 60 * 1000;
                      })();
                      const lastSeenStr = (() => {
                        const ds = p.lastActiveAt || p.lastLoginAt;
                        if (!ds) return 'Никогда';
                        return new Date(ds).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: '2-digit', 
                          hour: '2-digit', minute: '2-digit'
                        });
                      })();

                      const isMainAdmin = (p.username && p.username.toLowerCase() === 'belkin') || p.id === 'user-admin-belkin';`;
    
    code = code.slice(0, firstIndex) + freshLogic + code.slice(lastIndex + endStr.length);
  }
}

fs.writeFileSync('src/components/AdminPanelModal.tsx', code);
