// Scenes for "Responsive Self Service Procurement in Oracle Fusion".
// State-based: render(state, prev, kit) draws the whole picture for one step; stable keys glide.
// Colour meaning: green = added/correct, red = wrong/error/hold, yellow = being looked at, blue = normal/active.
// Mostly screen-space (a flat pipeline reads best), drawn inside about ±325 x ±235 so phones don't crop it.

// ---------- small helpers ----------
function pill(k, key, x, y, w, text, opts = {}) {
  k.rect(key, { x: x - w / 2, y, w, h: 34, r: 17, fill: opts.fill || 'surface', stroke: opts.stroke || 'line-strong',
    label: text, labelSize: opts.size || 14, labelColor: opts.color || 'ink', layer: 20 });
}
function person(k, key, x, y, color = 'blue', opacity = 1) {
  k.circle(key + '-head', { x, y: y - 22, r: 9, fill: color, opacity });
  k.path(key + '-body', { d: `M${x - 14},${y + 14} Q${x},${y - 18} ${x + 14},${y + 14} Z`, fill: color, stroke: color, width: 1, opacity });
}
function check(k, key, x, y, ok, size = 15) {
  k.text(key, { x, y, text: ok ? '✓' : '✗', size, weight: 800, color: ok ? 'green-ink' : 'red-ink' });
}

// =====================================================================
// ELI5: the company food court
// =====================================================================
const COUNTERS = [
  { x: -270, name: 'Salad bar', real: 'local catalog' },
  { x: -150, name: 'Grill stall', real: 'punchout' },
  { x: -30, name: 'Custom order', real: 'smart form' },
];
const foodCourt = {
  mode: 'svg',
  label: 'A company food court: kitchens, counters, a diner, a manager, an expediter and a supplier',
  render(s, prev, k) {
    k.begin();
    const st = s.stage || 'kitchen';
    const order = ['kitchen', 'wristband', 'ticket', 'named'];
    const n = order.indexOf(st);
    const named = st === 'named';
    if (s.caption) pill(k, 'caption', 0, -238, 420, s.caption, { size: 14 });

    // kitchens (back row)
    [{ x: -300, t: 'Kitchen' }, { x: -130, t: 'Kitchen 2' }].forEach((kc, i) => {
      k.rect('kitchen-' + i, { x: kc.x, y: -188, w: 150, h: 50, r: 8, fill: 'surface-2', stroke: 'ink-2', label: kc.t, labelSize: 14 });
      k.path('kitchen-roof-' + i, { d: `M${kc.x + 10},-188 L${kc.x + 75},-202 L${kc.x + 140},-188`, stroke: 'ink-2', width: 1.5 });
      if (named) k.text('kitchen-real-' + i, { x: kc.x + 75, y: -128, text: 'Procurement BU', size: 12, weight: 700, color: 'blue-ink', mono: true, layer: 12 });
    });
    // stocking arrows: kitchens to counters
    k.sarrow('stock-0', { x1: -225, y1: named ? -118 : -134, x2: -258, y2: -66, color: 'muted', width: 1.5, dashed: true });
    k.sarrow('stock-1', { x1: -55, y1: named ? -118 : -134, x2: -40, y2: -66, color: 'muted', width: 1.5, dashed: true });

    // counters with dish tiles
    COUNTERS.forEach((c, i) => {
      const allowed = n >= 1 && i < 2;
      const blocked = n >= 1 && i === 2;
      k.rect('counter-' + i, { x: c.x - 50, y: -60, w: 100, h: 46, r: 6,
        fill: allowed ? 'green-soft' : 'surface', stroke: allowed ? 'green-ink' : 'line-strong', strokeWidth: allowed ? 2 : 1,
        label: c.name, labelSize: 13, opacity: blocked ? 0.35 : 1 });
      for (let d = 0; d < 3; d++) k.rect(`dish-${i}-${d}`, { x: c.x - 40 + d * 28, y: -76, w: 22, h: 12, r: 6, fill: 'surface-2', stroke: 'ink-2', opacity: blocked ? 0.35 : 1, delay: d * 60 });
      if (named) k.text('counter-real-' + i, { x: c.x, y: -2, text: c.real, size: 11, weight: 700, color: 'blue-ink', mono: true, layer: 12 });
    });

    // a new dish no wristband covers
    if (n >= 1) {
      k.rect('newdish', { x: 40, y: -60, w: 100, h: 46, r: 6, fill: 'surface', stroke: 'muted', dashed: true, label: 'New dish', labelSize: 13, labelColor: 'muted', opacity: 0.6 });
      k.text('newdish-note', { x: 90, y: -2, text: named ? 'not in a zone' : 'no band covers it', size: 11, color: 'muted', italic: true });
    }

    // diner (requester)
    person(k, 'diner', -210, 92, 'blue');
    k.text('diner-l', { x: -210, y: 128, text: 'Diner', size: 13, weight: 600 });
    if (named) k.text('diner-real', { x: -210, y: 146, text: 'Requester', size: 12, weight: 700, color: 'blue-ink', mono: true });
    if (n >= 1) {
      k.rect('band', { x: -226, y: 94, w: 32, h: 9, r: 4, fill: 'green', stroke: 'green-ink' });
      k.sarrow('band-to-0', { x1: -222, y1: 62, x2: -262, y2: 12, color: 'green-ink', width: 1.5, dashed: true });
      k.sarrow('band-to-1', { x1: -198, y1: 62, x2: -158, y2: 12, color: 'green-ink', width: 1.5, dashed: true });
      if (named) k.text('band-real', { x: -300, y: 98, text: 'wristband =\ncontent zone', size: 11, weight: 700, color: 'blue-ink', mono: true, anchor: 'middle' });
      else k.text('band-l', { x: -300, y: 98, text: 'wristband', size: 12, color: 'green-ink', weight: 700 });
    }

    // manager
    person(k, 'manager', 0, 92, 'ink-2');
    k.text('manager-l', { x: 0, y: 128, text: 'Manager', size: 13, weight: 600 });
    if (named) k.text('manager-real', { x: 0, y: 146, text: 'Approval', size: 12, weight: 700, color: 'blue-ink', mono: true });

    // ticket: invisible at the diner until it is written, then slides to the manager
    const tAt = n >= 2 ? { x: -60, y: 40 } : { x: -190, y: 40 };
    k.rect('ticket', { x: tAt.x, y: tAt.y, w: 46, h: 30, r: 3, fill: 'yellow-soft', stroke: 'yellow-ink', label: 'ticket', labelSize: 11, opacity: n >= 2 ? 1 : 0, layer: 14 });
    if (n >= 2) {
      k.circle('stamp', { x: -14, y: 40, r: 13, fill: 'green', stroke: 'green-ink', label: '✓', labelSize: 15, layer: 15, delay: 300, enter: 'grow' });
      if (named) k.text('ticket-real', { x: -68, y: 55, anchor: 'end', text: 'Requisition', size: 11, weight: 700, color: 'blue-ink', mono: true, layer: 16 });
    }

    // expediter + supplier truck + the fork
    if (named) {
      person(k, 'expediter', 170, 150, 'ink-2');
      k.text('exp-l', { x: 170, y: 186, text: 'Expediter = Buyer', size: 12, weight: 700, color: 'blue-ink', mono: true });
      const tx = 255, ty = 20;
      k.path('truck', { d: `M${tx - 40},${ty - 18} h46 v32 h-46 Z M${tx + 6},${ty - 6} h22 l12,12 v14 h-34 Z`, stroke: 'ink-2', fill: 'surface-2', width: 1.5 });
      k.circle('truck-w1', { x: tx - 26, y: ty + 18, r: 6, fill: 'ink-2' });
      k.circle('truck-w2', { x: tx + 26, y: ty + 18, r: 6, fill: 'ink-2' });
      k.text('truck-l', { x: tx, y: ty - 56, text: 'Supplier', size: 13, weight: 600 });
      k.text('truck-real', { x: tx, y: ty - 36, text: 'PO to supplier', size: 12, weight: 700, color: 'blue-ink', mono: true });
      k.sarrow('fork-express', { x1: 20, y1: 40, x2: 205, y2: 14, color: 'green-ink', width: 3, label: 'agreement', ldy: -14, delay: 200 });
      k.sarrow('fork-buyer', { x1: 20, y1: 70, x2: 145, y2: 140, color: 'yellow-ink', width: 2, dashed: true, delay: 300 });
      k.sarrow('fork-buyer-2', { x1: 195, y1: 130, x2: 245, y2: 50, color: 'yellow-ink', width: 2, dashed: true, delay: 420 });
    }
    k.end();
  },
};

