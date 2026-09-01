const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const target = `  const [workspace, setWorkspace] = useState(getInitialWorkspace());`;

const newCode = `  const [workspace, setWorkspace] = useState(() => localStorage.getItem(\`nebucode_workspace_\${winId}\`) || getInitialWorkspace());
  
  useEffect(() => {
    localStorage.setItem(\`nebucode_workspace_\${winId}\`, workspace);
  }, [workspace, winId]);`;

code = code.replace(target, newCode);
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
