import { useState, useEffect } from 'react';

export default function SystemApp() {
  const [stats, setStats] = useState<any>(null);
  const [processes, setProcesses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = `http://${window.location.hostname}:3001`;
        if (activeTab === 'overview') {
          const res = await fetch(`${baseUrl}/api/system`, { credentials: 'include' });
          if (res.ok) setStats(await res.json());
        } else if (activeTab === 'processes') {
          const res = await fetch(`${baseUrl}/api/processes`, { credentials: 'include' });
          if (res.ok) setProcesses(await res.json());
        }
      } catch (e) {}
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const formatBytes = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';

  return (
    <div className="h-full flex flex-col bg-white text-sm">
      <div className="flex border-b border-gray-200 bg-gray-50 h-14 items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div> {/* Space for traffic lights */}
        <div className="flex-1 flex space-x-2 px-2">
          <button className={`nebudesk-no-drag px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'overview' ? 'bg-white shadow-sm border border-gray-200 text-black font-medium' : 'text-gray-600 hover:bg-gray-200/50'}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`nebudesk-no-drag px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'processes' ? 'bg-white shadow-sm border border-gray-200 text-black font-medium' : 'text-gray-600 hover:bg-gray-200/50'}`} onClick={() => setActiveTab('processes')}>Processes</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-2">CPU Usage ({stats.cpu.currentLoad.toFixed(1)}%)</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${stats.cpu.currentLoad}%` }}></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {stats.cpu.cores.map((c: number, i: number) => (
                  <div key={i} className="text-xs bg-gray-100 p-1 rounded text-center">Core {i}: {c.toFixed(0)}%</div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-2">Memory ({formatBytes(stats.memory.active)} / {formatBytes(stats.memory.total)})</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-green-500 h-4 rounded-full transition-all" style={{ width: `${(stats.memory.active / stats.memory.total) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Storage</h3>
              {stats.storage.map((fs: any, i: number) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{fs.mount} ({fs.type})</span>
                    <span>{fs.use.toFixed(1)}% ({formatBytes(fs.used)} / {formatBytes(fs.size)})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${fs.use}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'processes' && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="pb-2">PID</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">User</th>
                <th className="pb-2">CPU %</th>
                <th className="pb-2">Mem %</th>
              </tr>
            </thead>
            <tbody>
              {processes.map(p => (
                <tr key={p.pid} className="border-b hover:bg-gray-50">
                  <td className="py-1">{p.pid}</td>
                  <td>{p.name}</td>
                  <td>{p.user}</td>
                  <td>{p.cpu.toFixed(1)}</td>
                  <td>{p.mem.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
