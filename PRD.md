# PRD — WebLinux Desktop

Nama proyek: WebLinux Desktop
Versi PRD: 1.0
Target: Linux server headless yang dapat digunakan melalui browser sebagai desktop graphical environment ringan.
Primary UX: macOS-like desktop
Primary stack: React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Node.js + WebSocket + SQLite

---

## 1. Ringkasan Produk

WebLinux Desktop adalah aplikasi web yang memberikan pengalaman seperti desktop operating system melalui browser.

Pengguna membuka:
`https://desktop.example.com`

kemudian mendapatkan:
```text
┌──────────────────────────────────────────────────────────────┐
│ WebLinux   File  Edit  View  Window  Help       🔊 02:31    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│       📁 Home                 📁 Projects                    │
│                                                              │
│                                                              │
│                    ┌─────────────────────────┐               │
│                    │ ● ● ●   Terminal         │               │
│                    ├─────────────────────────┤               │
│                    │ $ ls                    │               │
│                    │ Documents Downloads     │               │
│                    │ projects                │               │
│                    │ $                       │               │
│                    └─────────────────────────┘               │
│                                                              │
│                                                              │
│                  📁    💻    📊    ⚙️    🗑️                  │
└──────────────────────────────────────────────────────────────┘
```
Linux tidak menjalankan GNOME, KDE, Cinnamon, XFCE, atau desktop environment lainnya.
Browser menjadi presentation layer.

---

## 2. Tujuan

**2.1 Tujuan utama**
1. Memberikan desktop Linux melalui browser.
2. Sangat ringan terhadap server.
3. Tidak membutuhkan Linux GUI.
4. Menyediakan filesystem manager.
5. Menyediakan terminal interaktif.
6. Menyediakan system monitoring.
7. Menyediakan Docker management.
8. Mendukung multiple windows.
9. Memiliki pengalaman seperti desktop modern.
10. Bisa digunakan dari PC, laptop, tablet, dan HP.

---

## 3. Non-goals

Versi pertama tidak bertujuan menjadi:
- OS baru.
- Linux distribution.
- full remote desktop seperti RDP.
- virtual machine manager.
- pengganti Proxmox.
- cloning macOS.
- menjalankan aplikasi Linux GUI melalui browser.

Contohnya:
- Firefox Linux GUI
- LibreOffice GUI
- GIMP GUI
tidak menjadi target MVP.
Aplikasi yang dibuat adalah web-native applications yang mengontrol Linux backend.

---

## 4. Prinsip Arsitektur

Prinsip utama:
> Browser menggambar desktop. Linux menyediakan resource dan command.

Bukan:
`Linux GUI` → `VNC` → `Browser`

Melainkan:
`Browser` → `React` → `WebSocket / REST` → `Node.js` → `Linux kernel/filesystem/process`

Ini menghindari overhead desktop environment dan remote framebuffer.

---

## 5. Technology Stack

**Frontend**
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- Lucide Icons
- xterm.js

Kenapa React?
Karena desktop memiliki state kompleks:
```text
Windows
├── position
├── size
├── z-index
├── minimized
├── maximized
├── focused
└── application state
```
React cocok untuk ini.

---

## 6. Backend

**Default:**
- Node.js
- TypeScript
- Fastify
- WebSocket

Backend bertanggung jawab atas:
- filesystem
- terminal
- process information
- system information
- Docker
- service management
- logs
- authentication
- WebSocket
- API

---

## 7. Database

**Gunakan:**
- SQLite

**ORM:**
- Prisma

Database menyimpan:
- users
- sessions
- settings
- desktop_preferences
- audit_logs

Jangan menyimpan file Linux ke database.

---

## 8. Deployment

Target deployment:
```text
Linux
├── Node.js
├── WebLinux backend
├── SQLite
└── WebLinux frontend
```

Reverse proxy:
- Nginx atau Caddy
- HTTPS wajib untuk deployment internet.

---

## 9. Desktop Architecture

Desktop memiliki layer:
```text
Desktop
│
├── MenuBar
│
├── DesktopIcons
│
├── WindowManager
│   ├── Finder
│   ├── Terminal
│   ├── System Monitor
│   ├── Settings
│   ├── Docker
│   └── Logs
│
└── Dock
```

