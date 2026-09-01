const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const newVersion = `## [v0.1.1] - 2026-09-02
### 🚀 Dependency Upgrades & Fixes
- **Port 5050 Fix**: Resolved an issue where the Vite frontend server failed to bind correctly to port 5050.
- **Bleeding-Edge Resources**: Verified and updated all core dependencies to their absolute latest versions (React v19.2.8, Vite v8.2.2, Tailwind v4.3.3). NebuDesk is now running on the most modern tech stack available!

`;

code = code.replace("All notable changes to this project will be documented in this file.\n\n", "All notable changes to this project will be documented in this file.\n\n" + newVersion);
fs.writeFileSync('CHANGELOG.md', code);
