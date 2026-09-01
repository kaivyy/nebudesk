const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const target = `{/* Status Bar Bottom */}`;
const bottomPanelCode = `{/* Bottom Panel (Integrated Terminal) */}
        {showBottomPanel && (
          <div style={{ height: bottomPanelHeight }} className="flex flex-col border-t border-[#3e3e42] bg-[#1e1e1e] relative shrink-0">
            {/* Panel Resizer */}
            <div 
              className="h-[4px] bg-transparent hover:bg-blue-500 cursor-row-resize absolute top-0 left-0 right-0 z-10 -mt-[2px] transition-colors"
              onPointerDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startH = bottomPanelHeight;
                const onMove = (moveEvent: any) => {
                  const newH = Math.max(100, Math.min(800, startH - (moveEvent.clientY - startY)));
                  setBottomPanelHeight(newH);
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
            {/* Panel Header */}
            <div className="flex items-center px-4 h-9 shrink-0">
              <div className="text-[11px] uppercase tracking-wider text-gray-300 border-b border-blue-500 h-full flex items-center px-2">Terminal</div>
              <div className="flex-1"></div>
              <button onClick={() => setShowBottomPanel(false)} className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
            </div>
            {/* Terminal Container */}
            <div className="flex-1 p-2 min-h-0 pl-4">
              <IntegratedTerminal workspace={workspace} winId={winId} />
            </div>
          </div>
        )}
        
        `;
code = code.replace(target, bottomPanelCode + target);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
