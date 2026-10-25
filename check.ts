// Run: node --experimental-strip-types check.ts
import assert from 'node:assert/strict';
import { parseRss, tone, weeklyPlan } from './src/pure.ts';

assert.equal(tone('Nvidia shares surge after record earnings'), 'positive');
assert.equal(tone('Chip stocks tumble as AI fears grow'), 'negative');
assert.equal(tone('Nvidia to hold annual meeting'), 'neutral');

const xml = `<rss><channel><item><title><![CDATA[Oil &amp; gas rally - Reuters]]></title><link>https://x.test/a</link><pubDate>Fri, 24 Oct 2026 14:00:00 GMT</pubDate></item><item><title>No link</title></item></channel></rss>`;
const items = parseRss(xml);
assert.equal(items.length, 1);
assert.equal(items[0].title, 'Oil & gas rally - Reuters');

const plan = weeklyPlan(200, { VEQT: 0.4, LLY: 0.3, CNQ: 0.2, RY: 0.1 });
assert.deepEqual(plan.map((p) => p[0]), ['VEQT', 'LLY', 'CNQ', 'RY']);
assert.ok(Math.abs(plan.reduce((a, p) => a + p[1], 0) - (200 * 12) / 52) < 0.05);
console.log('ok');
