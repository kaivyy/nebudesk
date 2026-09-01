const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/system/SystemApp.tsx', 'utf8');

code = code.replace(
  '<div className="flex-1 flex space-x-2 px-2 nebudesk-no-drag">',
  '<div className="flex-1 flex space-x-2 px-2">'
);

code = code.replace(
  '<button className={`px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === \'overview\'',
  '<button className={`nebudesk-no-drag px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === \'overview\''
);

code = code.replace(
  '<button className={`px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === \'processes\'',
  '<button className={`nebudesk-no-drag px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === \'processes\''
);

fs.writeFileSync('apps/web/src/apps/system/SystemApp.tsx', code);
