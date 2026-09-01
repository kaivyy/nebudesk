const https = require('https');
const fs = require('fs');

async function getWikiImageUrl(filename) {
  return new Promise((resolve, reject) => {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query.pages;
          const page = pages[Object.keys(pages)[0]];
          if (page.imageinfo && page.imageinfo[0].url) resolve(page.imageinfo[0].url);
          else reject('No image info');
        } catch(e) { reject(e); }
      });
    });
  });
}

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
  const map = {
    'Activity_Monitor_Icon_macOS_Big_Sur.png': 'activity_monitor.png',
    'System_Preferences_icon_(macOS_Big_Sur).png': 'settings.png',
    'Automator_icon_macOS_Big_Sur.png': 'automator.png',
    'Server_App_icon.png': 'services.png'
  };

  for(const [wikiName, dest] of Object.entries(map)) {
    try {
      const url = await getWikiImageUrl(wikiName);
      console.log(wikiName, '->', url);
      await download(url, `apps/web/public/icons/${dest}`);
    } catch(e) {
      console.error('Failed', wikiName, e);
    }
  }
}
run();
