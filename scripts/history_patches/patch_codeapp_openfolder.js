const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const target = `            <div className="flex items-center space-x-1 uppercase cursor-pointer min-w-0" onClick={() => {
              document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                detail: { initialPath: workspace, onSelect: (p: string) => setWorkspace(p) }
              }));
            }} title="Change Workspace Folder">`;

const replacement = `            <div className="flex items-center space-x-1 uppercase cursor-pointer min-w-0" onClick={() => {
              document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                detail: { 
                  initialPath: workspace, 
                  onSelect: (p: string) => {
                    useWindowStore.getState().openWindow({
                      appId: 'code',
                      title: 'NebuCode',
                      x: 150, y: 150,
                      width: 800, height: 600,
                      minWidth: 600, minHeight: 400,
                      minimized: false, maximized: false,
                      path: p
                    } as any, true);
                  }
                }
              }));
            }} title="Open Folder in New Window">`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
