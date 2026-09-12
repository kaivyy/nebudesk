import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Cpu } from 'lucide-react';

export default function ServicesApp() {
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const logsRef = useRef<HTMLPreElement>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/services`, { credentials: 'include' });
      if (res.ok) setServices(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (name: string) => {
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/services/logs?name=${encodeURIComponent(name)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchLogs(selectedService);
      const interval = setInterval(() => fetchLogs(selectedService), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedService]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-white text-sm font-sans select-none">
      <div className="h-14 border-b border-gray-200 bg-gray-50 flex items-center justify-between px-4 shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex items-center space-x-2 font-semibold text-gray-700 nebudesk-no-drag">
          <Cpu size={16} className="text-blue-500" />
          <span>Services Manager</span>
        </div>
        <div className="w-[90px] shrink-0 flex justify-end">
          <button 
            onClick={fetchServices}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors nebudesk-no-drag cursor-pointer"
            title="Refresh Services"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/30 nebudesk-no-drag">
          <div className="flex-1 overflow-auto">
            {error && <div className="p-3 text-red-600 bg-red-50 text-xs border-b border-red-100">{error}</div>}
            {loading && services.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">Memuat layanan...</div>
            ) : services.length === 0 ? (
              <div className="p-8 text-center text-gray-400 select-none">
                <Cpu size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium text-gray-500">Tidak ada layanan sistem</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {services.map(s => (
                  <div 
                    key={s.name} 
                    onClick={() => setSelectedService(s.name)}
                    className={`px-3 py-2.5 cursor-pointer border-b border-gray-100 hover:bg-gray-100 flex items-center transition-colors ${selectedService === s.name ? 'bg-blue-50 border-blue-200 font-medium' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2.5 shrink-0 ${s.active === 'active' ? 'bg-emerald-500 shadow-xs' : 'bg-gray-300'}`}></div>
                    <div className="flex-1 truncate text-xs text-gray-800">{s.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-2/3 flex flex-col bg-[#1e1e1e] text-gray-200">
          <div className="px-4 py-2 border-b border-[#333333] bg-[#252526] font-medium text-xs flex justify-between items-center text-gray-300">
            <span>{selectedService ? `Logs: ${selectedService}` : 'Pilih layanan di sebelah kiri untuk melihat log'}</span>
            {selectedService && <span className="text-[10px] text-gray-400 font-mono">Live Stream</span>}
          </div>
          <pre ref={logsRef} className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap text-gray-300 bg-[#1e1e1e] [scrollbar-width:thin]">
            {logs || 'Belum ada log yang tersedia.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
