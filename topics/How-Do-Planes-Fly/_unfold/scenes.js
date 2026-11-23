// Scenes for "How Do Planes Fly?". Hand-written M2 reference: the three.js stage plus SVG fallbacks.
// The flow field is illustrative (shape is qualitatively right, numbers are not a CFD result).

// ---------- shared model ----------
export function liftCoeff(aoa) {
  // Thin cambered airfoil: some lift at 0°, roughly linear at small angles, abrupt loss past stall (~15°).
  if (aoa <= 12) return 0.25 + 0.09 * aoa;
  if (aoa <= 15) return 1.33 + 0.09 * (aoa - 12) - 0.025 * (aoa - 12) ** 2;
  return Math.max(0.55, 1.375 - 0.22 * (aoa - 15) ** 1.3);
}
export const stallAmount = aoa => Math.max(0, Math.min(1, (aoa - 14) / 3));

function airfoil(n = 48, c = 4, t = 0.13, m = 0.035, p = 0.4) {
  // NACA 4-digit style section, chord from x=-c/2 (leading edge) to +c/2.
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const b = (i / n) * Math.PI, xc = (1 - Math.cos(b)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc ** 2 + 0.2843 * xc ** 3 - 0.1015 * xc ** 4);
    const yc = xc < p ? (m / p ** 2) * (2 * p * xc - xc ** 2) : (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * xc - xc ** 2);
    const x = (xc - 0.5) * c;
    up.push([x, (yc + yt) * c]);
    lo.push([x, (yc - yt) * c]);
  }
  return { up, lo };
}
const FOIL = airfoil();

function flowY(x, y0, P) {
  const isUp = y0 > 0, ef = Math.exp(-Math.abs(y0) / 2.2), near = Math.exp(-(x * x) / 3);
  const turn = P.L * (1 - 0.7 * P.stall);
  let y = y0 + (isUp ? 0.45 : -0.12) * ef * near;
  y += turn * ef * 0.35 * Math.exp(-((x + 2.6) ** 2) / 1.2);                                  // upwash ahead
  y -= turn * ef * 0.55 * (1 / (1 + Math.exp(-(x - 0.8) * 1.6))) * (1 + Math.max(0, x - 0.8) * 0.12); // downwash behind
  if (P.stall > 0 && isUp && x > -0.5) y += P.stall * ef * 0.55 * (Math.sin(x * 3.1 + P.t * 5 + y0 * 5) * 0.4 + 0.35) * Math.min(1, (x + 0.5) / 1.5);
  return y;
}
function flowSpeed(x, y0, P) {
  const ef = Math.exp(-Math.abs(y0) / 2.2), near = Math.exp(-(x * x) / 2.5), turn = P.L * (1 - 0.6 * P.stall);
  return y0 > 0 ? 1 + 0.55 * ef * near * turn : 1 - 0.25 * ef * near * turn;
}
const ROWS = [-3.2, -2.3, -1.5, -0.8, 0.8, 1.5, 2.3, 3.2];
const XMIN = -6.5, XMAX = 6.5;

function targetParams(s) {
  const aoa = s.aoa ?? 0, speed = s.speed ?? 1;
  return { aoa, speed, L: s.flow === false ? 0 : liftCoeff(aoa) / 1.2, stall: stallAmount(aoa), flow: s.flow === false ? 0 : 1 };
}
const liftLen = s => (s.flow === false ? 0 : liftCoeff(s.aoa ?? 0) * (s.speed ?? 1) ** 2);

