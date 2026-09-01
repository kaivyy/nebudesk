import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Monitor, HardDrive, Network, Palette } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function SettingsApp() {
  const [activeTab, setActiveTab] = useState('general');
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [theme, setTheme] = useState('system');
  const [wallpaper, setWallpaper] = useState('default');
  const [status, setStatus] = useState('');

  // Fetch OS details
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const baseUrl = `http://${window.location.hostname}:3030`;
        const res = await fetch(`${baseUrl}/api/system`, { credentials: 'include' });
        if (res.ok) setSysInfo(await res.json());
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchInfo();
  }, []);

  // Fetch Desktop preferences
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const baseUrl = `http://${window.location.hostname}:3030`;
        const res = await fetch(`${baseUrl}/api/desktop`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.theme) setTheme(data.theme);
          if (data.wallpaper) setWallpaper(data.wallpaper);
        }
      } catch (err: any) {}
    };
    fetchPrefs();
  }, []);

  const handleSave = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
      await fetch(`${baseUrl}/api/desktop`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme, wallpaper })
      });
      setStatus('Settings saved!');
      useThemeStore.getState().fetchTheme();
      setTimeout(() => setStatus(''), 2000);
    } catch(e) {
      setStatus('Failed to save');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'network', label: 'Network', icon: Network },
  ];

  return (
    <div className="h-full flex flex-col bg-[#ececec] text-gray-800 text-sm font-sans select-none">
      {/* Unified Settings Titlebar */}
      <div className="h-14 border-b border-gray-300 flex items-center shrink-0 nebudesk-drag-region select-none touch-none bg-gradient-to-b from-gray-100 to-gray-200">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex-1 text-center font-medium text-gray-800 pr-[90px]">System Settings</div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-gray-100/80 backdrop-blur-xl border-r border-gray-300 flex flex-col py-4">
          <div className="flex flex-col px-3 space-y-1">
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center px-3 py-1.5 rounded-md text-[13px] transition-colors ${isActive ? 'bg-blue-500 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-800'}`}
                >
                  <Icon size={16} className={`mr-2 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-white">
          {error && <div className="p-4 mb-4 bg-red-100 text-red-600 rounded-lg">{error}</div>}
          
          {activeTab === 'general' && sysInfo && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200">
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center shrink-0 border border-gray-200 shadow-sm">
                  <Monitor size={48} className="text-gray-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-1 text-gray-900">{sysInfo.os.hostname || 'NebuDesk Mac'}</h2>
                  <p className="text-gray-500 mb-4">{sysInfo.os.distro} {sysInfo.os.release} ({sysInfo.os.arch})</p>
                  
                  <div className="space-y-3">
                    <div className="flex pb-2 border-b border-gray-100">
                      <div className="w-24 text-gray-500 font-medium text-right pr-4 shrink-0">Processor</div>
                      <div className="font-medium">{sysInfo.cpuInfo.brand}</div>
                    </div>
                    <div className="flex pb-2 border-b border-gray-100">
                      <div className="w-24 text-gray-500 font-medium text-right pr-4 shrink-0">Memory</div>
                      <div className="font-medium">{formatBytes(sysInfo.memory.total, 0)}</div>
                    </div>
                    <div className="flex pb-2 border-b border-gray-100">
                      <div className="w-24 text-gray-500 font-medium text-right pr-4 shrink-0">Kernel</div>
                      <div className="font-medium">{sysInfo.os.kernel}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="font-semibold mb-4 flex items-center"><HardDrive size={16} className="mr-2 text-gray-500"/> Storage</h3>
                {sysInfo.storage.map((disk: any, i: number) => (
                  <div key={i} className="mb-4 last:mb-0">
                    <div className="flex justify-between mb-2 items-center">
                      <span className="font-medium flex-1 truncate mr-2" title={disk.mount}>{disk.mount} <span className="text-gray-400 text-xs ml-1">({disk.type})</span></span>
                      <span className="text-gray-500 text-xs">{formatBytes(disk.size - disk.used)} available of {formatBytes(disk.size)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${disk.use}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200">
              <h2 className="text-2xl font-semibold mb-6">Appearance</h2>
              
              <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4">Theme</h3>
                <div className="flex space-x-6">
                  <label className="flex flex-col items-center space-y-3 cursor-pointer group">
                    <div className={`w-32 h-20 rounded-xl border-2 flex flex-col overflow-hidden bg-gray-100 shadow-sm transition-all ${theme === 'light' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 group-hover:border-blue-300'}`}>
                      <div className="h-4 bg-gray-200 w-full"></div>
                      <div className="flex-1 w-full bg-white"></div>
                    </div>
                    <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} className="sr-only" />
                    <span className="text-[13px] font-medium text-gray-700">Light</span>
                  </label>
                  <label className="flex flex-col items-center space-y-3 cursor-pointer group">
                    <div className={`w-32 h-20 rounded-xl border-2 flex flex-col overflow-hidden bg-gray-800 shadow-sm transition-all ${theme === 'dark' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700 group-hover:border-blue-400'}`}>
                      <div className="h-4 bg-gray-900 w-full"></div>
                      <div className="flex-1 w-full bg-[#1e1e1e]"></div>
                    </div>
                    <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} className="sr-only" />
                    <span className="text-[13px] font-medium text-gray-700">Dark</span>
                  </label>
                </div>
              </section>

              <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4">Desktop Picture</h3>
                <select 
                  value={wallpaper} 
                  onChange={(e) => setWallpaper(e.target.value)}
                  className="w-full max-w-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                >
                  <option value="default">macOS Big Sur Graphic</option>
                  <option value="solid-black">Solid Black</option>
                  <option value="solid-gray">Solid Gray</option>
                </select>
              </section>

              <div className="pt-2 flex items-center justify-end space-x-4">
                {status && <span className="text-gray-500 text-sm animate-in fade-in">{status}</span>}
                <button 
                  onClick={handleSave}
                  className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-sm transition-colors font-medium text-[13px]"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'network' && sysInfo && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
              <h2 className="text-2xl font-semibold mb-6">Network</h2>
              {sysInfo.network.map((net: any, i: number) => (
                <div key={i} className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex items-start space-x-4">
                  <div className={`p-2 rounded-full ${net.ip4 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                    <Network size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{net.iface}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${net.ip4 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {net.ip4 ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex"><span className="w-24 text-gray-400">IPv4 Address:</span> <span>{net.ip4 || 'None'}</span></div>
                      {net.ip6 && <div className="flex"><span className="w-24 text-gray-400">IPv6 Address:</span> <span>{net.ip6}</span></div>}
                      <div className="flex"><span className="w-24 text-gray-400">MAC Address:</span> <span>{net.mac || 'Unknown'}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