---

## 10. Window Manager

Ini adalah komponen terpenting.

Setiap window mempunyai:
```typescript
interface DesktopWindow {
  id: string
  appId: string
  title: string
  x: number
  y: number
  width: number
  height: number
  minWidth: number
  minHeight: number
  zIndex: number
  minimized: boolean
  maximized: boolean
  focused: boolean
}
```

**Window behavior**
Harus mendukung:
- open
- close
- minimize
- maximize
- restore
- focus
- drag
- resize
- double-click title bar
- keyboard shortcuts
- multiple instances

Contoh: Finder #1, Finder #2, Terminal #1, Terminal #2 semuanya boleh terbuka bersamaan.

---

## 11. Window Rules

Ketika window dibuka: `newWindow()`
system memberikan: `zIndex = highestZIndex + 1`

Ketika window diklik: `focusWindow(id)`
maka: `zIndex = highestZIndex + 1`

Window aktif selalu berada paling depan.

---

## 12. Dragging

User dapat menyeret title bar.
Contoh:
`mousedown` → `drag start` → `pointer movement` → `update x/y` → `pointer release`

Gunakan Pointer Events.
Jangan menggunakan library drag yang terlalu berat jika tidak diperlukan.

---

## 13. Resizing

Window dapat di-resize dari:
- top, bottom, left, right
- top-left, top-right, bottom-left, bottom-right

Minimum:
- `width >= minWidth`
- `height >= minHeight`

---

## 14. Maximize

Ketika maximize:
`window.maximized = true`
Simpan ukuran sebelumnya: `previousBounds`

Ketika restore:
restore `previousBounds`

---

## 15. Minimize

Minimize tidak menghancurkan aplikasi.
Contoh: Terminal → `minimized=true` (State terminal tetap hidup).

---

## 16. Close

Close menghapus window dari WindowManager.
Untuk aplikasi yang memiliki session (contoh: Terminal WebSocket), backend harus menerima close/disconnect dan melakukan cleanup.

---

## 17. Desktop

Desktop background harus mendukung:
- wallpaper
- dark mode
- light mode
- custom wallpaper
- solid color
- gradient

Desktop icon:
- Home
- Computer
- Trash
- Applications

---

## 18. Menu Bar

Bagian atas:
```text
┌────────────────────────────────────────────────────────────┐
│ 🐧 WebLinux  File  Edit  View  Window  Help    WiFi 🔋 02:31│
└────────────────────────────────────────────────────────────┘
```

Menu dinamis berdasarkan aplikasi aktif.

---

## 19. Dock

Dock berada di bawah.
Default:
- Finder
- Terminal
- System Monitor
- Docker
- Files
- Settings

Behavior:
- click → open/focus
- click minimized → restore
- right-click → context menu
- indicator ketika app aktif
- optional auto-hide
- hover animation

---

## 20. Finder / File Manager

Aplikasi utama: Finder.
Namun jangan menggunakan nama/branding Apple dalam production. Nama internal: `Files` atau `WebFiles`.

---

## 21. Files UI

Layout:
```text
┌──────────────────────────────────────────────────────┐
│ ← → ↑    /home/user/Documents        🔍              │
├──────────────┬───────────────────────────────────────┤
│ Favorites    │                                       │
│              │ 📁 Projects                           │
│ Home         │ 📁 Documents                          │
│ Documents    │ 📁 Downloads                          │
│ Downloads    │ 📄 README.md                          │
│ Projects     │                                       │
├──────────────┴───────────────────────────────────────┤
│ 5 items                                             │
└──────────────────────────────────────────────────────┘
```

---

## 22. File Operations

MVP:
- list
- open folder
- back, forward, parent
- create folder
- create file
- rename
- delete
- copy, move
- upload, download
- refresh

---

## 23. File Metadata

Tampilkan: Name, Type, Size, Modified, Permissions, Owner.

---

## 24. File Preview

MVP preview:
`.txt, .md, .json, .js, .ts, .tsx, .css, .html, .log`
Preview berupa text editor/read-only viewer.
Binary files (image, video, audio, pdf) dapat ditambahkan kemudian.