// ---------- 3D wing (Core tab, Playground) ----------
const wing3d = {
  mode: 'three',
  fallback: 'lift-2d',
  label: 'A wing in moving air',
  mount(stage, k3) {
    const { THREE, scene } = k3;
    const C = k3.colors();
    const P = { aoa: 0, speed: 1, L: 0, stall: 0, flow: 0, t: 0, pressure: 0, liftLen: 0, weightLen: 0, downLen: 0 };
    this.P = P;

    // wing: extruded airfoil, span along z
    const shape = new THREE.Shape();
    FOIL.up.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    [...FOIL.lo].reverse().forEach(([x, y]) => shape.lineTo(x, y));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false, curveSegments: 4 });
    geo.translate(0, 0, -3);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd3, metalness: 0.15, roughness: 0.55 });
    const wing = new THREE.Mesh(geo, wingMat);
    const wingGroup = new THREE.Group();
    wingGroup.add(wing);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0x6b7080 }));
    wingGroup.add(edges);
    scene.add(wingGroup);

    // pressure skins: low pressure above (blue), high pressure below (red)
    const skin = (pts, offset, color) => {
      const sh = new THREE.Shape();
      pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
      [...pts].reverse().forEach(([x, y]) => sh.lineTo(x, y + offset * Math.sin(Math.PI * (x + 2) / 4) ** 0.7));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 5.96, bevelEnabled: false });
      g.translate(0, 0, -2.98);
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(g, m);
      wingGroup.add(mesh);
      return m;
    };
    this.lowMat = skin(FOIL.up, 0.42, new THREE.Color(C.blue));
    this.highMat = skin(FOIL.lo, -0.26, new THREE.Color(C.red));

    // streamlines (thin lines) + particles, at three span stations
    const SPAN = [-2.2, 0, 2.2], N = 70;
    this.lines = [];
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(C.muted), transparent: true, opacity: 0.45 });
    for (const z of SPAN) for (const y0 of ROWS) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
      const line = new THREE.Line(g, lineMat);
      scene.add(line);
      this.lines.push({ line, y0, z, N });
    }
    const PCOUNT = this.lines.length * 6;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(PCOUNT * 3), 3));
    const pMat = new THREE.PointsMaterial({ color: new THREE.Color(C.blue), size: 0.13, transparent: true, opacity: 0 });
    this.points = new THREE.Points(pGeo, pMat);
    scene.add(this.points);
    this.parts = Array.from({ length: PCOUNT }, (_, i) => ({ li: i % this.lines.length, x: XMIN + Math.random() * (XMAX - XMIN) }));

    // arrows
    // solid arrows: shaft + head, length set via setLength
    const arrow = (dir, origin, color) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 16), mat);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 20), mat);
      g.add(shaft, head);
      g.position.copy(origin);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      g.setLength = len => {
        const hl = Math.min(0.4, len * 0.45), sl = Math.max(0.001, len - hl);
        shaft.scale.y = sl; shaft.position.y = sl / 2;
        head.scale.setScalar(hl / 0.4); head.position.y = sl + hl / 2;
      };
      g.setColor = c => mat.color.set(c);
      g.visible = false;
      scene.add(g);
      return g;
    };
    this.lift = arrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.3, 0), C.green);
    this.weight = arrow(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -0.3, 0), C.muted);
    this.down = arrow(new THREE.Vector3(0.6, -0.8, 0), new THREE.Vector3(2.4, -0.35, 0), C.yellow);

    // text labels as sprites
    const label = (text, color) => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const tex = new THREE.CanvasTexture(cv);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sp.scale.set(2.2, 0.55, 1);
      sp.userData = { cv, tex, text: null, color };
      sp.renderOrder = 10;
      scene.add(sp);
      return sp;
    };
    this.setLabel = (sp, text, color) => {
      if (sp.userData.text === text && sp.userData.color === color) return;
      Object.assign(sp.userData, { text, color });
      const { cv, tex } = sp.userData, g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      if (text) {
        g.font = '600 46px "Segoe UI", system-ui, sans-serif';
        const w = Math.min(500, g.measureText(text).width + 44);
        g.fillStyle = k3.colors().surface; g.strokeStyle = color; g.lineWidth = 4;
        g.beginPath(); g.roundRect((512 - w) / 2, 24, w, 80, 40); g.fill(); g.stroke();
        g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66);
      }
      tex.needsUpdate = true;
      sp.visible = !!text;
    };
    this.liftLabel = label(); this.downLabel = label(); this.aoaLabel = label(); this.weightLabel = label();
    this.wingGroup = wingGroup;

    // ambient: particles flow, lines follow tweened params
    k3.onFrame(dt => {
      P.t += dt;
      const sp = 2.2 * P.speed;
      const pos = this.points.geometry.attributes.position;
      this.parts.forEach((p, i) => {
        const L = this.lines[p.li];
        p.x += sp * flowSpeed(p.x, L.y0, P) * dt;
        if (p.x > XMAX) p.x = XMIN;
        pos.setXYZ(i, p.x, flowY(p.x, L.y0, P), L.z);
      });
      pos.needsUpdate = true;
    });
    k3.onUpdate(() => this.updateLines());
    k3.onThemeChange = () => {
      const c = k3.colors();
      lineMat.color.set(c.muted); pMat.color.set(c.blue);
      this.lowMat.color.set(c.blue); this.highMat.color.set(c.red);
      this.lift.setColor(c.green); this.down.setColor(c.yellow); this.weight.setColor(c.muted);
      for (const sp of [this.liftLabel, this.downLabel, this.aoaLabel, this.weightLabel]) { const { text, color } = sp.userData; sp.userData.text = null; this.setLabel(sp, text, color); }
    };
    this.updateLines(true);
  },
  updateLines(force) {
    const P = this.P;
    const key = [P.aoa, P.L, P.stall, P.flow].map(v => v.toFixed(3)).join() + (P.stall > 0 ? P.t.toFixed(2) : '');
    if (!force && key === this._key) return;
    this._key = key;
    for (const { line, y0, z, N } of this.lines) {
      const a = line.geometry.attributes.position;
      for (let i = 0; i < N; i++) { const x = XMIN + (i / (N - 1)) * (XMAX - XMIN); a.setXYZ(i, x, flowY(x, y0, P), z); }
      a.needsUpdate = true;
      line.material.opacity = 0.45 * P.flow;
    }
    this.points.material.opacity = 0.95 * P.flow;
    this.wingGroup.rotation.z = (-P.aoa * Math.PI) / 180;
    const len = (n, v) => { const a = this[n]; a.visible = v > 0.05; if (a.visible) a.setLength(v); };
    len('lift', P.liftLen); len('weight', P.weightLen); len('down', P.downLen);
    this.lowMat.opacity = 0.42 * P.pressure; this.highMat.opacity = 0.34 * P.pressure;
  },
  render(s, prev, k3) {
    const P = this.P, T = targetParams(s), C = k3.colors();
    const ll = liftLen(s);
    k3.tween(P, {
      aoa: T.aoa, speed: T.speed, L: T.L, stall: T.stall, flow: T.flow,
      pressure: s.pressure ? 1 : 0,
      liftLen: s.lift ? 0.4 + 1.3 * ll : 0,
      weightLen: s.weight ? 1.6 : 0,
      downLen: s.downwash ? 0.5 + 0.7 * T.L * (1 - 0.6 * T.stall) * T.speed : 0,
    });
    this.liftLabel.position.set(1.1, 0.5 + (s.lift ? 0.4 + 1.3 * ll : 0), 3.3);
    this.setLabel(this.liftLabel, s.lift ? (T.stall > 0.5 ? 'lift collapses' : 'lift') : '', C.green);
    this.weightLabel.position.set(-0.9, -2.2, 3.3);
    this.setLabel(this.weightLabel, s.weight ? 'weight' : '', C.muted);
    this.downLabel.position.set(3.4, -1.9, 3.3);
    this.setLabel(this.downLabel, s.downwash ? 'air turned down' : '', C.yellow);
    this.aoaLabel.position.set(-3.4, 1.4, 3.3);
    this.setLabel(this.aoaLabel, s.showAoa ? `angle of attack ${Math.round(T.aoa)}°` : '', C.blue);
    const views = { side: [[0.8, 1.4, 15.5], [0.4, 0, 0]], three: [[8.5, 5, 11], [0, 0, 0]], low: [[6, -3.2, 12], [0.5, 0, 0]] };
    const [pos, tgt] = views[s.view || 'side'];
    k3.cameraTo(pos, tgt, { dur: prev ? k3.duration * 1.6 : 0 });
  },
  metrics(s) {
    const cl = liftCoeff(s.aoa), stalled = stallAmount(s.aoa) > 0.5;
    return { 'angle': `${s.aoa}°`, 'speed': `×${(+s.speed).toFixed(1)}`, 'lift coeff': cl.toFixed(2), 'lift': `×${(liftLen(s) / liftLen({ aoa: 5 })).toFixed(1)}`, status: stalled ? 'STALLED' : 'flying' };
  },
  note(s) {
    if (stallAmount(s.aoa) > 0.5) return 'Past about 15° the flow separates from the upper surface and **lift collapses**: a stall [S3].';
    if (s.speed >= 1.8) return 'Lift grows with the **square** of speed: ×2 speed gives about ×4 lift [S2].';
    if (s.aoa <= 0) return 'Even at 0° this curved (cambered) wing makes a little lift. A symmetric wing would make none [S3].';
    return 'More angle turns more air downward, so lift rises roughly in step with the angle at small angles [S3].';
  },
};

