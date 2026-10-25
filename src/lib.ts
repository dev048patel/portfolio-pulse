import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HOLDINGS, MONTHLY, WEIGHTS, type Holding } from './config';
import { cad, parseRss, tone, weeklyPlan, type Tone } from './pure';

type Pos = { shares: number; invested: number }; // invested -1 = start tracking from first price
type State = { pos: Record<string, Pos>; seen: string[] };
export type Row = { h: Holding; price: number; day: number; shares: number; invested: number; value: number; weight: number };
export type NewsItem = { link: string; title: string; date: number; symbol: string; tone: Tone; weight: number };
export type Data = { rows: Row[]; news: NewsItem[]; total: number; invested: number; day: number };

const KEY = 'pp-state';

async function loadState(): Promise<State> {
  const st: State = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{"pos":{},"seen":[]}');
  for (const h of HOLDINGS) st.pos[h.symbol] ??= { shares: h.shares, invested: h.invested ?? -1 };
  return st;
}
const saveState = (st: State) => AsyncStorage.setItem(KEY, JSON.stringify(st));

async function chart(sym: string) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`);
  if (!r.ok) throw new Error(`price ${sym}: HTTP ${r.status}`);
  const res = (await r.json()).chart.result[0];
  const closes: number[] = res.indicators.quote[0].close.filter((x: number | null) => x != null);
  return { price: res.meta.regularMarketPrice as number, prev: (closes[closes.length - 2] ?? res.meta.chartPreviousClose) as number };
}

async function headlines(query: string) {
  const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:2d')}&hl=en-CA&gl=CA&ceid=CA:en`);
  return r.ok ? parseRss(await r.text()) : [];
}

export async function refresh(): Promise<Data> {
  const st = await loadState();
  const fx = await chart('USDCAD=X');
  const qs = await Promise.all(HOLDINGS.map((h) => chart(h.yahoo).catch(() => null)));
  const rows: Row[] = HOLDINGS.flatMap((h, i) => {
    const q = qs[i];
    if (!q) return [];
    const p = st.pos[h.symbol];
    const price = q.price * (h.usd ? fx.price : 1);
    const value = p.shares * price;
    if (p.invested < 0) p.invested = value;
    return [{ h, price, day: q.price / q.prev - 1, shares: p.shares, invested: p.invested, value, weight: 0 }];
  });
  await saveState(st);
  const total = rows.reduce((a, r) => a + r.value, 0);
  rows.forEach((r) => (r.weight = total ? r.value / total : 0));

  const feeds = await Promise.all(rows.map((r) => headlines(r.h.news).catch(() => [])));
  const seenLinks = new Set<string>();
  const news = rows
    .flatMap((r, i) => feeds[i].map((n) => ({ link: n.link, title: n.title, date: Date.parse(n.date) || 0, symbol: r.h.symbol, tone: tone(n.title), weight: r.weight })))
    .filter((n) => !seenLinks.has(n.link) && seenLinks.add(n.link))
    .sort((a, b) => b.date - a.date);

  return {
    rows,
    news,
    total,
    invested: rows.reduce((a, r) => a + r.invested, 0),
    day: rows.reduce((a, r) => a + r.value - r.value / (1 + r.day), 0),
  };
}

export async function logBuy(symbol: string, amountCad: number, priceCad: number) {
  const st = await loadState();
  st.pos[symbol].shares += amountCad / priceCad;
  st.pos[symbol].invested += amountCad;
  await saveState(st);
}

// Notify on new non-neutral headlines for things you own. First run only records what exists.
export async function alertNew(d: Data) {
  const st = await loadState();
  const first = st.seen.length === 0;
  const fresh = d.news.filter((n) => !st.seen.includes(n.link));
  const hot = first ? [] : fresh.filter((n) => n.weight > 0 && n.tone !== 'neutral').slice(0, 3);
  for (const n of hot) {
    await Notifications.scheduleNotificationAsync({
      content: { title: `${n.symbol} · ${Math.round(n.weight * 100)}% of your money · ${n.tone}`, body: n.title, data: { link: n.link } },
      trigger: null,
    });
  }
  st.seen = [...fresh.map((n) => n.link), ...st.seen].slice(0, 300);
  await saveState(st);
}

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.DEFAULT });
  }
  if (!(await Notifications.requestPermissionsAsync()).granted) return;
  // Friday 9:00 device time (weekday 1 = Sunday, so Friday = 6).
  const plan = weeklyPlan(MONTHLY, WEIGHTS).map(([s, a]) => `${s} ${cad(a)}`).join(' · ');
  await Notifications.cancelScheduledNotificationAsync('friday-invest');
  await Notifications.scheduleNotificationAsync({
    identifier: 'friday-invest',
    content: { title: 'Friday: time to invest', body: plan },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour: 9, minute: 0 },
  });
}
