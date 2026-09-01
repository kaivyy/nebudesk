import Fastify from 'fastify';
import websocket from '@fastify/websocket';
const f = Fastify();
f.register(websocket);
f.get('/', { websocket: true }, (connection, req) => {
  console.log("Keys:", Object.keys(connection));
});
f.listen({ port: 3005 });
