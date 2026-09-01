const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/docs/DocsApp.tsx', 'utf8');

code = code.replace(
  'export default function DocsApp() {',
  'export default function DocsApp({ initialPath }: { initialPath?: string }) {'
);

const fetchDocsEffect = `  const fetchDocs = async () => {
    const res = await fetch(\`\${BASE()}/api/docs?type=doc\`, { credentials: 'include' });
    if (res.ok) setDocs(await res.json());
  };

  useEffect(() => { fetchDocs(); }, []);`;

const newFetchDocsEffect = `  const fetchDocs = async () => {
    const res = await fetch(\`\${BASE()}/api/docs?type=doc\`, { credentials: 'include' });
    if (res.ok) setDocs(await res.json());
  };

  useEffect(() => { 
    if (initialPath) {
      const loadFsFile = async () => {
        try {
          const res = await fetch(\`\${BASE()}/api/files/content?p=\${encodeURIComponent(initialPath)}\`, { credentials: 'include' });
          if (res.ok) {
             const data = await res.json();
             const name = initialPath.split('/').pop() || '';
             setActiveDoc({ id: 'fs-' + initialPath, name, type: 'doc', isFs: true, path: initialPath });
             setTimeout(() => {
               if (editorRef.current) {
                 editorRef.current.innerHTML = data.content || '<p>Start writing...</p>';
               }
             }, 50);
          }
        } catch(e) {}
      };
      loadFsFile();
    } else {
      fetchDocs(); 
    }
  }, [initialPath]);`;

code = code.replace(fetchDocsEffect, newFetchDocsEffect);

const scheduleSaveStr = `  const scheduleSave = useCallback(() => {
    if (!activeDoc) return;
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const content = editorRef.current?.innerHTML || '';
      await fetch(\`\${BASE()}/api/docs/\${activeDoc.id}\`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1500);
  }, [activeDoc]);`;

const newScheduleSaveStr = `  const scheduleSave = useCallback(() => {
    if (!activeDoc) return;
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const content = editorRef.current?.innerHTML || '';
      if (activeDoc.isFs) {
        await fetch(\`\${BASE()}/api/files/content\`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: activeDoc.path, content })
        });
      } else {
        await fetch(\`\${BASE()}/api/docs/\${activeDoc.id}\`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
      }
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1500);
  }, [activeDoc]);`;

code = code.replace(scheduleSaveStr, newScheduleSaveStr);

// Hide sidebar if initialPath is present
const sidebarStart = `{/* Sidebar */}
        <div className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col">`;

const newSidebarStart = `{/* Sidebar */}
        {!initialPath && <div className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col">`;

const sidebarEnd = `</div>
            )}
          </div>
        </div>`;

const newSidebarEnd = `</div>
            )}
          </div>
        </div>}`;

code = code.replace(sidebarStart, newSidebarStart);
code = code.replace(sidebarEnd, newSidebarEnd);

fs.writeFileSync('apps/web/src/apps/docs/DocsApp.tsx', code);
