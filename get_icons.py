import requests
import json
import urllib.parse
import os

os.makedirs('apps/web/public/icons', exist_ok=True)

apps = {
    'finder.png': 'macos big sur finder icon png wikimedia',
    'vscode.png': 'macos big sur vscode icon png wikimedia',
    'terminal.png': 'macos big sur terminal icon png wikimedia',
    'settings.png': 'macos big sur system preferences icon png wikimedia',
    'activity_monitor.png': 'macos big sur activity monitor icon png wikimedia',
    'docker.png': 'docker macos big sur icon png wikimedia',
    'automator.png': 'automator macos big sur icon png wikimedia',
    'services.png': 'network utility macos big sur icon png wikimedia'
}

for name, query in apps.items():
    if os.path.exists(f'apps/web/public/icons/{name}') and os.path.getsize(f'apps/web/public/icons/{name}') > 10000:
        continue
        
    print(f"Searching {name}...")
    url = f"http://127.0.0.1:8888/search?q={urllib.parse.quote(query)}&categories=images&format=json"
    try:
        r = requests.get(url, timeout=5)
        data = r.json()
        for res in data.get('results', []):
            img_url = res.get('img_src')
            if not img_url: continue
            if 'wikimedia' not in img_url and 'github' not in img_url and 'mac' not in img_url: continue
            
            print(f"  Trying {img_url}")
            try:
                img_res = requests.get(img_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
                if img_res.status_code == 200 and 'image' in img_res.headers.get('content-type', ''):
                    with open(f'apps/web/public/icons/{name}', 'wb') as f:
                        f.write(img_res.content)
                    print(f"  Downloaded {name}!")
                    break
            except Exception as e:
                print(f"  Failed: {e}")
    except Exception as e:
        print(f"Search failed for {name}: {e}")

