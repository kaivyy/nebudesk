const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

// The block to replace:
const targetBlock = `        {/* Nav Items */}
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
        </div>`;

const replacement = `        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto space-y-[2px] nebudesk-no-drag pb-4">
          <div className="mt-2 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">System</div>
          <button 
            onClick={() => setActiveTab('general')}
            className={\`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors \${activeTab === 'general' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}\`} style={{ width: 'calc(100% - 16px)' }}
          >
            <SettingsIcon size={16} className={\`\${activeTab === 'general' ? 'text-gray-700' : 'text-gray-500'}\`} />
            <span className="truncate text-left flex-1">General</span>
          </button>

          <button 
            onClick={() => setActiveTab('appearance')}
            className={\`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors \${activeTab === 'appearance' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}\`} style={{ width: 'calc(100% - 16px)' }}
          >
            <Palette size={16} className={\`\${activeTab === 'appearance' ? 'text-gray-700' : 'text-gray-500'}\`} />
            <span className="truncate text-left flex-1">Appearance</span>
          </button>

          <div className="mt-4 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Connections</div>
          <button 
            onClick={() => setActiveTab('network')}
            className={\`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors \${activeTab === 'network' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}\`} style={{ width: 'calc(100% - 16px)' }}
          >
            <Network size={16} className={\`\${activeTab === 'network' ? 'text-blue-500' : 'text-blue-400'}\`} />
            <span className="truncate text-left flex-1">Network</span>
          </button>
          
          <div className="mt-4 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Personal</div>
          <button 
            onClick={() => setActiveTab('account')}
            className={\`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-default select-none text-sm transition-colors \${activeTab === 'account' ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}\`} style={{ width: 'calc(100% - 16px)' }}
          >
            <User size={16} className={\`\${activeTab === 'account' ? 'text-gray-700' : 'text-gray-500'}\`} />
            <span className="truncate text-left flex-1">Account</span>
          </button>
        </div>`;

// Also fix the background color to match Finder perfectly: bg-[#f5f5f7] -> bg-[#f3f3f3]
code = code.replace(/bg-\[#f5f5f7\]/g, 'bg-[#f3f3f3]');
code = code.replace(targetBlock, replacement);

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
