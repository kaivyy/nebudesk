import { useState, useEffect } from 'react';
import { useWindowStore } from '../../stores/windowStore';

export default function SettingsApp() {
  const [theme, setTheme] = useState('system');
  const [wallpaper, setWallpaper] = useState('default');
  const [status, setStatus] = useState('');

  // Simulating loading current settings from an API if we had one for user preferences
  // For now, we'll just save them to local UI state and mock the persistence

  const handleSave = () => {
    setStatus('Settings saved (Mock)');
    setTimeout(() => setStatus(''), 2000);
  };

  return (
    <div className="h-full flex bg-[#f5f5f7] text-gray-800 text-sm font-sans select-none">
      {/* Sidebar */}
      <div className="w-48 bg-white border-r border-gray-200 flex flex-col py-4">
        <div className="px-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Settings
        </div>
        <div className="flex flex-col px-2 space-y-1">
          <button className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md text-sm shadow-sm">
            Appearance
          </button>
          <button className="flex items-center px-3 py-2 hover:bg-gray-100 text-gray-700 rounded-md text-sm transition-colors">
            Desktop
          </button>
          <button className="flex items-center px-3 py-2 hover:bg-gray-100 text-gray-700 rounded-md text-sm transition-colors">
            Security
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Appearance</h2>
        
        <div className="space-y-8 max-w-lg">
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Theme</h3>
            <div className="flex space-x-4">
              <label className="flex flex-col items-center space-y-2 cursor-pointer">
                <div className={`w-24 h-16 rounded-lg border-2 flex items-center justify-center bg-gray-100 ${theme === 'light' ? 'border-blue-500' : 'border-transparent'}`}>
                  <span className="text-gray-500 font-medium">Light</span>
                </div>
                <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} className="sr-only" />
                <span className="text-xs">Light</span>
              </label>
              <label className="flex flex-col items-center space-y-2 cursor-pointer">
                <div className={`w-24 h-16 rounded-lg border-2 flex items-center justify-center bg-gray-900 ${theme === 'dark' ? 'border-blue-500' : 'border-transparent'}`}>
                  <span className="text-white font-medium">Dark</span>
                </div>
                <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} className="sr-only" />
                <span className="text-xs">Dark</span>
              </label>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Wallpaper</h3>
            <select 
              value={wallpaper} 
              onChange={(e) => setWallpaper(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="default">Default Blue Gradient</option>
              <option value="solid-black">Solid Black</option>
              <option value="solid-gray">Solid Gray</option>
            </select>
          </section>

          <div className="pt-4 flex items-center justify-between">
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm transition-colors"
            >
              Apply Changes
            </button>
            {status && <span className="text-green-600 text-sm font-medium">{status}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
