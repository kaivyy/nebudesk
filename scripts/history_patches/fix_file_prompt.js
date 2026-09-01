const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

const target = `  const handleCreateFile = async () => {
    const name = prompt('File name:');
    if (!name?.trim()) return;
    const res = await fetch(\`\${BASE}/api/files/file\`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: currentPath, name })
    });
    if (res.ok) loadFiles(currentPath);
  };`;

const replacement = `  const handleCreateFile = () => {
    setPromptModal({
      type: 'file',
      onSubmit: async (name) => {
        if (!name?.trim()) return;
        const res = await fetch(\`\${BASE}/api/files/file\`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: currentPath, name, content: '' })
        });
        if (res.ok) loadFiles(currentPath);
      }
    });
  };`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
