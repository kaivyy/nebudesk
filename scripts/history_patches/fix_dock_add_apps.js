const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Dock.tsx', 'utf8');

const targetStr = `{ id: 'settings', title: 'System Settings', icon: '/icons/settings.png' }`;
const replacementStr = `{ id: 'manager', title: 'App Manager', icon: '/icons/manager.svg' },
    { id: 'settings', title: 'System Settings', icon: '/icons/settings.png' }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('apps/web/src/desktop/Dock.tsx', code);
