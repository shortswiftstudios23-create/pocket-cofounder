// Pure helpers for the server link check (SSRF guard + page text relatedness).
export function isBlockedIp(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '');
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIp(mapped[1]);
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (v.includes(':')) return v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  return false;
}
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan')) return true;
  if (/^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return isBlockedIp(h);
  return !h.includes('.'); // bare hostnames are internal
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const strip = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/** Title, og tags, description and first h1 joined into one string. */
export function extractPageText(html: string): string {
  const parts: string[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i); if (title) parts.push(strip(title[1]));
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const val = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (val && (key === 'description' || key === 'og:title' || key === 'og:description')) parts.push(decode(val));
  }
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); if (h1) parts.push(strip(h1[1]));
  return parts.join(' ').trim();
}
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'about', 'finish', 'work', 'task', 'today', 'tonight', 'some', 'out', 'new', 'get', 'write', 'build', 'design', 'create', 'make', 'draft', 'ship', 'launch', 'publish', 'add', 'fix', 'update', 'review', 'prepare', 'set', 'setup', 'complete', 'do']);
const stem = (w: string) => w.slice(0, 5);
const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
/** 0..1: share of the task's keywords that appear in `text`. Returns undefined when `text` is too thin to judge. */
export function relatedness(task: string, text: string): number | undefined {
  const have = new Set(words(text).map(stem));
  if (have.size < 3) return undefined;
  const keys = [...new Set(words(task).filter(w => w.length >= 3 && !STOP.has(w)).map(stem))];
  if (keys.length === 0) return 1;
  return keys.filter(k => have.has(k)).length / keys.length;
}
