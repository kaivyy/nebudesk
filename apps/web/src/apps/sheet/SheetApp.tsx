import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, BarChart2 } from 'lucide-react';

const BASE = () => `http://${window.location.hostname}:3030`;
const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROWS = Array.from({ length: 50 }, (_, i) => i + 1);

function evalFormula(formula: string, cells: Record<string, string>): string {
  if (!formula.startsWith('=')) return formula;
  try {
    const expr = formula.slice(1).toUpperCase();
    const rangeMatch = expr.match(/^(SUM|AVG|MAX|MIN)\(([A-Z])(\d+):([A-Z])(\d+)\)$/);
    if (rangeMatch) {
      const [, fn, c1, r1, c2, r2] = rangeMatch;
      const vals: number[] = [];
      for (let r = parseInt(r1); r <= parseInt(r2); r++) {
        for (let c = COLS.indexOf(c1); c <= COLS.indexOf(c2); c++) {
          const v = parseFloat(cells[`${COLS[c]}${r}`] || '0');
          if (!isNaN(v)) vals.push(v);
        }
      }
      if (fn === 'SUM') return String(vals.reduce((a, b) => a + b, 0));
      if (fn === 'AVG') return String(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
      if (fn === 'MAX') return String(Math.max(...vals));
      if (fn === 'MIN') return String(Math.min(...vals));
    }
    return '#ERROR';
  } catch { return '#ERROR'; }
}

export default function SheetApp() {
  const [docs, setDocs] = useState<any[]>([]);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const saveTimer = useRef<any>(null);

  const fetchDocs = async () => {
    const res = await fetch(`${BASE()}/api/docs?type=sheet`, { credentials: 'include' });
    if (res.ok) setDocs(await res.json());
  };

  useEffect(() => { fetchDocs(); }, []);

  const loadDoc = async (doc: any) => {
    const res = await fetch(`${BASE()}/api/docs/${doc.id}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setActiveDoc(data);
      try { setCells(JSON.parse(data.content || '{}')); } catch { setCells({}); }
    }
  };

  const createDoc = async () => {
    const name = `Untitled Sheet ${docs.length + 1}`;
    const res = await fetch(`${BASE()}/api/docs`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'sheet' })
    });
    if (res.ok) { const doc = await res.json(); await fetchDocs(); loadDoc(doc); }
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this sheet?')) return;
    await fetch(`${BASE()}/api/docs/${id}`, { method: 'DELETE', credentials: 'include' });
    if (activeDoc?.id === id) setActiveDoc(null);
    fetchDocs();
  };

  const scheduleSave = useCallback((newCells: Record<string, string>) => {
    if (!activeDoc) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`${BASE()}/api/docs/${activeDoc.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: JSON.stringify(newCells) })
      });
    }, 2000);
  }, [activeDoc]);

  const commitEdit = () => {
    if (!selected) return;
    const newCells = { ...cells, [selected]: editVal };
    if (!editVal) delete newCells[selected];
    setCells(newCells);
    scheduleSave(newCells);
    setEditing(false);
  };

  const handleCellKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
      const col = selected![0];
      const row = parseInt(selected!.slice(1));
      setSelected(`${col}${row + 1}`);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      const ci = COLS.indexOf(selected![0]);
      if (ci < COLS.length - 1) setSelected(`${COLS[ci + 1]}${selected!.slice(1)}`);
    } else if (e.key === 'Escape') {
      setEditing(false);
      setEditVal(cells[selected!] || '');
    }
  };

  const cellClick = (ref: string) => {
    if (editing && selected !== ref) commitEdit();
    setSelected(ref);
    setEditVal(cells[ref] || '');
    setEditing(false);
  };

  const cellDblClick = (ref: string) => {
    setSelected(ref);
    setEditVal(cells[ref] || '');
    setEditing(true);
  };

  const displayVal = (ref: string) => {
    const v = cells[ref] || '';
    return v.startsWith('=') ? evalFormula(v, cells) : v;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-14 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex-1 text-center font-medium text-gray-800 pr-[90px]">{activeDoc ? activeDoc.name : 'NebuSheet'}</div>
      </div>

      {/* Formula bar */}
      {activeDoc && (
        <div className="border-b border-gray-200 bg-white px-3 py-1 flex items-center space-x-2 shrink-0">
          <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono w-16 text-center text-gray-600">{selected || 'A1'}</div>
          <div className="text-gray-300">fx</div>
          <input value={editVal} onChange={(e) => { setEditVal(e.target.value); setEditing(true); }}
            onKeyDown={handleCellKey} onBlur={commitEdit}
            className="flex-1 text-sm font-mono focus:outline-none text-gray-800" placeholder="Enter value or formula..."
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sheets</span>
            <button onClick={createDoc} className="p-1 hover:bg-gray-200 rounded"><Plus size={14} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            {docs.map(doc => (
              <div key={doc.id} onClick={() => loadDoc(doc)} className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 group ${activeDoc?.id === doc.id ? 'bg-green-50 border-r-2 border-green-500' : ''}`}>
                <div className="flex items-center overflow-hidden">
                  <BarChart2 size={12} className="mr-2 text-gray-400 shrink-0" />
                  <span className="text-sm truncate">{doc.name}</span>
                </div>
                <button onClick={(e) => deleteDoc(doc.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 hover:text-red-500 rounded"><Trash2 size={11} /></button>
              </div>
            ))}
            {docs.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-gray-400 text-sm mb-3">No sheets yet</p>
                <button onClick={createDoc} className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600">Create Sheet</button>
              </div>
            )}
          </div>
        </div>

        {activeDoc ? (
          <div className="flex-1 overflow-auto">
            <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th className="w-12 h-6 bg-gray-100 border border-gray-300 sticky top-0 left-0 z-20"></th>
                  {COLS.map(c => <th key={c} className="w-24 h-6 bg-gray-100 border border-gray-300 text-center text-xs text-gray-600 font-semibold sticky top-0 z-10">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(r => (
                  <tr key={r}>
                    <td className="h-6 bg-gray-100 border border-gray-300 text-center text-xs text-gray-500 font-semibold sticky left-0">{r}</td>
                    {COLS.map(c => {
                      const ref = `${c}${r}`;
                      const isSelected = selected === ref;
                      return (
                        <td key={ref} className={`h-6 border border-gray-200 p-0 text-xs cursor-cell ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                          onClick={() => cellClick(ref)} onDoubleClick={() => cellDblClick(ref)}>
                          {isSelected && editing ? (
                            <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={handleCellKey} onBlur={commitEdit}
                              className="w-full h-full px-1 focus:outline-none font-mono text-xs" />
                          ) : (
                            <span className="px-1 truncate block">{displayVal(ref)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500 mb-4">Create a new spreadsheet to get started</p>
              <button onClick={createDoc} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">New Sheet</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
