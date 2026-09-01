const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/MenuBar.tsx', 'utf8');

const targetStr = \`<button onClick={() => handleAction(() => {
                document.dispatchEvent(new CustomEvent('desktop:pick-folder', { \`;

const newFileMenu = \`<button onClick={() => handleAction(() => {
                document.dispatchEvent(new CustomEvent('desktop:pick-file', { 
                  detail: {
                    initialPath: '/root',
                    onSelect: (p: string) => {
                      const name = p.split('/').pop() || '';
                      const ext = name.split('.').pop()?.toLowerCase() || '';
                      let appId = 'code';
                      let title = name;
                      if (/^(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(ext)) { appId = 'image'; title = \`Image — \${name}\`; }
                      else if (/^(md|txt|rtf|doc|docx|odt|pages)$/.test(ext)) { appId = 'docs'; title = \`Docs — \${name}\`; }
                      else if (/^(csv|xlsx|xls|ods|numbers)$/.test(ext)) { appId = 'sheet'; title = \`Sheet — \${name}\`; }
                      else if (/^(ppt|pptx|odp|key)$/.test(ext)) { appId = 'slides'; title = \`Slides — \${name}\`; }
                      
                      openWindow({
                        appId, title, x: 160, y: 120, width: 860, height: 560, minWidth: 500, minHeight: 350, minimized: false, maximized: false, path: p
                      } as any, true);
                    }
                  }
                }));
              })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Open File...</span><span className="text-gray-400 group-hover:text-white/70">⇧⌘O</span>
              </button>
              <button onClick={() => handleAction(() => {
                document.dispatchEvent(new CustomEvent('desktop:pick-folder', { \`;

code = code.replace(targetStr, newFileMenu);

fs.writeFileSync('apps/web/src/desktop/MenuBar.tsx', code);
