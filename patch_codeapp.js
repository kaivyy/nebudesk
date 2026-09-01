const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// Add import
code = code.replace(
  "import { useState, useEffect } from 'react';",
  "import { useState, useEffect } from 'react';\nimport { useWindowStore } from '../../stores/windowStore';"
);

// Add onContextMenu to FileTreeNode props
code = code.replace(
  "expandedPaths: Set<string>, toggleExpand: (p: string) => void,",
  "expandedPaths: Set<string>, toggleExpand: (p: string) => void,\n  onContextMenu?: (e: any, path: string, isDir: boolean) => void,"
);

code = code.replace(
  "expandedPaths, toggleExpand, onAction",
  "expandedPaths, toggleExpand, onAction, onContextMenu"
);

// Add onContextMenu handler to FileTreeNode div
code = code.replace(
  "onClick={() => isDir ? toggleExpand(path) : onSelectFile(path)}",
  "onClick={() => isDir ? toggleExpand(path) : onSelectFile(path)}\n        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if(onContextMenu) onContextMenu(e, path, isDir); }}"
);

// Pass onContextMenu in children mapping inside FileTreeNode
code = code.replace(
  "onAction={onAction}",
  "onAction={onAction}\n                onContextMenu={onContextMenu}"
);

// Add contextMenu state to CodeApp
const codeAppDef = "export default function CodeApp({ initialPath = '', winId = '' }: { initialPath?: string, winId?: string }) {";
const contextMenuState = `
  const store = useWindowStore();
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string, isDir: boolean } | null>(null);

  const handleOpenNewWindow = () => {
    if (!contextMenu) return;
    store.openWindow({
      appId: 'code',
      title: 'NebuCode',
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      width: 900,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      minimized: false,
      maximized: false,
      path: contextMenu.path
    });
    setContextMenu(null);
  };
`;
code = code.replace(codeAppDef, codeAppDef + contextMenuState);

// Add contextMenu handler in CodeApp's render (pass to root map)
code = code.replace(
  "<FileTreeNode \n                  key={file.name}",
  "<FileTreeNode \n                  onContextMenu={(e, p, isDir) => setContextMenu({ x: e.clientX, y: e.clientY, path: p, isDir })}\n                  key={file.name}"
);

// Render context menu UI
const contextMenuUI = `
      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => {e.preventDefault(); setContextMenu(null);}}></div>
          <div 
            className="fixed z-50 bg-[#2d2d2d] border border-[#3e3e42] shadow-xl rounded py-1 min-w-[200px] text-[13px] text-[#cccccc]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button 
              onClick={handleOpenNewWindow}
              className="w-full text-left px-4 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Open in New Window
            </button>
            <div className="border-t border-[#3e3e42] my-1"></div>
            <button 
              onClick={(e) => {
                 onFileAction(e, 'delete', contextMenu.path);
                 setContextMenu(null);
              }}
              className="w-full text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}`;

code = code.replace(/    <\/div>\n  \);\n\}$/, contextMenuUI);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log("Success!");
