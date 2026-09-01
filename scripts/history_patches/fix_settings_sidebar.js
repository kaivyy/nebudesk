const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

const target = `  return (
    <div className="h-full flex flex-col bg-white font-sans text-gray-800">
      {/* TitleBar */}
      <div className="h-14 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
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
                  className={\`flex items-center px-3 py-1.5 rounded-md text-[13px] transition-colors \${isActive ? 'bg-blue-500 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-800'}\`}
                >
                  <Icon size={16} className={\`mr-2 \${isActive ? 'text-white' : 'text-blue-500'}\`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-white">`;

const replacement = `  return (
    <div className="h-full flex flex-row bg-white font-sans text-gray-800">
      {/* Left Unified Sidebar & Chrome */}
      <div className="w-56 bg-gray-100/80 backdrop-blur-xl border-r border-gray-300 flex flex-col nebudesk-drag-region h-full shrink-0 z-10">
        <div className="h-14 shrink-0 pointer-events-none"></div>
        
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 nebudesk-no-drag">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={\`w-full flex items-center px-3 py-1.5 rounded-md text-[13px] transition-colors \${isActive ? 'bg-blue-500 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-800'}\`}
              >
                <Icon size={16} className={\`mr-2 \${isActive ? 'text-white' : 'text-blue-500'}\`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white z-0 h-full">
        {/* Main Toolbar */}
        <div className="h-14 flex items-center px-6 border-b border-gray-200 bg-white shrink-0 nebudesk-drag-region touch-none">
          <h1 className="font-semibold text-gray-800 text-sm">System Settings</h1>
        </div>
        
        <div className="flex-1 p-8 overflow-y-auto nebudesk-no-drag relative">`;

code = code.replace(target, replacement);

const endTarget = `        </div>
      </div>
    </div>
  );
}`;
const endReplacement = `        </div>
      </div>
    </div>
  );
}`;
code = code.replace(endTarget, endReplacement);

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
