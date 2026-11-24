// Unfold three.js stage. Same contract as the SVG kit: scenes are state-based.
// A scene with mode "three" gets k3 in mount(stage, k3) and render(state, prev, k3).
// k3.tween(obj, {x: 1, ...}) animates numeric props (on objects, vectors, materials) toward targets;
// k3.onFrame(fn) registers per-frame ambient animation; k3.cameraTo([x,y,z], [tx,ty,tz]) moves the view.

import { ease } from 'unfold/scene-kit';

let threeModPromise;
function loadThree() {
  threeModPromise ||= Promise.all([
    import('three'),
    import('three/orbit'),
  ]);
  return threeModPromise;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

export async function createThreeKit(stage, { duration = 600 } = {}) {
  const [THREE, { OrbitControls }] = await loadThree();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(6, 4, 9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3; controls.maxDistance = 30;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(5, 10, 7);
  scene.add(sun);

  const tweens = new Set();
  const frames = new Set();
  const updates = new Set();
  let raf = 0, paused = false, disposed = false, last = performance.now();

  const k3 = { THREE, scene, camera, renderer, controls, stage, reduced, duration: reduced ? 0 : duration };

  k3.colors = () => {
    const cs = getComputedStyle(stage);
    const g = n => cs.getPropertyValue('--' + n).trim() || '#888888';
    return { red: g('red'), green: g('green'), blue: g('blue'), yellow: g('yellow'), ink: g('ink'), muted: g('muted'),
      surface: g('surface'), line: g('line-strong'), bg: g('bg') };
  };
  k3.color = name => new THREE.Color(k3.colors()[name] || name);

  // Tween numeric props on any object. Props may be dotted paths ("position.y") or THREE.Color targets.
  k3.tween = (obj, to, { dur = k3.duration, delay = 0 } = {}) => {
    for (const tw of tweens) if (tw.obj === obj) for (const k of Object.keys(to)) delete tw.to[k];
    const from = {};
    const get = path => path.split('.').reduce((o, k) => o?.[k], obj);
    for (const k of Object.keys(to)) {
      const v = get(k);
      from[k] = v?.isColor ? v.clone() : v;
    }
    const tw = { obj, from, to: { ...to }, start: performance.now() + delay, dur };
    tweens.add(tw);
    if (!dur) step(performance.now());
    return tw;
  };
  function applyTween(tw, t) {
    for (const k of Object.keys(tw.to)) {
      const parts = k.split('.'), leaf = parts.pop();
      const target = parts.reduce((o, p) => o?.[p], tw.obj);
      if (!target) continue;
      const a = tw.from[k], b = tw.to[k];
      if (a?.isColor) { target[leaf].copy(a).lerp(b?.isColor ? b : new THREE.Color(b), t); }
      else if (typeof a === 'number') target[leaf] = a + (b - a) * t;
      else if (t >= 1) target[leaf] = b;
    }
  }
  k3.cameraTo = (pos, target = [0, 0, 0], opts) => {
    k3.tween(camera, { 'position.x': pos[0], 'position.y': pos[1], 'position.z': pos[2] }, opts);
    k3.tween(controls, { 'target.x': target[0], 'target.y': target[1], 'target.z': target[2] }, opts);
  };
  k3.onFrame = fn => { frames.add(fn); return () => frames.delete(fn); };       // ambient: skipped when paused / reduced motion
  k3.onUpdate = fn => { updates.add(fn); return () => updates.delete(fn); };     // always runs, after tweens
  k3.setPaused = p => { paused = p; };

  function resize() {
    const w = stage.clientWidth || 800, h = stage.clientHeight || 450;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  function step(now) {
    for (const tw of [...tweens]) {
      const t = tw.dur ? Math.max(0, Math.min(1, (now - tw.start) / tw.dur)) : 1;
      if (now < tw.start) continue;
      applyTween(tw, ease(t));
      if (t >= 1) tweens.delete(tw);
    }
  }
  function loop(now) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(now);
    if (!paused && !reduced) for (const fn of frames) fn(dt, now);
    for (const fn of updates) fn(dt, now);
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  // ---------- helpers ----------
  // Text in 3D: a camera-facing sprite drawn on a canvas. Returns the sprite; sprite.setText('new') redraws it.
  k3.label3d = (text, { size = 0.45, color = 'ink', weight = 700, bg = null } = {}) => {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.setText = (t, col = color) => {
      const font = `${weight} 64px ${getComputedStyle(stage).fontFamily || 'sans-serif'}`;
      ctx.font = font;
      const w = Math.ceil(ctx.measureText(t).width) + 32, h = 96;
      cv.width = w; cv.height = h;
      ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      if (bg) { ctx.fillStyle = k3.colors()[bg] || bg; ctx.beginPath(); ctx.roundRect(0, 8, w, h - 16, 40); ctx.fill(); }
      ctx.fillStyle = k3.colors()[col] || col; ctx.fillText(t, w / 2, h / 2 + 2);
      tex.needsUpdate = true;
      sprite.scale.set(size * w / h, size, 1);
    };
    sprite.setText(String(text));
    return sprite;
  };
  // A cloud of points. update(fn(i, p)) lets you move each point (p = [x, y, z]).
  k3.particles = ({ count = 300, area = [6, 3, 3], size = 0.06, color = 'blue', opacity = 0.9 } = {}) => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) for (let a = 0; a < 3; a++) pos[i * 3 + a] = (Math.random() - 0.5) * area[a];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ size, color: k3.color(color), transparent: true, opacity, depthWrite: false }));
    points.update = fn => { const p = [0, 0, 0]; for (let i = 0; i < count; i++) { p[0] = pos[i * 3]; p[1] = pos[i * 3 + 1]; p[2] = pos[i * 3 + 2]; fn(i, p); pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; } geo.attributes.position.needsUpdate = true; };
    return points;
  };
  // Particles carried by a velocity field v(x, y, z) -> [vx, vy, vz]; they respawn at the min-x edge.
  k3.flowField = (velocity, { count = 400, min = [-4, -2, -1.5], max = [4, 2, 1.5], size = 0.05, color = 'blue', speed = 1 } = {}) => {
    const span = max.map((v, i) => v - min[i]);
    const pts = k3.particles({ count, size, color, area: span });
    pts.position.set(0, 0, 0);
    pts.update((i, p) => { for (let a = 0; a < 3; a++) p[a] = min[a] + Math.random() * span[a]; });
    let field = velocity;
    pts.setVelocity = fn => { field = fn; };
    k3.onFrame(dt => pts.update((i, p) => {
      const v = field(p[0], p[1], p[2]);
      for (let a = 0; a < 3; a++) p[a] += v[a] * dt * speed;
      if (p.some((c, a) => c < min[a] - 0.01 || c > max[a] + 0.01)) { p[0] = min[0]; p[1] = min[1] + Math.random() * span[1]; p[2] = min[2] + Math.random() * span[2]; }
    }));
    return pts;
  };
  // An instanced grid of cubes (tensors, neurons, pixels). grid.set(i, { value 0..1 (height), color }).
  k3.grid = ({ nx = 8, ny = 4, nz = 1, cell = 0.4, gap = 0.06, color = 'blue' } = {}) => {
    const n = nx * ny * nz, mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cell, cell, cell), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
    const m = new THREE.Matrix4(), step = cell + gap, vals = new Float32Array(n).fill(1), c = k3.color(color);
    const place = i => {
      const ix = i % nx, iy = Math.floor(i / nx) % ny, iz = Math.floor(i / (nx * ny)), h = Math.max(0.05, vals[i]);
      m.makeScale(1, h, 1).setPosition((ix - (nx - 1) / 2) * step, (iz * step) + cell * h / 2, (iy - (ny - 1) / 2) * step);
      mesh.setMatrixAt(i, m);
    };
    for (let i = 0; i < n; i++) { place(i); mesh.setColorAt(i, c); }
    mesh.set = (i, { value, color: col } = {}) => {
      if (value != null) { vals[i] = value; place(i); mesh.instanceMatrix.needsUpdate = true; }
      if (col) { mesh.setColorAt(i, k3.color(col)); mesh.instanceColor.needsUpdate = true; }
    };
    mesh.count = n;
    return mesh;
  };
  // Extrude an SVG path (M L H V C Q Z, absolute or relative) into a solid. scale: SVG px -> world units.
  k3.extrude = (d, { depth = 0.3, scale = 0.02, color = 'blue', bevel = 0.02 } = {}) => {
    const shape = pathToShape(THREE, d, scale);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
    geo.center();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: k3.color(color), roughness: 0.5 }));
  };
  // A step's state.camera = { pos: [x, y, z], target: [x, y, z] } glides the view (the player calls this).
  k3.applyCamera = cam => { if (cam?.pos) k3.cameraTo(cam.pos, cam.target || [0, 0, 0]); };
  k3.hasLoops = () => frames.size > 0;

  k3.isAnimating = () => tweens.size > 0;
  k3.refreshColors = () => { k3.onThemeChange?.(); };
  k3.destroy = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    scene.traverse(o => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach(m => m.dispose?.()); });
    renderer.dispose();
    renderer.domElement.remove();
  };
  return k3;
}

