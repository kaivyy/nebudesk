const fs = require('fs');
let code = fs.readFileSync('apps/web/src/stores/windowStore.ts', 'utf8');

if (!code.includes('updateSize:')) {
  code = code.replace(
    "updatePosition: (id: string, x: number, y: number) => void;",
    "updatePosition: (id: string, x: number, y: number) => void;\n  updateSize: (id: string, width: number, height: number, x?: number, y?: number) => void;"
  );
  code = code.replace(
    "updatePosition: (id, x, y) => set((state) => ({",
    "updateSize: (id, width, height, x, y) => set((state) => ({\n    windows: state.windows.map(w => w.id === id ? { ...w, width, height, x: x !== undefined ? x : w.x, y: y !== undefined ? y : w.y } : w)\n  })),\n  updatePosition: (id, x, y) => set((state) => ({"
  );
  fs.writeFileSync('apps/web/src/stores/windowStore.ts', code);
  console.log('patched windowStore.ts');
} else {
  console.log('already patched');
}
