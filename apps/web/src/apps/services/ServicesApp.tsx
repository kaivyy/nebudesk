import { useState, useEffect, useRef } from 'react';

export default function ServicesApp() {
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const logsRef = useRef<HTMLPreElement>(null);

  const fetchServices = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/services`, { credentials: 'include' });
      if (res.ok) setServices(await res.json());
    } catch (err: any) {
      setError(err.message);
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
    <div className="h-full flex flex-col bg-white text-sm">
      <div className="h-14 border-b border-gray-200 bg-gray-50 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex-1 text-center font-semibold text-gray-700 pr-[90px]">Services</div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r flex flex-col nebudesk-no-drag">
        <div className="flex-1 overflow-auto">
          {error && <div className="p-2 text-red-500">{error}</div>}
          <div className="flex flex-col">
            {services.map(s => (
              <div 
                key={s.name} 
                onClick={() => setSelectedService(s.name)}
                className={`p-2 cursor-pointer border-b hover:bg-gray-100 flex items-center ${selectedService === s.name ? 'bg-blue-50 border-blue-200' : ''}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${s.active === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div className="flex-1 truncate">{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-2/3 flex flex-col bg-gray-900 text-gray-100">
        <div className="p-2 border-b border-gray-700 bg-gray-800 font-bold flex justify-between">
          <span>{selectedService ? `Logs: ${selectedService}` : 'Select a service to view logs'}</span>
        </div>
        <pre ref={logsRef} className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap">
          {logs || 'No logs available.'}
        </pre>
      </div>
    </div>
    </div>
  );
}