// =====================================================================
// Core + Technical: the SSP pipeline with setup levers
// =====================================================================
const BW = 96, GAP = 14, X0 = -323;
const COL = i => X0 + i * (BW + GAP);          // left edge of stage i
const CX = i => COL(i) + BW / 2;               // centre of stage i
const STAGES = ['Shop', 'Cart &\nSubmit', 'Approve', 'Buyer', 'PO', 'Receive &\nInvoice'];
const BOX_Y = -100, BOX_H = 72;
const LEVERS = {
  'Requisitioning BU access': { col: 0, text: 'BU data\naccess' },
  'Content zones': { col: 0, text: 'Content\nzones' },
  'Manage Requisition Approvals (AMX)': { col: 2, text: 'Req Approvals\n(AMX)' },
  'Manage Buyer Assignment Rules': { col: 3, text: 'Buyer Assign.\nRules' },
  'Agreement Controls': { col: 4, text: 'Agreement\nControls' },
  'Match approval level': { col: 5, text: 'Match approval\nlevel' },
};
const TOKEN = {
  pre: { col: 0, text: 'REQ ?', fill: 'surface', stroke: 'muted', color: 'muted', dashed: true },
  shop: { col: 0, text: 'items', fill: 'yellow-soft', stroke: 'yellow-ink', color: 'ink' },
  cart: { col: 1, text: 'REQ', fill: 'yellow-soft', stroke: 'yellow-ink', color: 'ink' },
  approve: { col: 2, text: 'REQ', fill: 'yellow-soft', stroke: 'yellow-ink', color: 'ink' },
  buyer: { col: 3, text: 'REQ', fill: 'yellow-soft', stroke: 'yellow-ink', color: 'ink' },
  po: { col: 4, text: 'PO', fill: 'green-soft', stroke: 'green-ink', color: 'green-ink' },
  checklist: { col: 4, text: 'PO', fill: 'green-soft', stroke: 'green-ink', color: 'green-ink' },
  hold: { col: 5, text: 'INV', fill: 'red-soft', stroke: 'red-ink', color: 'red-ink' },
};
const JX = COL(3) + BW + GAP / 2, JY = BOX_Y + BOX_H / 2;   // the switch after Buyer

