const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

const target = `    </div>
  );
}`;

const replacement = `      {/* Alert Modal */}
      {alertModal && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-[100] backdrop-blur-[1px]" onClick={() => setAlertModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
              <h3 className="font-semibold text-sm text-red-700">Notice</h3>
            </div>
            <div className="p-4 text-sm text-gray-700 break-words">
              {alertModal}
            </div>
            <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button onClick={() => setAlertModal(null)} className="px-4 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
