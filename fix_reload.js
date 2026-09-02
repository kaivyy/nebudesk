const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/browser/BrowserApp.tsx', 'utf8');

const regex = /  const handleReload = \(\) => \{\n    if \(iframeRef\.current\) \{\n      iframeRef\.current\.src = url;\n    \}\n  \};\n/g;

code = code.replace(regex, (match, offset, str) => {
  return offset === str.indexOf(match) ? match : ''; // keep only first
});

fs.writeFileSync('apps/web/src/apps/browser/BrowserApp.tsx', code);
