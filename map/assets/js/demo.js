/* Demo page JS - browser-only simulation */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Footer year
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // File upload
  const fileInput = $('#fileInput');
  const fileInfo = $('#fileInfo');
  const resetFile = $('#resetFile');
  let uploadedFile = null;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    uploadedFile = f || null;
    if (!f) { fileInfo.textContent = 'No file selected.'; return; }
    fileInfo.textContent = `${f.name} • ${(f.size/1024).toFixed(1)} KB • ${f.type || 'unknown type'}`;
  });
  resetFile.addEventListener('click', () => {
    fileInput.value = '';
    uploadedFile = null;
    fileInfo.textContent = 'No file selected.';
  });

  // Translation (simulated)
  const langSelect = $('#langSelect');
  const translateBtn = $('#translateBtn');
  const translateOut = $('#translateOut');
  const langLabel = { es: 'Spanish', zh: 'Chinese (Simplified)', vi: 'Vietnamese', ar: 'Arabic', hi: 'Hindi' };
  translateBtn.addEventListener('click', async () => {
    if (!uploadedFile) { translateOut.textContent = 'Please upload a form first.'; return; }
    const lang = langSelect.value;
    translateOut.textContent = 'Translating…';
    await new Promise(r => setTimeout(r, 700));
    translateOut.textContent = `Translated to ${langLabel[lang]}. (Demo output)`;
  });

  // Chat (simulated AI)
  const chatLog = $('#chatLog');
  const chatForm = $('#chatForm');
  const chatInput = $('#chatInput');
  const messages = [];
  function addMsg(role, text) {
    messages.push({ role, text });
    const div = document.createElement('div');
    div.className = role === 'user' ? 'mb-1' : 'mb-1 text-muted';
    div.textContent = (role === 'user' ? 'You: ' : 'AI: ') + text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function fakeAIResponse(q) {
    const s = q.toLowerCase();
    if (s.includes('name')) return 'Enter your full legal name as it appears on your ID.';
    if (s.includes('address')) return 'Provide your current street address, city, state, and ZIP.';
    if (s.includes('birth') || s.includes('dob')) return 'Use format YYYY-MM-DD for date of birth.';
    if (s.includes('ssn')) return 'SSN may be optional. If unsure, you can leave it blank or provide last 4 digits.';
    return 'I can help you fill the form. Ask me about any section (name, address, DOB, etc.).';
  }
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = chatInput.value.trim();
    if (!q) return;
    addMsg('user', q);
    chatInput.value = '';
    setTimeout(() => addMsg('ai', fakeAIResponse(q)), 300);
  });

  // Autofill from chat (simple extraction)
  const fName = $('#f_name');
  const fDob = $('#f_dob');
  const fAddress = $('#f_address');
  const fPhone = $('#f_phone');
  const fSSN = $('#f_ssn');
  $('#autofillBtn').addEventListener('click', () => {
    const text = messages.filter(m => m.role === 'user').map(m => m.text).join('\n');
    // very naive patterns
    const nameMatch = text.match(/my name is\s+([a-zA-Z ,.'-]+)/i) || text.match(/name:\s*([^\n]+)/i);
    const dobMatch = text.match(/dob[:\s-]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i) || text.match(/born[:\s-]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const addrMatch = text.match(/address[:\s-]*([^\n]+)/i);
    const phoneMatch = text.match(/phone[:\s-]*([0-9()\-\s\.\+]{7,})/i);
    const ssnMatch = text.match(/ssn[:\s-]*([0-9\-]{4,11})/i);
    if (nameMatch) fName.value = nameMatch[1].trim();
    if (dobMatch) fDob.value = dobMatch[1].trim();
    if (addrMatch) fAddress.value = addrMatch[1].trim();
    if (phoneMatch) fPhone.value = phoneMatch[1].trim();
    if (ssnMatch) fSSN.value = ssnMatch[1].trim();
  });
  $('#clearBtn').addEventListener('click', () => {
    [fName, fDob, fAddress, fPhone, fSSN].forEach(i => i.value = '');
  });

  // Download JSON
  $('#downloadJsonBtn').addEventListener('click', () => {
    const data = {
      name: fName.value, dob: fDob.value, address: fAddress.value, phone: fPhone.value, ssn: fSSN.value,
      _meta: { demo: true, generatedAt: new Date().toISOString() }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'medpull_filled_form.json'; a.click();
    URL.revokeObjectURL(url);
  });

  // Download filled PDF (simple text render)
  $('#downloadPdfBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) { alert('PDF library not loaded'); return; }
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('MedPull — Filled Form (Demo)', 14, 18);
    doc.setFontSize(11);
    const lines = [
      `Full name: ${fName.value || ''}`,
      `Date of birth: ${fDob.value || ''}`,
      `Address: ${fAddress.value || ''}`,
      `Phone: ${fPhone.value || ''}`,
      `SSN (optional): ${fSSN.value || ''}`
    ];
    let y = 30;
    lines.forEach(l => { doc.text(l, 14, y); y += 8; });
    doc.save('medpull_filled_form_demo.pdf');
  });
})();
