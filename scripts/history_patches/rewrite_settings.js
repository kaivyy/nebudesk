const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

const targetRegex = /return \([\s\S]*\}\);\n\}/;

const newReturn = `return (
    <div className="h-full flex flex-row bg-white font-sans text-[13px] text-gray-800 select-none">
      
      {/* Sidebar & Window Chrome */}
      <div className="w-[220px] bg-[#f5f5f7] flex-shrink-0 flex flex-col border-r border-transparent nebudesk-drag-region h-full relative z-10">
        
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
        <div className="flex-1 overflow-y-auto px-2 space-y-[2px] nebudesk-no-drag pb-4">
          <button 
            onClick={() => setActiveTab('general')}
            className={\`w-full flex items-center px-2 py-1.5 rounded-md transition-colors \${activeTab === 'general' ? 'bg-[#0061e0] text-white' : 'hover:bg-gray-200 text-gray-900'}\`}
          >
            <div className={\`w-6 h-6 rounded flex items-center justify-center mr-2 shadow-sm \${activeTab === 'general' ? 'bg-white/20' : 'bg-gray-400'}\`}>
              <SettingsIcon size={14} className="text-white" />
            </div>
            <span className="font-medium">General</span>
          </button>

          <button 
            onClick={() => setActiveTab('appearance')}
            className={\`w-full flex items-center px-2 py-1.5 rounded-md transition-colors \${activeTab === 'appearance' ? 'bg-[#0061e0] text-white' : 'hover:bg-gray-200 text-gray-900'}\`}
          >
            <div className={\`w-6 h-6 rounded flex items-center justify-center mr-2 shadow-sm \${activeTab === 'appearance' ? 'bg-white/20' : 'bg-gradient-to-br from-indigo-500 to-purple-500'}\`}>
              <Palette size={14} className="text-white" />
            </div>
            <span className="font-medium">Appearance</span>
          </button>

          <button 
            onClick={() => setActiveTab('network')}
            className={\`w-full flex items-center px-2 py-1.5 rounded-md transition-colors \${activeTab === 'network' ? 'bg-[#0061e0] text-white' : 'hover:bg-gray-200 text-gray-900'}\`}
          >
            <div className={\`w-6 h-6 rounded flex items-center justify-center mr-2 shadow-sm \${activeTab === 'network' ? 'bg-white/20' : 'bg-blue-500'}\`}>
              <Network size={14} className="text-white" />
            </div>
            <span className="font-medium">Network</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('account')}
            className={\`w-full flex items-center px-2 py-1.5 rounded-md transition-colors \${activeTab === 'account' ? 'bg-[#0061e0] text-white' : 'hover:bg-gray-200 text-gray-900'}\`}
          >
            <div className={\`w-6 h-6 rounded flex items-center justify-center mr-2 shadow-sm \${activeTab === 'account' ? 'bg-white/20' : 'bg-gray-500'}\`}>
              <User size={14} className="text-white" />
            </div>
            <span className="font-medium">Account</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white z-0 h-full">
        
        {/* Content Header */}
        <div className="h-12 flex items-center px-8 shrink-0 nebudesk-drag-region">
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
                <div className="w-24 h-24 bg-[#f5f5f7] rounded-full flex items-center justify-center shrink-0 border border-gray-200/60 shadow-sm">
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
                      <div className="bg-[#0061e0] h-2.5 rounded-full" style={{ width: \`\${disk.use / disk.size * 100}%\` }}></div>
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
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
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
                    <span className={\`text-xs \${authStatus.includes('success') ? 'text-green-600' : 'text-red-500'}\`}>{authStatus}</span>
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
}`;

code = code.replace(targetRegex, newReturn);
fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
