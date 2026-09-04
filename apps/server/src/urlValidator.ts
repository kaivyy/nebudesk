import dns from 'dns/promises';
import { URL } from 'url';

export async function isUrlAllowed(targetUrl: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { allowed: false, reason: 'Only HTTP and HTTPS protocols are allowed.' };
    }

    const hostname = parsed.hostname;
    
    // IP address checks
    const isIp = /^[0-9\.]+$/.test(hostname) || hostname.includes(':');
    let ipsToCheck = [hostname.replace(/\[/g, '').replace(/\]/g, '')];

    // Resolve domains to prevent DNS rebinding to internal IPs
    if (!isIp) {
      try {
        const records = await dns.lookup(hostname, { all: true });
        ipsToCheck = records.map(r => r.address);
      } catch {
        return { allowed: false, reason: 'DNS resolution failed.' };
      }
    }

    for (const rawIp of ipsToCheck) {
      let ip = rawIp;

      // Check IPv4-mapped IPv6 or pure IPv6
      if (ip.includes(':')) {
        const lowerIp = ip.toLowerCase();
        // Block IPv6 loopback (::1) and unspecified (::, ::0)
        if (lowerIp === '::1' || lowerIp === '::' || lowerIp === '::0') {
          return { allowed: false, reason: 'IPv6 loopback/unspecified is blocked.' };
        }
        // Block IPv4-mapped IPv6 (::ffff:...)
        if (lowerIp.startsWith('::ffff:') || lowerIp.startsWith('ffff:') || lowerIp.includes(':ffff:')) {
          return { allowed: false, reason: 'IPv4-mapped IPv6 address is blocked.' };
        }
        // Block IPv6 unique local address (fc00::/7)
        if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) {
          return { allowed: false, reason: 'IPv6 unique local address is blocked.' };
        }
        // Block IPv6 link-local (fe80::/10)
        if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) {
          return { allowed: false, reason: 'IPv6 link-local is blocked.' };
        }
      }

      // IPv4 checks
      if (ip.includes('.')) {
        const parts = ip.split('.').map(Number);
        const p0 = parts[0];
        const p1 = parts[1];
        if (p0 !== undefined && p1 !== undefined) {
          if (p0 === 10) return { allowed: false, reason: 'Private IP (10.x.x.x) is blocked.' };
          if (p0 === 192 && p1 === 168) return { allowed: false, reason: 'Private IP (192.168.x.x) is blocked.' };
          if (p0 === 172 && p1 >= 16 && p1 <= 31) return { allowed: false, reason: 'Private IP (172.16.x.x-172.31.x.x) is blocked.' };
          if (p0 === 169 && p1 === 254) return { allowed: false, reason: 'Link-local/Cloud metadata (169.254.x.x) is blocked.' };
          if (p0 === 100 && p1 >= 64 && p1 <= 127) return { allowed: false, reason: 'CGNAT (100.64.x.x) is blocked.' };
          if (p0 === 127) return { allowed: false, reason: 'Loopback IP (127.x.x.x) is blocked.' };
          if (p0 === 0) return { allowed: false, reason: 'Unspecified IP (0.x.x.x) is blocked.' };
        }
      }
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Invalid URL format.' };
  }
}
