const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const patchDesktopBlock = `fastify.patch('/api/desktop', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { windowsJson, wallpaper, theme } = request.body as any;
  console.log('PATCH /api/desktop');
  
  if (windowsJson !== undefined) {
    await dbRun(\`UPDATE DesktopState SET windowsJson = ? WHERE userId = ?\`, [windowsJson, request.user.id]);
  }
  if (wallpaper !== undefined) {
    await dbRun(\`UPDATE DesktopState SET wallpaper = ? WHERE userId = ?\`, [wallpaper, request.user.id]);
  }
  if (theme !== undefined) {
    await dbRun(\`UPDATE DesktopState SET theme = ? WHERE userId = ?\`, [theme, request.user.id]);
  }
  
  return { success: true };
});`;

code = code.replace(/fastify\.patch\('\/api\/desktop'[\s\S]*?return \{ success: true \};\n\}\);/, patchDesktopBlock);
fs.writeFileSync('apps/server/src/index.ts', code);
