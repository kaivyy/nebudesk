const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

// 1. Change outer container to flex-row
code = code.replace(
  `<div className="h-full flex flex-col bg-white text-gray-800 font-sans select-none" ref={containerRef}>`,
  `<div className="h-full flex flex-row bg-white text-gray-800 font-sans select-none" ref={containerRef}>`
);

// 2. Extract Sidebar Content
const sidebarStart = `{/* Sidebar */}`;
const sidebarContentRegex = /\{\/\* Sidebar \*\/\}[\s\S]*?(?=\{\/\* File List\/Grid \*\/)/;
const sidebarMatch = code.match(sidebarContentRegex);
if (!sidebarMatch) { console.error("Sidebar not found"); process.exit(1); }
const sidebarContentRaw = sidebarMatch[0];

// Rewrite Sidebar to include the drag region and top spacer
const newSidebar = `{/* Left Unified Sidebar & Chrome */}
    <div className="w-56 bg-[#f3f3f3] flex-shrink-0 flex flex-col border-r border-gray-200 nebudesk-drag-region h-full relative z-10">
      {/* Traffic Light Spacer (Window.tsx absolute lights sit here) */}
      <div className="h-14 shrink-0 pointer-events-none border-b border-transparent"></div>
      
      <div className="flex-1 overflow-y-auto py-2 space-y-1 nebudesk-no-drag">
${sidebarContentRaw.replace(/\{\/\* Sidebar \*\/\}\n\s*<div className="w-52[^>]*>\n\s*<div className="flex-1[^>]*>/, '').replace(/<\/div>\n\s*<\/div>\n\s*$/, '')}
      </div>
    </div>
`;

// 3. Extract Toolbar Content
const toolbarContentRegex = /\{\/\* Toolbar \*\/\}[\s\S]*?(?=\{\/\* Error \*\/|\{\/\* Main Content Area \*\/)/;
const toolbarMatch = code.match(toolbarContentRegex);
const toolbarContentRaw = toolbarMatch[0];

// Remove the spacer for traffic lights from Toolbar
const newToolbar = toolbarContentRaw.replace(`<div className="w-[70px] shrink-0"></div> {/* Spacer for traffic lights */}`, '');

// 4. Extract Main Content (File List/Grid)
const mainContentRegex = /\{\/\* File List\/Grid \*\/\}[\s\S]*?(?=\{\/\* Prompt Modal \*\/|\{\/\* Context Menu \*\/)/;
const mainMatch = code.match(mainContentRegex);
const mainContentRaw = mainMatch[0];

// 5. Extract Error banner
const errorRegex = /\{\/\* Error \*\/\}[\s\S]*?(?=\{\/\* Main Content Area \*\/)/;
let errorRaw = '';
const errMatch = code.match(errorRegex);
if (errMatch) errorRaw = errMatch[0];
else {
  const genericErrMatch = code.match(/\{error && <div[^>]*>\{error\}<\/div>\}/);
  if (genericErrMatch) errorRaw = genericErrMatch[0];
}

// 6. Build the new structure
const newStructure = `    ${newSidebar}

    {/* Right Main Area */}
    <div className="flex-1 flex flex-col overflow-hidden h-full z-0 bg-white">
      ${newToolbar}
      ${errorRaw}
      ${mainContentRaw}
    </div>
`;

// 7. Replace everything from Toolbar to just before Prompt Modal
const replaceStart = code.indexOf(`{/* Toolbar */}`);
const replaceEnd = code.indexOf(`{/* Prompt Modal */}`) > -1 ? code.indexOf(`{/* Prompt Modal */}`) : code.indexOf(`{/* Context Menu */}`);
const oldSection = code.substring(replaceStart, replaceEnd);

code = code.replace(oldSection, newStructure);

fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
console.log("Success");
