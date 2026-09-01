const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// 1. Import useRef
code = code.replace(
  "import { useState, useEffect } from 'react';",
  "import { useState, useEffect, useRef } from 'react';"
);

// 2. Add timer ref to FileTreeNode
const fileTreeNodeStart = `const [loading, setLoading] = useState(false);`;
const timerLogic = `  const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  const handleTouchStart = (e: any) => {
    const touch = e.touches[0];
    timerRef.current = setTimeout(() => {
      if (onContextMenu) {
        onContextMenu({ preventDefault: ()=>{}, stopPropagation: ()=>{}, clientX: touch.clientX, clientY: touch.clientY }, path, isDir);
      }
    }, 600);
  };

  const handleTouchEndOrMove = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
`;
code = code.replace(fileTreeNodeStart, timerLogic);

// 3. Add touch events to the div
const oldDivStart = `        onClick={() => isDir ? toggleExpand(path) : onSelectFile(path)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if(onContextMenu) onContextMenu(e, path, isDir); }}`;

const newDivStart = `        onClick={() => isDir ? toggleExpand(path) : onSelectFile(path)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if(onContextMenu) onContextMenu(e, path, isDir); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEndOrMove}
        onTouchMove={handleTouchEndOrMove}`;

code = code.replace(oldDivStart, newDivStart);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('Success!');
