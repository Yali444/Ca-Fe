/**
 * Build a worklist page for asking Tel Aviv cafes about gluten-free food on
 * Instagram.
 *
 * There is no legitimate way to automate the sending: Instagram's official
 * Messaging API only permits replying within 24h of a user-initiated message,
 * and the unofficial libraries that fake a logged-in session violate the terms
 * and get accounts disabled. So this optimises the manual path instead — one
 * tap opens the DM thread, one tap copies the message — and, more usefully,
 * captures each reply as structured data that apply-gluten-free.ts can ingest.
 *
 * Rows are one per Instagram handle, not one per cafe: ten handles in the
 * dataset cover two branches each, and messaging מלה three times would be both
 * wasteful and embarrassing.
 *
 *   npx tsx scripts/generate-outreach-page.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { GLUTEN_FREE_ITEMS } from '../src/lib/gluten-free';

const CAFES_PATH = path.join(__dirname, '../public/data/cafes.json');
const CANDIDATES_PATH = path.join(__dirname, 'gluten-free-candidates.json');
const OUTPUT_PATH = path.join(__dirname, 'outreach.html');

const TEL_AVIV_CITIES = new Set(['תל אביב', 'תל אביב-יפו', 'יפו']);

/** The message to send, exactly as the site owner wrote it. */
const MESSAGE = 'היי, יש פתרונות לצליאקים? אם כן, מה?';

/**
 * Cafes already published as gluten-free on the strength of brand-level
 * evidence — a sibling branch was confirmed, not this one. Listed explicitly
 * because nothing in the dataset distinguishes an inferred `true` from a
 * directly evidenced one, and for someone with celiac disease travelling to a
 * specific branch that difference is the whole point.
 */
const NEEDS_BRANCH_VERIFICATION = new Set(['97', '129', '130']);

interface RawCafe {
  id: number | string;
  name: string;
  city?: string;
  address?: string;
  instagramHandle?: string;
  glutenFree?: boolean;
}

interface Candidate {
  id: string;
  glutenFree: boolean | null;
}

type GroupKey = 'verify' | 'pending' | 'rest';

interface Row {
  handle: string;
  group: GroupKey;
  cafes: { id: string; name: string; address: string }[];
}

const GROUP_COPY: Record<GroupKey, { title: string; blurb: string }> = {
  verify: {
    title: 'לאימות',
    blurb:
      'כבר מסומנים ללא גלוטן באתר — אבל על סמך סניף אחר של אותה רשת. שאל ספציפית על הסניף הזה.',
  },
  pending: {
    title: 'הכי משתלם',
    blurb:
      'כבר מופיעים ברשימות ללא גלוטן, רק בלי פירוט מה מגישים. שלוש תשובות כאן חושפות את הפילטר באתר.',
  },
  rest: { title: 'כל השאר', blurb: 'אין עליהם שום מידע עדיין.' },
};