const sspPipeline = {
  mode: 'svg',
  label: 'Requisition pipeline: Shop, Cart and Submit, Approve, Buyer, PO, Receive and Invoice, with the setup lever under each stage',
  render(s, prev, k) {
    k.begin();
    const active = s.active ?? 0;
    const cur = Math.max(0, active - 1);        // active 0 = before Shop
    const route = s.route;
    const siding = route === 'siding';
    const express = route === 'express' || route === 'checklist';
    if (s.caption) pill(k, 'caption', 0, -238, 360, s.caption);

    // stage boxes + connectors
    STAGES.forEach((name, i) => {
      const isActive = active > 0 && i === cur && !(siding && i === 4);
      const done = active > 0 && i < cur;
      const waiting = siding && i === 4;
      const isHold = s.token === 'hold' && i === 5;
      k.rect('stage-' + i, { x: COL(i), y: BOX_Y, w: BW, h: BOX_H, r: 10,
        fill: isHold ? 'red-soft' : isActive ? 'blue' : done ? 'blue-soft' : 'surface',
        stroke: isHold ? 'red-ink' : isActive ? 'blue-ink' : waiting ? 'muted' : done ? 'blue-ink' : 'line-strong',
        strokeWidth: isActive || isHold ? 2 : 1, dashed: waiting });
      k.text('stage-l-' + i, { x: CX(i), y: BOX_Y + (name.includes('\n') ? 22 : 18), text: name, size: 13, weight: 700,
        color: isHold ? 'red-ink' : isActive ? '#ffffff' : 'ink', layer: 11 });
      if (i < 5) {
        const ex = i === 3 && express;
        k.sarrow('conn-' + i, { x1: COL(i) + BW + 1, y1: JY, x2: COL(i + 1) - 1, y2: JY,
          color: ex ? 'green-ink' : 'muted', width: ex ? 3 : 1.5, layer: 6 });
      }
    });

    // the switch after Buyer
    if (active >= 5 || route) {
      k.circle('switch', { x: JX, y: JY, r: 5, fill: siding ? 'yellow' : 'green', stroke: siding ? 'yellow-ink' : 'green-ink', layer: 8 });
      k.line('switch-arm', { x1: JX, y1: JY, x2: JX + (siding ? 0 : 6), y2: JY + (siding ? 30 : 0), color: siding ? 'yellow-ink' : 'green-ink', width: 3, layer: 7 });
    }

    // the token
    const t = TOKEN[s.token];
    if (t) {
      k.rect('token', { x: CX(t.col) - 34, y: BOX_Y + BOX_H - 30, w: 68, h: 22, r: 11, fill: t.fill, stroke: t.stroke, dashed: t.dashed,
        label: t.text, labelSize: 12, labelColor: t.color, mono: true, layer: 13 });
    } else if (s.token === 'siding') {
      k.rect('token', { x: JX - 34, y: 66, w: 68, h: 22, r: 11, fill: 'yellow-soft', stroke: 'yellow-ink', label: 'REQ', labelSize: 12, mono: true, layer: 13 });
    }

    // lever chips, dropping in above their stage
    const levers = s.levers || [];
    const perCol = {};
    if (levers.length) k.text('levers-h', { x: 40, y: -192, text: 'Setup levers: the task that controls each stage', size: 12, color: 'muted', italic: true });
    levers.forEach((name, i) => {
      const L = LEVERS[name] || { col: Math.min(5, i), text: name };
      const row = perCol[L.col] = (perCol[L.col] ?? -1) + 1;
      const y = -160 - row * 46;
      const fresh = i === levers.length - 1 && !route;
      k.rect('lever-' + name, { x: COL(L.col) + 2, y, w: BW - 4, h: 40, r: 8, fill: fresh ? 'green-soft' : 'surface', stroke: fresh ? 'green-ink' : 'blue-ink',
        label: L.text, labelSize: 10.5, labelColor: 'ink', layer: 10, delay: 120 });
      if (row === 0) k.line('lever-stem-' + name, { x1: CX(L.col), y1: y + 40, x2: CX(L.col), y2: BOX_Y, color: 'blue-ink', width: 1, dashed: true });
    });

    // ---------- detail area (below the pipeline) ----------
    const D = 0;   // top of the detail area
    const pointUp = (key, col) => k.sarrow(key, { x1: CX(col), y1: D + 10, x2: CX(col), y2: BOX_Y + BOX_H + 4, color: 'muted', width: 1.2, dashed: true });

    if (s.token === 'pre') {
      person(k, 'req-person', -290, 120, 'blue');
      k.text('req-person-l', { x: -290, y: 156, text: 'requester', size: 12, weight: 600 });
      k.rect('gate', { x: -236, y: 70, w: 70, h: 72, r: 6, fill: 'yellow-soft', stroke: 'yellow-ink', label: 'Req BU\naccess?', labelSize: 12 });
      k.sarrow('to-gate', { x1: -268, y1: 106, x2: -240, y2: 106, color: 'ink-2', width: 1.5 });
      k.sarrow('gate-up', { x1: -200, y1: 66, x2: CX(0) + 6, y2: BOX_Y + BOX_H + 4, color: 'green-ink', width: 1.5, label: 'yes', ldx: 14 });
      k.rect('err', { x: -150, y: 150, w: 170, h: 30, r: 6, fill: 'red-soft', stroke: 'red-ink', label: 'no → POR-2010674', labelSize: 12, labelColor: 'red-ink', mono: true, opacity: 0.55 });
      k.sarrow('gate-err', { x1: -200, y1: 144, x2: -150, y2: 162, color: 'red-ink', width: 1.2, dashed: true, opacity: 0.55 });
      k.rect('prefs', { x: 70, y: 40, w: 250, h: 132, r: 10, fill: 'surface', stroke: 'blue-ink' });
      k.text('prefs-t', { x: 195, y: 60, text: 'Preferences', size: 14, weight: 700, color: 'blue-ink' });
      ['Default requisitioning BU', 'Deliver-to location', 'Charge account'].forEach((p, i) =>
        k.text('prefs-' + i, { x: 90, y: 92 + i * 26, text: '• ' + p, size: 13, anchor: 'start', delay: i * 80 }));
    }

    if (s.token === 'shop') {
      const tiles = [['Local', -300], ['Punchout', -215], ['Smart form', -130]];
      tiles.forEach(([n, x], i) => {
        k.rect('tile-' + i, { x, y: 150, w: 78, h: 34, r: 6, fill: 'blue-soft', stroke: 'blue-ink', label: n, labelSize: 12, delay: i * 80 });
        k.sarrow('tile-up-' + i, { x1: x + 39, y1: 146, x2: x + 39, y2: 104, color: 'blue-ink', width: 1.2 });
      });
      k.rect('zone-filter', { x: -310, y: 66, w: 266, h: 34, r: 17, fill: 'yellow-soft', stroke: 'yellow-ink', label: 'Content zone: does it cover you?', labelSize: 12 });
      k.sarrow('zone-up', { x1: CX(0), y1: 62, x2: CX(0), y2: BOX_Y + BOX_H + 4, color: 'green-ink', width: 2 });
      k.rect('orphan', { x: 0, y: 150, w: 120, h: 34, r: 6, fill: 'surface', stroke: 'muted', dashed: true, label: 'New catalog', labelSize: 12, labelColor: 'muted' });
      k.text('orphan-n', { x: 60, y: 200, text: 'in no zone → invisible', size: 12, color: 'muted', italic: true });
      k.text('one-search', { x: 200, y: 100, text: 'One search box\nover all content', size: 13, color: 'ink-2', weight: 600 });
    }

    if (s.token === 'cart') {
      pointUp('detail-up', 1);
      k.rect('cart-card', { x: -260, y: 20, w: 210, h: 130, r: 10, fill: 'surface', stroke: 'blue-ink' });
      k.text('cart-t', { x: -155, y: 40, text: 'Cart: edit, then Submit', size: 13, weight: 700, color: 'blue-ink' });
      ['Delivery location', 'Project', 'Charge account', 'Attachments'].forEach((p, i) =>
        k.text('cart-' + i, { x: -245, y: 66 + i * 22, text: '• ' + p, size: 12, anchor: 'start', delay: i * 60 }));
      if (s.viewApprovers) {
        k.rect('view-appr', { x: -20, y: 40, w: 190, h: 34, r: 17, fill: 'yellow-soft', stroke: 'yellow-ink', label: 'View Approvers (25B)', labelSize: 12, delay: 200 });
        k.text('view-appr-n', { x: 75, y: 96, text: 'approvers, FYI approvers\nand the rule that added each', size: 12, color: 'ink-2' });
      }
    }

    if (s.token === 'approve') {
      pointUp('detail-up', 2);
      ['Header Preapproval', 'Header', 'Header Postapproval', 'Postapproval FYI'].forEach((n, i) => {
        const y = 16 + i * 46;
        k.rect('lane-' + i, { x: -150, y, w: 330, h: 38, r: 6, fill: 'surface', stroke: 'line-strong' });
        k.rect('lane-fill-' + i, { x: -150, y, w: 330, h: 38, r: 6, fill: 'green-soft', stroke: 'green-ink', enter: 'grow', delay: 150 + i * 220 });
        k.text('lane-l-' + i, { x: -138, y: y + 19, text: `${i + 1}. ${n}`, size: 13, weight: 600, anchor: 'start', layer: 12 });
        check(k, 'lane-ok-' + i, 160, y + 19, true);
      });
      k.text('lane-src', { x: 260, y: 100, text: 'rules from\nAMX', size: 12, color: 'blue-ink', weight: 700 });
    }

    if (s.token === 'buyer') {
      pointUp('detail-up', 3);
      const hit = s.buyerHit ?? 1;
      ['Buyer the requester suggested', 'Buyer assignment rules', 'Item default buyer', 'Proc BU default buyer'].forEach((n, i) => {
        const y = 16 + i * 46;
        const lit = i === hit, skipped = i < hit;
        k.rect('chain-' + i, { x: -110, y, w: 280, h: 38, r: 19, fill: lit ? 'blue' : 'surface', stroke: lit ? 'blue-ink' : 'line-strong', opacity: i > hit ? 0.5 : 1, delay: i * 80 });
        k.text('chain-l-' + i, { x: -94, y: y + 19, text: `${i + 1}  ${n}`, size: 13, weight: 600, anchor: 'start', color: lit ? '#ffffff' : skipped ? 'muted' : 'ink', layer: 12, opacity: i > hit ? 0.5 : 1 });
        if (skipped) k.text('chain-s-' + i, { x: 205, y: y + 19, text: 'none', size: 12, color: 'muted', italic: true });
        if (lit) k.text('chain-s-' + i, { x: 215, y: y + 19, text: '← first match wins', size: 12, color: 'blue-ink', weight: 700, anchor: 'start' });
        if (i < 3) k.sarrow('chain-a-' + i, { x1: -130, y1: y + 22, x2: -130, y2: y + 54, color: 'muted', width: 1 });
      });
    }

    if (s.token === 'po') {
      k.rect('po-card', { x: 20, y: 30, w: 290, h: 110, r: 10, fill: 'green-soft', stroke: 'green-ink' });
      k.text('po-card-t', { x: 165, y: 52, text: 'Touchless PO', size: 15, weight: 700, color: 'green-ink' });
      k.text('po-card-b', { x: 165, y: 96, text: 'Agreement Controls:\nAutomatically generate orders\n(optional: auto-submit)', size: 12, color: 'ink' });
      k.sarrow('po-card-up', { x1: CX(4), y1: 26, x2: CX(4), y2: BOX_Y + BOX_H + 4, color: 'green-ink', width: 1.5 });
      k.text('buyer-skip', { x: CX(3) - 40, y: 60, text: 'buyer\nnot touched', size: 12, color: 'muted', italic: true });
    }

    if (siding) {
      k.path('siding-track', { d: `M${JX},${JY + 6} L${JX},${42}`, stroke: 'yellow-ink', width: 3, dashed: true });
      k.rect('proc-req', { x: JX - 90, y: 42, w: 180, h: 54, r: 10, fill: 'yellow-soft', stroke: 'yellow-ink' });
      k.text('proc-req-l', { x: JX, y: 56, text: 'Process Requisitions', size: 12, weight: 700, layer: 12 });
      k.text('proc-req-n', { x: JX, y: 116, text: 'buyer: document builder\n(type, style, grouping)', size: 12, color: 'ink-2' });
      k.rect('chk-card', { x: -325, y: 20, w: 250, h: 150, r: 10, fill: 'surface', stroke: 'line-strong' });
      k.text('chk-t', { x: -200, y: 40, text: 'Touchless needs all of:', size: 13, weight: 700 });
      const rows = [['Agreement: auto-generate', true], ['Valid buyer', true], ['Supplier and site', true], ['Negotiated (CPA line)', false]];
      rows.forEach(([n, ok], i) => {
        check(k, 'chk-ok-' + i, -305, 70 + i * 26, ok);
        k.text('chk-' + i, { x: -290, y: 70 + i * 26, text: n, size: 12, anchor: 'start', color: ok ? 'ink' : 'red-ink', weight: ok ? 500 : 700 });
      });
    }

    if (route === 'checklist') {
      k.rect('cl-card', { x: -325, y: 4, w: 420, h: 224, r: 10, fill: 'surface', stroke: 'green-ink' });
      k.text('cl-t', { x: -115, y: 24, text: 'Touchless PO checklist', size: 14, weight: 700, color: 'green-ink' });
      ['Agreement BU access: req BU + supplier site', 'Controls: Automatically generate orders', 'Optional: Automatically submit for approval',
        'Line has a valid buyer', 'Line has a supplier and supplier site', 'Item purchasable in proc BU inventory org', 'CPA-sourced line: Negotiated checked']
        .forEach((n, i) => {
          check(k, 'cl-ok-' + i, -305, 50 + i * 25, true, 14);
          k.text('cl-' + i, { x: -290, y: 50 + i * 25, text: n, size: 12, anchor: 'start', delay: i * 60 });
        });
      k.rect('cl-consol', { x: 115, y: 40, w: 210, h: 90, r: 10, fill: 'yellow-soft', stroke: 'yellow-ink' });
      k.text('cl-consol-t', { x: 220, y: 85, text: 'Consolidation on?\nNo PO until the\nGenerate Orders job runs', size: 12 });
    }

    if (s.token === 'hold') {
      pointUp('detail-up', 5);
      const bars = [['PO', 10, 'blue'], ['Received', 8, 'blue'], ['Invoiced', 10, 'red']];
      k.text('bars-t', { x: -60, y: 20, text: '3-way match: invoice vs receipt', size: 13, weight: 700 });
      bars.forEach(([n, v, c], i) => {
        const y = 40 + i * 34;
        k.text('bar-l-' + i, { x: -230, y: y + 12, text: n, size: 12, anchor: 'end', weight: 600 });
        k.rect('bar-' + i, { x: -222, y, w: v * 24, h: 24, r: 4, fill: c === 'red' ? 'blue' : c, stroke: 'none', enter: 'grow', delay: i * 100 });
        if (c === 'red') k.rect('bar-over', { x: -222 + 8 * 24, y, w: 2 * 24, h: 24, r: 4, fill: 'red', stroke: 'red-ink', enter: 'grow', delay: 400 });
        k.text('bar-v-' + i, { x: -222 + v * 24 + 8, y: y + 12, text: String(v), size: 12, mono: true, anchor: 'start' });
      });
      k.line('rec-line', { x1: -222 + 8 * 24, y1: 34, x2: -222 + 8 * 24, y2: 146, color: 'yellow-ink', dashed: true, width: 1.5 });
      k.rect('hold-badge', { x: 90, y: 50, w: 150, h: 32, r: 16, fill: 'red-soft', stroke: 'red-ink', label: 'QTY REC hold', labelSize: 13, labelColor: 'red-ink', mono: true, delay: 500 });
      k.rect('confirm', { x: 90, y: 110, w: 150, h: 34, r: 8, fill: 'blue', stroke: 'blue-ink', label: 'Confirm Receipt', labelSize: 13, labelColor: '#ffffff', delay: 800 });
      k.text('confirm-n', { x: 165, y: 170, text: 'requester creates the receipt\n(after the Action Required Code job)', size: 11, color: 'ink-2' });
    }
    k.end();
  },
};

