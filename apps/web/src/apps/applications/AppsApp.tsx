import { useState, useEffect } from 'react';
import { Server, Globe, ShieldCheck, Box, Plus, RefreshCw, Trash2, Save, ExternalLink, Settings, Play, Square, RotateCw, FileText, X, HelpCircle, Info, ExternalLink as ExtLink } from 'lucide-react';

const BASE = () => `http://${window.location.hostname}:3030`;

export default function AppsApp() {
  const [activeTab, setActiveTab] = useState<'managed' | 'discovery' | 'settings'>('managed');
  const [apps, setApps] = useState<any[]>([]);
  const [dockerContainers, setDockerContainers] = useState<any[]>([]);
  const [pm2Apps, setPm2Apps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingApp, setEditingApp] = useState<any>(null);
  
  // Settings
  const [cfToken, setCfToken] = useState('');
  const [cfZone, setCfZone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [viewingLogs, setViewingLogs] = useState<{name: string, logs: string} | null>(null);
  const [showTips, setShowTips] = useState(false);


  
  const handleDiscoveryAction = async (runtime: string, identifier: string, action: string) => {
    try {
      const res = await fetch(`${BASE()}/api/discovery/action`, {
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
      const res = await fetch(`${BASE()}/api/discovery/logs?runtime=${runtime}&identifier=${identifier}`, { credentials: 'include' });
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

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`${BASE()}/api/applications/${id}/action`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
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

  const handleViewLogs = async (id: string, name: string) => {
    try {
      const res = await fetch(`${BASE()}/api/applications/${id}/logs`, { credentials: 'include' });
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, dockerRes, pm2Res, setRes] = await Promise.all([
        fetch(`${BASE()}/api/applications`, { credentials: 'include' }),
        fetch(`${BASE()}/api/docker/containers`, { credentials: 'include' }).catch(() => null),
        fetch(`${BASE()}/api/pm2/apps`, { credentials: 'include' }).catch(() => null),
        fetch(`${BASE()}/api/settings`, { credentials: 'include' }).catch(() => null)
      ]);
      if (appRes.ok) setApps(await appRes.json());
      if (dockerRes && dockerRes.ok) {
        const d = await dockerRes.json();
        setDockerContainers(Array.isArray(d) ? d : []);
      }
      if (pm2Res && pm2Res.ok) {
        const p = await pm2Res.json();
        setPm2Apps(Array.isArray(p) ? p : []);
      }
      if (setRes && setRes.ok) {
        const s = await setRes.json();
        const tk = s.find((x: any) => x.key === 'CF_API_TOKEN')?.value || '';
        const z = s.find((x: any) => x.key === 'CF_ZONE_ID')?.value || '';
        setCfToken(tk);
        setCfZone(z);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingApp.id;
    const url = isNew ? `${BASE()}/api/applications` : `${BASE()}/api/applications/${editingApp.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    await fetch(url, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingApp)
    });
    setEditingApp(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this app from managed list? (This will NOT stop the actual process/container)')) return;
    await fetch(`${BASE()}/api/applications/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchData();
  };
  
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    await fetch(`${BASE()}/api/settings`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'CF_API_TOKEN', value: cfToken })
    });
    await fetch(`${BASE()}/api/settings`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'CF_ZONE_ID', value: cfZone })
    });
    setSavingSettings(false);
    alert('Settings saved successfully!');
  };

  const adoptPm2Container = (p: any) => {
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

  const adoptContainer = (c: any) => {
    const name = c.Names?.[0]?.replace('/', '') || 'Unknown';
    setEditingApp({
      name: name,
      runtime: 'docker',
      identifier: c.Id?.substring(0, 12) || '',
      internalHost: '127.0.0.1',
      internalPort: c.Ports?.[0]?.PublicPort || 80,
      publicDomain: name.toLowerCase() + '.example.com',
      proxyEnabled: 0,
      cfEnabled: 0
    });
    setActiveTab('managed');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 text-gray-800">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex-1 text-center font-medium pr-[90px] flex items-center justify-center">
          <Server size={18} className="mr-2 text-blue-500" /> App Manager
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between shrink-0">
        <div className="flex space-x-1">
          <button onClick={() => { setActiveTab('managed'); setEditingApp(null); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'managed' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Managed Apps</button>
          <button onClick={() => { setActiveTab('discovery'); setEditingApp(null); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'discovery' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Discovery</button>
          <button onClick={() => { setActiveTab('settings'); setEditingApp(null); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Settings</button>
        </div>
        <div className="flex space-x-2">
          <button onClick={fetchData} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors" title="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          {activeTab === 'managed' && !editingApp && (
            <button onClick={() => setEditingApp({ name: '', runtime: 'systemd', identifier: '', internalHost: '127.0.0.1', internalPort: 8080, publicDomain: '', proxyEnabled: 0, cfEnabled: 0 })} className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
              <Plus size={14} className="mr-1" /> Add App
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {editingApp ? (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">{editingApp.id ? 'Edit Application' : 'Add Application'}</h2>
            <form onSubmit={handleSaveApp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">App Name</label>
                  <input required value={editingApp.name} onChange={e => setEditingApp({...editingApp, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="e.g. WhatsMoney" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Runtime</label>
                  <select value={editingApp.runtime} onChange={e => setEditingApp({...editingApp, runtime: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="docker">Docker</option>
                    <option value="pm2">PM2</option>
                    <option value="systemd">Systemd</option>
                    <option value="static">Static/Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Process Identifier (Container/Service Name)</label>
                  <input required value={editingApp.identifier} onChange={e => setEditingApp({...editingApp, identifier: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="e.g. whatsmoney-web" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Internal Target (Host:Port)</label>
                  <div className="flex space-x-2">
                    <input value={editingApp.internalHost} onChange={e => setEditingApp({...editingApp, internalHost: e.target.value})} className="w-2/3 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="127.0.0.1" />
                    <input type="number" required value={editingApp.internalPort} onChange={e => setEditingApp({...editingApp, internalPort: parseInt(e.target.value)})} className="w-1/3 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="3000" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Public Domain</label>
                  <input required value={editingApp.publicDomain} onChange={e => setEditingApp({...editingApp, publicDomain: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="e.g. app.example.com" />
                </div>
                <div className="col-span-2 flex items-center space-x-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={!!editingApp.proxyEnabled} onChange={e => setEditingApp({...editingApp, proxyEnabled: e.target.checked ? 1 : 0})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span className="text-sm font-medium">Enable Reverse Proxy Config</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={!!editingApp.cfEnabled} onChange={e => setEditingApp({...editingApp, cfEnabled: e.target.checked ? 1 : 0})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span className="text-sm font-medium text-orange-600">Cloudflare Proxy (DNS)</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setEditingApp(null)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors flex items-center"><Save size={16} className="mr-2" /> Save Config</button>
              </div>
            </form>
          </div>
        ) : activeTab === 'managed' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">{app.name}</h3>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Box size={12} className="mr-1" /> {app.runtime.toUpperCase()} • {app.identifier}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wide">Managed</span>
                </div>
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center"><Globe size={14} className="mr-2" /> Domain</span>
                    <a href={`https://${app.publicDomain}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center">{app.publicDomain} <ExternalLink size={12} className="ml-1" /></a>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center"><Server size={14} className="mr-2" /> Target</span>
                    <span className="font-mono text-gray-700">{app.internalHost}:{app.internalPort}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center"><ShieldCheck size={14} className="mr-2" /> Routing</span>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${app.proxyEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>Proxy</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${app.cfEnabled ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>CF</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex space-x-1">
                    
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

                    <button onClick={() => handleAction(app.id, 'restart')} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Restart"><RotateCw size={14} /></button>
                    <button onClick={() => handleViewLogs(app.id, app.name)} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Logs"><FileText size={14} /></button>
                  </div>
                  <div className="flex space-x-2">
                  <button onClick={() => setEditingApp(app)} className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors">Configure</button>
                  <button onClick={() => handleDelete(app.id)} className="px-3 py-1.5 text-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
            {apps.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 flex flex-col items-center">
                <Server size={48} className="text-gray-300 mb-4" />
                <p className="text-lg mb-2">No Managed Applications</p>
                <p className="text-sm">Go to Discovery to adopt running containers, or add manually.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'discovery' ? (
          <div>
            
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
                          <span className={`px-2 py-0.5 ${p.pm2_env?.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-[10px] font-bold uppercase rounded-full`}>{p.pm2_env?.status}</span>
                        </td>
                        <td className="py-2 px-4 text-right flex justify-end items-center space-x-1">
                          
                          {p.pm2_env?.status === 'online' ? (
                            <button onClick={() => handleDiscoveryAction('pm2', p.name, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                          ) : (
                            <button onClick={() => handleDiscoveryAction('pm2', p.name, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          )}
                          <button onClick={() => handleDiscoveryAction('pm2', p.name, 'restart')} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Restart"><RotateCw size={14} /></button>
                          <button onClick={() => handleDiscoveryLogs('pm2', p.name, p.name)} className="p-1 text-gray-600 hover:bg-gray-200 rounded" title="Logs"><FileText size={14} /></button>
                          
                          <div className="w-px h-4 bg-gray-300 mx-2"></div>
                          
                          {isManaged ? (
                            <span className="text-xs text-gray-400 font-medium italic px-2">Managed</span>
                          ) : (
                            <button onClick={() => adoptPm2Container(p)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium text-xs border border-blue-200">Adopt</button>
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
            
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center"><Box size={16} className="mr-2" /> Running Docker Containers</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <th className="py-2 px-4 font-medium">Container</th>
                    <th className="py-2 px-4 font-medium">Image</th>
                    <th className="py-2 px-4 font-medium">Ports</th>
                    <th className="py-2 px-4 font-medium">Status</th>
                    <th className="py-2 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dockerContainers.map(c => {
                    const name = c.Names?.[0]?.replace('/', '') || 'Unknown';
                    const isManaged = apps.some(a => a.identifier === c.Id?.substring(0, 12) || a.identifier === name);
                    return (
                      <tr key={c.Id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium text-gray-800">{name}</td>
                        <td className="py-2 px-4 text-gray-500 truncate max-w-[200px]">{c.Image}</td>
                        <td className="py-2 px-4 text-gray-500 font-mono text-xs">
                          {(c.Ports || []).map((p: any) => p.PublicPort ? `${p.PublicPort}->${p.PrivatePort}` : p.PrivatePort).join(', ')}
                        </td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">{c.State}</span>
                        </td>
                        <td className="py-2 px-4 text-right flex justify-end items-center space-x-1">
                          
                          {c.State === 'running' ? (
                            <button onClick={() => handleDiscoveryAction('docker', c.Id, 'stop')} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                          ) : (
                            <button onClick={() => handleDiscoveryAction('docker', c.Id, 'start')} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                          )}
                          <button onClick={() => handleDiscoveryAction('docker', c.Id, 'restart')} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Restart"><RotateCw size={14} /></button>
                          <button onClick={() => handleDiscoveryLogs('docker', c.Id, name)} className="p-1 text-gray-600 hover:bg-gray-200 rounded" title="Logs"><FileText size={14} /></button>
                          
                          <div className="w-px h-4 bg-gray-300 mx-2"></div>
                          
                          {isManaged ? (
                            <span className="text-xs text-gray-400 font-medium italic px-2">Managed</span>
                          ) : (
                            <button onClick={() => adoptContainer(c)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium text-xs border border-blue-200">Adopt</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {dockerContainers.length === 0 && (
                    <tr><td colSpan={5} className="py-4 px-4 text-center text-gray-500">No containers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h2 className="text-lg font-semibold flex items-center">
                <Settings size={18} className="mr-2" /> Cloudflare Integration
              </h2>
              <button type="button" onClick={(e) => { e.preventDefault(); setShowTips(!showTips); }} className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium transition-colors">
                <HelpCircle size={16} className="mr-1" /> {showTips ? 'Hide Tips' : 'Deployment Tips'}
              </button>
            </div>
            
            {showTips && (
              <div className="mb-6 bg-blue-50/50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
                <h4 className="font-bold flex items-center mb-3"><Info size={16} className="mr-2" /> Choose Your Deployment Model</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                    <div className="font-bold text-gray-800 mb-1">🌍 VPS (Public IP)</div>
                    <p className="text-gray-600 text-xs mb-2">For standard cloud servers with a direct public IP.</p>
                    <ol className="list-decimal pl-4 text-xs space-y-1 text-gray-700">
                      <li>Fill out the API Token & Zone ID below.</li>
                      <li>When Adopting an app, check <b>Cloudflare Proxy</b>.</li>
                      <li>NebuDesk will auto-create the DNS A-Records for you.</li>
                    </ol>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                    <div className="font-bold text-gray-800 mb-1">🏠 Homeserver / Proxmox LXC</div>
                    <p className="text-gray-600 text-xs mb-2">For servers behind NAT without a public IP (Zero Trust).</p>
                    <ol className="list-decimal pl-4 text-xs space-y-1 text-gray-700 mb-2">
                      <li>Do not use the API Token below. Instead, set up a <a href="https://one.dash.cloudflare.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center">CF Tunnel <ExtLink size={10} className="ml-0.5" /></a> manually.</li>
                      <li>Route a <b>Wildcard Domain</b> (*.domain.com) to your local Caddy port (localhost:80).</li>
                      <li>When Adopting, <b>UNCHECK</b> Cloudflare Proxy (DNS is handled by your tunnel).</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500 mb-6">
              Configure your Cloudflare API credentials here to allow NebuDesk to automatically manage DNS records when you enable Cloudflare Proxy on an application.
            </p>
            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Global API Key or Token</label>
                <input 
                  type="password"
                  value={cfToken}
                  onChange={e => setCfToken(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Bearer token or API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone ID</label>
                <input 
                  type="text"
                  value={cfZone}
                  onChange={e => setCfZone(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. 023e105f4ecef8ad9ca31a8372d0c353"
                />
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={savingSettings} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center">
                  <Save size={16} className="mr-2" /> {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      
      {viewingLogs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50 shrink-0">
              <h3 className="font-semibold text-gray-800 flex items-center"><FileText size={16} className="mr-2 text-gray-500" /> Logs: {viewingLogs.name}</h3>
              <button onClick={() => setViewingLogs(null)} className="p-1 hover:bg-gray-200 rounded-md text-gray-500"><X size={18} /></button>
            </div>
            <div className="flex-1 bg-[#1e1e1e] p-4 overflow-auto font-mono text-xs text-green-400 whitespace-pre-wrap select-text">
              {viewingLogs.logs}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