// ---------- SVG path -> THREE.Shape ----------
function pathToShape(THREE, d, k) {
  const shape = new THREE.Shape();
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  let i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0;
  const num = () => +toks[i++];
  const P = (px, py) => [px * k, -py * k];
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ax = v => (rel ? x + v : v), ay = v => (rel ? y + v : v);
    if (C === 'M') { x = ax(num()); y = ay(num()); sx = x; sy = y; shape.moveTo(...P(x, y)); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { x = ax(num()); y = ay(num()); shape.lineTo(...P(x, y)); }
    else if (C === 'H') { x = ax(num()); shape.lineTo(...P(x, y)); }
    else if (C === 'V') { y = ay(num()); shape.lineTo(...P(x, y)); }
    else if (C === 'C') { const a = [ax(num()), ay(num()), ax(num()), ay(num()), ax(num()), ay(num())]; shape.bezierCurveTo(...P(a[0], a[1]), ...P(a[2], a[3]), ...P(a[4], a[5])); x = a[4]; y = a[5]; }
    else if (C === 'Q') { const a = [ax(num()), ay(num()), ax(num()), ay(num())]; shape.quadraticCurveTo(...P(a[0], a[1]), ...P(a[2], a[3])); x = a[2]; y = a[3]; }
    else if (C === 'Z') { shape.closePath(); x = sx; y = sy; if (i < toks.length && !/[a-zA-Z]/.test(toks[i])) cmd = 'L'; }
    else i++;   // unsupported command (A, S, T): skip a token
  }
  return shape;
}

