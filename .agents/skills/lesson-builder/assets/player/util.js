// Small shared helpers for the player.
export const PLAYER_VERSION = '1.1.0';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Inline markdown-lite: **bold**, *em*, `code`, [S3] citations, [text](url) links, blank-line paragraphs.
export function md(text, sources = [], { block = false } = {}) {
  const byId = Object.fromEntries((sources || []).map(s => [s.id, s]));
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\[(S\d+)\]/g, (m, id) => {
      const s = byId[id];
      return s ? `<a class="cite" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title)}${s.publisher ? ' · ' + esc(s.publisher) : ''}">${id}</a>` : `<span class="cite">${id}?</span>`;
    });
  if (!block) return inline(text);
  return String(text ?? '').split(/\n{2,}/).map(p => `<p>${inline(p.trim())}</p>`).join('');
}

// Tiny syntax colouring for pseudocode / py / js. Returns per-line HTML.
const KW = /\b(def|return|if|elif|else|for|while|in|not|and|or|class|self|None|True|False|function|const|let|var|new|throw|raise|import|from|try|except|catch|push|pop|len|null|undefined|of|is|break|continue|lambda|pass)\b/g;
export function highlightLines(src) {
  return String(src).replace(/\t/g, '  ').split('\n').map(line => {
    // find a # or // comment start that is outside quotes
    let q = null, ci = -1;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === '#' || (c === '/' && line[i + 1] === '/')) { ci = i; break; }
    }
    const comment = ci >= 0 ? esc(line.slice(ci)) : '';
    const code = ci >= 0 ? line.slice(0, ci) : line;
    const TOK = new RegExp(`("[^"]*"|'[^']*')|\\b(\\d+(?:\\.\\d+)?)\\b|${KW.source}`, 'g');
    let out = '', last = 0, m;
    while ((m = TOK.exec(code))) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'tok-s' : m[2] ? 'tok-n' : 'tok-k';
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = TOK.lastIndex;
    }
    out += esc(code.slice(last));
    return out + (comment ? `<span class="tok-c">${comment}</span>` : '');
  });
}

export const store = {
  get(key, fallback) { try { const v = localStorage.getItem('unfold:' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, val) { try { localStorage.setItem('unfold:' + key, JSON.stringify(val)); } catch { /* private mode */ } },
};

export function initTheme(btn, onChange) {
  const apply = t => {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    onChange?.();
  };
  apply(store.get('theme', null));
  btn?.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    store.set('theme', next);
    apply(next);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => onChange?.());
}

export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copied: ' + t); } catch { toast(t); }
}

export function progressFor(slug) { return store.get('progress:' + slug, { quizBest: null, visited: {} }); }
export function saveProgress(slug, p) { store.set('progress:' + slug, p); }
