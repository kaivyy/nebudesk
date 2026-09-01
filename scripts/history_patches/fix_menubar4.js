const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/MenuBar.tsx', 'utf8');

// Revert the fragment error
code = code.replace(`    </>
  );
}`, `  );
}`);

code = code.replace(`    <>
      {aboutModal && (`, `      {aboutModal && (`);

fs.writeFileSync('apps/web/src/desktop/MenuBar.tsx', code);