// ---------- the "3d" style: lit meshes for the SVG kit's box / plate / token ----------
// An orthographic camera at the kit's exact isometric angle and scale, so meshes line up with the SVG labels,
// arrows and text drawn on top. Scenes don't change: the kit calls update(key, type, props) for every frame.
export async function createIsoMesh(stage, kit) {
  const [THREE] = await loadThree();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200);
  const dir = new THREE.Vector3(1, 1, 1).normalize();
  cam.position.copy(dir.clone().multiplyScalar(50)); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a6, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(3, 10, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 0.5, far: 40 });
  sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true;
  scene.add(ground);

  const box = new THREE.BoxGeometry(1, 1, 1), edges = new THREE.EdgesGeometry(box), disc = new THREE.CylinderGeometry(1, 1, 1, 40);
  const discEdges = new THREE.EdgesGeometry(disc, 30);
  const objs = new Map();
  const col = v => { const h = kit.color(v); try { return new THREE.Color(h); } catch { return new THREE.Color('#888888'); } };
  const S = () => kit.scale * Math.sqrt(1.5);

  function make(type) {
    const geo = type === 'token' ? disc : box;
    // boxes get one material for the sides and one for the top face (BoxGeometry groups: +x -x +y -y +z -z)
    const side = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, transparent: true });
    const top = type === 'box' ? new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, transparent: true }) : side;
    const mesh = new THREE.Mesh(geo, type === 'box' ? [side, side, top, side, side, side] : side);
    mesh.castShadow = type !== 'plate'; mesh.receiveShadow = true;
    const solid = new THREE.LineBasicMaterial({ transparent: true }), dashed = new THREE.LineDashedMaterial({ transparent: true, dashSize: 0.12, gapSize: 0.09 });
    const line = new THREE.LineSegments(type === 'token' ? discEdges : edges, solid);
    mesh.add(line);
    scene.add(mesh);
    return { mesh, line, type, side, top, solid, dashed };
  }
  const setDashed = (o, on) => {
    const m = on ? o.dashed : o.solid;
    if (o.line.material !== m) { o.line.material = m; if (on) o.line.computeLineDistances(); }
    if (on) { o.dashed.scale = Math.max(0.2, (o.mesh.scale.x + o.mesh.scale.z) / 2); }
  };
  function updateCamera() {
    const vb = kit.viewBox(), r = stage.getBoundingClientRect();
    const sa = (r.width || 800) / (r.height || 500), va = vb.w / vb.h;
    let vx0 = vb.x, vx1 = vb.x + vb.w, vy0 = vb.y, vy1 = vb.y + vb.h;
    if (sa > va) { const w = vb.h * sa, cx = vb.x + vb.w / 2; vx0 = cx - w / 2; vx1 = cx + w / 2; }
    else { const h = vb.w / sa, cy = vb.y + vb.h / 2; vy0 = cy - h / 2; vy1 = cy + h / 2; }
    const [ox, oy] = kit.origin, s = S();
    cam.left = (vx0 - ox) / s; cam.right = (vx1 - ox) / s; cam.top = (oy - vy0) / s; cam.bottom = (oy - vy1) / s;
    cam.updateProjectionMatrix();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    const c = renderer.domElement;
    if (c.width !== Math.round(w * renderer.getPixelRatio()) || c.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  }
  const api = {
    update(key, type, p) {
      let o = objs.get(key);
      if (!o) { o = make(type); objs.set(key, o); }
      o.props = p;
      const { mesh, line, side, top } = o, op = p.opacity ?? 1;
      if (type === 'box') {
        const { x = 0, y = 0, z = 0, w = 1, d = 1, h = 1 } = p;
        mesh.scale.set(w, Math.max(0.001, h), d); mesh.position.set(x + w / 2, z + h / 2, y + d / 2);
        side.color = col(p.color || 'blue');
        top.color = p.topColor ? col(p.topColor) : side.color;
        side.opacity = top.opacity = op * (p.dashed ? 0.12 : 1);
        line.material.color = p.dashed ? col('muted') : col(p.outline || p.color || 'blue').multiplyScalar(0.62);
        line.material.opacity = op * (p.dashed ? 0.8 : 0.55);
      } else if (type === 'plate') {
        const { x = 0, y = 0, z = 0, w = 1, d = 1 } = p, t = 0.04;
        mesh.scale.set(w, t, d); mesh.position.set(x + w / 2, z - t / 2, y + d / 2);
        side.color = col(p.color || 'surface-2');
        side.opacity = p.fill === 'none' ? 0 : op * (p.fillOpacity ?? 1) * (p.dashed ? 0.35 : 1);
        line.material.color = col(p.stroke || 'line-strong'); line.material.opacity = op * 0.9;
      } else {
        const r = (p.r || 14) / S(), t = 0.16;
        mesh.scale.set(r, t, r); mesh.position.set(p.x || 0, (p.z || 0) + t / 2 + 0.08, p.y || 0);
        side.color = col(p.color || 'blue'); side.opacity = op;
        line.material.color = col(p.color || 'blue').multiplyScalar(0.6); line.material.opacity = op * 0.6;
      }
      side.depthWrite = top.depthWrite = side.opacity > 0.98;
      setDashed(o, !!p.dashed);
      mesh.visible = op > 0.01;
    },
    remove(key) { const o = objs.get(key); if (!o) return; scene.remove(o.mesh); for (const m of new Set([o.side, o.top, o.solid, o.dashed])) m.dispose(); objs.delete(key); },
    refresh() { for (const [key, o] of objs) if (o.props) api.update(key, o.type, o.props); },
    render() { updateCamera(); renderer.render(scene, cam); },
    animating: () => false,
    destroy() { ro.disconnect(); for (const k of [...objs.keys()]) api.remove(k); box.dispose(); edges.dispose(); disc.dispose(); discEdges.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
  const ro = new ResizeObserver(() => api.render());
  ro.observe(stage);
  return api;
}
