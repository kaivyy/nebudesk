const fs = require('fs');
let code = fs.readFileSync('README.md', 'utf8');

const target = `2. Open your browser and navigate to \`http://100.x.x.x:5050\` *(replace with your VPS Tailscale IP)*.
3. Open **App Manager > Discovery** to start adopting your internal apps!`;

const replacement = `2. Open your browser and navigate to \`http://100.x.x.x:5050\` *(replace with your VPS Tailscale IP)*.
3. Login using the default credentials: **Username:** \`admin\` | **Password:** \`admin\`
4. Open **App Manager > Discovery** to start adopting your internal apps!`;

code = code.replace(target, replacement);
fs.writeFileSync('README.md', code);
