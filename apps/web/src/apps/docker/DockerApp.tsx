import { useState, useEffect } from 'react';
import { Play, Square, RotateCw, Trash2, RefreshCw, Box } from 'lucide-react';

export default function DockerApp() {
  const [containers, setContainers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchContainers = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/docker/containers`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch containers');
      setContainers(await res.json());
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, action: string) => {
    if (action === 'remove' && !confirm('Are you sure you want to remove this container?')) return;
    
    setLoadingAction(`${id}-${action}`);
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
      const res = await fetch(`${baseUrl}/api/docker/containers/${id}/${action}`, { 
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} container`);
      }
      fetchContainers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white text-gray-800 text-sm font-sans select-none relative">
      <div className="h-14 border-b border-gray-200 bg-gray-50 flex items-center justify-between px-4 shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex items-center space-x-2 text-gray-700 nebudesk-no-drag font-semibold">
          <Box size={16} className="text-blue-500" />
          <span>Docker</span>
        </div>
        <div className="w-[90px] shrink-0 flex justify-end">
          <button 
            onClick={fetchContainers} 
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors nebudesk-no-drag"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 border-b border-red-100 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="py-2.5 px-4 font-semibold text-gray-600 border-b w-[220px]">Container</th>
              <th className="py-2.5 px-4 font-semibold text-gray-600 border-b">Image</th>
              <th className="py-2.5 px-4 font-semibold text-gray-600 border-b w-24">State</th>
              <th className="py-2.5 px-4 font-semibold text-gray-600 border-b w-32">Status</th>
              <th className="py-2.5 px-4 font-semibold text-gray-600 border-b w-36 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {containers.map(c => {
              const name = c.Names?.[0]?.replace(/^\//, '') || 'Unknown';
              const isRunning = c.State === 'running';
              const idPrefix = c.Id.substring(0, 12);
              
              return (
                <tr key={c.Id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-gray-800 truncate" title={name}>{name}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{idPrefix}</div>
                  </td>
                  <td className="py-2.5 px-4 text-gray-600 truncate max-w-[200px]" title={c.Image}>{c.Image}</td>
                  <td className="py-2.5 px-4">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isRunning ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                      {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>}
                      {c.State}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-500">{c.Status}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-center space-x-1">
                      {isRunning ? (
                        <button 
                          onClick={() => handleAction(c.Id, 'stop')}
                          disabled={loadingAction !== null}
                          className="p-1.5 rounded-md text-gray-500 hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
                          title="Stop Container"
                        >
                          <Square size={14} fill="currentColor" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAction(c.Id, 'start')}
                          disabled={loadingAction !== null}
                          className="p-1.5 rounded-md text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors"
                          title="Start Container"
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleAction(c.Id, 'restart')}
                        disabled={loadingAction !== null}
                        className="p-1.5 rounded-md text-gray-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        title="Restart Container"
                      >
                        <RotateCw size={14} />
                      </button>
                      
                      <div className="w-px h-4 bg-gray-200 mx-1"></div>
                      
                      <button 
                        onClick={() => handleAction(c.Id, 'remove')}
                        disabled={loadingAction !== null}
                        className="p-1.5 rounded-md text-gray-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                        title="Delete Container"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {containers.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <Box size={32} className="mx-auto mb-3 text-gray-300" />
                  <div className="text-sm font-medium">No Docker containers found</div>
                  <div className="text-xs mt-1">Make sure Docker is running on the host machine.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}