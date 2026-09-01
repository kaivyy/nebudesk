import { useState, useEffect } from 'react';

export default function DockerApp() {
  const [containers, setContainers] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const baseUrl = `http://${window.location.hostname}:3001`;
        const res = await fetch(`${baseUrl}/api/docker/containers`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch containers');
        setContainers(await res.json());
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchContainers();
    const interval = setInterval(fetchContainers, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white text-sm">
      <div className="flex border-b bg-gray-50 px-4 py-2 font-bold">
        Docker Containers
      </div>
      {error && <div className="p-4 text-red-500">{error}</div>}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="pb-2">Name</th>
              <th className="pb-2">Image</th>
              <th className="pb-2">State</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {containers.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="py-2">{c.name}</td>
                <td>{c.image}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-xs text-white ${c.state === 'running' ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {c.state}
                  </span>
                </td>
                <td className="text-gray-500">{c.status}</td>
              </tr>
            ))}
            {containers.length === 0 && !error && <tr><td colSpan={4} className="py-4 text-center">No containers found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
