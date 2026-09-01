import { useState } from 'react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://${window.location.hostname}:3030/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }), credentials: "include"
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-96">
        <h1 className="text-3xl font-bold mb-6 text-center">NebuDesk</h1>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          {error && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{error}</div>}
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="p-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="p-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
