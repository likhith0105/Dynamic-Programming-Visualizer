/*
Dynamic Programming Visualizer (single-file JS)

Conventions:
- Each algorithm module returns:
  { title, presets: [{name, inputs}], build: (inputs) => { steps, finalText, tableMeta } }
- steps: array of { i, j, value, desc, highlights: [{i,j,kind}], set: [{i,j,value}] }
- tableMeta: { rows, cols, rowLabels?, colLabels?, emptyValue? }
*/

const $ = (id) => document.getElementById(id);

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function parseNums(str) {
  return str
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number);
}

function fmt(v) {
  if (v === Infinity) return '∞';
  if (v === null || v === undefined) return '—';
  return String(v);
}

function makeTableState(tableMeta) {
  const rows = tableMeta.rows;
  const cols = tableMeta.cols;
  const empty = tableMeta.emptyValue ?? null;
  const dp = Array.from({ length: rows }, () => Array.from({ length: cols }, () => empty));
  return dp;
}

function cloneGrid(grid) {
  return grid.map(r => r.slice());
}

function renderDPTable(tableMeta, dp, highlights = []) {
  const wrap = $('tableWrap');
  wrap.innerHTML = '';

  const { rows, cols, rowLabels, colLabels } = tableMeta;

  const table = document.createElement('table');
  table.className = 'dp-table';

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');

  const corner = document.createElement('th');
  corner.textContent = '';
  hr.appendChild(corner);

  for (let c = 0; c < cols; c++) {
    const th = document.createElement('th');
    th.textContent = colLabels?.[c] ?? c;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = rowLabels?.[r] ?? r;
    tr.appendChild(th);

    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.dataset.i = r;
      td.dataset.j = c;
      td.textContent = fmt(dp[r][c]);

      const hit = highlights.find(h => h.i === r && h.j === c);
      if (hit) {
        if (hit.kind === 'cur') td.classList.add('cell-cur');
        if (hit.kind === 'dep') td.classList.add('cell-dep');
        if (hit.kind === 'try') td.classList.add('cell-try');
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
}

function createInputField({ key, label, placeholder, defaultValue }) {
  const div = document.createElement('div');
  div.className = 'field';

  const lab = document.createElement('label');
  lab.textContent = label;
  lab.setAttribute('for', `in-${key}`);

  const input = document.createElement('input');
  input.id = `in-${key}`;
  input.className = 'input';
  input.placeholder = placeholder ?? '';
  input.value = defaultValue ?? '';

  div.appendChild(lab);
  div.appendChild(input);
  return div;
}

function readInputs(schema) {
  const res = {};
  for (const s of schema) {
    const el = $(`in-${s.key}`);
    res[s.key] = el ? el.value : s.defaultValue;
  }
  return res;
}

// ------------------ Algorithms ------------------

const Algorithms = {
  fib: {
    id: 'fib',
    name: 'Fibonacci',
    inputsSchema: [
      { key: 'n', label: 'n', placeholder: 'e.g. 10', defaultValue: '10' }
    ],
    presets: [
      { name: 'n=10', inputs: { n: '10' } },
      { name: 'n=20', inputs: { n: '20' } },
      { name: 'n=6', inputs: { n: '6' } }
    ],
    build: ({ n }) => {
      const nn = Number(n);
      const N = Math.max(0, nn);
      const meta = { rows: N + 1, cols: 1, rowLabels: Array.from({length: N+1}, (_,i)=>i), colLabels: [''] };
      meta.emptyValue = null;

      const steps = [];
      const dp = makeTableState(meta);

      // Base: dp[0]=0, dp[1]=1
      if (N >= 0) {
        dp[0][0] = 0;
        steps.push({
          desc: 'Initialize dp[0] = 0',
          highlights: [{ i: 0, j: 0, kind: 'cur' }],
          set: [{ i: 0, j: 0, value: 0 }]
        });
      }
      if (N >= 1) {
        dp[1][0] = 1;
        steps.push({
          desc: 'Initialize dp[1] = 1',
          highlights: [{ i: 1, j: 0, kind: 'cur' }],
          set: [{ i: 1, j: 0, value: 1 }]
        });
      }

      for (let i = 2; i <= N; i++) {
        const a = dp[i-1][0];
        const b = dp[i-2][0];
        const v = a + b;
        dp[i][0] = v;
        steps.push({
          desc: `Compute dp[${i}] = dp[${i-1}] + dp[${i-2}] = ${a} + ${b} = ${v}`,
          highlights: [
            { i, j: 0, kind: 'cur' },
            { i: i-1, j: 0, kind: 'dep' },
            { i: i-2, j: 0, kind: 'dep' }
          ],
          set: [{ i, j: 0, value: v }]
        });
      }

      return {
        title: `Fibonacci(${N})`,
        tableMeta: meta,
        steps,
        finalText: `F(${N}) = ${N === 0 ? 0 : dp[N][0]}`
      };
    }
  },

  knapsack01: {
    id: 'knapsack01',
    name: '0/1 Knapsack',
    inputsSchema: [
      { key: 'capacity', label: 'Capacity (W)', placeholder: 'e.g. 10', defaultValue: '10' },
      { key: 'weights', label: 'Weights', placeholder: 'comma/space separated', defaultValue: '2 3 4 5' },
      { key: 'values', label: 'Values', placeholder: 'comma/space separated', defaultValue: '3 4 5 6' }
    ],
    presets: [
      { name: 'W=10', inputs: { capacity: '10', weights: '2 3 4 5', values: '3 4 5 6' } },
      { name: 'W=8', inputs: { capacity: '8', weights: '1 3 4 5', values: '1 4 5 7' } }
    ],
    build: ({ capacity, weights, values }) => {
      const W = Math.max(0, Number(capacity));
      const wt = parseNums(weights);
      const val = parseNums(values);
      const n = Math.min(wt.length, val.length);

      const meta = {
        rows: n + 1,
        cols: W + 1,
        rowLabels: Array.from({ length: n + 1 }, (_, i) => i),
        colLabels: Array.from({ length: W + 1 }, (_, j) => j),
        emptyValue: null
      };

      const steps = [];
      const dp = makeTableState(meta);
      for (let i = 0; i <= n; i++) dp[i].fill(0);

      steps.push({
        desc: 'Initialize row 0 and column 0 to 0.',
        highlights: [{ i: 0, j: 0, kind: 'cur' }],
        set: []
      });

      for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= W; w++) {
          const notTake = dp[i-1][w];
          let take = -Infinity;
          if (wt[i-1] <= w) take = dp[i-1][w - wt[i-1]] + val[i-1];
          const best = Math.max(notTake, take);
          dp[i][w] = best;

          const highlights = [
            { i, j: w, kind: 'cur' },
            { i: i-1, j: w, kind: 'dep' }
          ];
          if (wt[i-1] <= w) highlights.push({ i: i-1, j: w - wt[i-1], kind: 'dep' });

          const expl = wt[i-1] <= w
            ? `dp[${i}][${w}] = max(dp[${i-1}][${w}] = ${notTake}, dp[${i-1}][${w-wt[i-1]}] + ${val[i-1]} = ${take}) = ${best}`
            : `dp[${i}][${w}] = dp[${i-1}][${w}] = ${notTake} (item too heavy)`;

          steps.push({
            desc: expl,
            highlights,
            set: [{ i, j: w, value: best }]
          });
        }
      }

      return {
        title: '0/1 Knapsack',
        tableMeta: meta,
        steps,
        finalText: `Optimal value = ${dp[n][W]}`
      };
    }
  },

  lcs: {
    id: 'lcs',
    name: 'Longest Common Subsequence (LCS)',
    inputsSchema: [
      { key: 'a', label: 'Sequence A', placeholder: 'e.g. ABCBDAB', defaultValue: 'ABCBDAB' },
      { key: 'b', label: 'Sequence B', placeholder: 'e.g. BDCABA', defaultValue: 'BDCABA' }
    ],
    presets: [
      { name: 'Classic', inputs: { a: 'ABCBDAB', b: 'BDCABA' } },
      { name: 'Short', inputs: { a: 'AGGTAB', b: 'GXTXAYB' } }
    ],
    build: ({ a, b }) => {
      const A = (a ?? '').toString();
      const B = (b ?? '').toString();
      const n = A.length;
      const m = B.length;

      const meta = {
        rows: n + 1,
        cols: m + 1,
        rowLabels: [''].concat(A.split('')),
        colLabels: [''].concat(B.split('')),
        emptyValue: null
      };

      const steps = [];
      const dp = makeTableState(meta);
      for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) dp[i][j] = 0;

      steps.push({
        desc: 'Initialize dp with zeros for empty prefixes.',
        highlights: [{ i: 0, j: 0, kind: 'cur' }],
        set: []
      });

      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (A[i-1] === B[j-1]) {
            const best = dp[i-1][j-1] + 1;
            dp[i][j] = best;
            steps.push({
              desc: `Match '${A[i-1]}' at A[${i-1}] and B[${j-1}]: dp[${i}][${j}] = dp[${i-1}][${j-1}] + 1 = ${best}`,
              highlights: [
                { i, j, kind: 'cur' },
                { i: i-1, j: j-1, kind: 'dep' }
              ],
              set: [{ i, j, value: best }]
            });
          } else {
            const up = dp[i-1][j];
            const left = dp[i][j-1];
            const best = Math.max(up, left);
            dp[i][j] = best;
            steps.push({
              desc: `No match ('${A[i-1]}' vs '${B[j-1]}'): dp[${i}][${j}] = max(dp[${i-1}][${j}] = ${up}, dp[${i}][${j-1}] = ${left}) = ${best}`,
              highlights: [
                { i, j, kind: 'cur' },
                { i: i-1, j, kind: 'dep' },
                { i, j: j-1, kind: 'dep' }
              ],
              set: [{ i, j, value: best }]
            });
          }
        }
      }

      return {
        title: 'LCS',
        tableMeta: meta,
        steps,
        finalText: `LCS length = ${dp[n][m]}`
      };
    }
  },

  lis: {
    id: 'lis',
    name: 'Longest Increasing Subsequence (LIS)',
    inputsSchema: [
      { key: 'arr', label: 'Array', placeholder: 'e.g. 10 9 2 5 3 7 101 18', defaultValue: '10 9 2 5 3 7 101 18' }
    ],
    presets: [
      { name: 'Classic', inputs: { arr: '10 9 2 5 3 7 101 18' } },
      { name: 'Short', inputs: { arr: '3 10 2 1 20' } }
    ],
    build: ({ arr }) => {
      const a = parseNums(arr);
      const n = a.length;

      // dp[i] = LIS ending at i
      // We'll represent as table (n x 1) for simplicity with labels.
      const meta = {
        rows: n,
        cols: 1,
        rowLabels: a.map((_, idx) => idx),
        colLabels: ['dp[i]'],
        emptyValue: null
      };

      const steps = [];
      const dp = makeTableState(meta);

      for (let i = 0; i < n; i++) {
        dp[i][0] = 1;
        steps.push({
          desc: `Initialize dp[${i}] = 1 (every element alone forms length 1 subsequence).`,
          highlights: [{ i, j: 0, kind: 'cur' }],
          set: [{ i, j: 0, value: 1 }]
        });

        for (let j = 0; j < i; j++) {
          if (a[j] < a[i]) {
            const cand = dp[j][0] + 1;
            steps.push({
              desc: `Try extending from j=${j} because ${a[j]} < ${a[i]}: candidate = dp[${j}] + 1 = ${dp[j][0]} + 1 = ${cand}`,
              highlights: [
                { i, j: 0, kind: 'cur' },
                { i: j, j: 0, kind: 'try' }
              ],
              set: []
            });
            if (cand > dp[i][0]) {
              dp[i][0] = cand;
              steps.push({
                desc: `Update dp[${i}] to ${cand} (better than previous ${dp[i][0] === cand ? cand : dp[i][0]}).`,
                highlights: [
                  { i, j: 0, kind: 'cur' },
                  { i: j, j: 0, kind: 'dep' }
                ],
                set: [{ i, j: 0, value: cand }]
              });
            }
          }
        }
      }

      let best = 0;
      for (let i = 0; i < n; i++) best = Math.max(best, dp[i][0]);

      return {
        title: 'LIS',
        tableMeta: meta,
        steps,
        finalText: `LIS length = ${best}`
      };
    }
  },

  matrixChain: {
    id: 'matrixChain',
    name: 'Matrix Chain Multiplication',
    inputsSchema: [
      { key: 'dims', label: 'Dimensions p (size n+1)', placeholder: 'e.g. 30 35 15 5 10 20', defaultValue: '30 35 15 5 10 20' }
    ],
    presets: [
      { name: 'Classic', inputs: { dims: '30 35 15 5 10 20' } },
      { name: 'Small', inputs: { dims: '10 20 30 40 30' } }
    ],
    build: ({ dims }) => {
      const p = parseNums(dims);
      const n = p.length - 1; // matrices A1..An

      // m[i][j] for i<=j, 1-indexed in formula. We'll store 0-indexed: i..j correspond to 1..n.
      const meta = {
        rows: n + 1,
        cols: n + 1,
        rowLabels: Array.from({ length: n + 1 }, (_, i) => i === 0 ? '' : `i=${i}`),
        colLabels: Array.from({ length: n + 1 }, (_, j) => j === 0 ? '' : `j=${j}`),
        emptyValue: null
      };

      const steps = [];
      const m = makeTableState(meta);
      for (let i = 1; i <= n; i++) m[i][i] = 0;

      steps.push({
        desc: 'Initialize m[i][i] = 0 (single matrix needs no multiplications).',
        highlights: [{ i: 1, j: 1, kind: 'cur' }],
        set: []
      });

      for (let L = 2; L <= n; L++) {
        for (let i = 1; i <= n - L + 1; i++) {
          const j = i + L - 1;
          m[i][j] = Infinity;
          steps.push({
            desc: `Compute cost for chain (i=${i}..j=${j}). Start with ∞.`,
            highlights: [{ i, j, kind: 'cur' }],
            set: [{ i, j, value: Infinity }]
          });

          for (let k = i; k < j; k++) {
            const q = m[i][k] + m[k+1][j] + p[i-1] * p[k] * p[j];
            steps.push({
              desc: `Split at k=${k}: q = m[${i}][${k}] (${m[i][k]}) + m[${k+1}][${j}] (${m[k+1][j]}) + p[${i-1}]*p[${k}]*p[${j}] = ${q}`,
              highlights: [
                { i, j, kind: 'cur' },
                { i, j: k, kind: 'dep' },
                { i: k+1, j, kind: 'dep' }
              ],
              set: []
            });

            if (q < m[i][j]) {
              m[i][j] = q;
              steps.push({
                desc: `Update m[${i}][${j}] = ${q} (new best).`,
                highlights: [
                  { i, j, kind: 'cur' },
                  { i, j: k, kind: 'dep' },
                  { i: k+1, j, kind: 'dep' }
                ],
                set: [{ i, j, value: q }]
              });
            }
          }
        }
      }

      return {
        title: 'Matrix Chain Multiplication',
        tableMeta: meta,
        steps,
        finalText: `Minimum multiplications = ${m[1][n]}`
      };
    }
  },

  coinChange: {
    id: 'coinChange',
    name: 'Coin Change (min coins)',
    inputsSchema: [
      { key: 'coins', label: 'Coins', placeholder: 'e.g. 1 2 5', defaultValue: '1 2 5' },
      { key: 'amount', label: 'Amount', placeholder: 'e.g. 11', defaultValue: '11' }
    ],
    presets: [
      { name: 'amount=11', inputs: { coins: '1 2 5', amount: '11' } },
      { name: 'amount=3', inputs: { coins: '2 5', amount: '3' } }
    ],
    build: ({ coins, amount }) => {
      const coinsArr = parseNums(coins);
      const A = Math.max(0, Number(amount));

      // dp[x] = min coins to make amount x.
      const meta = {
        rows: A + 1,
        cols: 1,
        rowLabels: Array.from({ length: A + 1 }, (_, i) => i),
        colLabels: ['minCoins'],
        emptyValue: null
      };

      const dp = makeTableState(meta);
      const steps = [];

      dp[0][0] = 0;
      steps.push({
        desc: 'Initialize dp[0] = 0',
        highlights: [{ i: 0, j: 0, kind: 'cur' }],
        set: [{ i: 0, j: 0, value: 0 }]
      });

      for (let x = 1; x <= A; x++) {
        dp[x][0] = Infinity;
        steps.push({
          desc: `Initialize dp[${x}] = ∞`,
          highlights: [{ i: x, j: 0, kind: 'cur' }],
          set: [{ i: x, j: 0, value: Infinity }]
        });

        for (const c of coinsArr) {
          if (c <= x && dp[x - c][0] !== Infinity) {
            const cand = dp[x - c][0] + 1;
            steps.push({
              desc: `Try coin ${c}: dp[${x}] = min(dp[${x}], dp[${x-c}] + 1) = min(${fmt(dp[x][0])}, ${dp[x-c][0]} + 1 = ${cand})`,
              highlights: [
                { i: x, j: 0, kind: 'cur' },
                { i: x - c, j: 0, kind: 'try' }
              ],
              set: []
            });

            if (cand < dp[x][0]) {
              dp[x][0] = cand;
              steps.push({
                desc: `Update dp[${x}] = ${cand}`,
                highlights: [
                  { i: x, j: 0, kind: 'cur' },
                  { i: x - c, j: 0, kind: 'dep' }
                ],
                set: [{ i: x, j: 0, value: cand }]
              });
            }
          }
        }
      }

      const ans = dp[A][0];
      return {
        title: 'Coin Change',
        tableMeta: meta,
        steps,
        finalText: ans === Infinity ? `No solution for amount ${A}` : `Minimum coins for ${A} = ${ans}`
      };
    }
  },

  editDistance: {
    id: 'editDistance',
    name: 'Edit Distance (Levenshtein)',
    inputsSchema: [
      { key: 's1', label: 'String 1', placeholder: 'e.g. kitten', defaultValue: 'kitten' },
      { key: 's2', label: 'String 2', placeholder: 'e.g. sitting', defaultValue: 'sitting' }
    ],
    presets: [
      { name: 'kitten→sitting', inputs: { s1: 'kitten', s2: 'sitting' } },
      { name: 'flaw→lawn', inputs: { s1: 'flaw', s2: 'lawn' } }
    ],
    build: ({ s1, s2 }) => {
      const A = (s1 ?? '').toString();
      const B = (s2 ?? '').toString();
      const n = A.length;
      const m = B.length;

      const meta = {
        rows: n + 1,
        cols: m + 1,
        rowLabels: [''].concat(A.split('')),
        colLabels: [''].concat(B.split('')),
        emptyValue: null
      };

      const steps = [];
      const dp = makeTableState(meta);

      for (let i = 0; i <= n; i++) dp[i][0] = i;
      for (let j = 0; j <= m; j++) dp[0][j] = j;

      steps.push({
        desc: 'Initialize first row/column: dp[i][0]=i deletions, dp[0][j]=j insertions.',
        highlights: [{ i: 0, j: 0, kind: 'cur' }],
        set: []
      });

      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const cost = A[i-1] === B[j-1] ? 0 : 1;
          const del = dp[i-1][j] + 1;
          const ins = dp[i][j-1] + 1;
          const sub = dp[i-1][j-1] + cost;
          const best = Math.min(del, ins, sub);
          dp[i][j] = best;

          const expl = cost === 0
            ? `Characters match ('${A[i-1]}'='${B[j-1]}'): dp[${i}][${j}] = dp[${i-1}][${j-1}] = ${dp[i][j]}`
            : `dp[${i}][${j}] = min(delete=${del}, insert=${ins}, substitute=${sub}) = ${best}`;

          steps.push({
            desc: expl,
            highlights: [
              { i, j, kind: 'cur' },
              { i: i-1, j, kind: 'dep' },
              { i, j: j-1, kind: 'dep' },
              { i: i-1, j: j-1, kind: 'dep' }
            ],
            set: [{ i, j, value: best }]
          });
        }
      }

      return {
        title: 'Edit Distance',
        tableMeta: meta,
        steps,
        finalText: `Edit distance = ${dp[n][m]}`
      };
    }
  }
};

