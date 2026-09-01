const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

code = code.replace(`        </div>
      </div>

            
    </div>
{/* Prompt Modal */}`, `        </div>
      </div>
{/* Prompt Modal */}`);

fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
