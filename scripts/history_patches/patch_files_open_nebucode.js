const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

const target = `          {contextMenu.file.isDir && (
            <button onClick={() => { navigate(contextMenu.fullPath); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
              <FolderOpen size={14} className="text-blue-500" /><span>Open Folder</span>
            </button>
          )}`;

const replacement = `          {contextMenu.file.isDir && (
            <>
              <button onClick={() => { navigate(contextMenu.fullPath); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                <FolderOpen size={14} className="text-blue-500" /><span>Open Folder</span>
              </button>
              <button onClick={() => { 
                useWindowStore.getState().openWindow({
                  appId: 'code', title: 'NebuCode',
                  x: 150, y: 150, width: 800, height: 600,
                  minWidth: 600, minHeight: 400, minimized: false, maximized: false,
                  path: contextMenu.fullPath
                } as any, true);
                setContextMenu(null); 
              }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                <Code2 size={14} className="text-gray-500" /><span>Open in NebuCode</span>
              </button>
            </>
          )}`;

code = code.replace(target, replacement);

const importTarget = "import { useWindowStore } from '../../stores/windowStore';";
if (!code.includes(importTarget)) {
  code = code.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { useWindowStore } from '../../stores/windowStore';");
}

fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
console.log('done!');
