const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');
const lines = code.split('\n');
while(lines[lines.length-1].trim() === '' || lines[lines.length-1].includes('}') || lines[lines.length-1].includes(');') || lines[lines.length-1].includes('</div')) {
  lines.pop();
}
lines.push('        </div>');
lines.push('      </div>');
lines.push('    </div>');
lines.push('  );');
lines.push('}');
fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', lines.join('\n'));
