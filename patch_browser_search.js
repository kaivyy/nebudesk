const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/browser/BrowserApp.tsx', 'utf8');

const oldHandleNavigate = `  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = input.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'http://' + target;
    }
    setUrl(target);
    setInput(target);
  };`;

const newHandleNavigate = `  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = input.trim();
    
    const isUrl = /^([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(\\/.*)?$/.test(target) || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('localhost') || target.startsWith('127.0.0.1');

    if (!isUrl) {
      target = \`https://www.google.com/search?q=\${encodeURIComponent(target)}\`;
    } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    
    setUrl(target);
    setInput(target);
  };`;

code = code.replace(oldHandleNavigate, newHandleNavigate);

fs.writeFileSync('apps/web/src/apps/browser/BrowserApp.tsx', code);
console.log('Browser search logic updated!');
