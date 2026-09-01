const fs = require('fs');

let docker = fs.readFileSync('apps/web/src/apps/docker/DockerApp.tsx', 'utf8');
docker = docker.replace(
  '<div className="flex border-b bg-gray-50 px-4 py-2 font-bold">\n        Docker Containers\n      </div>',
  `<div className="h-14 flex items-center border-b border-gray-200 bg-gray-50 shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[70px] shrink-0"></div>
        <div className="font-semibold text-gray-700">Docker Containers</div>
      </div>`
);
fs.writeFileSync('apps/web/src/apps/docker/DockerApp.tsx', docker);

let image = fs.readFileSync('apps/web/src/apps/image/ImageApp.tsx', 'utf8');
image = image.replace(
  '<div className="h-12 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-4">',
  `<div className="h-14 border-b border-gray-800 bg-gray-900 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[70px] shrink-0"></div>`
);
image = image.replace(
  '<div className="flex space-x-2">',
  '<div className="flex-1"></div><div className="flex space-x-2 mr-4 nebudesk-no-drag">'
);
fs.writeFileSync('apps/web/src/apps/image/ImageApp.tsx', image);