// ---------- 2D side view (ELI5, Technical, fallback for wing-3d) ----------
const PX = 52;
const toScreen = (x, y) => [x * PX, -y * PX + 10];
function rot([x, y], deg) { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [x * c + y * s, -x * s + y * c]; }

const lift2d = {
  mode: 'svg',
  label: 'Side view of a wing in moving air',
  mount(stage, kit) {
    this.P = { aoa: 0, speed: 1, L: 0, stall: 0, flow: 0, t: 0, pressure: 0 };
    this.T = { ...this.P };
    this.layer = kit.raw('flow');
    kit.svg.insertBefore(this.layer, kit.world); // draw flow below arrows/labels
    this.parts = Array.from({ length: ROWS.length * 7 }, (_, i) => ({ r: i % ROWS.length, x: XMIN + Math.random() * (XMAX - XMIN) }));
    let last = performance.now();
    kit.loop(now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const P = this.P, T = this.T, k = Math.min(1, dt * 5);
      for (const key of ['aoa', 'speed', 'L', 'stall', 'flow', 'pressure']) P[key] += (T[key] - P[key]) * k;
      P.t += dt;
      for (const p of this.parts) { p.x += 2.2 * P.speed * flowSpeed(p.x, ROWS[p.r], P) * dt; if (p.x > XMAX) p.x = XMIN; }
      this.draw(kit);
    });
  },
  draw(kit) {
    const P = this.P, c = kit.colors();
    const foil = [...FOIL.up, ...[...FOIL.lo].reverse()].map(p => toScreen(...rot(p, P.aoa)));
    const d = 'M' + foil.map(p => p.map(n => n.toFixed(1)).join(',')).join('L') + 'Z';
    let s = '';
    if (P.pressure > 0.01) {
      const band = (pts, off) => {
        const a = pts.map(p => toScreen(...rot(p, P.aoa)));
        const b = [...pts].reverse().map(([x, y]) => toScreen(...rot([x, y + off * Math.sin(Math.PI * (x + 2) / 4) ** 0.7], P.aoa)));
        return 'M' + [...a, ...b].map(p => p.map(n => n.toFixed(1)).join(',')).join('L') + 'Z';
      };
      s += `<path d="${band(FOIL.up, 0.8)}" fill="${c.blue}" opacity="${(0.28 * P.pressure).toFixed(2)}"/>`;
      s += `<path d="${band(FOIL.lo, -0.5)}" fill="${c.red}" opacity="${(0.24 * P.pressure).toFixed(2)}"/>`;
    }
    if (P.flow > 0.01) {
      for (const y0 of ROWS) {
        let pd = '';
        for (let i = 0; i <= 60; i++) { const x = XMIN + (i / 60) * (XMAX - XMIN); const [sx, sy] = toScreen(x, flowY(x, y0, P)); pd += (i ? 'L' : 'M') + sx.toFixed(1) + ',' + sy.toFixed(1); }
        s += `<path d="${pd}" fill="none" stroke="${c.muted}" stroke-opacity="${(0.4 * P.flow).toFixed(2)}" stroke-width="1.2"/>`;
      }
      for (const p of this.parts) {
        const [sx, sy] = toScreen(p.x, flowY(p.x, ROWS[p.r], P));
        s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3" fill="${c.blue}" opacity="${P.flow.toFixed(2)}"/>`;
      }
    }
    s += `<path d="${d}" fill="${c['surface-2']}" stroke="${c['ink-2']}" stroke-width="1.6"/>`;
    this.layer.innerHTML = s;
  },
  render(s, prev, kit) {
    Object.assign(this.T, targetParams(s), { pressure: s.pressure ? 1 : 0 });
    if (!prev || kit.reduced || kit.duration === 0) { Object.assign(this.P, this.T); this.draw(kit); }
    const T = this.T, ll = liftLen(s);
    kit.begin();
    if (s.lift) {
      const h = 40 + 70 * ll;
      kit.sarrow('lift', { x1: 0, y1: -10, x2: 0, y2: -10 - h, color: 'green-ink', width: 3.5, label: T.stall > 0.5 ? 'lift collapses' : 'lift', ldx: 34, ldy: -h / 2 + 10 });
    }
    if (s.weight) kit.sarrow('weight', { x1: 0, y1: 30, x2: 0, y2: 130, color: 'muted', width: 3.5, label: 'weight', ldx: 40, ldy: 20 });
    if (s.thrust) kit.sarrow('thrust', { x1: -170, y1: 10, x2: -260, y2: 10, color: 'blue-ink', width: 3.5, label: 'thrust', ldy: -14 });
    if (s.drag) kit.sarrow('drag', { x1: 140, y1: 10, x2: 215, y2: 10, color: 'yellow-ink', width: 3.5, label: 'drag', ldy: -14 });
    if (s.downwash) kit.sarrow('down', { x1: 150, y1: 30, x2: 230, y2: 30 + 40 + 40 * T.L, color: 'yellow-ink', width: 3, label: 'air turned down', ldx: 70, ldy: 0, curve: 10 });
    if (s.showAoa) {
      const [lx, ly] = toScreen(...rot([-2, 0], T.aoa));
      const [tx, ty] = toScreen(...rot([2, 0], T.aoa));
      kit.line('chord', { x1: lx - 20, y1: ly + (ly - ty) * 0.005, x2: tx + 30, y2: ty, color: 'blue', dashed: true, width: 1.2 });
      kit.line('flowdir', { x1: -340, y1: 10, x2: 300, y2: 10, color: 'line-strong', dashed: true, width: 1 });
      kit.text('aoa', { x: -200, y: -40, text: `angle of attack ${Math.round(T.aoa)}°`, size: 14, weight: 700, color: 'blue-ink' });
    }
    if (s.flow !== false) kit.sarrow('wind', { x1: -300, y1: -205, x2: -215, y2: -205, color: 'muted', width: 2, label: 'airflow', ldx: 0, ldy: -14 });
    if (s.caption) kit.text('caption', { x: 0, y: -215, text: s.caption, size: 15, weight: 600, color: s.captionColor || 'ink-2' });
    if (s.flow === false) kit.text('vacuum', { x: 0, y: 150, text: 'no air · no flow · no lift', size: 15, weight: 700, color: 'red-ink' });
    kit.end();
  },
  metrics: wing3d.metrics,
  note: wing3d.note,
};

