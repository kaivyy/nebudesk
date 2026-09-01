const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Desktop.tsx', 'utf8');

code = code.replace("{win.appId === 'sheet' && <SheetApp initialPath={(win as any).path} />}", "{win.appId === 'sheet' && <SheetApp />}");
code = code.replace("{win.appId === 'slides' && <SlidesApp initialPath={(win as any).path} />}", "{win.appId === 'slides' && <SlidesApp />}");

fs.writeFileSync('apps/web/src/desktop/Desktop.tsx', code);

['apps/web/src/apps/sheet/SheetApp.tsx', 'apps/web/src/apps/slides/SlidesApp.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    'export default function SheetApp({ initialPath }: { initialPath?: string }) {',
    'export default function SheetApp() {'
  );
  code = code.replace(
    'export default function SlidesApp({ initialPath }: { initialPath?: string }) {',
    'export default function SlidesApp() {'
  );
  fs.writeFileSync(file, code);
});
