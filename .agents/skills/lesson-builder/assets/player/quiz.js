// Check Yourself: instant-feedback quiz; best score saved locally (drives the graph's progress ring).
import { esc, md, progressFor, saveProgress } from 'unfold/util';

export function renderQuiz(el, lesson) {
  const qs = lesson.quiz || [];
  const answers = new Array(qs.length).fill(null);
  const letters = 'ABCDEFG';
  const prog = progressFor(lesson.slug);
  el.innerHTML = `<div class="doc">
    <div><h2>Check yourself</h2><p class="lede">${qs.length} questions aimed at the ideas that are easiest to get wrong. Pick an answer to see why.</p></div>
    ${qs.map((q, i) => `
      <section class="quiz-q" data-i="${i}">
        <div class="qmeta"><span class="tag">Q${i + 1}</span>${q.concept ? `<span class="tag">${esc(q.concept)}</span>` : ''}</div>
        <h3>${md(q.q, lesson.sources)}</h3>
        <div class="opts" role="group" aria-label="Options for question ${i + 1}">
          ${q.options.map((o, j) => `<button class="opt" data-j="${j}"><span class="k">${letters[j]}</span><span>${md(o, lesson.sources)}</span></button>`).join('')}
        </div>
        <div class="why" hidden></div>
      </section>`).join('')}
    <div class="score" hidden><div class="ring"></div><div><div class="big"></div><div class="lede"></div></div><button class="btn" data-retry style="margin-left:auto">Try again</button></div>
    ${prog.quizBest != null ? `<p class="lede">Your best so far: ${Math.round(prog.quizBest * 100)}%</p>` : ''}
  </div>`;

  el.querySelectorAll('.quiz-q').forEach(sec => {
    const i = +sec.dataset.i, q = qs[i];
    sec.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
      if (answers[i] != null) return;
      const j = +btn.dataset.j;
      answers[i] = j;
      sec.querySelectorAll('.opt').forEach(b => { b.disabled = true; });
      sec.querySelector(`.opt[data-j="${q.answer}"]`).classList.add('correct');
      if (j !== q.answer) btn.classList.add('wrong');
      const why = sec.querySelector('.why');
      why.hidden = false;
      why.innerHTML = `<strong>${j === q.answer ? 'Right.' : 'Not quite.'}</strong> ${md(q.why, lesson.sources)}`;
      if (answers.every(a => a != null)) finish();
    }));
  });
  el.querySelector('[data-retry]').addEventListener('click', () => renderQuiz(el, lesson));

  function finish() {
    const right = answers.filter((a, i) => a === qs[i].answer).length;
    const frac = right / qs.length;
    const box = el.querySelector('.score');
    box.hidden = false;
    box.querySelector('.ring').style.setProperty('--p', Math.round(frac * 100));
    box.querySelector('.big').textContent = `${right} / ${qs.length}`;
    const missed = [...new Set(qs.filter((q, i) => answers[i] !== q.answer).map(q => q.concept).filter(Boolean))];
    box.querySelector('.lede').textContent = missed.length ? `Revisit: ${missed.join(', ')}` : 'Every concept checks out.';
    const p = progressFor(lesson.slug);
    p.quizBest = Math.max(p.quizBest ?? 0, frac);
    saveProgress(lesson.slug, p);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
