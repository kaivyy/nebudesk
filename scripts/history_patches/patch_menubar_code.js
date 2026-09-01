const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/MenuBar.tsx', 'utf8');

const target = `                    onSelect: (p: string) => {
                      if (focusedWindow?.appId === 'code') {
                        document.dispatchEvent(new CustomEvent('nebucode:open-folder-direct', { detail: { winId: focusedWindow.id, path: p } }));
                      } else {
                        openWindow({ appId: 'code', title: \`Code - \${p}\`, x: 130, y: 130, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
                      }
                    }`;

const replacement = `                    onSelect: (p: string) => {
                      openWindow({ appId: 'code', title: \`Code - \${p}\`, x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
                    }`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/web/src/desktop/MenuBar.tsx', code);
console.log('done!');