// =====================================================================
// Technical: requisitioning BUs, procurement BUs and content zones
// =====================================================================
const REQ = [{ id: 'us', t: 'Req BU: US', y: -150 }, { id: 'uk', t: 'Req BU: UK', y: -30 }];
const PROC = [{ id: 'central', t: 'Proc BU: Central', y: -150 }, { id: 'it', t: 'Proc BU: IT', y: -30 }];
const buZones = {
  mode: 'svg',
  label: 'Requisitioning business units served by procurement business units, and a content zone securing shopping content',
  render(s, prev, k) {
    k.begin();
    const zones = s.view === 'zones';
    const sec = s.security || 'bu';
    if (s.caption) pill(k, 'caption', 0, -238, 380, s.caption);
    REQ.forEach(r => {
      k.rect('req-' + r.id, { x: -310, y: r.y, w: 170, h: 60, r: 10, fill: 'blue-soft', stroke: 'blue-ink', strokeWidth: 1.5, label: r.t, labelSize: 14 });
      if (!zones) k.text('req-n-' + r.id, { x: -225, y: r.y + 74, text: 'holds requisition defaults', size: 11, color: 'muted', italic: true });
    });
    PROC.forEach(p => k.rect('proc-' + p.id, { x: 140, y: p.y, w: 170, h: 60, r: 10, fill: 'surface-2', stroke: 'ink-2', strokeWidth: 1.5, label: p.t, labelSize: 14 }));
    k.text('serves-h', { x: 0, y: -178, text: 'serves (client relationship)', size: 12, color: 'muted', italic: true });
    const op = zones ? 0.3 : 1;
    k.sarrow('svc-c-us', { x1: 136, y1: -120, x2: -136, y2: -120, color: 'blue-ink', width: 2, opacity: op });
    k.sarrow('svc-it-us', { x1: 136, y1: -12, x2: -136, y2: -110, color: 'blue-ink', width: 2, opacity: op });
    k.sarrow('svc-it-uk', { x1: 136, y1: 0, x2: -136, y2: 0, color: 'blue-ink', width: 2, opacity: op });
    if (!zones) {
      k.rect('default-tag', { x: -90, y: 18, w: 180, h: 28, r: 14, fill: 'yellow-soft', stroke: 'yellow-ink', label: 'Default Procurement BU', labelSize: 12 });
      k.text('default-n', { x: 0, y: 64, text: 'catches lines no other proc BU claims', size: 12, color: 'ink-2' });
      k.text('crf', { x: -225, y: 110, text: 'Configure Requisitioning\nBusiness Function', size: 12, weight: 700, color: 'blue-ink', mono: true });
    }
    if (zones) {
      k.rect('zone', { x: 130, y: 80, w: 190, h: 64, r: 10, fill: 'yellow-soft', stroke: 'yellow-ink', strokeWidth: 1.5, enter: 'fade' });
      k.text('zone-t', { x: 225, y: 100, text: 'Content zone', size: 14, weight: 700 });
      k.text('zone-u', { x: 225, y: 122, text: 'usage: requisitioning', size: 12, color: 'ink-2', mono: true });
      k.line('zone-hang', { x1: 225, y1: 30, x2: 225, y2: 80, color: 'yellow-ink', width: 2, dashed: true });
      // targets narrow from whole BUs to people or locations
      const targets = sec === 'bu'
        ? [[-136, -100], [-136, 20]]
        : [[-60, -130], [-60, -70], [-60, -10], [-60, 50]];
      if (sec === 'worker') [[-60, -130], [-60, -70], [-60, -10], [-60, 50]].forEach(([x, y], i) => person(k, 'w-' + i, x, y + 12, i % 2 ? 'muted' : 'blue'));
      if (sec === 'location') [[-60, -130], [-60, -70], [-60, -10], [-60, 50]].forEach(([x, y], i) =>
        k.path('pin-' + i, { d: `M${x},${y + 14} C${x - 12},${y} ${x - 10},${y - 14} ${x},${y - 14} C${x + 10},${y - 14} ${x + 12},${y} ${x},${y + 14} Z`, fill: i % 2 ? 'muted' : 'blue', stroke: 'none' }));
      targets.forEach(([x, y], i) => {
        if (sec !== 'bu' && i % 2) return;   // only some workers / locations are in the zone
        k.sarrow('fan-' + i, { x1: 128, y1: 112, x2: x + (sec === 'bu' ? 0 : 18), y2: y, color: 'green-ink', width: 1.8, delay: i * 80 });
      });
      ['bu', 'worker', 'location'].forEach((c, i) => {
        const on = c === sec;
        k.rect('sec-' + c, { x: -300 + i * 160, y: 180, w: 150, h: 32, r: 16, fill: on ? 'blue' : 'surface', stroke: on ? 'blue-ink' : 'line-strong',
          label: ['By req BU', 'By worker', 'By deliver-to loc.'][i], labelSize: 12, labelColor: on ? '#ffffff' : 'ink-2' });
      });
      k.text('sec-h', { x: -75, y: 160, text: 'Requisitioning zones are secured', size: 12, color: 'muted', italic: true });
    }
    k.end();
  },
};

