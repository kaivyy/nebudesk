const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

const targetStr = `{error && <div className="px-4 py-2 text-red-500 bg-red-50 text-xs border-b border-red-100">{error}</div>}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">`;

const replacement = `{error && <div className="px-4 py-2 text-red-500 bg-red-50 text-xs border-b border-red-100">{error}</div>}

      {/* Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-gray-50/80 backdrop-blur-md border-r border-gray-200 flex flex-col pt-3 pb-2 select-none overflow-y-auto">
          <div className="px-4 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Favorites</div>
          <button onClick={() => navigate('/root')} className={\`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors \${currentPath === '/root' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}\`}>
            <Home size={16} className={\`mr-2 \${currentPath === '/root' ? 'text-white' : 'text-blue-500'}\`} /> <span className="truncate">Home</span>
          </button>
          <button onClick={() => navigate('/root/Documents')} className={\`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors mt-0.5 \${currentPath === '/root/Documents' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}\`}>
            <FileText size={16} className={\`mr-2 \${currentPath === '/root/Documents' ? 'text-white' : 'text-blue-500'}\`} /> <span className="truncate">Documents</span>
          </button>
          <button onClick={() => navigate('/root/Downloads')} className={\`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors mt-0.5 \${currentPath === '/root/Downloads' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}\`}>
            <Folder size={16} className={\`mr-2 \${currentPath === '/root/Downloads' ? 'text-white' : 'text-blue-500'}\`} /> <span className="truncate">Downloads</span>
          </button>
          
          <div className="px-4 mt-4 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Locations</div>
          <button onClick={() => navigate('/')} className={\`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors \${currentPath === '/' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}\`}>
            <HardDrive size={16} className={\`mr-2 \${currentPath === '/' ? 'text-white' : 'text-gray-500'}\`} /> <span className="truncate">Root</span>
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-auto p-4 bg-white">`;

code = code.replace(targetStr, replacement);

const targetEndStr = `        )}
      </div>

      {/* Context Menu */}`;

const replacementEnd = `        )}
        </div>
      </div>

      {/* Context Menu */}`;

code = code.replace(targetEndStr, replacementEnd);

fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
