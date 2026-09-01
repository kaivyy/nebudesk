const fs = require('fs');

const fixCenterTitle = (file, textToFind, textToReplace) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(textToFind, textToReplace);
  // Also change any w-[70px] or w-[60px] to w-[90px]
  content = content.replace(/w-\[60px\]/g, 'w-[90px]');
  content = content.replace(/w-\[70px\]/g, 'w-[90px]');
  fs.writeFileSync(file, content);
};

// DockerApp
fixCenterTitle(
  'apps/web/src/apps/docker/DockerApp.tsx',
  '<div className="font-semibold text-gray-700">Docker Containers</div>',
  '<div className="flex-1 text-center font-semibold text-gray-700 pr-[90px]">Docker Containers</div>'
);

// ServicesApp
fixCenterTitle(
  'apps/web/src/apps/services/ServicesApp.tsx',
  '<div className="font-semibold text-gray-700">Services</div>',
  '<div className="flex-1 text-center font-semibold text-gray-700 pr-[90px]">Services</div>'
);

// SettingsApp
fixCenterTitle(
  'apps/web/src/apps/settings/SettingsApp.tsx',
  '<div className="font-semibold text-gray-700 text-sm">Settings</div>',
  '<div className="flex-1 text-center font-semibold text-gray-700 text-sm pr-[90px]">Settings</div>'
);

// Other apps: just replace w-[60px] and w-[70px] with w-[90px]
['CodeApp', 'FilesApp', 'ImageApp', 'SystemApp', 'TasksApp'].forEach(app => {
  const path = `apps/web/src/apps/${app.toLowerCase().replace('app', '')}/${app}.tsx`;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/w-\[60px\]/g, 'w-[90px]');
  content = content.replace(/w-\[70px\]/g, 'w-[90px]');
  fs.writeFileSync(path, content);
});

