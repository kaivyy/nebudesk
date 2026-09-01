const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let cookie = res.headers['set-cookie'][0].split(';')[0];
  console.log('Login:', res.statusCode);
  
  const req2 = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/desktop',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
  }, (res2) => {
    let d = ''; res2.on('data', c=>d+=c);
    res2.on('end', () => console.log('PATCH:', res2.statusCode, d));
    
    const req3 = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/desktop',
      method: 'GET',
      headers: { 'Cookie': cookie }
    }, (res3) => {
      let d2 = ''; res3.on('data', c=>d2+=c);
      res3.on('end', () => console.log('GET:', res3.statusCode, d2));
    });
    req3.end();
  });
  req2.write(JSON.stringify({ windowsJson: '[{"id":"test"}]' }));
  req2.end();
});
req.write(JSON.stringify({ username: 'admin', password: 'admin' }));
req.end();
