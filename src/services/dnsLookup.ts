/**
 * Service de vérification DNS en temps réel via Cloudflare DNS-over-HTTPS (1.1.1.1)
 */

export interface DnsQuestionAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface LiveDnsReport {
  domain: string;
  checkedAt: string;
  isCloudflareNs: boolean;
  nameservers: string[];
  mxRecords: { priority: number; exchange: string }[];
  spfRecords: string[];
  dmarcRecords: string[];
  dkimRecords: string[];
  aRecords: string[];
  hasActiveMailRouting: boolean;
  hasSpf: boolean;
  hasBrevoSpf: boolean;
  hasDmarc: boolean;
  hasDkim: boolean;
  hasBrevoDkim: boolean;
  error?: string;
}

async function queryCloudflareDoh(name: string, type: 'A' | 'NS' | 'MX' | 'TXT' | 'CNAME'): Promise<DnsQuestionAnswer[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
      {
        headers: { Accept: 'application/dns-json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.Answer) ? json.Answer : [];
  } catch {
    return [];
  }
}

function parseTxtData(raw: string): string {
  const trimmed = raw.trim();
  const quotedChunks = trimmed.match(/"([^"]*)"/g);
  if (quotedChunks && quotedChunks.length > 0) {
    return quotedChunks.map(chunk => chunk.slice(1, -1)).join('');
  }
  return trimmed.replace(/^"|"$/g, '');
}

export async function checkLiveCloudflareDns(domain: string): Promise<LiveDnsReport> {
  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const now = new Date();
  const checkedAt = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  try {
    const [nsAns, mxAns, txtAns, dmarcAns, dkimMailAns, dkimCfAns, brevo1Ans, brevo2Ans, aAns] = await Promise.all([
      queryCloudflareDoh(cleanDomain, 'NS'),
      queryCloudflareDoh(cleanDomain, 'MX'),
      queryCloudflareDoh(cleanDomain, 'TXT'),
      queryCloudflareDoh(`_dmarc.${cleanDomain}`, 'TXT'),
      queryCloudflareDoh(`mail._domainkey.${cleanDomain}`, 'TXT'),
      queryCloudflareDoh(`cf2024-1._domainkey.${cleanDomain}`, 'TXT'),
      queryCloudflareDoh(`brevo1._domainkey.${cleanDomain}`, 'CNAME'),
      queryCloudflareDoh(`brevo2._domainkey.${cleanDomain}`, 'CNAME'),
      queryCloudflareDoh(cleanDomain, 'A'),
    ]);

    const nameservers = nsAns.map(a => a.data.replace(/\.$/, '').toLowerCase());
    const isCloudflareNs = nameservers.some(ns => ns.includes('cloudflare.com'));

    const mxRecords = mxAns
      .map(a => {
        const parts = a.data.trim().split(/\s+/);
        const priority = parseInt(parts[0], 10) || 10;
        const exchange = (parts[1] || parts[0] || '').replace(/\.$/, '').toLowerCase();
        return { priority, exchange };
      })
      .sort((a, b) => a.priority - b.priority);

    const allRootTxt = txtAns.map(a => parseTxtData(a.data));
    const spfRecords = allRootTxt.filter(t => t.toLowerCase().includes('v=spf1'));
    const hasBrevoSpf = spfRecords.some(t => t.toLowerCase().includes('spf.brevo.com'));

    const dmarcRecords = dmarcAns
      .map(a => parseTxtData(a.data))
      .filter(t => t.toLowerCase().includes('v=dmarc1'));

    const dkimRecords = [...dkimCfAns, ...dkimMailAns]
      .map(a => parseTxtData(a.data))
      .filter(t => t.toLowerCase().includes('v=dkim1') || t.includes('p='));

    const hasBrevoDkim = brevo1Ans.length > 0 && brevo2Ans.length > 0;
    const aRecords = aAns.map(a => a.data);

    return {
      domain: cleanDomain,
      checkedAt,
      isCloudflareNs,
      nameservers,
      mxRecords,
      spfRecords,
      dmarcRecords,
      dkimRecords,
      aRecords,
      hasActiveMailRouting: mxRecords.length > 0,
      hasSpf: spfRecords.length > 0,
      hasBrevoSpf,
      hasDmarc: dmarcRecords.length > 0,
      hasDkim: dkimRecords.length > 0,
      hasBrevoDkim,
    };
  } catch (err) {
    return {
      domain: cleanDomain,
      checkedAt,
      isCloudflareNs: false,
      nameservers: [],
      mxRecords: [],
      spfRecords: [],
      dmarcRecords: [],
      dkimRecords: [],
      aRecords: [],
      hasActiveMailRouting: false,
      hasSpf: false,
      hasBrevoSpf: false,
      hasDmarc: false,
      hasDkim: false,
      hasBrevoDkim: false,
      error: err instanceof Error ? err.message : 'Erreur réseau DNS',
    };
  }
}
