const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
docker.listContainers({ all: true }).then(containers => console.log(JSON.stringify(containers[0], null, 2))).catch(e => console.log(e.message));
