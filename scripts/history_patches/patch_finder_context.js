const fs = require('fs');

// 1. Desktop.tsx
let desktop = fs.readFileSync('apps/web/src/desktop/Desktop.tsx', 'utf8');
desktop = desktop.replace(
  "{win.appId === 'files' && <FilesApp />}",
  "{win.appId === 'files' && <FilesApp initialPath={(win as any).path} />}"
);
fs.writeFileSync('apps/web/src/desktop/Desktop.tsx', desktop);

// 2. FilesApp.tsx
let filesapp = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');
filesapp = filesapp.replace(
  "export default function FilesApp() {",
  "export default function FilesApp({ initialPath = '/root' }: { initialPath?: string }) {"
);
filesapp = filesapp.replace(
  "const [currentPath, setCurrentPath] = useState('/root');",
  "const [currentPath, setCurrentPath] = useState(initialPath);"
);
fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', filesapp);

// 3. MenuBar.tsx
let menubar = fs.readFileSync('apps/web/src/desktop/MenuBar.tsx', 'utf8');
const targetMenu = `                    onSelect: (p: string) => {
                      openWindow({ appId: 'code', title: \`Code - \${p}\`, x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
                    }`;
const newMenu = `                    onSelect: (p: string) => {
                      if (focusedWindow?.appId === 'files') {
                        openWindow({ appId: 'files', title: 'Files', x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
                      } else {
                        openWindow({ appId: 'code', title: \`Code - \${p}\`, x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
                      }
                    }`;
menubar = menubar.replace(targetMenu, newMenu);
fs.writeFileSync('apps/web/src/desktop/MenuBar.tsx', menubar);

console.log('done!');
