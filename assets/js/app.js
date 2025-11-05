/* MedPull marketing site JS */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Year in footer
  $('#year').textContent = new Date().getFullYear();

  // Theme toggle
  const themeKey = 'medpull-theme';
  const savedTheme = localStorage.getItem(themeKey);
  const html = document.documentElement;
  if (savedTheme === 'dark') html.setAttribute('data-bs-theme', 'dark');
  $('#themeToggle').addEventListener('click', () => {
    const isDark = html.getAttribute('data-bs-theme') === 'dark';
    html.setAttribute('data-bs-theme', isDark ? 'light' : 'dark');
    localStorage.setItem(themeKey, isDark ? 'light' : 'dark');
    $('#themeToggle').textContent = isDark ? 'Dark mode' : 'Light mode';
  });
  // Initialize button label
  $('#themeToggle').textContent = (html.getAttribute('data-bs-theme') === 'dark') ? 'Light mode' : 'Dark mode';

  // Smooth scroll for nav links and close navbar on click
  $$('.navbar .nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = a.getAttribute('href');
      if (target?.startsWith('#')) {
        e.preventDefault();
        document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Collapse mobile navbar
        const nav = $('#mainNav');
        if (nav?.classList.contains('show')) {
          new bootstrap.Collapse(nav).hide();
        }
      }
    });
  });

  // FEATURES dynamic render
  const features = [
    { icon: '📄', title: 'Upload any form', body: 'PDFs or photos—cleaned up and prepped for filling.' },
    { icon: '🌍', title: 'Instant translation', body: 'See the form in your language while keeping layout.' },
    { icon: '🤖', title: 'AI chat help', body: 'Ask questions about any section and what it means.' },
    { icon: '✍️', title: 'Guided autofill', body: 'We map your answers to the official English form.' },
    { icon: '🔒', title: 'Privacy-first', body: 'No account required; enterprise security options available.' },
    { icon: '📤', title: 'Export & share', body: 'Download the completed English form and a translated copy.' },
  ];
  const featuresGrid = $('#featuresGrid');
  features.forEach(({ icon, title, body }) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';
    col.innerHTML = `
      <div class="card h-100 playful-card" data-tilt>
        <div class="card-body p-4">
          <div class="d-inline-flex align-items-center justify-content-center rounded-3 mb-3" style="width:44px;height:44px;background:var(--animated-gradient);background-size:200% 200%;animation:gradientShift 20s ease-in-out infinite;color:#fff">${icon}</div>
          <h5 class="card-title">${title}</h5>
          <p class="card-text text-muted">${body}</p>
        </div>
      </div>`;
    featuresGrid.appendChild(col);
  });

  // PRICING dynamic render
  const pricingPlans = [
    { name: 'Free', monthly: 0, yearly: 0, cta: 'Start free', perks: ['Public search', 'Basic filters', 'Email support'] },
    { name: 'Pro', monthly: 39, yearly: 374, featured: true, cta: 'Start trial', perks: ['Advanced filters', 'Referrals & exports', 'Priority support'] },
    { name: 'Enterprise', monthly: 129, yearly: 1234, cta: 'Contact sales', perks: ['SSO & audit logs', 'HIPAA BAA', 'Custom integrations'] },
  ];
  const pricingGrid = $('#pricingGrid');
  const toggle = $('#billingToggle');
  if (pricingGrid && toggle) {
    function renderPricing() {
      const annually = toggle.checked;
      pricingGrid.innerHTML = '';
      pricingPlans.forEach(plan => {
        const price = annually ? plan.yearly : plan.monthly;
        const per = annually ? '/year' : '/month';
        const note = annually ? '<span class="badge text-bg-success ms-2">Save 20%</span>' : '';
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';
        col.innerHTML = `
          <div class="card pricing-card h-100 ${plan.featured ? 'featured' : ''}">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="card-title mb-0">${plan.name}</h5>
                ${note}
              </div>
              <div class="d-flex align-items-baseline gap-2 mb-3">
                <div class="price">${price === 0 ? 'Free' : '$' + price}</div>
                <div class="period">${price === 0 ? '' : per}</div>
              </div>
              <ul class="list-unstyled mb-4">
                ${plan.perks.map(p => `<li class="mb-2">✓ ${p}</li>`).join('')}
              </ul>
              <a href="#contact" class="btn ${plan.featured ? 'btn-primary' : 'btn-outline-primary'} w-100">${plan.cta}</a>
            </div>
          </div>`;
        pricingGrid.appendChild(col);
      });
    }
    toggle.addEventListener('change', renderPricing);
    renderPricing();
  }

  // TESTIMONIALS dynamic render + simple carousel
  const testimonials = [
    { quote: 'I finally understood every section of my form.', author: 'Parent', org: 'Houston' },
    { quote: 'Our clinic navigators save 15 minutes per form.', author: 'Program Manager', org: 'CHC' },
    { quote: 'The AI chat in Spanish is a game changer.', author: 'Case Worker', org: 'Nonprofit Partner' },
  ];
  const track = $('#testimonialsTrack');
  testimonials.forEach(t => {
    const card = document.createElement('div');
    card.className = 'testimonial';
    card.innerHTML = `<div class="quote">“${t.quote}”</div><div class="mt-3 text-muted">— ${t.author}, ${t.org}</div>`;
    track.appendChild(card);
  });
  let index = 0;
  function showTestimonial(i) {
    const width = track.getBoundingClientRect().width;
    track.scrollTo({ left: i * width, behavior: 'smooth' });
  }
  $('#prevTestimonial').addEventListener('click', () => { index = (index - 1 + testimonials.length) % testimonials.length; showTestimonial(index); });
  $('#nextTestimonial').addEventListener('click', () => { index = (index + 1) % testimonials.length; showTestimonial(index); });
  // Auto-advance
  setInterval(() => { index = (index + 1) % testimonials.length; showTestimonial(index); }, 5000);

  // Newsletter form (client-side demo only)
  $('#newsletterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#newsletterEmail').value.trim();
    const out = $('#newsletterFeedback');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      out.textContent = 'Please enter a valid email.';
      out.className = 'text-danger small mt-2';
      return;
    }
    out.textContent = 'Thanks! You\'re on the list.';
    out.className = 'text-success small mt-2';
    e.target.reset();
    // TODO: Integrate with your email provider (e.g., SES via API Gateway/Lambda or a form service)
  });

  // Contact form (client-side demo only)
  $('#contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const out = $('#contactFeedback');

    // simple validation
    if (!data.name || !data.email || !data.message || !$('#consent').checked) {
      out.textContent = 'Please complete all required fields and consent.';
      out.className = 'text-danger';
      return;
    }

    // Simulate async submit
    out.textContent = 'Sending…';
    out.className = 'text-muted';
    try {
      await new Promise(r => setTimeout(r, 900));
      // Example for future integration:
      // await fetch('https://api.example.com/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      out.textContent = 'Thanks! We\'ll be in touch shortly.';
      out.className = 'text-success';
      e.target.reset();
      $('#consent').checked = false;
    } catch (err) {
      out.textContent = 'Something went wrong. Please try again later.';
      out.className = 'text-danger';
    }
  });
  // Accent color cycle
  // Tilt effect
  function bindTilt(el){
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (y - 0.5) * 6; // rotateX
      const ry = (0.5 - x) * 6; // rotateY
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
  $$('[data-tilt]').forEach(bindTilt);

  // Confetti micro-interaction
  function confettiBurstAt(x, y){
    const shapes = ['✨','★','●','◆','◦'];
    for (let i = 0; i < 16; i++){
      const s = document.createElement('span');
      s.className = 'confetti-piece';
      s.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      s.style.left = `${x}px`; s.style.top = `${y}px`;
      const dx = (Math.random() - 0.5) * 220;
      const dy = (Math.random() * 240) - 60;
      const rot = `${(Math.random() - 0.5) * 720}deg`;
      s.style.setProperty('--dx', `${dx}px`);
      s.style.setProperty('--dy', `${dy}px`);
      s.style.setProperty('--rot', rot);
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }
  $$('[data-confetti]').forEach(el => {
    el.addEventListener('click', (e) => {
      const r = el.getBoundingClientRect();
      confettiBurstAt(r.left + r.width/2 + window.scrollX, r.top + r.height/2 + window.scrollY);
    });
  });
})();
