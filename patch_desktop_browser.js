const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Desktop.tsx', 'utf8');

code = code.replace(
  "import TerminalApp from '../apps/terminal/TerminalApp';",
  "import TerminalApp from '../apps/terminal/TerminalApp';\nimport BrowserApp from '../apps/browser/BrowserApp';"
);

code = code.replace(
  "{win.appId === 'terminal' && <TerminalApp winId={win.id} />}",
  "{win.appId === 'terminal' && <TerminalApp winId={win.id} />}\n            {win.appId === 'browser' && <BrowserApp />}"
);

fs.writeFileSync('apps/web/src/desktop/Desktop.tsx', code);
console.log('done!');
