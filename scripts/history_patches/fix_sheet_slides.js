const fs = require('fs');

['apps/web/src/apps/sheet/SheetApp.tsx', 'apps/web/src/apps/slides/SlidesApp.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    'export default function SheetApp() {',
    'export default function SheetApp({ initialPath }: { initialPath?: string }) {'
  );
  code = code.replace(
    'export default function SlidesApp() {',
    'export default function SlidesApp({ initialPath }: { initialPath?: string }) {'
  );
  fs.writeFileSync(file, code);
});