// ---------- Technical: lift coefficient vs angle of attack ----------
const clCurve = {
  mode: 'svg',
  label: 'Lift coefficient versus angle of attack',
  render(s, prev, kit) {
    const X0 = -280, Y0 = 150, W = 560, Hh = 300, amax = 20, cmax = 1.8;
    const sx = a => X0 + ((a + 4) / (amax + 4)) * W, sy = c => Y0 - (c / cmax) * Hh;
    kit.begin();
    kit.line('xaxis', { x1: X0, y1: sy(0), x2: X0 + W, y2: sy(0), color: 'line-strong' });
    kit.line('yaxis', { x1: sx(0), y1: Y0 + 10, x2: sx(0), y2: Y0 - Hh - 10, color: 'line-strong' });
    for (const a of [0, 5, 10, 15, 20]) kit.text('xt' + a, { x: sx(a), y: sy(0) + 18, text: `${a}°`, size: 11, color: 'muted', mono: true });
    kit.text('xl', { x: X0 + W, y: sy(0) + 40, text: 'angle of attack →', size: 12, color: 'muted', anchor: 'end' });
    kit.text('yl', { x: sx(0) + 8, y: Y0 - Hh - 8, text: 'lift coefficient', size: 12, color: 'muted', anchor: 'start' });
    if (s.stallZone) kit.rect('stall', { x: sx(15), y: Y0 - Hh - 10, w: sx(20) - sx(15), h: Hh + 10 + (sy(0) - Y0), r: 0, fill: 'red-soft', stroke: 'none', layer: -1 });
    if (s.stallZone) kit.text('stall-t', { x: (sx(15) + sx(20)) / 2, y: Y0 - Hh + 8, text: 'stall', size: 13, weight: 700, color: 'red-ink' });
    if (s.linearZone) kit.rect('lin', { x: sx(-4), y: Y0 - Hh - 10, w: sx(10) - sx(-4), h: Hh + 10 + (sy(0) - Y0), r: 0, fill: 'green-soft', stroke: 'none', layer: -1 });
    if (s.linearZone) kit.text('lin-t', { x: (sx(-4) + sx(10)) / 2, y: Y0 - Hh + 8, text: 'nearly straight line', size: 13, weight: 700, color: 'green-ink' });
    let d = '';
    for (let a = -4; a <= amax; a += 0.25) d += (d ? 'L' : 'M') + sx(a).toFixed(1) + ',' + sy(liftCoeff(a)).toFixed(1);
    kit.path('curve', { d, stroke: 'blue', width: 3 });
    if (s.symmetric) {
      let d2 = '';
      for (let a = -4; a <= 15; a += 0.5) d2 += (d2 ? 'L' : 'M') + sx(a).toFixed(1) + ',' + sy(Math.max(-0.36, 0.09 * a)).toFixed(1);
      kit.path('sym', { d: d2, stroke: 'muted', width: 2, dashed: true });
      kit.text('sym-t', { x: sx(8), y: sy(0.09 * 8) + 22, text: 'symmetric wing: zero lift at 0°', size: 12, color: 'muted', anchor: 'start' });
    }
    if (s.aoa != null) {
      kit.circle('dot', { x: sx(s.aoa), y: sy(liftCoeff(s.aoa)), r: 7, fill: stallAmount(s.aoa) > 0.5 ? 'red' : 'blue', stroke: 'surface', strokeWidth: 2 });
      kit.text('dot-t', { x: sx(s.aoa) + 12, y: sy(liftCoeff(s.aoa)) - 16, text: `${s.aoa}° → ${liftCoeff(s.aoa).toFixed(2)}`, size: 12, weight: 700, mono: true, anchor: 'start', color: 'ink' });
    }
    if (s.caption) kit.text('caption', { x: 0, y: -215, text: s.caption, size: 15, weight: 600, color: 'ink-2' });
    kit.end();
  },
};

