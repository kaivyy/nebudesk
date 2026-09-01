const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Desktop.tsx', 'utf8');

const importTarget = "import ImageApp from '../apps/image/ImageApp';";
const importInsert = "import AppsApp from '../apps/applications/AppsApp';\nimport ImageApp from '../apps/image/ImageApp';";
code = code.replace(importTarget, importInsert);

const renderTarget = "{win.appId === 'image' && <ImageApp initialPath={(win as any).path} />}";
const renderInsert = "{win.appId === 'manager' && <AppsApp />}\n            {win.appId === 'image' && <ImageApp initialPath={(win as any).path} />}";
code = code.replace(renderTarget, renderInsert);

fs.writeFileSync('apps/web/src/desktop/Desktop.tsx', code);
