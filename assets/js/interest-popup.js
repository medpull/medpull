/* MedPull early-access interest popup — self-contained (uses the Bootstrap bundle already on the page) */
(function () {
  'use strict';

  /* =========================================================================
     SETUP — read this:
     1. Go to https://web3forms.com and type the email you want submissions sent to.
     2. Copy the "Access Key" they give you (free, no account needed).
     3. Paste it between the quotes below, replacing YOUR-WEB3FORMS-ACCESS-KEY.
     That's it — every submission will then be emailed to you instantly.
     Until you add a key, the form runs in DEMO MODE: it logs to the console and
     still shows the success message, so you can test the look and feel.
     ========================================================================= */
  var WEB3FORMS_ACCESS_KEY = 'ee3a6bc7-8a3e-491e-9d17-b3bf412b4cd9';

  // How long before the gentle timed prompt appears (ms). Exit-intent can fire sooner.
  var SHOW_DELAY_MS = 30000;
  var STORAGE_KEY = 'medpull-interest-popup-seen';

  var hasKey = WEB3FORMS_ACCESS_KEY && WEB3FORMS_ACCESS_KEY.indexOf('YOUR-') !== 0;

  function alreadySeen() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  // --- Styles (scoped to the popup) -------------------------------------------------
  var style = document.createElement('style');
  style.textContent = [
    '#interestModal .modal-content{border:0;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(31,65,114,.28)}',
    '#interestModal .ip-head{background-image:linear-gradient(135deg,var(--brand-grad-1,#7fb4ff),var(--brand-grad-2,#86ccff) 50%,var(--brand-grad-3,#a7ecff));color:#0b1220;padding:26px 28px 22px}',
    '#interestModal .ip-eyebrow{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:rgba(255,255,255,.55);padding:4px 10px;border-radius:999px;margin-bottom:10px}',
    '#interestModal .ip-title{font-weight:700;font-size:1.5rem;line-height:1.2;margin:0 0 6px}',
    '#interestModal .ip-sub{margin:0;font-size:.95rem;color:#1f2a44;opacity:.85}',
    '#interestModal .ip-body{padding:24px 28px 28px}',
    '#interestModal .ip-perks{list-style:none;padding:0;margin:0 0 18px;display:flex;flex-wrap:wrap;gap:8px 16px}',
    '#interestModal .ip-perks li{font-size:.85rem;color:#66728a;display:flex;align-items:center;gap:6px}',
    '#interestModal .ip-perks li::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--brand-grad-2,#86ccff);flex:0 0 auto}',
    '#interestModal .ip-close{position:absolute;top:14px;right:16px;border:0;background:rgba(255,255,255,.6);width:32px;height:32px;border-radius:50%;font-size:18px;line-height:1;color:#0b1220;cursor:pointer}',
    '#interestModal .ip-close:hover{background:rgba(255,255,255,.9)}',
    '#interestModal .ip-fineprint{font-size:.78rem;color:#9aa3b2;margin:14px 0 0;text-align:center}',
    '#interestModal .ip-honey{position:absolute;left:-9999px;top:-9999px;opacity:0}',
    // "Get early access" trigger links — brand blue, so they stand out across the site.
    '[data-interest-open]{color:#2d6cdf!important;font-weight:700!important}',
    '[data-interest-open]:hover,[data-interest-open]:focus{color:#1f53b8!important;text-decoration:underline!important;text-underline-offset:3px}'
  ].join('');
  document.head.appendChild(style);

  // --- Markup -----------------------------------------------------------------------
  var wrap = document.createElement('div');
  wrap.innerHTML = [
    '<div class="modal fade" id="interestModal" tabindex="-1" aria-labelledby="interestModalTitle" aria-hidden="true">',
    '  <div class="modal-dialog modal-dialog-centered">',
    '    <div class="modal-content">',
    '      <button type="button" class="ip-close" data-bs-dismiss="modal" aria-label="Close">&times;</button>',
    '      <div class="ip-head">',
    '        <span class="ip-eyebrow">Early access</span>',
    '        <h2 class="ip-title" id="interestModalTitle">Bring the Recovery Copilot to your practice</h2>',
    '        <p class="ip-sub">Tell us where to reach you and we\'ll set up a free walkthrough for your team. Early partners get priority onboarding and pilot pricing.</p>',
    '      </div>',
    '      <div class="ip-body">',
    '        <ul class="ip-perks">',
    '          <li>Free pilot access</li>',
    '          <li>Priority onboarding</li>',
    '          <li>RTM setup support</li>',
    '          <li>No commitment</li>',
    '        </ul>',
    '        <form id="interestForm" novalidate>',
    '          <input type="text" name="botcheck" class="ip-honey" tabindex="-1" autocomplete="off" aria-hidden="true" />',
    '          <div class="row g-3">',
    '            <div class="col-12">',
    '              <label for="ip_clinic" class="form-label fw-semibold">Practice name <span class="text-danger">*</span></label>',
    '              <input type="text" class="form-control" id="ip_clinic" name="clinic_name" required />',
    '            </div>',
    '            <div class="col-md-6">',
    '              <label for="ip_contact" class="form-label fw-semibold">Your name <span class="text-danger">*</span></label>',
    '              <input type="text" class="form-control" id="ip_contact" name="contact_name" required />',
    '            </div>',
    '            <div class="col-md-6">',
    '              <label for="ip_email" class="form-label fw-semibold">Email <span class="text-danger">*</span></label>',
    '              <input type="email" class="form-control" id="ip_email" name="email" required />',
    '            </div>',
    '            <div class="col-12">',
    '              <label for="ip_phone" class="form-label fw-semibold">Phone <span class="text-muted fw-normal">(optional)</span></label>',
    '              <input type="tel" class="form-control" id="ip_phone" name="phone" />',
    '            </div>',
    '            <div class="col-12">',
    '              <label for="ip_comments" class="form-label fw-semibold">Additional comments <span class="text-muted fw-normal">(optional)</span></label>',
    '              <textarea class="form-control" id="ip_comments" name="comments" rows="3" placeholder="Anything else you\'d like us to know?"></textarea>',
    '            </div>',
    '            <div class="col-12">',
    '              <div class="form-check">',
    '                <input class="form-check-input" type="checkbox" id="ip_tcpa" name="tcpa_consent" required />',
    '                <label class="form-check-label small text-muted" for="ip_tcpa">By checking this box, I agree to receive calls and text messages from MedPull at the phone number provided, including via automated technology. Consent is not a condition of purchase. Message and data rates may apply. <span class="text-danger">*</span></label>',
    '              </div>',
    '            </div>',
    '            <div class="col-12">',
    '              <div id="interestFeedback" class="small"></div>',
    '            </div>',
    '            <div class="col-12">',
    '              <button type="submit" class="btn btn-gradient btn-lg w-100">Request early access</button>',
    '            </div>',
    '          </div>',
    '        </form>',
    '        <p class="ip-fineprint">No spam, ever. We\'ll only use this to reach out about MedPull.</p>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');
  document.body.appendChild(wrap.firstElementChild);

  var modalEl = document.getElementById('interestModal');
  var form = document.getElementById('interestForm');
  var feedback = document.getElementById('interestFeedback');

  function getModal() {
    if (!window.bootstrap || !bootstrap.Modal) return null;
    return bootstrap.Modal.getOrCreateInstance(modalEl);
  }

  function openModal() {
    var m = getModal();
    if (m) { markSeen(); m.show(); }
  }
  // Expose a global so any button/link can open it.
  window.openInterestModal = openModal;

  // Any element with data-interest-open opens the popup.
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-interest-open]');
    if (trigger) { e.preventDefault(); openModal(); }
  });

  // --- Gentle auto-trigger (once per visitor) ---------------------------------------
  // Disable on pages that opt out (e.g. the waitlist page) via <body data-interest-auto="off">.
  var autoEnabled = (document.body.getAttribute('data-interest-auto') !== 'off') && !alreadySeen();

  if (autoEnabled) {
    var fired = false;
    function autoFire() {
      if (fired || alreadySeen()) return;
      fired = true;
      openModal();
    }
    // Timed prompt.
    var timer = setTimeout(autoFire, SHOW_DELAY_MS);
    // Exit-intent: pointer leaves the top of the viewport (desktop only).
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) { clearTimeout(timer); autoFire(); }
    });
  }

  // --- Submission -------------------------------------------------------------------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    feedback.textContent = '';
    feedback.className = 'small';

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    var data = {
      clinic_name: form.clinic_name.value.trim(),
      contact_name: form.contact_name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      comments: form.comments.value.trim(),
      tcpa_consent: form.tcpa_consent.checked,
      botcheck: form.botcheck.value
    };

    var btn = form.querySelector('button[type="submit"]');
    var originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Sending…';

    function showSuccess() {
      feedback.textContent = '';
      form.classList.remove('was-validated');
      form.reset();
      btn.disabled = false;
      btn.innerHTML = originalLabel;
      var body = modalEl.querySelector('.ip-body');
      body.innerHTML = [
        '<div class="text-center py-3">',
        '  <div style="font-size:44px;line-height:1">🎉</div>',
        '  <h3 class="fw-bold mt-2 mb-2">You\'re on the list!</h3>',
        '  <p class="text-muted mb-3">Thanks for your interest. We\'ll reach out shortly to set up your walkthrough.</p>',
        '  <button type="button" class="btn btn-gradient" data-bs-dismiss="modal">Done</button>',
        '</div>'
      ].join('');
    }

    function showError() {
      btn.disabled = false;
      btn.innerHTML = originalLabel;
      feedback.textContent = 'Something went wrong. Please try again, or email us directly.';
      feedback.className = 'small text-danger';
    }

    if (!hasKey) {
      // DEMO MODE: no access key configured yet.
      console.log('[MedPull interest popup] DEMO MODE — submission captured locally:', data);
      setTimeout(showSuccess, 600);
      return;
    }

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: 'New MedPull early-access interest',
        from_name: 'MedPull website',
        clinic_name: data.clinic_name,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone || '(not provided)',
        comments: data.comments || '(none)',
        tcpa_consent: data.tcpa_consent ? 'Yes, consented to calls/texts' : 'No',
        botcheck: data.botcheck
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (json) { json && json.success ? showSuccess() : showError(); })
      .catch(showError);
  });
})();
