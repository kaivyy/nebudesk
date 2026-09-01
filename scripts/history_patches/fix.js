const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

const newWrapper = `
  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] text-gray-800 text-sm font-sans select-none">
      {/* Unified Settings Titlebar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center shrink-0 nebudesk-drag-region">
        <div className="w-[70px] shrink-0"></div>
        <div className="font-semibold text-gray-700 text-sm">Settings</div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
`;

code = code.replace(
  '  return (\n    <div className="h-full flex bg-[#f5f5f7] text-gray-800 text-sm font-sans select-none">',
  newWrapper
);

code = code.replace(
  '      </div>\n    </div>\n  );\n}',
  '      </div>\n    </div>\n    </div>\n  );\n}'
);

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