// ------------------ UI / Controller ------------------

const algorithmSelect = $('algorithm');
const presetSelect = $('preset');
const inputsDiv = $('inputs');
const speedRange = $('speed');
const speedLabel = $('speedLabel');

const btnPlay = $('btnPlay');
const btnPrev = $('btnPrev');
const btnNext = $('btnNext');
const btnReset = $('btnReset');
const vizStep = $('vizStep');
const vizExplain = $('vizExplain');
const resultEl = $('result');

let current = {
  algoId: null,
  tableMeta: null,
  steps: [],
  dp: null,
  stepIndex: 0,
  playing: false,
  timer: null
};

function getAlgo() {
  return Algorithms[current.algoId];
}

function stopPlaying() {
  current.playing = false;
  btnPlay.textContent = '▶ Play';
  if (current.timer) clearInterval(current.timer);
  current.timer = null;
}

function setSpeedUI() {
  const v = Number(speedRange.value);
  speedLabel.textContent = `${v}ms`;
}

function buildUIForAlgorithm(algo) {
  inputsDiv.innerHTML = '';

  // presets
  presetSelect.innerHTML = '';
  for (let i = 0; i < algo.presets.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = algo.presets[i].name;
    presetSelect.appendChild(opt);
  }

  // inputs
  for (const field of algo.inputsSchema) {
    inputsDiv.appendChild(createInputField(field));
  }

  // apply preset 0
  presetSelect.value = '0';
  const preset = algo.presets[0];
  for (const key of Object.keys(preset.inputs)) {
    const el = $(`in-${key}`);
    if (el) el.value = preset.inputs[key];
  }
}

