// All displayed copy arrives in lesson.json state. Stable keys animate identities,
// including cash tokens and the construction asset; direct links also draw fully.
function mount(stage, kit) {
  // The same compact canvas fits desktop and phone without the kit's edge crop.
  kit.svg.setAttribute('viewBox', '-280 -220 560 440');
}
function text(k, id, x, y, value, size = 19, color = 'ink', weight = 500) {
  k.text(id, { x, y, text: value, size, color, weight, layer: 10 });
}
function card(k, id, x, y, w, h, highlight = false, dashed = false) {
  k.rect(id, { x, y, w, h, r: 10, fill: highlight ? 'yellow-soft' : 'surface',
    stroke: highlight ? 'yellow-ink' : 'blue-ink', dashed, enter: 'grow' });
}
function arrow(k, id, x1, y1, x2, y2, color = 'blue-ink', dashed = false) {
  k.sarrow(id, { x1, y1, x2, y2, color, dashed, width: 2.5, layer: 5 });
}
function icon(k, id, cx, cy, kind, color) {
  // Original geometric marks: no brands, logos, photographs or portraits.
  const d = kind === 'factory'
    ? `M${cx-17},${cy+9} v-18 l11,7 v-7 l11,7 v-17 h7 v28 Z`
    : kind === 'store'
    ? `M${cx-17},${cy-6} l4,-8 h26 l4,8 Z M${cx-14},${cy-6} v20 h28 v-20 M${cx-4},${cy+14} v-12 h8 v12`
    : kind === 'port'
    ? `M${cx-18},${cy+10} h36 M${cx-12},${cy+8} v-26 h24 M${cx+3},${cy-18} v14 M${cx-5},${cy-4} h16 v10 h-16 Z`
    : kind === 'power'
    ? `M${cx+4},${cy-18} l-14,21 h10 l-4,15 l15,-22 h-10 Z`
    : kind === 'airport'
    ? `M${cx},${cy-17} v34 M${cx-18},${cy+2} l18,-8 l18,8 M${cx-9},${cy+15} l9,-5 l9,5`
    : kind === 'rail'
    ? `M${cx-16},${cy-12} h32 v22 h-32 Z M${cx-10},${cy-6} h8 v7 h-8 Z M${cx+2},${cy-6} h8 v7 h-8 Z M${cx-18},${cy+16} h36`
    : kind === 'warehouse'
    ? `M${cx-18},${cy-5} l18,-11 l18,11 v19 h-36 Z M${cx-8},${cy+14} v-14 h16 v14`
    : `M${cx-15},${cy-4} Q${cx},${cy-20} ${cx+15},${cy-4} M${cx-10},${cy+3} Q${cx},${cy-8} ${cx+10},${cy+3} M${cx-4},${cy+10} Q${cx},${cy+5} ${cx+4},${cy+10}`;
  k.path(id, { d, stroke: color, fill: 'none', width: 2, layer: 9 });
}
const boundary = {
  mode: 'svg', label: 'boundary-boxes', mount,
  render(s, prev, k) {
    k.begin();
    text(k, 'caption', 0, -201, s.caption, 20, 'ink', 650);
    const compact = s.stage > 1;
    [-137, 137].forEach((cx, i) => {
      card(k, 'role-'+i, cx-125, compact ? -175 : -67, 250, 80);
      text(k, 'role-text-'+i, cx, compact ? -137 : -29, s.roles[i], 18);
    });
    if (s.stage >= 2) {
      const focus = s.focus === 'ril' || s.focus === 'both';
      card(k, 'ril-outline', -263, -75, 250, 226, focus);
      // Handle emphasises the lunchbox metaphor without implying asset values.
      k.path('ril-handle', { d: 'M-170,-75 v-10 h64 v10', stroke: 'blue-ink', fill: 'none', width: 2 });
      text(k, 'ril-title', -138, -47, s.rilTitle, 19, 'ink', 650);
      s.compartments.forEach((v, i) => {
        k.rect('compartment-'+i, { x: -248, y: -21+i*52, w: 220, h: 43, r: 6,
          fill: 'blue-soft', stroke: 'line-strong', delay: i*80 });
        text(k, 'compartment-text-'+i, -138, i*52, v, 18);
      });
    }
    if (s.stage >= 3) {
      // Dotted portfolio banner is not an enclosing consolidated parent.
      card(k, 'portfolio-banner', 13, -75, 250, 43, false, true);
      text(k, 'portfolio-label', 138, -54, s.portfolioTitle, 18);
      s.entities.forEach((v, i) => {
        card(k, 'entity-'+i, 28, -17+i*57, 220, 48, s.focus === 'both' && i === 0);
        text(k, 'entity-text-'+i, 138, 7+i*57, v, 18, 'ink', 600);
        k.path('handle-'+i, { d: `M103,${-17+i*57} v-6 h70 v6`, stroke: 'blue-ink', fill: 'none', width: 1.5 });
      });
    }
    text(k, 'boundary-note', 0, 188, s.note, 18, 'ink-2');
    k.end();
  },
};
const engines = {
  mode: 'svg', label: 'business-engines', mount,
  render(s, prev, k) {
    k.begin();
    text(k, 'caption', 0, -204, s.caption, 19, 'ink', 650);
    card(k, 'customer', -71, -180, 142, 44, s.stage === 1);
    text(k, 'customer-label', 0, -158, s.customer, 20, 'ink', 650);
    arrow(k, 'delivery', -206, -136, -76, -158);
    arrow(k, 'payment', 76, -154, 208, -128, 'green-ink');
    text(k, 'delivery-label', -174, -166, s.delivery, 17, 'blue-ink');
    text(k, 'payment-label', 177, -166, s.payment, 17, 'green-ink');
    card(k, 'ril-lane', -264, -119, 528, 115, s.active === 'ril');
    text(k, 'ril-label', 0, -100, s.rilTitle, 18, 'ink', 650);
    card(k, 'adani-banner', -264, 7, 528, 35, false, true);
    text(k, 'adani-label', 0, 24, s.adaniTitle, 18, 'ink', 650);
    const nodes = [
      { id: 'fuel', min: 2, x: -248, y: -80, w: 152, kind: 'factory' },
      { id: 'jio', min: 3, x: -76, y: -80, w: 152, kind: 'signal' },
      { id: 'retail', min: 3, x: 96, y: -80, w: 152, kind: 'store' },
      { id: 'ports', min: 4, x: -264, y: 53, w: 246, kind: 'port' },
      { id: 'power', min: 5, x: -5, y: 53, w: 128, kind: 'power' },
      { id: 'airport', min: 5, x: 136, y: 53, w: 128, kind: 'airport' },
    ];
    nodes.forEach(n => {
      if (s.stage < n.min) return;
      const inspected = s.active === n.id;
      const cx = n.x+n.w/2;
      card(k, 'engine-'+n.id, n.x, n.y, n.w, 69, inspected);
      const color = inspected ? 'yellow-ink' : 'blue-ink';
      if (n.id === 'ports') {
        icon(k, 'icon-ports', cx-74, n.y+19, 'port', color);
        icon(k, 'icon-rail', cx, n.y+19, 'rail', color);
        icon(k, 'icon-warehouse', cx+74, n.y+19, 'warehouse', color);
        arrow(k, 'port-rail', cx-51, n.y+19, cx-24, n.y+19, color);
        arrow(k, 'rail-warehouse', cx+24, n.y+19, cx+50, n.y+19, color);
      } else icon(k, 'icon-'+n.id, cx, n.y+19, n.kind, color);
      text(k, 'label-'+n.id, cx, n.y+50, s.labels[n.id], 17, 'ink', 600);
    });
    if (s.stage === 2) {
      text(k, 'input-output', 0, 190, s.costs, 19);
      arrow(k, 'input', -172, 116, -172, -6);
      text(k, 'input-name', -173, 143, s.feedstock, 18);
    }
    if (s.stage === 4 || s.integrated) {
      // A service connection, never a new ownership outline.
      text(k, 'cargo-chain', -141, 135, s.cargoLink, 17, 'blue-ink');
      arrow(k, 'cargo-service', -231, 154, -52, 154, s.integrated ? 'yellow-ink' : 'blue-ink', true);
    }
    if (s.integrated) {
      arrow(k, 'retail-jio', 96, -46, 78, -46, 'yellow-ink', true);
      text(k, 'distribution', 0, -3, s.retailLink, 17, 'yellow-ink');
    }
    if (s.building || s.risk) {
      // Illustrative timing only: no quantities are inferred from company data.
      // The same tank, token and asset keys move between construction/operation.
      card(k, 'tank', -91, 156, 145, 53, s.building);
      text(k, 'tank-label', -19, 178, s.tank, 18, 'ink', 600);
      [-234, -174, -114].forEach((x, i) => {
        text(k, 'funding-label-'+i, x, 180, s.funding[i], 16, 'ink-2');
        arrow(k, 'funding-pipe-'+i, x, 193, -92, 199, 'green-ink');
        k.circle('cash-token-'+i, { x: s.risk ? -40+i*24 : x+25, y: s.risk ? 199 : 199,
          r: 4, fill: 'green', delay: i*90, layer: 12 });
      });
      arrow(k, 'capex-pipe', 56, 187, 128, 187, 'blue-ink');
      card(k, 'new-asset', 136, 156, 127, 53, s.risk);
      text(k, 'asset-label', 199, 176, s.asset, 17, 'ink', 600);
      k.circle('clock', { x: 110, y: 164, r: 12, stroke: 'yellow-ink', fill: 'surface' });
      k.line('clock-hand', { x1: 110, y1: 164, x2: s.risk ? 120 : 110, y2: s.risk ? 164 : 154, color: 'yellow-ink', width: 2 });
      if (s.risk) {
        text(k, 'obligations', 0, 140, s.obligations, 17, 'yellow-ink', 600);
        text(k, 'asset-ramp', 200, 197, s.ramp, 16, 'ink-2');
        // A small rising path is qualitative timing, not a company data chart.
        k.path('ramp-path', { d: 'M137,213 L160,213 L178,211 L200,206',
          stroke: 'blue-ink', fill: 'none', width: 2 });
      } else text(k, 'capex-label', 106, 207, s.capex, 16);
    } else if (s.stage !== 2 && s.stage !== 4) {
      text(k, 'engine-note', 0, 190, s.note, 18, 'ink-2');
    }
    k.end();
  },
};
const evidence = {
  mode: 'svg', label: 'evidence-cards', mount,
  render(s, prev, k) {
    k.begin();
    text(k, 'caption', 0, -201, s.caption, 20, 'ink', 650);
    // Persistent focus marker glides as the evidence question changes.
    k.circle('focus', { x: -253+s.stage*18, y: -177, r: 5, fill: 'yellow' });
    if (s.view === 'money') {
      s.cards.forEach((v, i) => {
        const x = i%2 ? 12 : -263, y = i<2 ? -147 : 11;
        card(k, 'money-'+i, x, y, 251, 133, i === 3);
        text(k, 'money-title-'+i, x+125, y+28, v.title, 21, 'ink', 650);
        text(k, 'money-copy-'+i, x+125, y+83, v.text, 18);
      });
      text(k, 'money-note', 0, 183, s.note, 18, 'ink-2');
    } else if (s.view === 'cash') {
      card(k, 'cash-account', 132, -144, 132, 283, true);
      text(k, 'cash-account-label', 198, -19, s.account, 20, 'ink', 650);
      s.flows.forEach((v, i) => {
        const y = -142+i*102;
        card(k, 'flow-'+i, -263, y, 275, 83);
        text(k, 'flow-title-'+i, -126, y+23, v.title, 20, 'ink', 650);
        text(k, 'flow-text-'+i, -126, y+58, v.text, 18);
        const out = i === 1;
        arrow(k, 'flow-arrow-'+i, out ? 130 : 15, y+42, out ? 15 : 130, y+42,
          i === 2 ? 'yellow-ink' : 'blue-ink');
      });
      text(k, 'cash-note', 0, 190, s.note, 18, 'ink-2');
    } else if (s.view === 'comparability') {
      text(k, 'period', 0, -148, s.period, 19, 'blue-ink', 600);
      s.cards.forEach((v, i) => {
        const y = -115+i*88;
        card(k, 'entity-evidence-'+i, -262, y, 524, 76, i === 1);
        text(k, 'entity-name-'+i, -122, y+23, v.title, 19, 'ink', 650);
        text(k, 'entity-measure-'+i, -122, y+53, v.measure, 18);
        text(k, 'entity-value-'+i, 142, y+39, v.value, 23, 'blue-ink', 650);
      });
      text(k, 'units', 0, 182, s.note, 18, 'ink-2');
    } else if (s.view === 'debt') {
      s.cards.forEach((v, i) => {
        const x = i ? 12 : -262;
        card(k, 'debt-'+i, x, -132, 250, 172, i === 1, i === 1);
        text(k, 'debt-name-'+i, x+125, -105, v.title, 20, 'ink', 650);
        text(k, 'debt-ratio-'+i, x+125, -55, v.value, 35, 'blue-ink', 700);
        text(k, 'debt-measure-'+i, x+125, 2, v.text, 18);
      });
      card(k, 'maturity', -263, 65, 526, 81);
      text(k, 'maturity-copy', 0, 105, s.maturity, 19);
      text(k, 'debt-note', 0, 187, s.note, 18, 'ink-2');
    } else if (s.view === 'risks') {
      s.risks.forEach((v, i) => {
        const y = -157+i*65;
        card(k, 'risk-engine-'+i, -264, y, 181, 52);
        text(k, 'risk-name-'+i, -174, y+26, v.title, 18, 'ink', 650);
        arrow(k, 'risk-link-'+i, -79, y+26, -42, y+26, 'yellow-ink');
        card(k, 'risk-cause-'+i, -37, y, 301, 52, true);
        text(k, 'risk-text-'+i, 113, y+26, v.text, 18);
      });
      text(k, 'risk-note', 0, 191, s.note, 18, 'ink-2');
    } else if (s.view === 'evidence') {
      s.documents.forEach((v, i) => {
        const y = -153+i*72;
        card(k, 'document-'+i, -263, y, 526, 58, i === 2);
        k.rect('folder-tab-'+i, { x: -252, y: y-7, w: 66, h: 8, r: 2,
          fill: i === 2 ? 'yellow-soft' : 'blue-soft', stroke: 'blue-ink' });
        text(k, 'document-text-'+i, 0, y+29, v, 18, 'ink', 600);
      });
      card(k, 'scope', -263, 75, 526, 88, true);
      text(k, 'scope-copy', 0, 119, s.scope, 18);
      text(k, 'freshness', 0, 196, s.note, 18, 'muted');
    }
    k.end();
  },
};
export default { 'boundary-boxes': boundary, 'business-engines': engines, 'evidence-cards': evidence };
