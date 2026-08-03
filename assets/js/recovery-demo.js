// MedPull Recovery Copilot — interactive demo (no deps)
// Drives the patient check-in on the left and the provider views on the right.
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const log = $('#demoChatLog');
  if (!log) return;

  /* ---------------------------------------------------------------------
     Scenarios. Each step asks a question and offers replies; a reply carries
     the signals that question was designed to surface (risk, pain, adherence)
     plus the note that ends up in the summary. Questions may be a function of
     the answers so far — that is what makes the check-in adaptive.
     --------------------------------------------------------------------- */
  const SCENARIOS = {
    tka: {
      name: 'Maria Alvarez', initials: 'MA', procedure: 'Total knee arthroplasty', pod: 14,
      rtm: { days: 9, mins: 12 },
      steps: [
        {
          q: 'Hi Maria — quick check-in. How would you rate your knee pain right now, 0 to 10?',
          replies: [
            { label: 'About a 7', pain: 7, risk: 3, note: 'Pain 7/10, up from 4 last week' },
            { label: 'About a 4', pain: 4, risk: 0, note: 'Pain stable at 4/10' },
            { label: 'About a 2', pain: 2, risk: -1, note: 'Pain improving to 2/10' },
          ],
        },
        {
          q: (a) => a.pain >= 6
            ? 'That’s up from a 4 last week, so let’s dig in. Is it worse when you’re resting, or when you’re moving?'
            : 'Good — that tracks with where we’d expect you at day 14. Is it worse when you’re resting, or when you’re moving?',
          replies: [
            { label: 'Mostly at night', risk: 2, note: 'Night waking reported' },
            { label: 'When I’m moving', risk: 1, note: 'Pain on movement' },
            { label: 'Neither really', risk: 0 },
          ],
        },
        {
          q: 'Any swelling, warmth, or redness around the knee?',
          replies: [
            { label: 'Some swelling', risk: 2, note: 'New swelling at day 14, first mention since discharge' },
            { label: 'No changes', risk: 0 },
          ],
        },
        {
          q: 'Last one — how many of your home exercise sessions did you finish this week?',
          replies: [
            { label: 'All of them', adherence: 100, risk: -1 },
            { label: 'Most of them', adherence: 86, risk: 0 },
            { label: 'Only one or two', adherence: 35, risk: 2, note: 'Home exercise adherence dropped to 35%' },
          ],
        },
      ],
    },

    acl: {
      name: 'James Whitfield', initials: 'JW', procedure: 'ACL reconstruction', pod: 21,
      rtm: { days: 14, mins: 16 },
      steps: [
        {
          q: 'Hi James — checking in on week three. How’s the knee feeling overall?',
          replies: [
            { label: 'Pretty good', pain: 3, risk: 0 },
            { label: 'Stiff and sore', pain: 5, risk: 1, note: 'Stiffness and soreness at week 3' },
            { label: 'Worse than last week', pain: 7, risk: 3, note: 'Pain 7/10 and worsening' },
          ],
        },
        {
          q: 'How many physical therapy sessions did you make it to this week?',
          replies: [
            { label: 'Both of them', adherence: 100, risk: -1 },
            { label: 'Just one', adherence: 50, risk: 2, note: 'Attended half of scheduled PT sessions' },
            { label: 'None this week', adherence: 0, risk: 3, note: 'Missed all PT sessions this week' },
          ],
        },
        {
          q: (a) => a.adherence !== undefined && a.adherence < 100
            ? 'That’s usually what sets recovery back the most. What’s getting in the way?'
            : 'Good. Can you straighten the knee fully when you’re lying down?',
          replies: (a) => a.adherence !== undefined && a.adherence < 100
            ? [
                { label: 'Work schedule', risk: 1, note: 'PT barrier: work schedule' },
                { label: 'It hurts too much', risk: 2, note: 'PT barrier: pain limiting participation' },
                { label: 'Too far to travel', risk: 1, note: 'PT barrier: transportation' },
              ]
            : [
                { label: 'Yes, fully', risk: -1 },
                { label: 'Almost', risk: 1, note: 'Mild extension deficit' },
                { label: 'No', risk: 2, note: 'Extension deficit at week 3' },
              ],
        },
        {
          q: 'Are you walking without crutches yet?',
          replies: [
            { label: 'No crutches', risk: -1 },
            { label: 'One crutch', risk: 0 },
            { label: 'Still using both', risk: 2, note: 'Still using both crutches at week 3' },
          ],
        },
      ],
    },

    rcr: {
      name: 'Rachel Okafor', initials: 'RO', procedure: 'Rotator cuff repair', pod: 9,
      rtm: { days: 5, mins: 6 },
      steps: [
        {
          q: 'Hi Rachel — day nine. How well did you sleep last night?',
          replies: [
            { label: 'Badly, pain woke me', pain: 7, risk: 3, note: 'Sleep disrupted by shoulder pain' },
            { label: 'So-so', pain: 5, risk: 1, note: 'Interrupted sleep' },
            { label: 'Pretty well', pain: 3, risk: -1 },
          ],
        },
        {
          q: 'Are you keeping the sling on except during your exercises?',
          replies: [
            { label: 'Yes, always', risk: -1 },
            { label: 'Mostly', risk: 1 },
            { label: 'Taking it off a lot', risk: 3, note: 'Sling non-adherence — re-injury risk' },
          ],
        },
        {
          q: (a) => a.pain >= 6
            ? 'Understood. Any numbness or tingling running down the arm or into the hand?'
            : 'Good. Any numbness or tingling running down the arm or into the hand?',
          replies: [
            { label: 'Yes, some', risk: 3, note: 'New numbness and tingling in the arm' },
            { label: 'No', risk: 0 },
          ],
        },
        {
          q: 'How are the passive range of motion exercises going?',
          replies: [
            { label: 'Doing them daily', adherence: 100, risk: -1 },
            { label: 'Every other day', adherence: 60, risk: 1 },
            { label: 'Haven’t started', adherence: 0, risk: 2, note: 'Passive ROM exercises not yet started' },
          ],
        },
      ],
    },
  };

  let key = 'tka';
  let scenario = SCENARIOS[key];
  let step = 0;
  let answers = {};
  let notes = [];
  let risk = 0;
  let busy = false;

  /* --- chat rendering ---------------------------------------------------- */

  function bubble(who, html) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-message ' + who;
    wrap.innerHTML =
      '<div class="chat-message-avatar">' + (who === 'ai' ? 'M' : scenario.initials) + '</div>' +
      '<div class="chat-message-bubble">' + html + '</div>';
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return wrap;
  }

  function askNext() {
    if (step >= scenario.steps.length) return finish();

    const s = scenario.steps[step];
    const text = typeof s.q === 'function' ? s.q(answers) : s.q;

    busy = true;
    renderReplies([]);
    const typing = bubble('ai', '<span class="typing"><i></i><i></i><i></i></span>');

    setTimeout(() => {
      typing.querySelector('.chat-message-bubble').textContent = text;
      const replies = typeof s.replies === 'function' ? s.replies(answers) : s.replies;
      renderReplies(replies);
      busy = false;
      progress();
    }, 620);
  }

  function renderReplies(replies) {
    const host = $('#demoReplies');
    host.innerHTML = '';
    replies.forEach((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quick-reply';
      b.style.cursor = 'pointer';
      b.textContent = r.label;
      b.addEventListener('click', () => choose(r, b));
      host.appendChild(b);
    });
  }

  function choose(reply, btn) {
    if (busy) return;
    btn.classList.add('is-picked');
    renderReplies([]);
    bubble('user', reply.label);

    if (reply.pain !== undefined) answers.pain = reply.pain;
    if (reply.adherence !== undefined) answers.adherence = reply.adherence;
    risk += reply.risk || 0;
    if (reply.note) notes.push(reply.note);

    step++;
    setTimeout(askNext, 380);
  }

  function progress() {
    $('#chatProgress').textContent =
      step >= scenario.steps.length ? 'Check-in complete' : 'Question ' + (step + 1) + ' of ' + scenario.steps.length;
  }

  /* --- provider side ----------------------------------------------------- */

  function statusOf(r) {
    if (r >= 5) return { label: 'Needs attention', cls: 'pill-attention', chip: '1 needs attention' };
    if (r >= 2) return { label: 'Watch', cls: 'pill-watch', chip: '1 to watch' };
    return { label: 'On track', cls: 'pill-ontrack', chip: 'All on track' };
  }

  function summaryFor(st) {
    const n = scenario.name.split(' ')[0];
    const reasons = notes.length ? notes.join('. ') + '.' : 'No concerning findings reported across any domain.';

    if (st.label === 'Needs attention') {
      return '<b>' + n + ' reported a pattern that warrants a call.</b> ' + reasons +
        ' Taken together these signals fall outside the expected recovery path for ' +
        scenario.procedure.toLowerCase() + ' at day ' + scenario.pod +
        '. Recommend clinical outreach within 24 hours to assess in person.';
    }
    if (st.label === 'Watch') {
      return '<b>' + n + ' is progressing, with a couple of things to keep an eye on.</b> ' + reasons +
        ' Nothing here requires immediate outreach, but the next check-in should confirm the trend is not worsening.';
    }
    return '<b>' + n + ' is recovering as expected.</b> ' + reasons +
      ' Trajectory is consistent with the expected path for ' + scenario.procedure.toLowerCase() +
      ' at day ' + scenario.pod + '. No action needed — continue routine check-ins.';
  }

  function finish() {
    const st = statusOf(risk);
    progress();

    // Worklist row
    $('#wlReason').textContent = notes[0] || 'Meeting all milestones';
    $('#wlLast').textContent = 'Just now';
    const pill = $('#wlStatus');
    pill.className = 'pill ' + st.cls;
    pill.textContent = st.label;
    $('#worklistChip').textContent = st.chip;
    $('#worklistRow').classList.toggle('is-flagged', st.label !== 'On track');

    // Summary
    $('#summaryChip').textContent = 'Ready for chart';
    $('#summaryText').classList.remove('text-muted');
    $('#summaryText').innerHTML = summaryFor(st);

    const flags = $('#summaryFlags');
    flags.innerHTML = '';
    if (notes.length) {
      notes.forEach((note, i) => {
        const row = document.createElement('div');
        row.className = 'rs-flag';
        const cls = st.label === 'Needs attention' && i === 0 ? 'pill-attention' : 'pill-watch';
        row.innerHTML = '<span class="pill ' + cls + '">' +
          (cls === 'pill-attention' ? 'Flag' : 'Watch') + '</span><span>' + note + '</span>';
        flags.appendChild(row);
      });
    }
    const exportRow = document.createElement('div');
    exportRow.className = 'rs-flag';
    exportRow.innerHTML = '<span class="pill pill-neutral">Note</span><span>Summary is exportable to the chart as a progress note.</span>';
    flags.appendChild(exportRow);

    // RTM — this check-in adds a data day, and clinician review adds interactive minutes.
    const flagged = st.label !== 'On track';
    const days = Math.min(16, scenario.rtm.days + 1);
    const mins = Math.min(20, scenario.rtm.mins + (flagged ? 8 : 4));
    setMeter('#rtmDaysBar', '#rtmDaysText', '#rtmDaysPill', days, 16, days + ' / 16 days');
    setMeter('#rtmMinsBar', '#rtmMinsText', '#rtmMinsPill', mins, 20, mins + ' / 20 min');
    const ready = (days >= 16 ? 1 : 0) + (mins >= 20 ? 1 : 0);
    $('#rtmChip').textContent = ready === 2 ? '2 of 2 ready' : ready + ' of 2 ready';
  }

  function setMeter(barSel, textSel, pillSel, value, target, text) {
    const bar = $(barSel);
    const pct = Math.round((value / target) * 100);
    bar.style.width = pct + '%';
    bar.parentElement.classList.toggle('is-short', value < target);
    $(textSel).textContent = text;
    const pill = $(pillSel);
    pill.className = 'pill ' + (value >= target ? 'pill-ontrack' : 'pill-watch');
    pill.textContent = value >= target ? 'Ready' : 'In progress';
  }

  /* --- lifecycle --------------------------------------------------------- */

  function reset(newKey) {
    key = newKey || key;
    scenario = SCENARIOS[key];
    step = 0;
    answers = {};
    notes = [];
    risk = 0;
    busy = false;

    log.innerHTML = '';
    $('#demoReplies').innerHTML = '';
    $('#chatMeta').textContent = 'Day ' + scenario.pod + ' · ' + scenario.procedure;
    $('#chatTitle').textContent = 'Recovery check-in';

    $('#wlName').textContent = scenario.name;
    $('#wlProc').textContent = scenario.procedure;
    $('#wlPod').textContent = scenario.pod;
    $('#wlReason').textContent = 'No check-in yet today';
    $('#wlLast').textContent = '—';
    const pill = $('#wlStatus');
    pill.className = 'pill pill-neutral';
    pill.textContent = 'Pending';
    $('#worklistChip').textContent = 'Awaiting check-in';
    $('#worklistRow').classList.remove('is-flagged');

    $('#summaryChip').textContent = 'Generating…';
    $('#summaryText').className = 'text-muted';
    $('#summaryText').textContent = 'The summary writes itself once the check-in is complete. Answer the questions on the left to see it build.';
    $('#summaryFlags').innerHTML = '';

    setMeter('#rtmDaysBar', '#rtmDaysText', '#rtmDaysPill', scenario.rtm.days, 16, scenario.rtm.days + ' / 16 days');
    setMeter('#rtmMinsBar', '#rtmMinsText', '#rtmMinsPill', scenario.rtm.mins, 20, scenario.rtm.mins + ' / 20 min');
    $('#rtmChip').textContent = 'In progress';

    askNext();
  }

  $$('#scenarioPicker [data-scenario]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#scenarioPicker [data-scenario]').forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.style.boxShadow = on ? '0 0 0 2px var(--brand-grad-1)' : '';
      });
      reset(btn.getAttribute('data-scenario'));
    });
  });

  $('#demoReset').addEventListener('click', () => reset());

  // Mark the default scenario as selected and start.
  const first = $('#scenarioPicker [data-scenario="tka"]');
  if (first) first.style.boxShadow = '0 0 0 2px var(--brand-grad-1)';
  reset('tka');
})();
