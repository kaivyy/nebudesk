const fs = require('fs');
let code = fs.readFileSync('/root/nebudesk/apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

code = code.replace(/c\.names/g, 'c.Names');
code = code.replace(/c\.id/g, 'c.Id');
code = code.replace(/c\.image/g, 'c.Image');
code = code.replace(/c\.ports/g, 'c.Ports');
code = code.replace(/c\.state/g, 'c.State');

fs.writeFileSync('/root/nebudesk/apps/web/src/apps/applications/AppsApp.tsx', code);
