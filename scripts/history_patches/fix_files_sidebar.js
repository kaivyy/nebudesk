const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

const targetSidebar = `          <div className="flex-1 overflow-y-auto py-2 space-y-1">
            <SidebarItem icon={Clock} label="Terbaru" path="/root" isActive={currentPath === '/root' && history.length === 1} />
            <SidebarItem icon={Users} label="Dibagikan" path="/root" isActive={false} />
            
            <div className="mt-4 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Favorit</div>
            <SidebarItem icon={AppWindow} label="Aplikasi" path="/root/Apps" isActive={currentPath === '/root/Apps'} />
            <SidebarItem icon={ArrowDownCircle} label="Unduhan" path="/root/Downloads" isActive={currentPath === '/root/Downloads'} />
            <SidebarItem icon={Monitor} label="Desktop" path="/root/Desktop" isActive={currentPath === '/root/Desktop'} />
            <SidebarItem icon={FileText} label="Dokumen" path="/root/Documents" isActive={currentPath === '/root/Documents'} />

            <div className="mt-4 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lokasi</div>
            <SidebarItem icon={Cloud} label="NebuCloud" path="/root" isActive={currentPath === '/root'} />
            <SidebarItem icon={Home} label="Home" path="/root" isActive={currentPath === '/root'} />
            <SidebarItem icon={HardDrive} label="System Root" path="/" isActive={currentPath === '/'} />
          </div>`;

const newSidebar = `          <div className="flex-1 overflow-y-auto py-2 space-y-1">
            <div className="mt-2 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Favorit</div>
            <SidebarItem icon={Home} label="Home" path="/root" isActive={currentPath === '/root'} />
            <SidebarItem icon={Monitor} label="NebuDesk" path="/root/nebudesk" isActive={currentPath === '/root/nebudesk'} />
            
            <div className="mt-4 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sistem</div>
            <SidebarItem icon={HardDrive} label="System Root" path="/" isActive={currentPath === '/'} />
            <SidebarItem icon={FolderOpen} label="Konfigurasi" path="/etc" isActive={currentPath === '/etc'} />
            <SidebarItem icon={Clock} label="Server Logs" path="/var/log" isActive={currentPath === '/var/log'} />
          </div>`;

code = code.replace(targetSidebar, newSidebar);
fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