---

## 25. File Upload

Drag & drop:
`PC` → `Browser` → `WebSocket/HTTP` → `Linux filesystem`
Progress:
`Uploading... ██████████████░░ 78%`

---

## 26. File Security

Backend tidak boleh membiarkan user meminta arbitrary filesystem path tanpa validasi.
Harus ada root restriction.

Contoh: `allowedRoot=/home/user`
Request: `/home/user/projects` (valid)
Request: `/etc/shadow` (ditolak jika di luar allowed root)
Path traversal (`../../etc/passwd`) harus selalu ditolak.

---

## 27. Terminal

Terminal merupakan aplikasi kedua yang wajib.
UI:
```text
┌──────────────────────────────────────────────┐
│ ● ● ●   Terminal                             │
├──────────────────────────────────────────────┤
│ Linux Web Terminal                           │
│                                              │
│ user@server:~$ ls                            │
│ Documents Downloads Projects                 │
│ user@server:~$                               │
└──────────────────────────────────────────────┘
```

---

## 28. Terminal Technology

Frontend: xterm.js
Backend: WebSocket
Linux: PTY

Backend membuat pseudo-terminal.
Alur: `xterm.js` → `WebSocket` → `Node.js` → `PTY` → `bash`

---

## 29. Terminal Requirements

Support:
- ANSI colors
- Ctrl+C, Ctrl+D, Ctrl+L
- tab completion
- resize
- shell history
- arrow keys
- paste, copy
- multiple terminals

---

## 30. Terminal Shell

Default shell: `$SHELL`
fallback: `/bin/bash`
Jangan hardcode `/bin/bash` jika `$SHELL` tersedia.

---

## 31. Terminal Security

Terminal adalah fitur high-risk.
Harus:
- authentication, authorization
- WebSocket authentication
- session expiration
- rate limiting
- audit log
- origin validation
- CSRF protection untuk HTTP API
- HTTPS
Jangan pernah menyediakan anonymous terminal.

---

## 32. System Monitor

Dashboard:
- CPU: `████████░░ 38%`
- Memory: `██████░░░░ 61%`
- Disk: `████░░░░░░ 42%`
- Network: `↓ 18.4 MB/s, ↑ 3.2 MB/s`

---

## 33. CPU

Tampilkan: total usage, per-core usage, load average, core count, CPU model
Refresh: 1 second

---

## 34. Memory

Tampilkan: total, used, available, cached, swap, swap used

---

## 35. Storage

Tampilkan: Filesystem, Size, Used, Available, Usage %, Mount point

---

## 36. Network

Tampilkan: Interface, IPv4, IPv6, RX, TX

---

## 37. Processes

Tabel: PID, Process, CPU, Memory, User, Status
Action: Kill (harus meminta konfirmasi)

---

## 38. Docker Manager

Jika Docker tersedia, aplikasi "Docker" menampilkan:
```text
┌──────────────────────────────────────────────┐
│ Containers                                   │
├──────────┬──────────┬───────────┬───────────┤
│ Name     │ Status   │ CPU       │ Memory    │
├──────────┼──────────┼───────────┼───────────┤
│ nextjs   │ Running  │ 4.2%      │ 312 MB    │
│ postgres │ Running  │ 1.2%      │ 190 MB    │
└──────────┴──────────┴───────────┴───────────┘
```

---

## 39. Docker Actions

MVP: list containers, start, stop, restart, logs, inspect, stats
Kemudian: exec, images, volumes, networks, compose

---

## 40. Services

Aplikasi "Services" menampilkan systemd services.
Actions: Start, Stop, Restart, Enable, Disable
MVP sebaiknya membatasi service yang dapat dimodifikasi.

---

## 41. Logs

Aplikasi "Logs", support: systemd journal, Docker logs, application logs, nginx logs
Streaming: WebSocket

---

## 42. Settings

Settings meliputi: Appearance, Desktop, Dock, Keyboard, Terminal, Files, Security, System.

---

## 43. Appearance

