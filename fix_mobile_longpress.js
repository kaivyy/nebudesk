const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// The issue: the synthetic click on touchend instantly hits the backdrop and closes the menu.
// Solution: Add a delay to the backdrop's onClick so it doesn't trigger immediately, or prevent default on the touchend if it was a long press.

// Let's modify handleTouchEndOrMove:
const oldTouch = `  const handleTouchEndOrMove = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };`;

const newTouch = `  const handleTouchEndOrMove = (e: any) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchEnd = (e: any) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    } else {
      // If timer is null, it means the timer ALREADY fired (long press happened).
      // We must prevent the synthetic click from firing and hitting the backdrop!
      e.preventDefault();
    }
  };
`;
code = code.replace(oldTouch, newTouch);

// Now update the div bindings
code = code.replace(/onTouchEnd=\{handleTouchEndOrMove\}/g, "onTouchEnd={handleTouchEnd}");

// Also add a small vibration to give feedback to the user on long press!
code = code.replace(
  "onContextMenu({ preventDefault: ()=>{}, stopPropagation: ()=>{}, clientX: touch.clientX, clientY: touch.clientY }, path, isDir);",
  "if (navigator.vibrate) navigator.vibrate(50);\n        onContextMenu({ preventDefault: ()=>{}, stopPropagation: ()=>{}, clientX: touch.clientX, clientY: touch.clientY }, path, isDir);\n        timerRef.current = null;"
);

// Add select-none and touch-callout-none to the div class to prevent native mobile popups
code = code.replace(
  `className="flex items-center py-1 hover:bg-[#2a2d2e] cursor-pointer text-gray-300 group"`,
  `className="flex items-center py-1 hover:bg-[#2a2d2e] cursor-pointer text-gray-300 group select-none [-webkit-touch-callout:none]"`
);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('Done!');