// =====================================================================
// Technical: approval stages, rules vs task configuration, voting
// =====================================================================
const LANES = ['Header Preapproval', 'Header', 'Header Postapproval', 'Postapproval FYI'];
const approvalLanes = {
  mode: 'svg',
  label: 'Four seeded requisition approval stages with the AMX rules panel and the BPM task configuration panel',
  render(s, prev, k) {
    k.begin();
    const parallel = s.mode === 'parallel';
    const vote = s.vote || 'serial';
    if (s.caption) pill(k, 'caption', 0, -238, 380, s.caption);
    const reqLane = parallel ? 1 : 0;
    LANES.forEach((n, i) => {
      const y = -170 + i * 70;
      const focus = parallel && i === 1;
      const done = parallel && i === 0;
      k.rect('lane-' + i, { x: -140, y, w: 280, h: 56, r: 8, fill: focus ? 'yellow-soft' : done ? 'green-soft' : 'surface', stroke: focus ? 'yellow-ink' : done ? 'green-ink' : 'line-strong', strokeWidth: focus ? 2 : 1 });
      k.text('lane-l-' + i, { x: -128, y: y + 16, text: `${i + 1}. ${n}`, size: 12, weight: 700, anchor: 'start' });
      if (i < 3) k.sarrow('lane-a-' + i, { x1: -120, y1: y + 58, x2: -120, y2: y + 68, color: 'muted', width: 1 });
    });
    k.rect('req-card', { x: -128, y: -170 + reqLane * 70 + 28, w: 48, h: 20, r: 4, fill: 'yellow-soft', stroke: 'yellow-ink', label: 'REQ', labelSize: 11, mono: true, layer: 12 });

    // approvers in the Header lane
    const hy = -170 + 70 + 38;
    [0, 1, 2].forEach(j => {
      const x = 10 + j * 44;
      let fill = 'surface-2', label = '', stroke = 'ink-2';
      if (parallel) {
        if (vote === 'frw') { fill = j === 0 ? 'green' : 'surface-2'; label = j === 0 ? '✓' : '–'; stroke = j === 0 ? 'green-ink' : 'line-strong'; }
        if (vote === 'consensus') { fill = 'green'; label = '✓'; stroke = 'green-ink'; }
        if (vote === 'serial') { fill = j === 0 ? 'green' : 'surface-2'; label = j === 0 ? '✓' : ''; }
      }
      k.circle('appr-' + j, { x, y: hy - 2, r: 13, fill, stroke, label, labelSize: 13, labelColor: fill === 'green' ? '#ffffff' : 'muted', layer: 12, delay: j * 120 });
      if (!parallel || vote === 'serial') { if (j < 2) k.sarrow('appr-a-' + j, { x1: x + 14, y1: hy - 2, x2: x + 29, y2: hy - 2, color: 'muted', width: 1 }); }
    });
    if (parallel) {
      const msg = { frw: 'First Responder Wins:\nfirst response decides', consensus: 'Consensus:\nall must approve', serial: 'Serial: one after\nanother, in order' }[vote];
      k.rect('vote-card', { x: 160, y: -110, w: 170, h: 64, r: 10, fill: 'green-soft', stroke: 'green-ink' });
      k.text('vote-t', { x: 245, y: -78, text: msg, size: 12, weight: 700, color: 'green-ink' });
      k.sarrow('vote-a', { x1: 158, y1: -78, x2: 142, y2: -78, color: 'green-ink', width: 1.5 });
      k.text('stage-done', { x: 245, y: -20, text: 'stage complete', size: 12, color: 'green-ink', italic: true });
    }

    // side panels
    const pOp = parallel ? 0.3 : 1;
    k.rect('amx', { x: -330, y: -170, w: 175, h: 266, r: 10, fill: 'blue-soft', stroke: 'blue-ink', opacity: pOp });
    k.text('amx-t', { x: -242, y: -150, text: 'Rules · AMX', size: 14, weight: 700, color: 'blue-ink', opacity: pOp });
    k.text('amx-b', { x: -242, y: -30, text: 'Manage Requisition\nApprovals\n\nList builders:\nSupervisory\nPosition\nJob Level\nSingle User\nUser-Defined Routing\nApproval Groups', size: 11, color: 'ink', opacity: pOp });
    k.rect('bpm', { x: 155, y: parallel ? 30 : -170, w: 175, h: parallel ? 66 : 266, r: 10, fill: 'surface-2', stroke: 'ink-2', opacity: pOp });
    k.text('bpm-t', { x: 242, y: parallel ? 50 : -150, text: 'Task config · BPM', size: 14, weight: 700, color: 'ink-2', opacity: pOp });
    if (!parallel) {
      k.text('bpm-b', { x: 242, y: -40, text: 'BPM Worklist\nTask Configuration\n\nAggregation:\nOnce per task\n\nCompletes on: Reject\n\nWho can add\nparticipants', size: 11, color: 'ink', opacity: pOp });
      k.sarrow('amx-feed', { x1: -152, y1: -40, x2: -142, y2: -40, color: 'blue-ink', width: 2 });
      k.text('amx-feed-l', { x: 0, y: 120, text: 'rules pick who approves; the task decides how it behaves', size: 12, color: 'ink-2', italic: true });
    }
    k.end();
  },
};

