const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

// Managed Apps Tab
const managedTarget = `<button onClick={() => handleAction(app.id, 'start')} className="p-1.5 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                    <button onClick={() => handleAction(app.id, 'stop')} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>`;
const managedReplacement = `
                    {(() => {
                      let isRunning = false;
                      if (app.runtime === 'docker') isRunning = dockerContainers.some(c => c.Id?.startsWith(app.identifier) && c.State === 'running');
                      if (app.runtime === 'pm2') isRunning = pm2Apps.some(p => p.name === app.identifier && p.pm2_env?.status === 'online');
                      
                      return isRunning ? (
                        <button onClick={() => handleAction(app.id, 'stop')} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                      ) : (
                        <button onClick={() => handleAction(app.id, 'start')} className="p-1.5 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                      );
                    })()}
`;
code = code.replace(managedTarget, managedReplacement);

// Discovery Tab - PM2
const pm2DiscoveryTarget = `<button onClick={() => handleDiscoveryAction('pm2', p.name, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          <button onClick={() => handleDiscoveryAction('pm2', p.name, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>`;
const pm2DiscoveryReplacement = `
                          {p.pm2_env?.status === 'online' ? (
                            <button onClick={() => handleDiscoveryAction('pm2', p.name, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                          ) : (
                            <button onClick={() => handleDiscoveryAction('pm2', p.name, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          )}`;
code = code.replace(pm2DiscoveryTarget, pm2DiscoveryReplacement);

// Discovery Tab - Docker
const dockerDiscoveryTarget = `<button onClick={() => handleDiscoveryAction('docker', c.Id, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          <button onClick={() => handleDiscoveryAction('docker', c.Id, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>`;
const dockerDiscoveryReplacement = `
                          {c.State === 'running' ? (
                            <button onClick={() => handleDiscoveryAction('docker', c.Id, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                          ) : (
                            <button onClick={() => handleDiscoveryAction('docker', c.Id, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          )}`;
code = code.replace(dockerDiscoveryTarget, dockerDiscoveryReplacement);

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
