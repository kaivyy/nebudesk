const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/image/ImageApp.tsx', 'utf8');
code = code.replace(
  '  return (\n    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden text-white relative">',
  '  return (\n    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden text-white relative">\n      <div className="h-14 border-b border-[#333] flex items-center shrink-0 nebudesk-drag-region">\n        <div className="w-[70px] shrink-0"></div>\n        <div className="flex-1 font-semibold text-gray-300 text-sm">{filePath.split(\'/\').pop() || \'Image Viewer\'}</div>\n      </div>'
);
fs.writeFileSync('apps/web/src/apps/image/ImageApp.tsx', code);
