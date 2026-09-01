const fs = require('fs');
let code = fs.readFileSync('install.sh', 'utf8');

const target = `echo "2. Access securely via: http://100.x.x.x:5050"
echo "3. Go to Discovery -> Adopt 'nebudesk-frontend' for a public domain."`;

const replacement = `echo "2. Access securely via: http://100.x.x.x:5050"
echo "3. Login with default credentials (Username: admin | Password: admin)"
echo "4. Go to Discovery -> Adopt 'nebudesk-frontend' for a public domain."`;

code = code.replace(target, replacement);
fs.writeFileSync('install.sh', code);