function buildRows(): Row[] {
  const cafes: RawCafe[] = JSON.parse(fs.readFileSync(CAFES_PATH, 'utf-8'));

  // Cafes that were researched but left undecided are the best use of a
  // message: half the answer already exists, only the categories are missing.
  const pendingIds = new Set<string>();
  if (fs.existsSync(CANDIDATES_PATH)) {
    try {
      const candidates: Candidate[] = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf-8'));
      for (const entry of candidates) {
        if (entry.glutenFree === null) pendingIds.add(String(entry.id));
      }
    } catch {
      // Missing or malformed — everything simply lands in "rest".
    }
  }

  const telAviv = cafes.filter((cafe) => TEL_AVIV_CITIES.has((cafe.city ?? '').trim()));
  const inScope = telAviv.filter(
    (cafe) => cafe.glutenFree == null || NEEDS_BRANCH_VERIFICATION.has(String(cafe.id)),
  );

  const byHandle = new Map<string, Row>();
  for (const cafe of inScope) {
    const handle = (cafe.instagramHandle ?? '').trim().replace(/^@/, '');
    if (!handle) continue; // nothing to open — קפה תמתי has no account

    const id = String(cafe.id);
    const group: GroupKey = NEEDS_BRANCH_VERIFICATION.has(id)
      ? 'verify'
      : pendingIds.has(id)
        ? 'pending'
        : 'rest';

    const existing = byHandle.get(handle);
    if (existing) {
      existing.cafes.push({ id, name: cafe.name, address: cafe.address ?? '' });
      // A handle inherits the most urgent group among its branches.
      if (group === 'verify' || (group === 'pending' && existing.group === 'rest')) {
        existing.group = group;
      }
    } else {
      byHandle.set(handle, {
        handle,
        group,
        cafes: [{ id, name: cafe.name, address: cafe.address ?? '' }],
      });
    }
  }

  const order: GroupKey[] = ['verify', 'pending', 'rest'];
  return [...byHandle.values()].sort(
    (a, b) =>
      order.indexOf(a.group) - order.indexOf(b.group) ||
      a.cafes[0].name.localeCompare(b.cafes[0].name, 'he'),
  );
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Tokens are defined once and re-pointed per theme, never restyled per theme. */
const STYLES = `
  :root {
    /* Warm neutrals biased toward the wheat accent rather than a neutral grey —
       the page is about gluten, and the ground should know it. */
    --ground: #FBF9F5;
    --surface: #FFFFFF;
    --edge: #E7E0D1;
    --ink: #1F1B12;
    --muted: #78705A;
    --accent: #B45309;
    --accent-soft: #FBEEDA;
    /* Status colours are semantic and deliberately not the accent. */
    --sent: #1D4ED8;
    --sent-soft: #E5EBFD;
    --replied: #15803D;
    --replied-soft: #DEF2E3;
    --shadow: 0 1px 2px rgba(31,27,18,.05), 0 4px 14px rgba(31,27,18,.05);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ground: #16140F;
      --surface: #201D16;
      --edge: #37311F;
      --ink: #F3EFE4;
      --muted: #A39A80;
      --accent: #E9A23B;
      --accent-soft: #3A2B12;
      --sent: #7CA0F5;
      --sent-soft: #1D2740;
      --replied: #6FC98A;
      --replied-soft: #16301F;
      --shadow: 0 1px 2px rgba(0,0,0,.4), 0 4px 14px rgba(0,0,0,.3);
    }
  }
  :root[data-theme="light"] {
    --ground: #FBF9F5; --surface: #FFFFFF; --edge: #E7E0D1; --ink: #1F1B12;
    --muted: #78705A; --accent: #B45309; --accent-soft: #FBEEDA;
    --sent: #1D4ED8; --sent-soft: #E5EBFD; --replied: #15803D; --replied-soft: #DEF2E3;
    --shadow: 0 1px 2px rgba(31,27,18,.05), 0 4px 14px rgba(31,27,18,.05);
  }
  :root[data-theme="dark"] {
    --ground: #16140F; --surface: #201D16; --edge: #37311F; --ink: #F3EFE4;
    --muted: #A39A80; --accent: #E9A23B; --accent-soft: #3A2B12;
    --sent: #7CA0F5; --sent-soft: #1D2740; --replied: #6FC98A; --replied-soft: #16301F;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 4px 14px rgba(0,0,0,.3);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; direction: rtl;
    background: var(--ground); color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 16px; line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 34rem; margin: 0 auto; padding: 0 1rem 4rem; }

  /* Header ------------------------------------------------------------- */
  .masthead { padding: 2rem 0 1rem; }
  .eyebrow {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .7rem; letter-spacing: .14em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 .4rem;
  }
  h1 { font-size: 1.5rem; line-height: 1.2; margin: 0 0 .5rem; text-wrap: balance; }
  .lede { margin: 0; color: var(--muted); font-size: .95rem; }

  .progress {
    position: sticky; top: 0; z-index: 5;
    background: var(--ground); border-bottom: 1px solid var(--edge);
    padding: .55rem 0; margin-bottom: 1.25rem;
    display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  }
  .progress button { padding: .35rem .7rem; font-size: .8rem; }
  .tally {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-variant-numeric: tabular-nums; font-size: .78rem; color: var(--muted);
  }
  .tally b { color: var(--ink); font-weight: 600; }
  .bar { flex: 1 1 6rem; height: 5px; border-radius: 3px; background: var(--edge); overflow: hidden; min-width: 5rem; }
  .bar span { display: block; height: 100%; background: var(--replied); transition: width .25s ease; }

  /* Groups ------------------------------------------------------------- */
  .group { margin-bottom: 2rem; }
  .group > h2 {
    font-size: .78rem; letter-spacing: .1em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 .3rem;
  }
  .group > p { margin: 0 0 .9rem; font-size: .88rem; color: var(--muted); }

  /* Cards -------------------------------------------------------------- */
  .card {
    background: var(--surface); border: 1px solid var(--edge); border-radius: 12px;
    padding: .9rem; margin-bottom: .6rem; box-shadow: var(--shadow);
  }
  .card[data-status="sent"] { border-inline-start: 3px solid var(--sent); }
  .card[data-status="replied"] { border-inline-start: 3px solid var(--replied); }
  .card[data-status="none"] { opacity: .6; }
  .names { font-weight: 600; margin: 0 0 .1rem; }
  .branch { display: block; font-weight: 400; font-size: .87rem; color: var(--muted); }
  .handle {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .78rem; color: var(--muted); margin: 0 0 .7rem;
    /* A Latin handle inside an RTL page gets its leading "@" reordered to the
       end ("melacafe_tlv@"). Isolating it as LTR keeps it readable. */
    direction: ltr; text-align: right; unicode-bidi: isolate;
  }
  .link-btn {
    background: none; border: none; padding: 0; margin: -.3rem 0 .6rem;
    font-size: .78rem; color: var(--accent); text-decoration: underline;
    cursor: pointer; display: block;
  }
  .fix-input {
    width: 100%; margin: 0 0 .6rem; padding: .4rem .5rem; border-radius: 8px;
    border: 1px solid var(--edge); background: var(--ground); color: var(--ink);
    font: inherit; font-size: .8rem; direction: ltr; text-align: right;
  }
  .actions { display: flex; gap: .45rem; flex-wrap: wrap; }
  button, .btn {
    font: inherit; font-size: .85rem; cursor: pointer; border-radius: 8px;
    padding: .5rem .8rem; border: 1px solid var(--edge);
    background: var(--surface); color: var(--ink);
    display: inline-flex; align-items: center; gap: .35rem; text-decoration: none;
  }
  .btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  :root[data-theme="dark"] .btn-primary, .btn-primary { color: #fff; }
  @media (prefers-color-scheme: dark) { .btn-primary { color: #16140F; } }
  :root[data-theme="dark"] .btn-primary { color: #16140F; }
  :root[data-theme="light"] .btn-primary { color: #fff; }
  button:focus-visible, .btn:focus-visible, input:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }
  .chips { display: flex; gap: .35rem; flex-wrap: wrap; margin-top: .6rem; }
  .chip { font-size: .78rem; padding: .32rem .6rem; }
  .chip[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); font-weight: 600; }
  .chip.sent[aria-pressed="true"] { background: var(--sent-soft); border-color: var(--sent); color: var(--sent); }
  .chip.replied[aria-pressed="true"] { background: var(--replied-soft); border-color: var(--replied); color: var(--replied); }

  /* Answer capture ----------------------------------------------------- */
  .answer { margin-top: .8rem; padding-top: .8rem; border-top: 1px dashed var(--edge); }
  .answer[hidden] { display: none; }
  .answer h3 { font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0 0 .5rem; }
  .answer textarea {
    width: 100%; margin-top: .6rem; padding: .5rem; border-radius: 8px;
    border: 1px solid var(--edge); background: var(--ground); color: var(--ink);
    font: inherit; font-size: .85rem; resize: vertical; min-height: 3rem;
  }
  .toast {
    position: fixed; inset-block-end: 1rem; inset-inline: 0; margin: 0 auto; width: fit-content;
    background: var(--ink); color: var(--ground); padding: .55rem 1rem; border-radius: 999px;
    font-size: .85rem; opacity: 0; transform: translateY(.5rem); pointer-events: none;
    transition: opacity .2s, transform .2s; z-index: 20;
  }
  .toast.show { opacity: 1; transform: none; }
  footer { margin-top: 2.5rem; padding-top: 1.25rem; border-top: 1px solid var(--edge); color: var(--muted); font-size: .85rem; }
  footer code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem;
    background: var(--surface); border: 1px solid var(--edge); border-radius: 6px;
    padding: .1rem .35rem; display: inline-block; direction: ltr;
  }
  footer pre { overflow-x: auto; background: var(--surface); border: 1px solid var(--edge); border-radius: 8px; padding: .7rem; direction: ltr; text-align: left; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

function render(rows: Row[]): string {
  const payload = JSON.stringify({
    rows,
    items: GLUTEN_FREE_ITEMS,
    message: MESSAGE,
    groups: GROUP_COPY,
    // Guard against a cafe name containing "</script>" closing the tag early.
  }).replace(/</g, '\\u003c');

  return `<title>פניות ללא גלוטן — תל אביב</title>
<style>${STYLES}</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">Ca-Fe · איסוף נתונים</p>
    <h1>מי מגיש אוכל ללא גלוטן?</h1>
    <p class="lede">${escapeHtml(String(rows.length))} חשבונות אינסטגרם. לחיצה פותחת את הדיירקט, לחיצה שנייה מעתיקה את ההודעה. התשובות נשמרות כאן ומיוצאות לאתר.</p>
  </header>

  <div class="progress">
    <div class="tally"><b id="t-sent">0</b> נשלחו · <b id="t-replied">0</b> ענו · <b id="t-total">0</b> סה״כ</div>
    <div class="bar"><span id="bar-fill" style="width:0%"></span></div>
    <button type="button" id="export">ייצוא תשובות</button>
    <button type="button" id="export-fixes">ייצוא תיקוני handles</button>
  </div>

  <main id="list"></main>

  <footer>
    <p><strong>אחרי שיש תשובות:</strong> לחץ ״ייצוא תשובות״, שמור את מה שהועתק כ־<code>scripts/replies.json</code>, ואז:</p>
    <pre>npx tsx scripts/apply-gluten-free.ts --input scripts/replies.json
npx tsx scripts/apply-gluten-free.ts --input scripts/replies.json --write</pre>
    <p><strong>וולט</strong> (במחשב, לא עובד מהנייד):</p>
    <pre>git pull
npx tsx scripts/detect-gluten-free.ts --limit 3 --skip-google \\
  --skip-websites --output /tmp/wolt-test.json</pre>
    <p>אם כתוב <code>Wolt venues matched: 0</code> — כתובות ה־API השתנו, תגיד לי. אחרת תריץ בלי <code>--limit</code> ועם <code>--output scripts/wolt-candidates.json</code>.</p>
  </footer>
</div>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script type="application/json" id="data">${payload}</script>
<script>
(function () {
  var DATA = JSON.parse(document.getElementById('data').textContent);
  var KEY = 'cafe-gf-outreach';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    tally();
  }
  function entry(handle) {
    if (!state[handle]) state[handle] = { status: '', items: [], note: '', answer: '', correctedHandle: '' };
    return state[handle];
  }
  function toast(text) {
    var el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Older mobile browsers: fall back to a hidden field.
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    return Promise.resolve();
  }
  function tally() {
    var sent = 0, replied = 0;
    DATA.rows.forEach(function (row) {
      var s = (state[row.handle] || {}).status;
      if (s === 'sent' || s === 'replied' || s === 'none') sent++;
      if (s === 'replied') replied++;
    });
    document.getElementById('t-sent').textContent = sent;
    document.getElementById('t-replied').textContent = replied;
    document.getElementById('t-total').textContent = DATA.rows.length;
    document.getElementById('bar-fill').style.width =
      (DATA.rows.length ? (sent / DATA.rows.length) * 100 : 0) + '%';
  }

  /**
   * Name a multi-branch card by what its branches share — "מתחת לעץ · 2 סניפים"
   * rather than a bare count. Trimmed back to the last whole word so
   * "הקפה בבימה" + "הקפה בבן גוריון" gives "הקפה", not "הקפה בב".
   */
  function brandName(cafes) {
    var prefix = cafes[0].name;
    cafes.forEach(function (cafe) {
      var i = 0;
      while (i < prefix.length && i < cafe.name.length && prefix[i] === cafe.name[i]) i++;
      prefix = prefix.slice(0, i);
    });
    prefix = prefix.replace(/[\\s(\\-–—]+$/, '');
    if (prefix.indexOf(' ') !== -1 && !/\\s$/.test(cafes[0].name.slice(prefix.length, prefix.length + 1))) {
      // Cut mid-word: fall back to the last complete word.
      var next = cafes[0].name.charAt(prefix.length);
      if (next && next !== ' ' && next !== '(') prefix = prefix.slice(0, prefix.lastIndexOf(' '));
    }
    prefix = prefix.trim();
    return (prefix ? prefix + ' · ' : '') + cafes.length + ' סניפים';
  }

  var STATUSES = [
    { key: 'sent', label: 'נשלח', cls: 'sent' },
    { key: 'replied', label: 'ענו', cls: 'replied' },
    { key: 'none', label: 'אין תשובה', cls: '' }
  ];

  function card(row) {
    var st = entry(row.handle);
    var el = document.createElement('article');
    el.className = 'card';
    el.setAttribute('data-status', st.status || '');

    var names = document.createElement('p');
    names.className = 'names';
    names.textContent = row.cafes.length > 1 ? brandName(row.cafes) : row.cafes[0].name;
    row.cafes.forEach(function (cafe, i) {
      if (row.cafes.length === 1 && i > 0) return;
      var line = document.createElement('span');
      line.className = 'branch';
      line.textContent = row.cafes.length > 1 ? cafe.name + ' — ' + cafe.address : cafe.address;
      names.appendChild(line);
    });
    el.appendChild(names);

    var handle = document.createElement('p');
    handle.className = 'handle';
    handle.textContent = '@' + row.handle;
    el.appendChild(handle);

    // Wrong handles happen — this is the moment the user actually finds out,
    // since ig.me opens straight to whatever account is really behind the
    // name. Kept as a single toggle+input rather than always-visible so 71
    // cards don't turn into 71 open text fields.
    var fixWrap = document.createElement('div');
    var fixToggle = document.createElement('button');
    fixToggle.type = 'button';
    fixToggle.className = 'link-btn';
    fixToggle.textContent = st.correctedHandle ? 'תוקן: @' + st.correctedHandle : 'ה-handle לא נכון?';
    var fixInput = document.createElement('input');
    fixInput.type = 'text';
    fixInput.className = 'fix-input';
    fixInput.placeholder = 'ה-handle הנכון (בלי @)';
    fixInput.value = st.correctedHandle || '';
    fixInput.hidden = true;
    fixInput.dir = 'ltr';
    fixToggle.addEventListener('click', function () {
      fixInput.hidden = !fixInput.hidden;
      if (!fixInput.hidden) fixInput.focus();
    });
    fixInput.addEventListener('input', function () {
      st.correctedHandle = fixInput.value.trim().replace(/^@/, '');
      fixToggle.textContent = st.correctedHandle ? 'תוקן: @' + st.correctedHandle : 'ה-handle לא נכון?';
      save();
    });
    fixWrap.appendChild(fixToggle);
    fixWrap.appendChild(fixInput);
    el.appendChild(fixWrap);

    var actions = document.createElement('div');
    actions.className = 'actions';

    var open = document.createElement('a');
    open.className = 'btn btn-primary';
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = 'פתח דיירקט';
    var syncOpenHref = function () {
      open.href = 'https://ig.me/m/' + encodeURIComponent(st.correctedHandle || row.handle);
    };
    syncOpenHref();
    fixInput.addEventListener('input', syncOpenHref);
    open.addEventListener('click', function () {
      if (!st.status) { st.status = 'sent'; el.setAttribute('data-status', 'sent'); sync(); save(); }
    });
    actions.appendChild(open);

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'העתק הודעה';
    copyBtn.addEventListener('click', function () {
      copy(DATA.message).then(function () { toast('ההודעה הועתקה'); });
    });
    actions.appendChild(copyBtn);

    if (row.group === 'verify') {
      var copyBranch = document.createElement('button');
      copyBranch.type = 'button';
      copyBranch.textContent = 'העתק + שם הסניף';
      copyBranch.addEventListener('click', function () {
        copy(DATA.message + ' (מדובר בסניף ' + row.cafes[0].name + ')')
          .then(function () { toast('הועתק עם שם הסניף'); });
      });
      actions.appendChild(copyBranch);
    }
    el.appendChild(actions);

    var chips = document.createElement('div');
    chips.className = 'chips';
    var statusButtons = [];
    STATUSES.forEach(function (status) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip ' + status.cls;
      b.textContent = status.label;
      b.setAttribute('aria-pressed', String(st.status === status.key));
      b.addEventListener('click', function () {
        st.status = st.status === status.key ? '' : status.key;
        el.setAttribute('data-status', st.status);
        sync(); save();
      });
      statusButtons.push({ button: b, key: status.key });
      chips.appendChild(b);
    });
    el.appendChild(chips);

    // Only cafes that actually replied need an answer form — showing 69 of
    // them at once would bury the list.
    var answer = document.createElement('div');
    answer.className = 'answer';
    answer.hidden = st.status !== 'replied';

    var yesNo = document.createElement('div');
    yesNo.className = 'chips';
    [['yes', 'יש ללא גלוטן'], ['no', 'אין']].forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = pair[1];
      b.setAttribute('aria-pressed', String(st.answer === pair[0]));
      b.addEventListener('click', function () {
        st.answer = st.answer === pair[0] ? '' : pair[0];
        yesNo.querySelectorAll('.chip').forEach(function (other, i) {
          other.setAttribute('aria-pressed', String(st.answer === (i === 0 ? 'yes' : 'no')));
        });
        itemsWrap.hidden = st.answer !== 'yes';
        save();
      });
      yesNo.appendChild(b);
    });
    answer.appendChild(yesNo);

    var itemsWrap = document.createElement('div');
    itemsWrap.hidden = st.answer !== 'yes';
    var h3 = document.createElement('h3');
    h3.textContent = 'מה מגישים';
    itemsWrap.appendChild(h3);
    var itemChips = document.createElement('div');
    itemChips.className = 'chips';
    DATA.items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = item;
      b.setAttribute('aria-pressed', String(st.items.indexOf(item) !== -1));
      b.addEventListener('click', function () {
        var at = st.items.indexOf(item);
        if (at === -1) st.items.push(item); else st.items.splice(at, 1);
        b.setAttribute('aria-pressed', String(at === -1));
        save();
      });
      itemChips.appendChild(b);
    });
    itemsWrap.appendChild(itemChips);
    answer.appendChild(itemsWrap);

    var note = document.createElement('textarea');
    note.placeholder = 'ציטוט מהתשובה, אזהרות זיהום צולב…';
    note.value = st.note || '';
    note.addEventListener('input', function () { st.note = note.value; save(); });
    answer.appendChild(note);
    el.appendChild(answer);

    function sync() {
      statusButtons.forEach(function (entryPair) {
        entryPair.button.setAttribute('aria-pressed', String(st.status === entryPair.key));
      });
      answer.hidden = st.status !== 'replied';
    }

    return el;
  }

  var list = document.getElementById('list');
  ['verify', 'pending', 'rest'].forEach(function (key) {
    var rows = DATA.rows.filter(function (row) { return row.group === key; });
    if (!rows.length) return;
    var section = document.createElement('section');
    section.className = 'group';
    var h2 = document.createElement('h2');
    h2.textContent = DATA.groups[key].title + ' · ' + rows.length;
    var p = document.createElement('p');
    p.textContent = DATA.groups[key].blurb;
    section.appendChild(h2);
    section.appendChild(p);
    rows.forEach(function (row) { section.appendChild(card(row)); });
    list.appendChild(section);
  });

  document.getElementById('export').addEventListener('click', function () {
    var out = [];
    DATA.rows.forEach(function (row) {
      var st = state[row.handle];
      if (!st || !st.answer) return;
      // One record per cafe: a handle covering two branches answers for both.
      row.cafes.forEach(function (cafe) {
        out.push({
          id: cafe.id,
          name: cafe.name,
          glutenFree: st.answer === 'yes',
          glutenFreeItems: st.answer === 'yes' ? st.items : [],
          sources: ['manual'],
          evidence: [{
            source: 'manual',
            term: 'ללא גלוטן',
            snippet: (st.note || 'נשאל בדיירקט באינסטגרם') + ' — @' + row.handle
          }]
        });
      });
    });
    if (!out.length) { toast('אין עדיין תשובות לייצוא'); return; }
    copy(JSON.stringify(out, null, 2)).then(function () {
      toast(out.length + ' רשומות הועתקו');
    });
  });

  document.getElementById('export-fixes').addEventListener('click', function () {
    // Same shape apply-instagram-fixes.ts already reads from the WebSearch
    // audit, so a correction typed here goes through the identical review
    // path — no separate ad-hoc format to maintain.
    var out = [];
    DATA.rows.forEach(function (row) {
      var st = state[row.handle];
      if (!st || !st.correctedHandle || st.correctedHandle === row.handle) return;
      out.push({
        ids: row.cafes.map(function (cafe) { return cafe.id; }),
        names: row.cafes.map(function (cafe) { return cafe.name; }),
        storedHandle: row.handle,
        status: 'wrong',
        suggestedHandle: st.correctedHandle,
        evidence: 'Corrected by hand while sending outreach DMs.'
      });
    });
    if (!out.length) { toast('אין תיקוני handle לייצוא'); return; }
    copy(JSON.stringify(out, null, 2)).then(function () {
      toast(out.length + ' תיקונים הועתקו');
    });
  });

  tally();
})();
</script>
`;
}

function main() {
  const rows = buildRows();
  fs.writeFileSync(OUTPUT_PATH, render(rows), 'utf-8');

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.group] = (acc[row.group] ?? 0) + 1;
    return acc;
  }, {});
  const cafeCount = rows.reduce((total, row) => total + row.cafes.length, 0);

  console.log(`Handles: ${rows.length}  (covering ${cafeCount} cafes)`);
  console.log(`  verify:  ${counts.verify ?? 0}`);
  console.log(`  pending: ${counts.pending ?? 0}`);
  console.log(`  rest:    ${counts.rest ?? 0}`);
  console.log(`Shared handles: ${rows.filter((row) => row.cafes.length > 1).length}`);
  console.log(`\nWritten to ${OUTPUT_PATH}`);
}

main();