function gatherInputs() {
  const algo = getAlgo();
  const raw = readInputs(algo.inputsSchema);
  return raw;
}

function initializeSteps() {
  stopPlaying();
  const algo = getAlgo();
  const inputs = gatherInputs();
  const built = algo.build(inputs);

  current.tableMeta = built.tableMeta;
  current.steps = built.steps;
  current.dp = makeTableState(current.tableMeta);
  current.stepIndex = 0;
  current.algoId = algo.id;

  // set initial empty table render
  renderDPTable(current.tableMeta, current.dp, []);

  resultEl.textContent = '—';

  // Render the first step
  if (current.steps.length > 0) {
    applyStepToDP(0, true);
  }
}


function applyStepToDP(idx, first=false) {
  const step = current.steps[idx];

  // apply all set operations up to idx
  if (!first) {
    // incremental: assume dp already has prior updates; apply only this set.
  }

  // If first time, reset dp then apply sets from 0..idx
  if (first) {
    current.dp = makeTableState(current.tableMeta);
    for (let k = 0; k <= idx; k++) {
      const st = current.steps[k];
      for (const op of (st.set ?? [])) {
        current.dp[op.i][op.j] = op.value;
      }
    }
  } else {
    for (const op of (step.set ?? [])) {
      current.dp[op.i][op.j] = op.value;
    }
  }

  // render
  const highlights = step?.highlights ?? [];
  renderDPTable(current.tableMeta, current.dp, highlights);

  current.stepIndex = idx;
  vizStep.textContent = `Step ${idx + 1} / ${current.steps.length}`;
  vizExplain.textContent = step?.desc ?? '';
  if (idx === current.steps.length - 1) resultEl.textContent = getAlgo().build(gatherInputs()).finalText;
}

