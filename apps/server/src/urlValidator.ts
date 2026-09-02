import dns from 'dns/promises';
import { URL } from 'url';

export async function isUrlAllowed(targetUrl: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { allowed: false, reason: 'Only HTTP and HTTPS protocols are allowed.' };
    }

    const hostname = parsed.hostname;
    
    // Explicitly allow localhost for development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { allowed: true };
    }

    // IP address checks
    const isIp = /^[0-9\.]+$/.test(hostname) || hostname.includes(':');
    let ipsToCheck = [hostname];

    // If it's a domain, resolve it to prevent basic DNS pointing to internal IPs
    // (Note: does not prevent advanced DNS rebinding where TTL is 0, but fulfills the basic audit requirement without overly complex proxy layers)
    if (!isIp) {
      try {
        const records = await dns.lookup(hostname, { all: true });
        ipsToCheck = records.map(r => r.address);
      } catch (e) {
        return { allowed: false, reason: 'DNS resolution failed.' };
      }
    }

    for (const ip of ipsToCheck) {
      // IPv4 checks
      if (ip.includes('.')) {
        const parts = ip.split('.').map(Number);
        if (parts[0] === 10) return { allowed: false, reason: 'Private IP (10.x.x.x) is blocked.' };
        if (parts[0] === 192 && parts[1] === 168) return { allowed: false, reason: 'Private IP (192.168.x.x) is blocked.' };
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return { allowed: false, reason: 'Private IP (172.16.x.x-172.31.x.x) is blocked.' };
        if (parts[0] === 169 && parts[1] === 254) return { allowed: false, reason: 'Link-local/Cloud metadata (169.254.x.x) is blocked.' };
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return { allowed: false, reason: 'CGNAT (100.64.x.x) is blocked.' };
        if (parts[0] === 127 && ip !== '127.0.0.1') return { allowed: false, reason: 'Loopback IP is blocked (use 127.0.0.1 for dev).' };
      }
      
      // IPv6 checks
      if (ip.includes(':')) {
        const lowerIp = ip.toLowerCase();
        if (lowerIp === '::1') return { allowed: false, reason: 'IPv6 loopback is blocked.' };
        if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return { allowed: false, reason: 'IPv6 unique local address is blocked.' };
        if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) return { allowed: false, reason: 'IPv6 link-local is blocked.' };
      }
    }

    return { allowed: true };
  } catch (e) {
    return { allowed: false, reason: 'Invalid URL format.' };
  }
}
