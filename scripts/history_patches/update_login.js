const fs = require('fs');

const code = `import { useState, useEffect } from 'react';
import { User, ArrowRight, Wifi, Power, Keyboard, Loader2 } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch(\`http://\${window.location.hostname}:3030/api/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = await res.json();
        setError(data.error || 'Incorrect username or password');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="w-screen h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-[#1a1b26] via-[#24283b] to-[#16161e] text-white font-sans items-center select-none animate-in fade-in duration-1000">
      
      {/* Background Image/Overlay (Simulated Mac Wallpaper) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-60 mix-blend-overlay transition-opacity duration-1000"
        style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(122, 100, 255, 0.4), transparent 50%), radial-gradient(circle at bottom left, rgba(0, 200, 255, 0.3), transparent 50%)' }}
      ></div>
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[20px] z-0"></div>

      {/* Top Clock Area */}
      <div className="z-10 mt-[8vh] flex flex-col items-center">
        <h1 className="text-[80px] md:text-[100px] font-extralight tracking-tight leading-none drop-shadow-sm">
          {formatTime(time)}
        </h1>
        <p className="text-lg md:text-xl font-medium text-white/80 mt-1 drop-shadow-sm">
          {formatDate(time)}
        </p>
      </div>

      {/* Main Login Area */}
      <div className="z-10 flex-1 flex flex-col justify-center items-center w-full mb-[10vh]">
         
         {/* Avatar */}
         <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl mb-4 transition-transform hover:scale-105 duration-300">
           <User size={48} strokeWidth={1.5} className="text-white/90" />
         </div>
         
         {/* Username Display (If pre-filled) */}
         <h2 className="text-xl md:text-2xl font-medium mb-8 tracking-wide drop-shadow-sm">
           {username || 'NebuDesk User'}
         </h2>

         {/* Form */}
         <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-[280px] md:w-[320px]">
           
           {/* Username Pill */}
           <div className="relative group">
              <input 
                type="text" 
                placeholder="Username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full py-3 px-5 text-sm md:text-base text-white placeholder-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all shadow-lg" 
              />
           </div>
           
           {/* Password Pill with Integrated Arrow */}
           <div className="relative group flex items-center">
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full py-3 pl-5 pr-12 text-sm md:text-base text-white placeholder-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all shadow-lg" 
              />
              <button 
                type="submit" 
                disabled={loading || !password} 
                className="absolute right-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white transition-all flex items-center justify-center cursor-pointer"
                aria-label="Log In"
              >
                 {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              </button>
           </div>

           {/* Error Message */}
           <div className={\`text-center text-red-200 text-sm font-medium transition-all duration-300 h-6 \${error ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}\`}>
             {error}
           </div>
         </form>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-8 z-10 flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
         <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
           <Wifi size={18} />
         </div>
      </div>
      
      <div className="absolute bottom-8 right-8 z-10 flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
         <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
           <Keyboard size={18} />
         </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => window.location.reload()}>
         <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg group">
           <Power size={22} className="group-hover:text-red-400 transition-colors" />
         </div>
         <span className="text-[10px] uppercase tracking-widest mt-2 font-medium">Restart</span>
      </div>
      
    </div>
  );
}
`;

fs.writeFileSync('apps/web/src/Login.tsx', code);