function stepNext() {
  if (current.stepIndex >= current.steps.length - 1) return;
  applyStepToDP(current.stepIndex + 1);
}

function stepPrev() {
  if (current.stepIndex <= 0) return;
  // easiest: rebuild from scratch by applying sets up to target
  applyStepToDP(current.stepIndex - 1, true);
}

function togglePlay() {
  if (!current.algoId) return;
  if (current.playing) {
    stopPlaying();
    return;
  }
  current.playing = true;
  btnPlay.textContent = '⏸ Pause';
  const delay = Number(speedRange.value);

  current.timer = setInterval(() => {
    if (current.stepIndex >= current.steps.length - 1) {
      stopPlaying();
      resultEl.textContent = getAlgo().build(gatherInputs()).finalText;
      return;
    }
    stepNext();
  }, delay);
}

function resetAll() {
  if (!current.algoId) return;
  initializeSteps();
  // set result at end step
  const built = getAlgo().build(gatherInputs());
  resultEl.textContent = '—';
}

function computeAlgorithmText() {
  const algo = getAlgo();
  const built = algo.build(gatherInputs());
  resultEl.textContent = built.finalText;
}

function init() {
  algorithmSelect.innerHTML = '';
  const order = ['fib', 'knapsack01', 'lcs', 'lis', 'matrixChain', 'coinChange', 'editDistance'];
  for (const id of order) {
    const algo = Algorithms[id];
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = algo.name;
    algorithmSelect.appendChild(opt);
  }

  setSpeedUI();

  // default select
  algorithmSelect.value = 'fib';
  current.algoId = 'fib';

  buildUIForAlgorithm(Algorithms.fib);
  initializeSteps();

  algorithmSelect.addEventListener('change', () => {
    current.algoId = algorithmSelect.value;
    const algo = Algorithms[current.algoId];
    buildUIForAlgorithm(algo);
    initializeSteps();
  });

  presetSelect.addEventListener('change', () => {
    const algo = getAlgo();
    const idx = Number(presetSelect.value);
    const preset = algo.presets[idx];
    for (const key of Object.keys(preset.inputs)) {
      const el = $(`in-${key}`);
      if (el) el.value = preset.inputs[key];
    }
    initializeSteps();
  });

  // rebuild when user edits inputs
  inputsDiv.addEventListener('change', () => initializeSteps());
  inputsDiv.addEventListener('input', (e) => {
    if (e.target && e.target.tagName === 'INPUT') {
      // debounce-ish
    }
  });

  speedRange.addEventListener('input', () => setSpeedUI());

  btnPrev.addEventListener('click', () => stepPrev());
  btnNext.addEventListener('click', () => stepNext());
  btnPlay.addEventListener('click', () => togglePlay());
  btnReset.addEventListener('click', () => resetAll());
}

init();

