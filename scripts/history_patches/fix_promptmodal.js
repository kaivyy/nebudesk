const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// Remove from FileTreeNode
code = code.replace(
  "  const [promptModal, setPromptModal] = useState<{type: 'folder' | 'file', onSubmit: (name: string) => void} | null>(null);\n",
  ""
);

// Add to CodeApp
const codeAppDef = "const contextMenuState = `";
// Wait, I can just find:
// const store = useWindowStore();
const target = "const store = useWindowStore();";
code = code.replace(
  target,
  target + "\n  const [promptModal, setPromptModal] = useState<{type: 'folder' | 'file', onSubmit: (name: string) => void} | null>(null);"
);

// Fix the "name" implicitly any
code = code.replace(/onSubmit: async \(name\)/g, "onSubmit: async (name: string)");

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
