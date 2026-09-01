import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function TasksApp() {
  const [activeTab, setActiveTab] = useState<'processes' | 'performance'>('processes');
  
  // Processes State
  const [processes, setProcesses] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [confirmKill, setConfirmKill] = useState<number | null>(null);

  // Performance State
  const [stats, setStats] = useState<any>(null);

  const fetchProcesses = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/processes`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch processes');
      setProcesses(await res.json());
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchStats = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/system`, { credentials: 'include' });
      if (res.ok) setStats(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === 'processes') {
      fetchProcesses();
      const interval = setInterval(fetchProcesses, 2000);
      return () => clearInterval(interval);
    } else {
      fetchStats();
      const interval = setInterval(fetchStats, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const killProcess = async (pid: number) => {
    try {
      setStatus(`Killing PID ${pid}...`);
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/processes/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pid })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to kill process');
      }
      setStatus(`Successfully killed PID ${pid}`);
      setConfirmKill(null);
      fetchProcesses();
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setConfirmKill(null);
    }
  };

  const filteredProcesses = processes.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.pid.toString().includes(search) || 
    p.user.toLowerCase().includes(search.toLowerCase())
  );

  const formatBytes = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';

  return (
    <div className="h-full flex flex-col bg-white text-gray-800 text-sm font-sans select-none relative">
      <div className="h-14 border-b border-gray-200 bg-gray-50 flex items-center justify-between px-4 shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div> {/* Space for traffic lights */}
        
        <div className="flex items-center space-x-1 nebudesk-no-drag">
          <button 
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'processes' ? 'bg-white shadow-sm border border-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-200/50'}`} 
            onClick={() => setActiveTab('processes')}
          >
            Processes
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'performance' ? 'bg-white shadow-sm border border-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-200/50'}`} 
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
        </div>

        <div className="flex items-center nebudesk-no-drag">
          {activeTab === 'processes' && (
            <input
              type="text"
              placeholder="Search processes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-48 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          )}
        </div>
      </div>

      {(error || status) && activeTab === 'processes' && (
        <div className={`px-4 py-2 text-xs font-medium ${error || status.startsWith('Error') ? 'bg-red-50 text-red-600 border-b border-red-100' : 'bg-green-50 text-green-700 border-b border-green-100'}`}>
          {error || status}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white">
        {activeTab === 'processes' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-2 px-4 font-semibold text-gray-600 border-b w-24">PID</th>
                <th className="py-2 px-4 font-semibold text-gray-600 border-b">Name</th>
                <th className="py-2 px-4 font-semibold text-gray-600 border-b w-24">User</th>
                <th className="py-2 px-4 font-semibold text-gray-600 border-b w-24 text-right">CPU %</th>
                <th className="py-2 px-4 font-semibold text-gray-600 border-b w-24 text-right">Mem %</th>
                <th className="py-2 px-4 font-semibold text-gray-600 border-b w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesses.map(p => (
                <tr key={p.pid} className="border-b border-gray-100 hover:bg-blue-50/50 group transition-colors">
                  <td className="py-2 px-4 font-mono text-gray-500">{p.pid}</td>
                  <td className="py-2 px-4 font-medium text-gray-700 truncate max-w-[200px]" title={p.name}>{p.name}</td>
                  <td className="py-2 px-4 text-gray-500">{p.user}</td>
                  <td className="py-2 px-4 text-right text-gray-600">{p.cpu.toFixed(1)}</td>
                  <td className="py-2 px-4 text-right text-gray-600">{p.mem.toFixed(1)}</td>
                  <td className="py-2 px-4 text-center relative">
                    <button 
                      onClick={() => setConfirmKill(p.pid)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all inline-flex items-center"
                      title="Force Kill (SIGKILL)"
                    >
                      <AlertTriangle size={14} className="mr-1" />
                      Kill
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProcesses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic">No processes found matching "{search}"</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'performance' && stats && (
          <div className="p-6 space-y-8 max-w-4xl mx-auto">
            <div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-base font-bold text-gray-800">CPU Usage</h3>
                <span className="text-sm font-medium text-blue-600">{stats.cpu.currentLoad.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200">
                <div className="bg-blue-500 h-4 transition-all duration-500" style={{ width: `${stats.cpu.currentLoad}%` }}></div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mt-3">
                {stats.cpu.cores.map((c: number, i: number) => (
                  <div key={i} className="text-[10px] bg-gray-50 border border-gray-200 p-1.5 rounded text-center text-gray-600 shadow-sm">
                    Core {i}<br/><strong className="text-gray-800 text-xs">{c.toFixed(0)}%</strong>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-base font-bold text-gray-800">Memory</h3>
                <span className="text-sm font-medium text-green-600">{formatBytes(stats.memory.active)} / {formatBytes(stats.memory.total)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200">
                <div className="bg-green-500 h-4 transition-all duration-500" style={{ width: `${(stats.memory.active / stats.memory.total) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3">Storage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.storage.map((fs: any, i: number) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-semibold text-gray-700">{fs.mount} <span className="font-normal text-gray-400">({fs.type})</span></span>
                      <span className="text-purple-600 font-medium">{fs.use.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1 overflow-hidden">
                      <div className="bg-purple-500 h-2 transition-all duration-500" style={{ width: `${fs.use}%` }}></div>
                    </div>
                    <div className="text-[10px] text-gray-500 text-right">
                      {formatBytes(fs.used)} / {formatBytes(fs.size)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmKill !== null && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 nebudesk-no-drag">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-xs w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center text-red-700">
              <AlertTriangle className="mr-2" size={18} />
              <span className="font-semibold text-sm">Force Quit Process</span>
            </div>
            <div className="p-4 text-sm text-gray-700 leading-relaxed">
              Are you sure you want to force quit <strong>{processes.find(p => p.pid === confirmKill)?.name || 'this process'}</strong> (PID {confirmKill})?
              <div className="mt-2 text-xs text-gray-500">Unsaved changes may be lost.</div>
            </div>
            <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2 border-t border-gray-100">
              <button 
                onClick={() => setConfirmKill(null)}
                className="px-4 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => killProcess(confirmKill)}
                className="px-4 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium shadow-sm transition-colors"
              >
                Force Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
