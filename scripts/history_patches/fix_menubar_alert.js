const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/MenuBar.tsx', 'utf8');

const stateTarget = `const [appleMenuOpen, setAppleMenuOpen] = useState(false);`;
const stateReplacement = stateTarget + `\n  const [aboutModal, setAboutModal] = useState(false);`;
code = code.replace(stateTarget, stateReplacement);

const alertTarget = `handleAction(() => alert('NebuDesk v1.0\\nWeb-based Headless Linux Desktop'))`;
const alertReplacement = `handleAction(() => setAboutModal(true))`;
code = code.replace(alertTarget, alertReplacement);

const jsxTarget = `      {/* Top Bar */}`;
const jsxReplacement = `      {/* About Modal */}
      {aboutModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999] backdrop-blur-[1px]" onClick={() => setAboutModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-72 overflow-hidden border border-gray-200 text-center p-6" onClick={e => e.stopPropagation()}>
            <img src="/icons/monitor.svg" alt="Logo" className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">NebuDesk</h2>
            <p className="text-xs text-gray-500 mb-4">Version 1.0 Alpha<br/>Web-based Headless Linux Desktop</p>
            <p className="text-[11px] text-gray-400 mb-6">Built to make server administration peaceful again.</p>
            <button onClick={() => setAboutModal(false)} className="px-6 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm">Close</button>
          </div>
        </div>
      )}

      {/* Top Bar */}`;
code = code.replace(jsxTarget, jsxReplacement);

fs.writeFileSync('apps/web/src/desktop/MenuBar.tsx', code);
