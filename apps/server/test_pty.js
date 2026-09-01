const pty = require('node-pty');
const ptyProcess = pty.spawn('tmux', ['new-session', '-A', '-s', 'test_pty_1', '-c', '/root/nebudesk'], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: '/root/nebudesk',
    env: process.env
});
ptyProcess.onData((data) => {
    console.log("Output: ", data);
});
ptyProcess.write('pwd\r');
setTimeout(() => process.exit(0), 1000);
