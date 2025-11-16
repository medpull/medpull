// MedPull Cluely-inspired interactions (no deps)
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // Year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Typed prompt
  const prompts = [
    'How do I fill Section 3?',
    'Translate this into Spanish',
    'What does “household income” mean here?',
    'Summarize this form in 3 bullets',
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
    { t: 'Instant translation', d: 'View any form in your language with clean, readable layout.' },
    { t: 'Ask anything', d: 'Chat about confusing sections and requirements in real time.' },
    { t: 'Autofill answers', d: 'Your responses are mapped to the official English form.' },
    { t: 'Export clean copies', d: 'Download a crisp, ready-to-submit PDF or print.' },
    { t: 'Works on any device', d: 'iOS, Android, and the web—no special setup required.' },
    { t: 'Privacy guaranteed', d: 'Enterprise plans with HIPAA-aligned options and BAAs.' },
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
      { q: 'It\'s hard to explain what\'s wrong when you don\'t have records. I\'d use anything that helps me keep them.', a: 'Patient' },
      { q: 'I have to fill out the same forms every visit and sometimes forget documents.', a: 'Patient' },
      { q: 'Patients get overwhelmed by the forms and long lines.', a: 'Staff' },
      { q: 'We rely heavily on Google Translate since our translators only speak English and Spanish.', a: 'Staff' },
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
})();
