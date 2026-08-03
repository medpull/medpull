// MedPull Recovery Copilot interactions (no deps)
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // Year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Rotating live signal feed in the hero
  const prompts = [
    '3 patients need attention',
    'James W. has not checked in for 4 days',
    'Maria A. flagged: pain up 3 points',
    'Rachel O. is behind on range of motion',
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
    { t: 'Adaptive check-ins', d: 'Questions adjust to the procedure, the post-op day, and what the patient said last time.' },
    { t: 'Recovery progression', d: 'Pain, range of motion, function, and adherence trended against the expected curve for that procedure.' },
    { t: 'Ranked provider worklist', d: 'Patients sorted by who needs attention, each with the clinical reason written out.' },
    { t: 'AI recovery summaries', d: 'Two weeks of check-ins in a paragraph a surgeon reads in fifteen seconds, ready for the chart.' },
    { t: 'RTM made simple', d: 'Data days and interactive minutes tracked automatically, so codes surface the moment thresholds are met.' },
    { t: 'Multilingual by default', d: 'Check-ins run in the patient\'s language, so response rates hold up across your whole panel.' },
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
