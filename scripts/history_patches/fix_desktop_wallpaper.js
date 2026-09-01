const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Desktop.tsx', 'utf8');

const importRegex = /import Window from '\.\/Window';/;
code = code.replace(importRegex, "import Window from './Window';\nimport { useThemeStore } from '../stores/themeStore';");

// find "export default function Desktop() {"
code = code.replace(
  'export default function Desktop() {',
  `export default function Desktop() {
  const { wallpaper, theme, fetchTheme } = useThemeStore();
  useEffect(() => { fetchTheme(); }, []);`
);

// find "    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black flex flex-col relative overflow-hidden">"
code = code.replace(
  '<div className="w-full h-full bg-gradient-to-br from-blue-900 to-black flex flex-col relative overflow-hidden">',
  `<div className={\`w-full h-full flex flex-col relative overflow-hidden \${
      wallpaper === 'solid-black' ? 'bg-black' : 
      wallpaper === 'solid-gray' ? 'bg-gray-800' : 
      'bg-gradient-to-br from-blue-900 to-black'
    } \${theme === 'dark' ? 'dark' : ''}\`}>`
);

fs.writeFileSync('apps/web/src/desktop/Desktop.tsx', code);
