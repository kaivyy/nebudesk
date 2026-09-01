import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Monitor, Network, Palette, User } from 'lucide-react';

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
    const [username, setUsername] = useState('admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authStatus, setAuthStatus] = useState('');

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

  
  const handleAuthSave = async () => {
    try {
      setAuthStatus('Saving...');
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, currentPassword, newPassword })
      });
      if (res.ok) {
        setAuthStatus('Profile updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => setAuthStatus(''), 3000);
      } else {
        const err = await res.json();
        setAuthStatus('Error: ' + err.error);
      }
    } catch (e) {
      setAuthStatus('Failed to update.');
    }
  };

  
  
  return (
    <div className="h-full flex flex-row bg-white font-sans text-[13px] text-gray-800 select-none">
      
      {/* Sidebar & Window Chrome */}
      <div className="w-[220px] bg-[#f3f3f3] flex-shrink-0 flex flex-col border-r border-transparent nebudesk-drag-region h-full relative z-10">
        
        {/* Traffic Light Spacer */}
        <div className="h-12 shrink-0 pointer-events-none"></div>

        {/* Search Bar (Fake) */}
        <div className="px-3 pb-3 shrink-0 nebudesk-no-drag">
          <div className="bg-white border border-gray-200 rounded-md px-2 py-1 flex items-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mr-2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Search" className="bg-transparent border-none outline-none text-xs w-full placeholder-gray-400 text-gray-700" />
          </div>
        </div>
        
        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto space-y-[2px] nebudesk-no-drag pb-4">
          <div className="mt-2 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">System</div>
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors ${activeTab === 'general' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}`} style={{ width: 'calc(100% - 16px)' }}
          >
            <SettingsIcon size={16} className={`${activeTab === 'general' ? 'text-gray-700' : 'text-gray-500'}`} />
            <span className="truncate text-left flex-1">General</span>
          </button>

          <button 
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors ${activeTab === 'appearance' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}`} style={{ width: 'calc(100% - 16px)' }}
          >
            <Palette size={16} className={`${activeTab === 'appearance' ? 'text-gray-700' : 'text-gray-500'}`} />
            <span className="truncate text-left flex-1">Appearance</span>
          </button>

          <div className="mt-4 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Connections</div>
          <button 
            onClick={() => setActiveTab('network')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors ${activeTab === 'network' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}`} style={{ width: 'calc(100% - 16px)' }}
          >
            <Network size={16} className={`${activeTab === 'network' ? 'text-blue-500' : 'text-blue-400'}`} />
            <span className="truncate text-left flex-1">Network</span>
          </button>
          
          <div className="mt-4 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Personal</div>
          <button 
            onClick={() => setActiveTab('account')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors ${activeTab === 'account' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}`} style={{ width: 'calc(100% - 16px)' }}
          >
            <User size={16} className={`${activeTab === 'account' ? 'text-gray-700' : 'text-gray-500'}`} />
            <span className="truncate text-left flex-1">Account</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white z-0 h-full">
        
        {/* Content Header */}
        <div className="h-14 flex items-center px-8 shrink-0 nebudesk-drag-region border-b border-transparent">
          <h1 className="text-lg font-semibold text-gray-800">
            {activeTab === 'general' && 'General'}
            {activeTab === 'appearance' && 'Appearance'}
            {activeTab === 'network' && 'Network'}
            {activeTab === 'account' && 'Account'}
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-8 pb-12 nebudesk-no-drag">
          {error && <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-md border border-red-100">{error}</div>}
          
          {activeTab === 'general' && sysInfo && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
              
              {/* About Box */}
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-[#f3f3f3] rounded-full flex items-center justify-center shrink-0 border border-gray-200/60 shadow-sm">
                  <Monitor size={40} className="text-gray-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1 text-gray-900">{sysInfo.os.hostname || 'NebuDesk Mac'}</h2>
                  <p className="text-sm text-gray-500 mb-2">{sysInfo.os.distro} {sysInfo.os.release} ({sysInfo.os.arch})</p>
                </div>
              </div>

              {/* iOS style grouped list */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-[13px]">
                <div className="flex px-4 py-3 border-b border-gray-100">
                  <div className="w-32 text-gray-500 font-medium">Processor</div>
                  <div className="flex-1 font-medium text-gray-900">{sysInfo.cpuInfo.brand}</div>
                </div>
                <div className="flex px-4 py-3 border-b border-gray-100">
                  <div className="w-32 text-gray-500 font-medium">Memory</div>
                  <div className="flex-1 font-medium text-gray-900">{formatBytes(sysInfo.memory.total, 0)}</div>
                </div>
                <div className="flex px-4 py-3">
                  <div className="w-32 text-gray-500 font-medium">Kernel</div>
                  <div className="flex-1 font-medium text-gray-900">{sysInfo.os.kernel}</div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mt-6 mb-2 px-1">Storage</h3>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
                {sysInfo.storage.map((disk: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1.5 items-center">
                      <span className="font-medium text-gray-900 truncate mr-2" title={disk.mount}>{disk.mount} <span className="text-gray-400 font-normal ml-1">({disk.type})</span></span>
                      <span className="text-gray-500 font-medium">{formatBytes(disk.use, 1)} / {formatBytes(disk.size, 1)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#0061e0] h-2.5 rounded-full" style={{ width: `${disk.use / disk.size * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-[13px]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="font-medium text-gray-900">Appearance</div>
                  <select value={theme} onChange={e => setTheme(e.target.value)} className="border-none bg-gray-100 rounded px-3 py-1 outline-none text-gray-700 font-medium cursor-pointer">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">Auto</option>
                  </select>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="font-medium text-gray-900">Wallpaper</div>
                  <select value={wallpaper} onChange={e => setWallpaper(e.target.value)} className="border-none bg-gray-100 rounded px-3 py-1 outline-none text-gray-700 font-medium cursor-pointer">
                    <option value="default">Ventura Graphic</option>
                    <option value="monterey">Monterey</option>
                    <option value="solid">Solid Color</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 px-1">Network Interfaces</h3>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-[13px]">
                {sysInfo?.network.map((net: any, i: number) => (
                  <div key={i} className="flex px-4 py-3 border-b border-gray-100 last:border-b-0 items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{net.iface}</div>
                      <div className="text-gray-500 font-mono text-[11px] mt-0.5">{net.mac}</div>
                    </div>
                    <div className="font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">{net.ip4}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
              
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 bg-gradient-to-b from-gray-200 to-gray-300 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-gray-300/50">
                  <User size={40} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1 text-gray-900">Local Admin</h2>
                  <p className="text-sm text-gray-500">Administrator</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-4">Change Credentials</h3>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleAuthSave(); }}>
                  <div className="flex items-center">
                    <label className="w-32 text-gray-500 font-medium text-[13px]">Username</label>
                    <input 
                      type="text" 
                      value={username} 
                      onChange={e => setUsername(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-32 text-gray-500 font-medium text-[13px]">Current Password</label>
                    <input 
                      type="password" 
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-32 text-gray-500 font-medium text-[13px]">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="pt-2 flex items-center justify-between">
                    <span className={`text-xs ${authStatus.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{authStatus}</span>
                    <button type="submit" className="bg-[#0061e0] hover:bg-blue-600 text-white px-4 py-1.5 rounded-md font-medium transition-colors shadow-sm text-[13px]">
                      Change Password...
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
