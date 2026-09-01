const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

// Add User to lucide-react
code = code.replace(
  "Settings, Monitor, Network, HardDrive, Wifi, Shield, Sliders }",
  "Settings, Monitor, Network, HardDrive, Wifi, Shield, Sliders, User, Lock }"
);

// Add state for auth
code = code.replace(
  "const [status, setStatus] = useState('');",
  `const [status, setStatus] = useState('');
  const [username, setUsername] = useState('admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authStatus, setAuthStatus] = useState('');`
);

// Add 'account' tab
const tabTarget = `<button 
              onClick={() => setActiveTab('appearance')}
              className={\`w-full text-left px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors \${activeTab === 'appearance' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}\`}
            >
              <Sliders size={16} className="inline-block mr-2" /> Appearance
            </button>`;
const tabReplacement = tabTarget + `
            <button 
              onClick={() => setActiveTab('account')}
              className={\`w-full text-left px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors \${activeTab === 'account' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}\`}
            >
              <User size={16} className="inline-block mr-2" /> Account
            </button>`;
code = code.replace(tabTarget, tabReplacement);

// Add 'account' content
const handleAuthSave = `
  const handleAuthSave = async () => {
    try {
      setAuthStatus('Saving...');
      const baseUrl = \`http://\${window.location.hostname}:3030\`;
      const res = await fetch(\`\${baseUrl}/api/auth/profile\`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, currentPassword, newPassword })
      });
      if (res.ok) {
        setAuthStatus('Profile updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => setAuthStatus(''), 3000);
      } else {
        const err = await res.json();
        setAuthStatus('Error: ' + err.error);
      }
    } catch (e) {
      setAuthStatus('Failed to update.');
    }
  };
`;
code = code.replace("const handleSave = async () => {", handleAuthSave + "\n  const handleSave = async () => {");

const accountHtml = `
          {activeTab === 'account' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200">
              <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>
              
              <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center"><User size={16} className="mr-2"/> Profile</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full max-w-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              </section>

              <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center"><Lock size={16} className="mr-2"/> Change Password</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full max-w-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Leave blank if not changing"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full max-w-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              </section>

              <div className="pt-2 flex items-center justify-end space-x-4">
                {authStatus && <span className={\`text-sm animate-in fade-in \${authStatus.includes('Error') ? 'text-red-500' : 'text-gray-500'}\`}>{authStatus}</span>}
                <button 
                  onClick={handleAuthSave}
                  className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-sm transition-colors font-medium text-[13px]"
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}
`;
code = code.replace("{activeTab === 'network' && sysInfo && (", accountHtml + "\n          {activeTab === 'network' && sysInfo && (");

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
