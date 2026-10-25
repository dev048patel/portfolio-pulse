// Pure helpers: no React Native imports, so check.ts can run them in plain Node.
export type Tone = 'positive' | 'negative' | 'neutral';

const POS = ['surge', 'soar', 'jump', 'rally', 'beat', 'record', 'gain', 'upgrade', 'strong', 'rise', 'climb', 'boost', 'profit', 'growth', 'approv', 'win'];
const NEG = ['plunge', 'fall', 'drop', 'slump', 'miss', 'cut', 'downgrade', 'weak', 'sell-off', 'selloff', 'tumble', 'loss', 'probe', 'lawsuit', 'fear', 'warn', 'crash', 'slide', 'decline', 'default', 'ban', 'tariff', 'risk'];

const hits = (t: string, words: string[]) => words.filter((w) => new RegExp('\\b' + w, 'i').test(t)).length;

// ponytail: word counting, not understanding. Swap for an LLM call if tone is often wrong.
export const tone = (title: string): Tone => {
  const s = hits(title, POS) - hits(title, NEG);
  return s > 0 ? 'positive' : s < 0 ? 'negative' : 'neutral';
};

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// ponytail: regex RSS parsing; breaks if Google changes the feed layout.
export function parseRss(xml: string, max = 5) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, max)
    .map((m) => {
      const get = (tag: string) => decode(m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '').trim();
      return { title: get('title'), link: get('link'), date: get('pubDate') };
    })
    .filter((i) => i.title && i.link);
}

export const weeklyPlan = (monthly: number, weights: Record<string, number>) =>
  Object.entries(weights).map(([s, w]) => [s, Math.round(((monthly * 12) / 52) * w * 100) / 100] as const);

export const cad = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
export const pct = (n: number) => (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
