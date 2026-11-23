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
