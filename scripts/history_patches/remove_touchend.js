const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const target = `  const handleTouchEnd = (e: any) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    } else {
      // If timer is null, it means the timer ALREADY fired (long press happened).
      // We must prevent the synthetic click from firing and hitting the backdrop!
      e.preventDefault();
    }
  };`;

code = code.replace(target, '');
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
