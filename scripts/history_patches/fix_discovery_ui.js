const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

const handlers = `
  const handleDiscoveryAction = async (runtime: string, identifier: string, action: string) => {
    try {
      const res = await fetch(\`\${BASE()}/api/discovery/action\`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtime, identifier, action })
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Action failed: ' + err.error);
      }
      fetchData();
    } catch (e: any) {
      alert('Action failed: ' + e.message);
    }
  };

  const handleDiscoveryLogs = async (runtime: string, identifier: string, name: string) => {
    try {
      const res = await fetch(\`\${BASE()}/api/discovery/logs?runtime=\${runtime}&identifier=\${identifier}\`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setViewingLogs({ name, logs: data.logs || 'No logs available.' });
      } else {
        const err = await res.json();
        alert('Failed to fetch logs: ' + err.error);
      }
    } catch (e: any) {
      alert('Failed to fetch logs: ' + e.message);
    }
  };
`;
code = code.replace("const handleAction = async", handlers + "\n  const handleAction = async");

// PM2 UI Actions
const pm2Target = `<td className="py-2 px-4 text-right">
                          {isManaged ? (
                            <span className="text-xs text-gray-400 font-medium italic">Managed</span>
                          ) : (
                            <button onClick={() => adoptPm2Container(p)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Adopt</button>
                          )}
                        </td>`;
const pm2Replacement = `<td className="py-2 px-4 text-right flex justify-end items-center space-x-1">
                          <button onClick={() => handleDiscoveryAction('pm2', p.name, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          <button onClick={() => handleDiscoveryAction('pm2', p.name, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                          <button onClick={() => handleDiscoveryAction('pm2', p.name, 'restart')} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Restart"><RotateCw size={14} /></button>
                          <button onClick={() => handleDiscoveryLogs('pm2', p.name, p.name)} className="p-1 text-gray-600 hover:bg-gray-200 rounded" title="Logs"><FileText size={14} /></button>
                          
                          <div className="w-px h-4 bg-gray-300 mx-2"></div>
                          
                          {isManaged ? (
                            <span className="text-xs text-gray-400 font-medium italic px-2">Managed</span>
                          ) : (
                            <button onClick={() => adoptPm2Container(p)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium text-xs border border-blue-200">Adopt</button>
                          )}
                        </td>`;
code = code.replace(pm2Target, pm2Replacement);

// Docker UI Actions
const dockerTarget = `<td className="py-2 px-4 text-right">
                          {isManaged ? (
                            <span className="text-xs text-gray-400 font-medium italic">Managed</span>
                          ) : (
                            <button onClick={() => adoptContainer(c)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Adopt</button>
                          )}
                        </td>`;
const dockerReplacement = `<td className="py-2 px-4 text-right flex justify-end items-center space-x-1">
                          <button onClick={() => handleDiscoveryAction('docker', c.Id, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          <button onClick={() => handleDiscoveryAction('docker', c.Id, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                          <button onClick={() => handleDiscoveryAction('docker', c.Id, 'restart')} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Restart"><RotateCw size={14} /></button>
                          <button onClick={() => handleDiscoveryLogs('docker', c.Id, name)} className="p-1 text-gray-600 hover:bg-gray-200 rounded" title="Logs"><FileText size={14} /></button>
                          
                          <div className="w-px h-4 bg-gray-300 mx-2"></div>
                          
                          {isManaged ? (
                            <span className="text-xs text-gray-400 font-medium italic px-2">Managed</span>
                          ) : (
                            <button onClick={() => adoptContainer(c)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium text-xs border border-blue-200">Adopt</button>
                          )}
                        </td>`;
code = code.replace(dockerTarget, dockerReplacement);

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
