const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

// 1. Add HelpCircle to lucide-react imports if not there (it's not there)
code = code.replace(
  "Settings, Play, Square, RotateCw, FileText, X } from 'lucide-react';",
  "Settings, Play, Square, RotateCw, FileText, X, HelpCircle, Info, ExternalLink as ExtLink } from 'lucide-react';"
);

// 2. Add state for tips
code = code.replace(
  "const [viewingLogs, setViewingLogs] = useState<{name: string, logs: string} | null>(null);",
  "const [viewingLogs, setViewingLogs] = useState<{name: string, logs: string} | null>(null);\n  const [showTips, setShowTips] = useState(false);"
);

// 3. Inject the UI into the Settings tab
const targetSettingsHeader = `<h3 className="font-semibold text-gray-700 mb-4 flex items-center"><Globe size={18} className="mr-2" /> Cloudflare Integration</h3>`;
const replacementSettingsHeader = `<div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center"><Globe size={18} className="mr-2" /> Cloudflare Integration</h3>
              <button onClick={(e) => { e.preventDefault(); setShowTips(!showTips); }} className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium transition-colors">
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
            )}`;

code = code.replace(targetSettingsHeader, replacementSettingsHeader);

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