Support: Light, Dark, System
Wallpaper: Default, Custom, Solid, Gradient
Accent color: Blue, Purple, Green, Orange, Red

---

## 44. Keyboard Shortcuts

Default:
- Ctrl + Alt + T → Terminal
- Ctrl + W → close active window
- Alt + Tab → switch application
- Ctrl + Shift + F → Files
- Ctrl + Shift + S → System Monitor

---

## 45. Search

Global search: `⌘ / Ctrl + Space`
MVP: application search, filename search

---

## 46. Notifications

Notification system dengan jenis: info, success, warning, error.

---

## 47. Authentication

Login: Username, Password
Session: secure HTTP-only cookie
Jangan menyimpan authentication token sensitif di localStorage.

---

## 48. User Roles

MVP: admin, user
Admin: terminal, filesystem, Docker, system, services
User: restricted filesystem, terminal restricted, no system administration

---

## 49. Audit Log

Catat action sensitif: timestamp, user, IP, action, target, result.

---

## 50. REST API

Contoh endpoint: `/api/system`, `/api/files`, `/api/docker/containers`, dll.

---

## 51. WebSocket

Endpoint: `/ws`
Messages menggunakan JSON.

---

## 52. WebSocket Event Types

`terminal.input`, `terminal.output`, `docker.stats`, `system.update`, dll.

---

## 53. State Management

Gunakan Zustand.
Store terpisah: desktopStore, windowStore, terminalStore, settingsStore, notificationStore.

---

## 54. Performance Target

Target:
- Initial JS bundle: < 500 KB gzip
- Initial load: < 2 seconds pada LAN
- System monitor: 1 update/sec
- Terminal: low latency
- Desktop interaction: 60 FPS target

---

## 55. Mobile Support

Desktop harus tetap usable pada: `320px+`
Mobile mode memiliki launcher sederhana yang menampilkan icon aplikasi. Window dapat menjadi full-screen pada layar kecil.

---

## 56. Responsive Breakpoints

- mobile: < 640px
- tablet: 640-1024px
- desktop: > 1024px

---

## 57. Accessibility

Wajib: keyboard navigation, focus state, aria labels, readable contrast, reduced motion, screen reader labels.

---

## 58. Error Handling

Jika backend gagal, WebSocket otomatis reconnect dengan backoff (1s, 2s, 4s, 8s, max 30s).

---

## 59. Offline Behavior

Desktop shell tetap dapat ditampilkan jika koneksi backend hilang, namun app spesifik akan menampilkan "Backend unavailable".

---

## 60. Security Architecture

Wajib: HTTPS, Authentication, Authorization, Session management, Rate limiting, Input validation, Path validation, Command isolation, Audit logging, Origin validation.

---

## 61. Command Execution

Jangan `exec(userInput)` untuk semua hal. Gunakan allowlist (contoh: docker, systemctl, journalctl) dengan argument yang divalidasi.

---

## 62. Root Access

Default: WebLinux ≠ root. Backend harus dijalankan dengan least privilege.

---

## 63. Filesystem Security

Semua path harus di-normalize, resolve, validate. Cegah path traversal, symlink escape, dll.

---

## 64. Project Structure

```text
weblinux/
├── apps/
│   ├── web/ (frontend React/Vite)
│   └── server/ (backend Node.js/Fastify)
├── packages/
│   ├── types/
│   └── ui/
├── prisma/
├── docs/
└── README.md
```

---

## 65. Development Phases

- **Phase 1:** Desktop Shell
- **Phase 2:** Files
- **Phase 3:** Terminal
- **Phase 4:** System Monitor
- **Phase 5:** Docker
- **Phase 6:** Services & Logs
- **Phase 7:** Authentication
- **Phase 8:** Polish

---

## 73. MVP Definition

MVP dianggap selesai ketika user bisa login, melihat desktop, mengelola file, menggunakan terminal, mengelola window (drag/resize/dll), memantau system/Docker, dan bisa diakses via HP.

---

## 74. UX Target

Desktop harus terasa: macOS-inspired (bukan sekadar web admin dashboard).
Dashboard menggunakan sidebar dan tabel. WebLinux menggunakan Desktop, Windows, Dock, Menu bar.
