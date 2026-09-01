const fs = require('fs');
let filesapp = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');
filesapp = filesapp.replace(
  "const [history, setHistory] = useState(['/root']);",
  "const [history, setHistory] = useState([initialPath || '/root']);"
);
fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', filesapp);
console.log('done!');