// =====================================================================
// Technical: 2/3/4-way match and a quantity-received hold
// =====================================================================
const matchBars = {
  mode: 'svg',
  label: 'PO, received and invoiced quantities compared under 2, 3 or 4-way match',
  render(s, prev, k) {
    k.begin();
    const m = s.match || 3, po = s.po ?? 10, rec = s.rec ?? 10, inv = s.inv ?? 10, insp = s.insp ?? rec;
    const U = 30, X = -200;
    if (s.caption) pill(k, 'caption', 0, -238, 380, s.caption);
    [2, 3, 4].forEach((w, i) => {
      const on = w === m;
      k.rect('mode-' + w, { x: -300 + i * 205, y: -186, w: 190, h: 34, r: 17, fill: on ? 'blue' : 'surface', stroke: on ? 'blue-ink' : 'line-strong',
        label: ['2-way: PO + invoice', '3-way: + receipt', '4-way: + inspection'][i], labelSize: 12, labelColor: on ? '#ffffff' : 'ink-2' });
    });
    const rows = [['PO qty', po, true], ['Received', rec, m >= 3], ['Inspected', insp, m >= 4], ['Invoiced', inv, true]];
    let r = 0;
    const lim = m >= 3 ? Math.min(rec, m >= 4 ? insp : rec) : po;
    rows.forEach(([n, v, used]) => {
      if (!used) return;
      const y = -120 + r * 52; r++;
      const isInv = n === 'Invoiced';
      const over = isInv && v > lim;
      k.text('l-' + n, { x: X - 10, y: y + 15, text: n, size: 13, weight: 600, anchor: 'end' });
      k.rect('b-' + n, { x: X, y, w: (over ? lim : v) * U, h: 30, r: 4, fill: 'blue', stroke: 'none', enter: 'grow' });
      if (over) k.rect('b-over', { x: X + lim * U, y, w: (v - lim) * U, h: 30, r: 4, fill: 'red', stroke: 'red-ink', enter: 'grow', delay: 300 });
      k.text('v-' + n, { x: X + v * U + 10, y: y + 15, text: String(v), size: 13, mono: true, anchor: 'start', weight: 700 });
    });
    if (m >= 3) {
      k.line('lim', { x1: X + lim * U, y1: -132, x2: X + lim * U, y2: -120 + r * 52, color: 'yellow-ink', width: 1.5, dashed: true });
      k.text('lim-l', { x: X + lim * U, y: -140, text: m >= 4 ? 'accepted qty' : 'received qty', size: 11, color: 'yellow-ink', weight: 700 });
    }
    const hold = s.hold && m >= 3 && inv > lim;
    if (hold) k.rect('hold', { x: 170, y: -40, w: 150, h: 32, r: 16, fill: 'red-soft', stroke: 'red-ink', label: 'QTY REC hold', labelSize: 13, labelColor: 'red-ink', mono: true, delay: 500 });
    else k.rect('hold', { x: 170, y: -40, w: 150, h: 32, r: 16, fill: 'green-soft', stroke: 'green-ink', label: 'matches: payable', labelSize: 13, labelColor: 'green-ink' });
    if (s.redwood) {
      k.rect('rw', { x: -300, y: 150, w: 290, h: 56, r: 10, fill: 'surface-2', stroke: 'ink-2' });
      k.text('rw-t', { x: -155, y: 178, text: 'Redwood SSP: opt-in feature\n+ Elastic Search on first use', size: 12, weight: 600 });
    }
    if (s.note) k.text('note', { x: 160, y: 178, text: s.note, size: 12, color: 'ink-2' });
    k.end();
  },
};

export default {
  'food-court': foodCourt,
  'ssp-pipeline': sspPipeline,
  'bu-zones': buZones,
  'approval-lanes': approvalLanes,
  'match-bars': matchBars,
};
