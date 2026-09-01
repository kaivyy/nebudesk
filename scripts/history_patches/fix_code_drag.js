const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// The original: <div className="flex-1 flex justify-center nebudesk-no-drag">
code = code.replace(
  '<div className="flex-1 flex justify-center nebudesk-no-drag">',
  '<div className="flex-1 flex justify-center">'
);

// We move nebudesk-no-drag to the inner div:
// <div className="bg-[#2d2d2d] text-gray-400 text-xs px-24 py-1.5 rounded flex items-center border border-[#3e3e42] shadow-inner cursor-pointer hover:bg-[#333333] transition-colors"
code = code.replace(
  '<div className="bg-[#2d2d2d] text-gray-400 text-xs px-24 py-1.5 rounded flex items-center border border-[#3e3e42] shadow-inner cursor-pointer hover:bg-[#333333] transition-colors"',
  '<div className="nebudesk-no-drag bg-[#2d2d2d] text-gray-400 text-xs px-24 py-1.5 rounded flex items-center border border-[#3e3e42] shadow-inner cursor-pointer hover:bg-[#333333] transition-colors"'
);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
