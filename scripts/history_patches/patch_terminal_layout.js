const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const target = `            {/* Panel Header */}
            <div className="flex items-center px-4 h-9 shrink-0 bg-[#1e1e1e]">
              <div className="text-[11px] uppercase tracking-wider text-gray-300 border-b border-blue-500 h-full flex items-center px-2 mr-4 shrink-0">Terminal</div>
              
              <div className="flex-1 flex items-center space-x-1 h-full overflow-x-auto [scrollbar-width:none]">
                {terminals.map(t => (
                  <div key={t.id} onClick={() => setActiveTermId(t.id)} className={\`flex items-center space-x-2 h-full px-3 cursor-pointer text-xs group \${activeTermId === t.id ? 'bg-[#2d2d2d] text-white' : 'text-gray-400 hover:bg-[#2d2d2d]'}\`}>
                    <span>bash</span>
                    <button onClick={(e) => { e.stopPropagation(); killTerminal(t.id); }} className={\`p-0.5 rounded hover:bg-gray-600 \${activeTermId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2 ml-2 shrink-0">
                <button onClick={() => addTerminal(workspace)} className="text-gray-400 hover:text-white p-1 rounded"><Plus size={14}/></button>
                <button onClick={() => setShowBottomPanel(false)} className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
              </div>
            </div>
            {/* Terminal Container */}
            <div className="flex-1 p-2 min-h-0 pl-4 relative">
              {terminals.map(t => activeTermId === t.id && (
                 <IntegratedTerminal key={t.id} workspace={t.cwd} termId={\`\${winId}_integrated_\${t.id}\`} />
              ))}
            </div>`;

const newLayout = `            {/* Panel Header */}
            <div className="flex items-center px-4 h-9 shrink-0 bg-[#1e1e1e]">
              <div className="text-[11px] uppercase tracking-wider text-gray-300 border-b border-blue-500 h-full flex items-center px-2 mr-4 shrink-0">Terminal</div>
              
              <div className="flex-1"></div>

              <div className="flex items-center space-x-2 ml-2 shrink-0">
                <button onClick={() => addTerminal(workspace)} title="New Terminal" className="text-gray-400 hover:text-white p-1 rounded"><Plus size={14}/></button>
                {terminals.length === 1 && (
                  <button onClick={() => killTerminal(terminals[0].id)} title="Kill Terminal" className="text-gray-400 hover:text-white p-1 rounded"><Trash2 size={14}/></button>
                )}
                <button onClick={() => setShowBottomPanel(false)} title="Close Panel" className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
              </div>
            </div>
            {/* Terminal Container & Sidebar */}
            <div className="flex-1 min-h-0 flex relative">
              {/* Terminal Area */}
              <div className="flex-1 p-2 pl-4 relative min-h-0">
                {terminals.map(t => activeTermId === t.id && (
                   <IntegratedTerminal key={t.id} workspace={t.cwd} termId={\`\${winId}_integrated_\${t.id}\`} />
                ))}
              </div>
              
              {/* Multi-terminal Right Sidebar */}
              {terminals.length > 1 && (
                <div className="w-32 bg-[#1e1e1e] flex flex-col shrink-0 overflow-y-auto border-l border-[#333] [scrollbar-width:none]">
                  {terminals.map((t, idx) => (
                    <div 
                      key={t.id} 
                      onClick={() => setActiveTermId(t.id)} 
                      className={\`flex items-center justify-between px-2 py-1.5 cursor-pointer text-[11px] group \${activeTermId === t.id ? 'bg-[#2d2d2d] text-white border-l-2 border-blue-500' : 'text-gray-400 hover:bg-[#2a2d2e] border-l-2 border-transparent'}\`}
                    >
                      <div className="flex items-center truncate">
                        <TerminalSquare size={12} className="mr-2 opacity-70 shrink-0" />
                        <span className="truncate">bash</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); killTerminal(t.id); }} 
                        className={\`p-0.5 rounded hover:bg-gray-600 \${activeTermId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`}
                        title="Kill Terminal"
                      >
                        <Trash2 size={10}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>`;

code = code.replace(target, newLayout);
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
