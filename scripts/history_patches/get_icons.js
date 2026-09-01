const fs = require('fs');
const https = require('https');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function run() {
  const icons = {
    'finder.png': 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Finder_Icon_macOS_Big_Sur.png',
    'vscode.svg': 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg',
    'terminal.png': 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Terminalicon2.png',
    'settings.png': 'https://upload.wikimedia.org/wikipedia/commons/e/ec/System_Preferences_icon.png',
    'activity_monitor.png': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Activity_Monitor_Icon.png',
    'docker.svg': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg',
    'services.png': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Server-icon.png'
  };

  for (const [name, url] of Object.entries(icons)) {
    console.log(`Downloading ${name}...`);
    try {
      await download(url, `apps/web/public/icons/${name}`);
      console.log(`Downloaded ${name}`);
    } catch(e) {
      console.error(e);
    }
  }
}

run();
