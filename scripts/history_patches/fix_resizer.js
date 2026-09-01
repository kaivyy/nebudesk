const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const target = `{/* Editor Area */}`;
const resizer = `{/* Sidebar Resizer */}
      <div 
        className="w-1 bg-transparent hover:bg-blue-500 cursor-col-resize shrink-0 z-10 -ml-[1px] relative transition-colors"
        onPointerDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = sidebarWidth;
          const onMove = (moveEvent: any) => {
            const newW = Math.max(130, Math.min(800, startW + (moveEvent.clientX - startX)));
            setSidebarWidth(newW);
          };
          const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
          };
          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
          document.addEventListener('pointercancel', onUp);
        }}
      />
      `;
code = code.replace(target, resizer + target);
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
