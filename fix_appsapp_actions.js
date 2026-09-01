const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

// Add Lucide imports
code = code.replace(
  "Settings } from 'lucide-react';",
  "Settings, Play, Square, RotateCw, FileText, X } from 'lucide-react';"
);

// Add logs modal state
code = code.replace(
  "const [savingSettings, setSavingSettings] = useState(false);",
  "const [savingSettings, setSavingSettings] = useState(false);\n  const [viewingLogs, setViewingLogs] = useState<{name: string, logs: string} | null>(null);"
);

// Add action handlers
const fetchDataTarget = `  const fetchData = async () => {`;
const actionHandlers = `
  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(\`\${BASE()}/api/applications/\${id}/action\`, {
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
      const res = await fetch(\`\${BASE()}/api/applications/\${id}/logs\`, { credentials: 'include' });
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

`;
code = code.replace(fetchDataTarget, actionHandlers + fetchDataTarget);

// Add UI buttons in Managed Apps
const cardTarget = `<div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">`;
const cardReplacement = `<div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex space-x-1">
                    <button onClick={() => handleAction(app.id, 'start')} className="p-1.5 text-green-600 hover:bg-green-100 rounded" title="Start"><Play size={14} /></button>
                    <button onClick={() => handleAction(app.id, 'stop')} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Stop"><Square size={14} /></button>
                    <button onClick={() => handleAction(app.id, 'restart')} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Restart"><RotateCw size={14} /></button>
                    <button onClick={() => handleViewLogs(app.id, app.name)} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Logs"><FileText size={14} /></button>
                  </div>
                  <div className="flex space-x-2">`;
code = code.replace(new RegExp(cardTarget.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'g'), cardReplacement);

// Close the flex div added above
const configureTarget = `<button onClick={() => setEditingApp(app)} className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors">Configure</button>`;
code = code.replace(new RegExp(configureTarget.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'g'), configureTarget);
const trashTarget = `<button onClick={() => handleDelete(app.id)} className="px-3 py-1.5 text-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>\n                </div>`;
const trashReplacement = `<button onClick={() => handleDelete(app.id)} className="px-3 py-1.5 text-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>\n                  </div>\n                </div>`;
code = code.replace(new RegExp(trashTarget.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'g'), trashReplacement);

// Add Log Modal at the end
const endTarget = `</div>\n    </div>\n  );\n}`;
const endReplacement = `</div>
      
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
}`;
code = code.replace(endTarget, endReplacement);

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
