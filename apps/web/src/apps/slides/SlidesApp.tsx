import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Presentation } from 'lucide-react';

const BASE = () => `http://${window.location.hostname}:3001`;

interface SlideElement { id: string; type: 'text'; x: number; y: number; w: number; h: number; content: string; fontSize: number; color: string; bold: boolean; align: string; }
interface Slide { id: string; bg: string; elements: SlideElement[]; }

export default function SlidesApp() {
  const [docs, setDocs] = useState<any[]>([]);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const saveTimer = useRef<any>(null);

  const fetchDocs = async () => {
    const res = await fetch(`${BASE()}/api/docs?type=slide`, { credentials: 'include' });
    if (res.ok) setDocs(await res.json());
  };

  useEffect(() => { fetchDocs(); }, []);

  const createBlankSlide = (): Slide => ({
    id: crypto.randomUUID(),
    bg: '#ffffff',
    elements: [{ id: crypto.randomUUID(), type: 'text', x: 50, y: 150, w: 700, h: 80, content: 'Click to edit title', fontSize: 36, color: '#1a1a1a', bold: true, align: 'center' }]
  });

  const loadDoc = async (doc: any) => {
    const res = await fetch(`${BASE()}/api/docs/${doc.id}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setActiveDoc(data);
      try {
        const parsed = JSON.parse(data.content || '[]');
        setSlides(parsed.length ? parsed : [createBlankSlide()]);
      } catch { setSlides([createBlankSlide()]); }
      setCurrentSlide(0);
    }
  };

  const createDoc = async () => {
    const name = `Untitled Presentation ${docs.length + 1}`;
    const res = await fetch(`${BASE()}/api/docs`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'slide' })
    });
    if (res.ok) { const doc = await res.json(); await fetchDocs(); loadDoc(doc); }
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this presentation?')) return;
    await fetch(`${BASE()}/api/docs/${id}`, { method: 'DELETE', credentials: 'include' });
    if (activeDoc?.id === id) { setActiveDoc(null); setSlides([]); }
    fetchDocs();
  };

  const scheduleSave = useCallback((newSlides: Slide[]) => {
    if (!activeDoc) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`${BASE()}/api/docs/${activeDoc.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: JSON.stringify(newSlides) })
      });
    }, 1500);
  }, [activeDoc]);

  const updateSlides = (newSlides: Slide[]) => { setSlides(newSlides); scheduleSave(newSlides); };

  const addSlide = () => {
    const newSlides = [...slides, createBlankSlide()];
    updateSlides(newSlides);
    setCurrentSlide(newSlides.length - 1);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length === 1) return;
    const newSlides = slides.filter((_, i) => i !== idx);
    updateSlides(newSlides);
    setCurrentSlide(Math.min(currentSlide, newSlides.length - 1));
  };

  const updateElement = (slideIdx: number, elId: string, changes: Partial<SlideElement>) => {
    const newSlides = slides.map((s, i) => i !== slideIdx ? s : {
      ...s, elements: s.elements.map(el => el.id !== elId ? el : { ...el, ...changes })
    });
    updateSlides(newSlides);
  };

  const addTextElement = () => {
    const newEl: SlideElement = { id: crypto.randomUUID(), type: 'text', x: 100, y: 200, w: 400, h: 50, content: 'New text', fontSize: 18, color: '#333', bold: false, align: 'left' };
    const newSlides = slides.map((s, i) => i !== currentSlide ? s : { ...s, elements: [...s.elements, newEl] });
    updateSlides(newSlides);
    setSelectedEl(newEl.id);
  };

  const slide = slides[currentSlide];

  return (
    <div className="h-full flex flex-col bg-[#2d2d2d]">
      <div className="h-14 border-b border-gray-700 bg-[#3c3c3c] flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex-1 text-center font-medium text-gray-200 pr-[90px]">{activeDoc ? activeDoc.name : 'NebuSlides'}</div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: doc list */}
        <div className="w-52 bg-[#252525] border-r border-gray-700 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Presentations</span>
            <button onClick={createDoc} className="p-1 hover:bg-gray-700 rounded text-gray-300"><Plus size={14} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            {docs.map(doc => (
              <div key={doc.id} onClick={() => loadDoc(doc)} className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-700 group ${activeDoc?.id === doc.id ? 'bg-purple-900/40 border-r-2 border-purple-400' : ''}`}>
                <div className="flex items-center overflow-hidden">
                  <Presentation size={12} className="mr-2 text-gray-400 shrink-0" />
                  <span className="text-sm truncate text-gray-300">{doc.name}</span>
                </div>
                <button onClick={(e) => deleteDoc(doc.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 rounded"><Trash2 size={11} /></button>
              </div>
            ))}
            {docs.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-gray-500 text-sm mb-3">No presentations</p>
                <button onClick={createDoc} className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">Create Presentation</button>
              </div>
            )}
          </div>
        </div>

        {activeDoc ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Slide thumbnails */}
            <div className="w-36 bg-[#2d2d2d] border-r border-gray-700 overflow-y-auto flex flex-col p-2 space-y-2">
              {slides.map((s, i) => (
                <div key={s.id} onClick={() => setCurrentSlide(i)} className={`relative rounded overflow-hidden cursor-pointer border-2 ${currentSlide === i ? 'border-blue-400' : 'border-transparent hover:border-gray-500'}`}
                  style={{ background: s.bg, aspectRatio: '16/9' }}>
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">{i + 1}</div>
                  <button onClick={(e) => { e.stopPropagation(); deleteSlide(i); }} className="absolute top-0.5 right-0.5 opacity-0 hover:opacity-100 bg-red-500 rounded text-white p-0.5"><Trash2 size={8} /></button>
                </div>
              ))}
              <button onClick={addSlide} className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded p-2 text-gray-500 hover:border-gray-400 hover:text-gray-300 text-xs">
                <Plus size={14} className="mr-1" /> Slide
              </button>
            </div>

            {/* Canvas + toolbar */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Slide toolbar */}
              <div className="bg-[#3c3c3c] border-b border-gray-700 px-3 py-1.5 flex items-center space-x-2 shrink-0">
                <button onClick={addTextElement} className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500">+ Text</button>
                <div className="w-px h-4 bg-gray-600"></div>
                <label className="text-xs text-gray-400">BG:</label>
                <input type="color" value={slide?.bg || '#fff'} onChange={(e) => { const ns = slides.map((s, i) => i === currentSlide ? {...s, bg: e.target.value} : s); updateSlides(ns); }} className="w-6 h-5 cursor-pointer rounded" />
                <div className="flex-1"></div>
                <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft size={14} /></button>
                <span className="text-xs text-gray-400">{currentSlide + 1} / {slides.length}</span>
                <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>

              {/* Slide canvas */}
              <div className="flex-1 overflow-auto flex items-center justify-center bg-[#1e1e1e] p-8">
                {slide && (
                  <div className="relative shadow-2xl" style={{ width: 800, height: 450, background: slide.bg, flexShrink: 0 }}
                    onClick={() => setSelectedEl(null)}>
                    {slide.elements.map(el => (
                      <div key={el.id} className={`absolute cursor-move border-2 ${selectedEl === el.id ? 'border-blue-400' : 'border-transparent hover:border-blue-200'}`}
                        style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                        onClick={(e) => { e.stopPropagation(); setSelectedEl(el.id); }}>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateElement(currentSlide, el.id, { content: e.currentTarget.innerText })}
                          style={{ fontSize: el.fontSize, color: el.color, fontWeight: el.bold ? 'bold' : 'normal', textAlign: el.align as any, width: '100%', height: '100%', outline: 'none' }}
                          dangerouslySetInnerHTML={{ __html: el.content }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-gray-400 mb-4">Create a presentation to get started</p>
              <button onClick={createDoc} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">New Presentation</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
