const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/services/ServicesApp.tsx', 'utf8');

const newWrapper = `  return (
    <div className="h-full flex flex-col bg-white text-sm">
      <div className="h-14 border-b border-gray-200 bg-gray-50 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[70px] shrink-0"></div>
        <div className="font-semibold text-gray-700">Services</div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r flex flex-col nebudesk-no-drag">`;

code = code.replace(
  '  return (\n    <div className="h-full flex bg-white text-sm">\n      <div className="w-1/3 border-r flex flex-col">\n        <div className="p-2 border-b bg-gray-50 font-bold">Services</div>',
  newWrapper
);

code = code.replace(
  '        </pre>\n      </div>\n    </div>\n  );',
  '        </pre>\n      </div>\n    </div>\n    </div>\n  );'
);

fs.writeFileSync('apps/web/src/apps/services/ServicesApp.tsx', code);
