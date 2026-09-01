const fs = require('fs');

const files = [
  'apps/web/src/apps/files/FilesApp.tsx',
  'apps/web/src/apps/settings/SettingsApp.tsx',
  'apps/web/src/apps/docs/DocsApp.tsx',
  'apps/web/src/apps/applications/AppsApp.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Remove sidebar right borders
  code = code.replace(/border-r border-gray-200/g, 'border-r border-transparent');
  code = code.replace(/border-r border-gray-300/g, 'border-r border-transparent');
  
  // Remove toolbar bottom borders (header toolbars)
  // We want to remove border-b border-gray-200 from the h-14 toolbars
  code = code.replace(/border-b border-gray-200/g, 'border-b border-transparent');
  
  fs.writeFileSync(file, code);
}

console.log("Borders removed!");
