const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = `fastify.post('/api/auth/logout'`;
const replacement = `fastify.put('/api/auth/profile', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { username, currentPassword, newPassword } = request.body;
  const user: any = await dbGet('SELECT * FROM User WHERE id = ?', [request.user.id]);
  if (!user) return reply.status(404).send({ error: 'User not found' });
  
  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return reply.status(401).send({ error: 'Incorrect current password' });
    const hash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE User SET username = ?, password = ? WHERE id = ?', [username || user.username, hash, request.user.id]);
  } else if (username && username !== user.username) {
    await dbRun('UPDATE User SET username = ? WHERE id = ?', [username, request.user.id]);
  }
  
  return { success: true };
});

fastify.post('/api/auth/logout'`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/index.ts', code);
