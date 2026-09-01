const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// Replace the handleTouch stuff
const targetStart = `  const handleTouchStart`;
const targetEnd = `    }
  };`;
const regex = new RegExp(targetStart + "[\\s\\S]*?" + targetEnd);

const newHandlers = `  const ignoreClickRef = useRef(false);

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return; // Only care about primary click/touch
    
    timerRef.current = setTimeout(() => {
      if (onContextMenu) {
        if (navigator.vibrate) navigator.vibrate(50);
        onContextMenu({ preventDefault: ()=>{}, stopPropagation: ()=>{}, clientX: e.clientX, clientY: e.clientY }, path, isDir);
        timerRef.current = null;
        ignoreClickRef.current = true; // Block the upcoming click
      }
    }, 600);
  };

  const handlePointerUpOrMove = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: any) => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isDir ? toggleExpand(path) : onSelectFile(path);
  };
`;

code = code.replace(regex, newHandlers);

// Replace the div bindings
const oldBindings = `        onClick={() => isDir ? toggleExpand(path) : onSelectFile(path)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if(onContextMenu) onContextMenu(e, path, isDir); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEndOrMove}`;

const newBindings = `        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if(onContextMenu) onContextMenu(e, path, isDir); }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrMove}
        onPointerMove={handlePointerUpOrMove}
        onPointerCancel={handlePointerUpOrMove}`;

code = code.replace(oldBindings, newBindings);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
