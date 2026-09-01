const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

// Add pm2Apps state
code = code.replace(
  "const [dockerContainers, setDockerContainers] = useState<any[]>([]);",
  "const [dockerContainers, setDockerContainers] = useState<any[]>([]);\n  const [pm2Apps, setPm2Apps] = useState<any[]>([]);"
);

// Fetch pm2 apps in Promise.all
const fetchTarget = "fetch(`${BASE()}/api/docker/containers`, { credentials: 'include' }).catch(() => null),";
const fetchReplacement = fetchTarget + "\n        fetch(`${BASE()}/api/pm2/apps`, { credentials: 'include' }).catch(() => null),";
code = code.replace(fetchTarget, fetchReplacement);

// Destructure pm2Res
const resTarget = "const [appRes, dockerRes, setRes] = await Promise.all([";
const resReplacement = "const [appRes, dockerRes, pm2Res, setRes] = await Promise.all([";
code = code.replace(resTarget, resReplacement);

// Handle pm2Res
const handleDockerTarget = `if (dockerRes && dockerRes.ok) {
        const d = await dockerRes.json();
        setDockerContainers(Array.isArray(d) ? d : []);
      }`;
const handleDockerReplacement = handleDockerTarget + `
      if (pm2Res && pm2Res.ok) {
        const p = await pm2Res.json();
        setPm2Apps(Array.isArray(p) ? p : []);
      }`;
code = code.replace(handleDockerTarget, handleDockerReplacement);

// Add PM2 Adopt Container
const adoptTarget = `const adoptContainer = (c: any) => {`;
const adoptReplacement = `const adoptPm2Container = (p: any) => {
    setEditingApp({
      name: p.name,
      runtime: 'pm2',
      identifier: p.name,
      internalHost: '127.0.0.1',
      internalPort: 8080,
      publicDomain: p.name.toLowerCase() + '.example.com',
      proxyEnabled: 0,
      cfEnabled: 0
    });
    setActiveTab('managed');
  };

  const adoptContainer = (c: any) => {`;
code = code.replace(adoptTarget, adoptReplacement);

// Update UI to include PM2 Apps
const uiTarget = `<h3 className="font-semibold text-gray-700 mb-3 flex items-center"><Box size={16} className="mr-2" /> Running Docker Containers</h3>`;
const uiReplacement = `
            <h3 className="font-semibold text-gray-700 mb-3 mt-6 flex items-center"><Box size={16} className="mr-2" /> Running PM2 Apps</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <th className="py-2 px-4 font-medium">Process Name</th>
                    <th className="py-2 px-4 font-medium">Memory</th>
                    <th className="py-2 px-4 font-medium">Status</th>
                    <th className="py-2 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pm2Apps.map(p => {
                    const isManaged = apps.some(a => a.identifier === p.name);
                    return (
                      <tr key={p.pm_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium text-gray-800">{p.name}</td>
                        <td className="py-2 px-4 text-gray-500 font-mono text-xs">{((p.monit?.memory || 0) / 1024 / 1024).toFixed(1)} MB</td>
                        <td className="py-2 px-4">
                          <span className={\`px-2 py-0.5 \${p.pm2_env?.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-[10px] font-bold uppercase rounded-full\`}>{p.pm2_env?.status}</span>
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isManaged ? (
                            <span className="text-xs text-gray-400 font-medium italic">Managed</span>
                          ) : (
                            <button onClick={() => adoptPm2Container(p)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Adopt</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {pm2Apps.length === 0 && (
                    <tr><td colSpan={4} className="py-4 px-4 text-center text-gray-500">No PM2 apps found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center"><Box size={16} className="mr-2" /> Running Docker Containers</h3>`;
code = code.replace(uiTarget, uiReplacement);

// Remove the "Coming soon" notice since we added PM2
const noticeTarget = `<div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 flex items-start">
              <Activity size={20} className="mr-3 shrink-0 mt-0.5 text-yellow-600" />
              <div>
                <p className="font-semibold text-sm">Systemd & PM2 Discovery Coming Soon</p>
                <p className="text-xs mt-1">Currently showing only active Docker containers. You can manually add Systemd/PM2 apps via the "Add App" button.</p>
              </div>
            </div>`;
code = code.replace(noticeTarget, "");

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
