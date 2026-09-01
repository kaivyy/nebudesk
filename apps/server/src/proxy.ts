import { dbAll, dbGet } from './db.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROXY_DIR = path.join(process.cwd(), 'proxy-configs');

export async function syncProxyConfig() {
  // Get all apps where proxy is enabled
  const apps = await dbAll('SELECT * FROM Applications WHERE proxyEnabled = 1');
  
  await fs.mkdir(PROXY_DIR, { recursive: true });
  
  // We'll generate Caddyfile format as it's simplest, and Nginx confs
  let caddyConfig = '';
  let nginxConfig = '';
  
  for (const app of apps as any[]) {
    if (!app.publicDomain) continue;
    
    // Caddy
    caddyConfig += `\${app.publicDomain} {
  reverse_proxy \${app.internalHost}:\${app.internalPort}
}
`;

    // Nginx
    nginxConfig += `server {
    listen 80;
    server_name \${app.publicDomain};
    location / {
        proxy_pass http://\${app.internalHost}:\${app.internalPort};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
`;
  }

  await fs.writeFile(path.join(PROXY_DIR, 'Caddyfile'), caddyConfig, 'utf-8');
  await fs.writeFile(path.join(PROXY_DIR, 'nginx.conf'), nginxConfig, 'utf-8');

  // Attempt to reload proxies if they exist on the system
  try {
    const { stdout: caddyCheck } = await execAsync('which caddy').catch(() => ({ stdout: '' }));
    if (caddyCheck.trim()) {
      await execAsync(`caddy reload --config \${path.join(PROXY_DIR, 'Caddyfile')}`).catch(e => console.error("Caddy reload failed:", e));
    }
    
    const { stdout: nginxCheck } = await execAsync('which nginx').catch(() => ({ stdout: '' }));
    if (nginxCheck.trim()) {
      // Typically we'd symlink into /etc/nginx/sites-enabled/ but this is an MVP
      // that avoids touching host system files aggressively unless requested.
      console.log("Nginx config generated at", path.join(PROXY_DIR, 'nginx.conf'));
    }
  } catch (err) {
    console.error("Proxy reload error:", err);
  }
}

export async function syncCloudflareDNS(domain: string, action: 'create' | 'delete') {
  const tokenRecord = await dbGet("SELECT value FROM Settings WHERE key = 'CF_API_TOKEN'") as any;
  const zoneRecord = await dbGet("SELECT value FROM Settings WHERE key = 'CF_ZONE_ID'") as any;
  
  if (!tokenRecord || !zoneRecord || !tokenRecord.value || !zoneRecord.value) {
    return { error: 'Cloudflare not configured' };
  }
  
  const token = tokenRecord.value;
  const zoneId = zoneRecord.value;

  try {
    // 1. Get current public IP
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const { ip } = await ipRes.json();

    // 2. Search for existing DNS record
    const searchRes = await fetch(`https://api.cloudflare.com/client/v4/zones/\${zoneId}/dns_records?name=\${domain}`, {
      headers: { 'Authorization': `Bearer \${token}`, 'Content-Type': 'application/json' }
    });
    const searchData = await searchRes.json();
    const existing = searchData.result?.[0];

    if (action === 'delete') {
      if (existing) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/\${zoneId}/dns_records/\${existing.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer \${token}`, 'Content-Type': 'application/json' }
        });
      }
      return { success: true };
    }

    if (action === 'create') {
      const payload = {
        type: 'A',
        name: domain,
        content: ip,
        proxied: true // Always proxied for now based on UI checkbox
      };

      if (existing) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/\${zoneId}/dns_records/\${existing.id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer \${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`https://api.cloudflare.com/client/v4/zones/\${zoneId}/dns_records`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer \${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      return { success: true };
    }
  } catch (err: any) {
    console.error("Cloudflare sync error:", err);
    return { error: err.message };
  }
}
