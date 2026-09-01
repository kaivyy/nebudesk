const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/MenuBar.tsx', 'utf8');

const stateTarget = `const [activeMenu, setActiveMenu] = useState<string | null>(null);`;
const stateReplacement = stateTarget + `\n  const [aboutModal, setAboutModal] = useState(false);`;
code = code.replace(stateTarget, stateReplacement);

fs.writeFileSync('apps/web/src/desktop/MenuBar.tsx', code);
