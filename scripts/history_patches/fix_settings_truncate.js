const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

// The code renders storage like: <span className="font-medium">{disk.mount} <span className="text-gray-400 text-xs ml-1">({disk.type})</span></span>
// We should truncate the mount text if it's too long.
code = code.replace(
  '<span className="font-medium">{disk.mount} <span className="text-gray-400 text-xs ml-1">({disk.type})</span></span>',
  '<span className="font-medium flex-1 truncate mr-2" title={disk.mount}>{disk.mount} <span className="text-gray-400 text-xs ml-1">({disk.type})</span></span>'
);

code = code.replace(
  '<div className="flex justify-between mb-2">',
  '<div className="flex justify-between mb-2 items-center">'
);

// also let's filter out some junk overlay mounts in the API or just rely on the CSS truncate?
// We can just rely on truncate.

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
