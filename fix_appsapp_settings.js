const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

// Add settings tab state
code = code.replace(
  "const [activeTab, setActiveTab] = useState<'managed' | 'discovery'>('managed');",
  "const [activeTab, setActiveTab] = useState<'managed' | 'discovery' | 'settings'>('managed');"
);

// Add settings tab button
const tabTarget = `<button onClick={() => setActiveTab('discovery')} className={\`px-4 py-1.5 rounded-md text-sm font-medium transition-colors \${activeTab === 'discovery' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}\`}>Discovery</button>`;
const tabReplacement = tabTarget + `\n          <button onClick={() => setActiveTab('settings')} className={\`px-4 py-1.5 rounded-md text-sm font-medium transition-colors \${activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}\`}>Settings</button>`;
code = code.replace(tabTarget, tabReplacement);

// Add settings state variables
code = code.replace(
  "const [loading, setLoading] = useState(false);",
  "const [loading, setLoading] = useState(false);\n  const [cfToken, setCfToken] = useState('');\n  const [cfZone, setCfZone] = useState('');"
);

// Fetch settings in fetchData
const fetchTarget = `fetch(\`\${BASE()}/api/docker/containers\`, { credentials: 'include' }).catch(() => null)`;
const fetchReplacement = fetchTarget + `,\n        fetch(\`\${BASE()}/api/settings\`, { credentials: 'include' }).catch(() => null)`;
code = code.replace(fetchTarget, fetchReplacement);

const jsonTarget = `if (dockerRes && dockerRes.ok) {
        const d = await dockerRes.json();
        setDockerContainers(Array.isArray(d) ? d : []);
      }`;
const jsonReplacement = jsonTarget + `
      const setRes = arguments[0]; // wait, we need to restructure Promise.all
`;
// Let's replace the whole fetchData function instead.
