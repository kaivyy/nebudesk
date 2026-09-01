const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/docs/DocsApp.tsx', 'utf8');

code = code.replace(`          </div>
        </div>}

        
      </div>}`, `          </div>
        </div>}`);

fs.writeFileSync('apps/web/src/apps/docs/DocsApp.tsx', code);
