import { useState, useEffect, useRef, useCallback } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Plus, Trash2, Type } from 'lucide-react';

const BASE = () => `http://${window.location.hostname}:3030`;

export default function DocsApp({ initialPath }: { initialPath?: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<any>(null);

  const fetchDocs = async () => {
    const res = await fetch(`${BASE()}/api/docs?type=doc`, { credentials: 'include' });
    if (res.ok) setDocs(await res.json());
  };

  useEffect(() => { 
    if (initialPath) {
      const loadFsFile = async () => {
        try {
          const res = await fetch(`${BASE()}/api/files/content?p=${encodeURIComponent(initialPath)}`, { credentials: 'include' });
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
  }, [initialPath]);

  const loadDoc = async (doc: any) => {
    const res = await fetch(`${BASE()}/api/docs/${doc.id}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setActiveDoc(data);
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = data.content || '<p>Start writing...</p>';
      }, 50);
    }
  };

  const createDoc = async () => {
    const name = `Untitled Document ${docs.length + 1}`;
    const res = await fetch(`${BASE()}/api/docs`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'doc' })
    });
    if (res.ok) {
      const doc = await res.json();
      await fetchDocs();
      loadDoc(doc);
    }
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;
    await fetch(`${BASE()}/api/docs/${id}`, { method: 'DELETE', credentials: 'include' });
    if (activeDoc?.id === id) { setActiveDoc(null); }
    fetchDocs();
  };

  const scheduleSave = useCallback(() => {
    if (!activeDoc) return;
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const content = editorRef.current?.innerHTML || '';
      if (activeDoc.isFs) {
        await fetch(`${BASE()}/api/files/content`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: activeDoc.path, content })
        });
      } else {
        await fetch(`${BASE()}/api/docs/${activeDoc.id}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
      }
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1500);
  }, [activeDoc]);

  const fmt = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    scheduleSave();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-14 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex-1 text-center font-medium text-gray-800 pr-[90px]">
          {activeDoc ? activeDoc.name : 'NebuDocs'}
          {saving && <span className="ml-2 text-xs text-gray-400">Saving...</span>}
          {saved && <span className="ml-2 text-xs text-green-500">Saved</span>}
        </div>
      </div>

      {/* Formatting Toolbar */}
      {activeDoc && (
        <div className="border-b border-gray-200 bg-white px-4 py-1.5 flex items-center space-x-1 shrink-0">
          <button onMouseDown={(e) => { e.preventDefault(); fmt('bold'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Bold"><Bold size={14} /></button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('italic'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Italic"><Italic size={14} /></button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('underline'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Underline"><Underline size={14} /></button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('strikeThrough'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Strikethrough"><Strikethrough size={14} /></button>
          <div className="w-px h-5 bg-gray-300 mx-1"></div>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('formatBlock', 'h1'); }} className="px-2 py-1 text-xs font-bold hover:bg-gray-100 rounded">H1</button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('formatBlock', 'h2'); }} className="px-2 py-1 text-xs font-bold hover:bg-gray-100 rounded">H2</button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('formatBlock', 'h3'); }} className="px-2 py-1 text-xs font-bold hover:bg-gray-100 rounded">H3</button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('formatBlock', 'p'); }} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">¶</button>
          <div className="w-px h-5 bg-gray-300 mx-1"></div>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('insertUnorderedList'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Bullet List"><List size={14} /></button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('insertOrderedList'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Numbered List"><ListOrdered size={14} /></button>
          <div className="w-px h-5 bg-gray-300 mx-1"></div>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('justifyLeft'); }} className="p-1.5 hover:bg-gray-100 rounded"><AlignLeft size={14} /></button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('justifyCenter'); }} className="p-1.5 hover:bg-gray-100 rounded"><AlignCenter size={14} /></button>
          <button onMouseDown={(e) => { e.preventDefault(); fmt('justifyRight'); }} className="p-1.5 hover:bg-gray-100 rounded"><AlignRight size={14} /></button>
          <div className="w-px h-5 bg-gray-300 mx-1"></div>
          <select onMouseDown={(e) => e.stopPropagation()} onChange={(e) => fmt('fontSize', e.target.value)} className="text-xs border border-gray-200 rounded px-1 py-0.5" defaultValue="3">
            {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{[8,10,12,14,16,20,24][s-1]}px</option>)}
          </select>
          <input type="color" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => fmt('foreColor', e.target.value)} className="w-6 h-6 cursor-pointer rounded" title="Text Color" />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!initialPath && <div className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</span>
            <button onClick={createDoc} className="p-1 hover:bg-gray-200 rounded" title="New Document"><Plus size={14} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            {docs.map(doc => (
              <div key={doc.id} onClick={() => loadDoc(doc)} className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 group ${activeDoc?.id === doc.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`}>
                <div className="flex items-center overflow-hidden">
                  <Type size={12} className="mr-2 text-gray-400 shrink-0" />
                  <span className="text-sm truncate text-gray-800">{doc.name}</span>
                </div>
                <button onClick={(e) => deleteDoc(doc.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 hover:text-red-500 rounded"><Trash2 size={11} /></button>
              </div>
            ))}
            {docs.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-gray-400 text-sm mb-3">No documents yet</p>
                <button onClick={createDoc} className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Create Document</button>
              </div>
            )}
          </div>
        </div>}

        {/* Editor */}
        {activeDoc ? (
          <div className="flex-1 overflow-auto bg-gray-100 p-8">
            <div
              ref={editorRef}
              contentEditable
              onInput={scheduleSave}
              className="min-h-full bg-white shadow-md rounded p-12 max-w-4xl mx-auto focus:outline-none"
              style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: '1.8', color: '#1a1a1a', minHeight: '1000px' }}
              suppressContentEditableWarning
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-gray-500 mb-4">Select a document or create a new one</p>
              <button onClick={createDoc} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">New Document</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
