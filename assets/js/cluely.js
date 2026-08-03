// MedPull Recovery Copilot interactions (no deps)
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // Year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Typed prompt
  const prompts = [
    'Who needs attention today?',
    'Summarize Maria’s last 14 days',
    'Which ACL patients are behind on ROM?',
    'Is James ready to bill RTM?',
  ];
  let pi = 0;
  const promptEl = $('#askPrompt');
  function rotatePrompt() {
    if (!promptEl) return;
    pi = (pi + 1) % prompts.length;
    promptEl.style.opacity = '0';
    setTimeout(() => {
      promptEl.textContent = prompts[pi];
      promptEl.style.opacity = '1';
    }, 180);
  }
  if (promptEl) setInterval(rotatePrompt, 2200);

  // Features grid (simple bento)
  const features = [
    { t: 'Adaptive check-ins', d: 'Conversational AI that adjusts its questions to the procedure, the post-op day, and what the patient said last time.' },
    { t: 'Recovery progression', d: 'Pain, range of motion, function, and adherence trended against the expected curve for that specific procedure.' },
    { t: 'Ranked provider worklist', d: 'Patients sorted by who needs attention, each with the clinical reason already written out.' },
    { t: 'AI recovery summaries', d: 'Two weeks of check-ins condensed into a paragraph a surgeon reads in fifteen seconds — and exports to the chart.' },
    { t: 'RTM made simple', d: 'Data days and interactive minutes tracked automatically, so codes surface as ready the moment thresholds are met.' },
    { t: 'Wearables and clinical data', d: 'Activity, sleep, and chart data joining the same recovery timeline — on the roadmap.' },
  ];
  const grid = $('#featuresGrid');
  if (grid) {
    grid.innerHTML = features
      .map(
        (f) => `
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 playful-card">
            <div class="card-body p-4">
              <h5 class="card-title">${f.t}</h5>
              <p class="card-text text-muted">${f.d}</p>
            </div>
          </div>
        </div>`
      )
      .join('');
  }

  // Testimonials (basic carousel-like scroll)
  const track = $('#testimonialsTrack');
  if (track) {
    const items = [
      { q: 'Between the six-week and twelve-week visits I genuinely don\'t know how most of my patients are doing. I find out when something has already gone wrong.', a: 'Orthopedic surgeon' },
      { q: 'We have one nurse calling down a list. She gets through maybe a third of them, and the ones who pick up are usually the ones doing fine.', a: 'Practice administrator' },
      { q: 'The patients who stop showing up for PT are the ones I worry about, and they\'re exactly the ones nobody hears from.', a: 'Physical therapy lead' },
      { q: 'I wasn\'t sure if the pain I had at three weeks was normal or a problem. I didn\'t want to bother anyone, so I just waited.', a: 'Post-operative patient' },
      { q: 'We looked at RTM. Once we worked out what it would take to track the minutes properly, we dropped it.', a: 'Practice administrator' },
    ];
    track.innerHTML = items
      .map(
        (x) => `
        <div class="card shadow-sm">
          <div class="card-body">
            <p class="mb-2">“${x.q}”</p>
            <div class="text-muted small">— ${x.a}</div>
          </div>
        </div>`
      )
      .join('');

    const step = 360; // px
    const prev = $('#prevTestimonial');
    const next = $('#nextTestimonial');
    if (prev) prev.addEventListener('click', () => (track.scrollLeft -= step));
    if (next) next.addEventListener('click', () => (track.scrollLeft += step));
  }

  // Simple forms
  const newsletter = $('#newsletterForm');
  if (newsletter) {
    newsletter.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#newsletterEmail');
      const fb = $('#newsletterFeedback');
      if (email && email.value.includes('@')) {
        if (fb) fb.textContent = 'Thanks! We\'ll be in touch.';
        newsletter.reset();
      } else if (fb) fb.textContent = 'Enter a valid email.';
    });
  }

  const contact = $('#contactForm');
  if (contact) {
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      const fb = $('#contactFeedback');
      if (fb) fb.textContent = 'Thanks! We\'ll reply shortly.';
      contact.reset();
    });
  }

  // Product mockup tabs (chat / worklist / summary / RTM)
  const tabs = $$('.mock-tab');
  if (tabs.length) {
    function selectTab(tab) {
      tabs.forEach((t) => {
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        const active = t === tab;
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        if (panel) panel.hidden = !active;
      });
      // Replay the message reveal so the chat feels live each time it's opened.
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) {
        panel.querySelectorAll('.chat-message').forEach((m, i) => {
          m.style.animation = 'none';
          // Force reflow so the animation can restart.
          void m.offsetWidth;
          m.style.animation = `slideIn .3s ease ${i * 0.09}s both`;
        });
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (e) => {
        const i = tabs.indexOf(tab);
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); next.focus(); selectTab(next); }
      });
    });
  }
})();
