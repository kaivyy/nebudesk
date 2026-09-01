import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function TasksApp() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [confirmKill, setConfirmKill] = useState<number | null>(null);

  const fetchProcesses = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/processes`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch processes');
      setProcesses(await res.json());
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 2000);
    return () => clearInterval(interval);
  }, []);

  const killProcess = async (pid: number) => {
    try {
      setStatus(`Killing PID ${pid}...`);
      const baseUrl = `http://${window.location.hostname}:3001`;
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

  return (
    <div className="h-full flex flex-col bg-white text-gray-800 text-sm font-sans select-none">
      <div className="h-14 border-b border-gray-200 bg-gray-50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center space-x-4">
          <h2 className="font-bold text-lg text-gray-700">Task Manager</h2>
          <button onClick={fetchProcesses} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search processes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {(error || status) && (
        <div className={`px-4 py-2 text-xs font-medium ${error || status.startsWith('Error') ? 'bg-red-50 text-red-600 border-b border-red-100' : 'bg-green-50 text-green-700 border-b border-green-100'}`}>
          {error || status}
        </div>
      )}

      <div className="flex-1 overflow-auto">
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
                  {confirmKill === p.pid ? (
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => killProcess(p.pid)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow-sm">Confirm</button>
                      <button onClick={() => setConfirmKill(null)} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded shadow-sm">Cancel</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmKill(p.pid)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all inline-flex items-center"
                      title="Force Kill (SIGKILL)"
                    >
                      <AlertTriangle size={14} className="mr-1" />
                      Kill
                    </button>
                  )}
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
      </div>
    </div>
  );
}
