const fs = require('fs');

const files = [
  'apps/web/src/apps/code/CodeApp.tsx',
  'apps/web/src/apps/files/FilesApp.tsx',
  'apps/web/src/apps/services/ServicesApp.tsx',
  'apps/web/src/apps/system/SystemApp.tsx',
  'apps/web/src/apps/tasks/TasksApp.tsx',
  'apps/web/src/apps/terminal/TerminalApp.tsx',
  'apps/web/src/apps/image/ImageApp.tsx'
];

for(const f of files) {
  let code = fs.readFileSync(f, 'utf8');
  
  // TasksApp
  code = code.replace('className="flex items-center space-x-4 nebudesk-no-drag"', 'className="flex items-center space-x-4"');
  code = code.replace('className="flex items-center nebudesk-no-drag"', 'className="flex items-center"');
  
  // FilesApp
  code = code.replace('className="flex items-center space-x-1 mr-4 shrink-0 nebudesk-no-drag"', 'className="flex items-center space-x-1 mr-4 shrink-0"');
  code = code.replace('className="flex items-center space-x-3 shrink-0 nebudesk-no-drag"', 'className="flex items-center space-x-3 shrink-0"');
  
  // ImageApp
  code = code.replace('className="flex space-x-2 mr-4 nebudesk-no-drag"', 'className="flex space-x-2 mr-4"');
  
  // TerminalApp
  code = code.replace('className="flex-1 p-2 nebudesk-no-drag"', 'className="flex-1 p-2"');
  
  fs.writeFileSync(f, code);
}

