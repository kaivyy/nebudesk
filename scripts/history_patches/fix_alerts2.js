const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

const stateTarget = `const [activeTab, setActiveTab] = useState<'managed' | 'discovery' | 'settings'>('managed');`;
const stateReplacement = stateTarget + `\n  const [alertModal, setAlertModal] = useState<string | null>(null);`;
code = code.replace(stateTarget, stateReplacement);

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
