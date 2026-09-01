const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/docs/DocsApp.tsx', 'utf8');

// 1. Change outer container to flex-row
code = code.replace(
  `<div className="h-full flex flex-col bg-white">`,
  `<div className="h-full flex flex-row bg-white">`
);

// 2. Extract Sidebar Content
const sidebarContentRegex = /\{\/\* Sidebar \*\/\}[\s\S]*?(?=<div className="flex-1 overflow-auto bg-gray-100">)/;
const sidebarMatch = code.match(sidebarContentRegex);
if (!sidebarMatch) { console.error("Sidebar not found"); process.exit(1); }
const sidebarContentRaw = sidebarMatch[0];

// Rewrite Sidebar to include the drag region and top spacer
const newSidebar = `{/* Left Unified Sidebar & Chrome */}
      {!initialPath && <div className="w-56 bg-gray-50 flex-shrink-0 flex flex-col border-r border-gray-200 nebudesk-drag-region h-full relative z-10">
        {/* Traffic Light Spacer (Window.tsx absolute lights sit here) */}
        <div className="h-14 shrink-0 pointer-events-none"></div>
${sidebarContentRaw.replace(/\{\/\* Sidebar \*\/\}\n\s*\{!initialPath && <div className="w-52[^>]*>/, '').replace(/<\/div>\n\s*$/, '')}
      </div>}
`;

// 3. Extract TitleBar Content
const titleBarRegex = /<div className="h-14 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">[\s\S]*?<\/div>\n\s*<\/div>/;
const titleBarMatch = code.match(titleBarRegex);
const titleBarContentRaw = titleBarMatch[0];
const newTitleBar = titleBarContentRaw.replace(`<div className="w-[90px] shrink-0"></div>`, '');

// 4. Extract Formatting Toolbar Content
const formatBarRegex = /\{\/\* Formatting Toolbar \*\/\}[\s\S]*?(?=<div className="flex-1 flex overflow-hidden">)/;
const formatBarMatch = code.match(formatBarRegex);
const formatBarRaw = formatBarMatch ? formatBarMatch[0] : '';

// 5. Build the new structure
const newStructure = `${newSidebar}

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full z-0 bg-white">
        ${newTitleBar}
        ${formatBarRaw}
`;

// 6. Replace everything from TitleBar to the inner flex container
const replaceStart = code.indexOf(`<div className="h-14 border-b border-gray-200`);
const replaceEnd = code.indexOf(`<div className="flex-1 overflow-auto bg-gray-100">`);
const oldSection = code.substring(replaceStart, replaceEnd);

code = code.replace(oldSection, newStructure);

// Remove the remaining closing tags for the old inner flex container
code = code.replace(`        </div>
      </div>
    </div>
  );
}`, `        </div>
      </div>
    </div>
  );
}`);

fs.writeFileSync('apps/web/src/apps/docs/DocsApp.tsx', code);
console.log("Success");