// ---------- Deep dive: the lift equation as bars ----------
const liftEq = {
  mode: 'svg',
  label: 'How each term in the lift equation scales lift',
  render(s, prev, kit) {
    const items = s.bars || [];
    kit.begin();
    kit.rect('formula', { x: -190, y: -220, w: 380, h: 46, r: 23, fill: 'surface', stroke: 'line-strong', label: 'L = Cl × ½ρV² × A', labelSize: 18, mono: true });
    const max = Math.max(4, ...items.map(b => b.value));
    const W = 520, bw = Math.min(110, W / Math.max(1, items.length) - 30), H = 260, base = 170;
    items.forEach((b, i) => {
      const x = -W / 2 + i * (W / items.length) + (W / items.length - bw) / 2, h = (b.value / max) * H;
      kit.rect('bar-' + b.id, { x, y: base - h, w: bw, h, r: 6, fill: b.color || 'blue', stroke: 'none', enter: 'grow' });
      kit.text('val-' + b.id, { x: x + bw / 2, y: base - h - 16, text: `×${b.value}`, size: 16, weight: 700, mono: true });
      kit.text('lab-' + b.id, { x: x + bw / 2, y: base + 20, text: b.label, size: 12, color: 'muted' });
    });
    kit.line('base', { x1: -W / 2, y1: base, x2: W / 2, y2: base, color: 'line-strong' });
    if (s.caption) kit.text('caption', { x: 0, y: -150, text: s.caption, size: 14, weight: 600, color: 'ink-2' });
    kit.end();
  },
};

export default { 'wing-3d': wing3d, 'lift-2d': lift2d, 'cl-curve': clCurve, 'lift-eq': liftEq };
