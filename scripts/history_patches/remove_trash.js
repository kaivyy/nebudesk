const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const targetBlock = `        {/* Actions (Delete) */}
        <div className="pr-2 flex items-center">
          <button 
            onClick={(e) => onAction(e, 'delete', path)}
            className="p-0.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded"
          >
            <Trash2 size={12} />
          </button>
        </div>`;

code = code.replace(targetBlock, '');
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
