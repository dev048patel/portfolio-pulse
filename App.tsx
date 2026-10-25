import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HOLDINGS, MONTHLY, WEIGHTS } from './src/config';
import { alertNew, logBuy, refresh, setupNotifications, type Data } from './src/lib';
import { cad, pct, weeklyPlan } from './src/pure';
import { registerBackground } from './src/task';

const C = { bg: '#0B0F14', card: '#151B23', text: '#E8EDF2', mute: '#8A96A3', up: '#3DDC84', down: '#FF6B6B' };
const col = (n: number) => (n > 0 ? C.up : n < 0 ? C.down : C.mute);
const TONE = { positive: ['▲ Positive', C.up], negative: ['▼ Negative', C.down], neutral: ['● Neutral', C.mute] } as const;

export default function App() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(HOLDINGS[0].symbol);
  const [amt, setAmt] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const data = await refresh();
      setD(data);
      await alertNew(data);
    } catch (e) {
      setErr(String(e));
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    setupNotifications();
    registerBackground();
    load();
  }, [load]);

  const log = async () => {
    const n = parseFloat(amt);
    const r = d?.rows.find((x) => x.h.symbol === pick);
    if (!r || !(n > 0)) return;
    await logBuy(pick, n, r.price);
    setAmt('');
    load();
  };

  const pl = d ? d.total - d.invested : 0;

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.mute} />}>
      <StatusBar style="light" />
      <Text style={s.h1}>Portfolio Pulse</Text>
      {err ? <Text style={[s.mute, { color: C.down }]}>{err}</Text> : null}

      <View style={s.card}>
        <Text style={s.mute}>Total value</Text>
        <Text style={s.big}>{d ? cad(d.total) : '…'}</Text>
        {d && (
          <View style={s.row}>
            <Text style={s.mute}>Invested {cad(d.invested)}</Text>
            <Text style={{ color: col(pl) }}>{pl >= 0 ? '+' : ''}{cad(pl)} overall</Text>
            <Text style={{ color: col(d.day) }}>{d.day >= 0 ? '+' : ''}{cad(d.day)} today</Text>
          </View>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Friday plan ({cad(MONTHLY)}/month)</Text>
        {weeklyPlan(MONTHLY, WEIGHTS).map(([sym, a]) => (
          <View key={sym} style={s.row}>
            <Text style={s.text}>{sym}</Text>
            <Text style={s.text}>{cad(a)}</Text>
          </View>
        ))}
        <Text style={s.mute}>You'll get a reminder every Friday at 9:00.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Holdings</Text>
        {d?.rows.map((r) => (
          <View key={r.h.symbol} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{r.h.symbol}</Text>
              <Text style={s.mute}>{r.shares > 0 ? `${Math.round(r.weight * 100)}% of portfolio` : 'not bought yet'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.text}>{cad(r.value)}</Text>
              <Text style={{ color: col(r.day) }}>{pct(r.day)} today</Text>
              {r.invested > 0 && <Text style={{ color: col(r.value - r.invested) }}>{pct(r.value / r.invested - 1)} overall</Text>}
            </View>
          </View>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Log a buy</Text>
        <View style={s.chips}>
          {HOLDINGS.map((h) => (
            <Pressable key={h.symbol} onPress={() => setPick(h.symbol)} style={[s.chip, pick === h.symbol && { backgroundColor: C.up }]}>
              <Text style={{ color: pick === h.symbol ? '#000' : C.text }}>{h.symbol}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.row}>
          <TextInput value={amt} onChangeText={setAmt} placeholder="Amount in CAD" placeholderTextColor={C.mute} keyboardType="decimal-pad" style={s.input} />
          <Pressable onPress={log} style={s.btn}>
            <Text style={{ color: '#000', fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>
      </View>

      <Text style={s.h2}>News on your holdings</Text>
      {d?.news.slice(0, 25).map((n) => (
        <Pressable key={n.link} onPress={() => Linking.openURL(n.link)} style={s.card}>
          <Text style={{ color: TONE[n.tone][1], fontWeight: '600' }}>{TONE[n.tone][0]} · {n.symbol}</Text>
          <Text style={s.text}>{n.title}</Text>
          <Text style={s.mute}>
            {n.weight > 0 ? `Touches ${Math.round(n.weight * 100)}% of your money` : 'On your plan, not owned yet'}
          </Text>
        </Pressable>
      ))}
      <Text style={s.mute}>Tone comes from headline wording, not a prediction. This is not financial advice.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 64, gap: 12 },
  h1: { color: C.text, fontSize: 28, fontWeight: '700' },
  h2: { color: C.text, fontSize: 18, fontWeight: '600' },
  big: { color: C.text, fontSize: 34, fontWeight: '700' },
  text: { color: C.text, fontSize: 15 },
  mute: { color: C.mute, fontSize: 13 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#24303C' },
  input: { flex: 1, color: C.text, backgroundColor: '#24303C', borderRadius: 10, padding: 10 },
  btn: { backgroundColor: C.up, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
});
