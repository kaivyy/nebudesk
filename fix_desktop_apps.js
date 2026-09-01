const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Desktop.tsx', 'utf8');

code = code.replace("{win.appId === 'docs' && <DocsApp />}", "{win.appId === 'docs' && <DocsApp initialPath={(win as any).path} />}");
code = code.replace("{win.appId === 'sheet' && <SheetApp />}", "{win.appId === 'sheet' && <SheetApp initialPath={(win as any).path} />}");
code = code.replace("{win.appId === 'slides' && <SlidesApp />}", "{win.appId === 'slides' && <SlidesApp initialPath={(win as any).path} />}");

fs.writeFileSync('apps/web/src/desktop/Desktop.tsx', code);
