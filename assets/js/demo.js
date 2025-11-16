/* MedPull Demo - Fully Functional with Real Parsing, Translation & AI */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Footer year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // State
  let uploadedFile = null;
  let extractedText = '';
  let translatedText = '';
  let formFields = [];
  let translated = false;
  let currentLanguage = 'en'; // Default to English, will be set from select
  let fieldTranslations = {}; // Store translated field labels
  const messages = [];

  // Initialize PDF.js worker
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // File upload with drag & drop
  const fileInput = $('#fileInput');
  const fileUploadArea = $('#fileUploadArea');
  const fileInfo = $('#fileInfo');
  const resetFile = $('#resetFile');

  // Drag and drop handlers
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, () => {
      fileUploadArea.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, () => {
      fileUploadArea.classList.remove('dragover');
    }, false);
  });

  fileUploadArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelect();
    }
  }, false);

  async function extractTextFromPDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async function extractTextFromImage(file) {
    try {
      showNotification('Processing image with OCR...', 'info');
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            // Could show progress here
          }
        }
      });
      return text.trim();
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  async function handleFileSelect() {
    const f = fileInput.files?.[0];
    uploadedFile = f || null;
    
    if (!f) {
      fileInfo.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span class="small text-muted">No file selected</span>
        </div>
      `;
      fileInfo.classList.remove('has-file');
      resetFile.style.display = 'none';
      extractedText = '';
      translated = false;
      updateTranslationOutput();
      return;
    }

    const size = f.size < 1024 ? `${f.size} B` : f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / (1024 * 1024)).toFixed(2)} MB`;
    const type = f.type || 'unknown type';
    const icon = f.type.includes('pdf') ? '📄' : '🖼️';

    fileInfo.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <span style="font-size: 18px;">${icon}</span>
        <div class="flex-grow-1">
          <div class="small fw-semibold" style="color: #1f2a44;">${f.name}</div>
          <div class="small text-muted">${size} • ${type}</div>
        </div>
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
    fileInfo.classList.add('has-file');
    resetFile.style.display = 'block';

    // Extract text
    try {
      showNotification('Extracting text from file...', 'info');
      if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(f);
      } else if (f.type.startsWith('image/')) {
        extractedText = await extractTextFromImage(f);
      } else {
        throw new Error('Unsupported file type');
      }

      // Don't extract fields yet - wait for translation
      // We'll extract fields from the translated text
      formFields = [];
      
      // Show placeholder in Fill & Export
      generateDynamicFields([]);
      
      fileInfo.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <span style="font-size: 18px;">${icon}</span>
          <div class="flex-grow-1">
            <div class="small fw-semibold" style="color: #1f2a44;">${f.name}</div>
            <div class="small text-success">✓ Text extracted (${extractedText.length} chars)</div>
          </div>
        </div>
      `;

      translated = false;
      updateTranslationOutput();
      
      // Update AI with form content in current language
      const lang = currentLanguage || 'en';
      const uploadMsg = lang === 'es' 
        ? `He recibido tu formulario. Por favor, tradúcelo primero para que pueda extraer los campos y ayudarte mejor.`
        : lang === 'zh'
        ? `我已收到您的表单。请先翻译，以便我可以提取字段并更好地帮助您。`
        : lang === 'fr'
        ? `J'ai reçu votre formulaire. Veuillez d'abord le traduire pour que je puisse extraire les champs et mieux vous aider.`
        : lang === 'ar'
        ? `لقد تلقيت النموذج الخاص بك. يرجى ترجمته أولاً حتى أتمكن من استخراج الحقول ومساعدتك بشكل أفضل.`
        : lang === 'hi'
        ? `मैंने आपका फॉर्म प्राप्त कर लिया है। कृपया पहले इसे अनुवाद करें ताकि मैं फ़ील्ड निकाल सकूं और आपकी बेहतर मदद कर सकूं।`
        : `I've received your form. Please translate it first so I can extract the fields and help you better.`;
      
      if (messages.length === 0) {
        setTimeout(() => {
          addChatMessage('ai', uploadMsg);
        }, 500);
      } else {
        addChatMessage('ai', uploadMsg);
      }
      
      showNotification('Text extracted successfully!', 'success');
    } catch (error) {
      fileInfo.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <span style="font-size: 18px;">${icon}</span>
          <div class="flex-grow-1">
            <div class="small fw-semibold" style="color: #1f2a44;">${f.name}</div>
            <div class="small text-danger">✗ ${error.message}</div>
          </div>
        </div>
      `;
      showNotification(error.message, 'error');
      extractedText = '';
    }
  }

  function detectFormFields(text) {
    const fields = [];
    if (!text || text.trim().length === 0) {
      console.log('No text provided for field detection');
      return [];
    }
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const seenLabels = new Set();
    
    console.log('Detecting fields from text (length:', text.length, 'lines:', lines.length, ')');
    console.log('First 500 chars:', text.substring(0, 500)); // Debug
    
    // Pattern mapping for known field types (for type detection)
    const typePatterns = [
      { pattern: /(?:date\s*of\s*birth|dob|birth\s*date|fecha\s*de\s*nacimiento|date\s*de\s*naissance)/i, type: 'date', id: 'dob' },
      { pattern: /(?:phone|telephone|teléfono|téléphone|mobile|cell)(?:\s*number)?/i, type: 'tel', id: 'phone' },
      { pattern: /email|e-mail|correo|courriel/i, type: 'email', id: 'email' },
      { pattern: /(?:ssn|social\s*security)/i, type: 'text', id: 'ssn' }
    ];
    
    // Extract actual form fields from text - MORE AGGRESSIVE APPROACH
    lines.forEach((line, index) => {
      // Skip very short or very long lines
      if (line.length < 2 || line.length > 200) return;
      
      // Skip lines that are clearly not form fields
      if (/^(page|página|trang)\s*\d+/i.test(line)) return;
      if (/^\d+\s*of\s*\d+/i.test(line)) return;
      if (/^form\s*[a-z0-9-]+$/i.test(line) && line.length < 25) return;
      if (/^©|copyright|all rights reserved/i.test(line)) return;
      
      let isFieldLabel = false;
      let fieldLabel = line;
      let fieldType = 'text';
      let fieldId = null;
      
      // Remove trailing colons, question marks, dashes, and whitespace
      fieldLabel = fieldLabel.replace(/[:?\-]\s*$/, '').trim();
      
      // PRIMARY: Lines ending with colon or question mark (most common form field pattern)
      if (/[:?]\s*$/.test(line)) {
        isFieldLabel = true;
      }
      
      // PRIMARY ALT: Lines with colon in the middle (like "Name: John" or "Address:")
      if (!isFieldLabel && line.includes(':')) {
        const parts = line.split(':');
        if (parts.length >= 2 && parts[0].trim().length > 1 && parts[0].trim().length < 60) {
          isFieldLabel = true;
          // Use the part before colon as the label
          fieldLabel = parts[0].trim();
        }
      }
      
      // SECONDARY: Lines that look like labels (capitalized, short, followed by blank/other content)
      if (!isFieldLabel) {
        const nextLine = index < lines.length - 1 ? lines[index + 1] : '';
        // If line is short and next line is different or empty, might be a label
        if (line.length < 60 && line.length > 2) {
          if (!nextLine || nextLine.length < 3 || 
              (line.length < 40 && /^[A-Z]/.test(line))) {
            isFieldLabel = true;
          }
        }
      }
      
      // TERTIARY: Lines with common form keywords
      if (!isFieldLabel) {
        const lowerLine = line.toLowerCase();
        const formKeywords = [
          'name', 'nombre', 'address', 'dirección', 'phone', 'teléfono', 'email', 'correo',
          'date', 'fecha', 'birth', 'nacimiento', 'age', 'edad', 'gender', 'género',
          'insurance', 'seguro', 'medical', 'médico', 'history', 'historial', 'allergy', 'alergia',
          'medication', 'medicamento', 'symptom', 'síntoma', 'reason', 'razón', 'visit', 'visita',
          'city', 'ciudad', 'state', 'estado', 'zip', 'postal', 'code', 'código'
        ];
        
        for (const keyword of formKeywords) {
          if (lowerLine.includes(keyword) && line.length < 100) {
            isFieldLabel = true;
            break;
          }
        }
      }
      
      // QUATERNARY: Lines that start with question words or prompts
      if (!isFieldLabel) {
        if (/^(what|where|when|who|how|please|enter|provide|list|describe|indicate|specify)/i.test(fieldLabel)) {
          isFieldLabel = true;
        }
      }
      
      // Check for field type patterns
      const lowerLine = line.toLowerCase();
      for (const typePattern of typePatterns) {
        if (typePattern.pattern.test(lowerLine)) {
          fieldType = typePattern.type;
          fieldId = typePattern.id;
          break;
        }
      }
      
      if (isFieldLabel && fieldLabel.length > 0) {
        // Generate a unique ID from the label
        const normalizedId = fieldLabel.toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 40);
        
        // Avoid duplicates - simpler check
        const labelKey = fieldLabel.toLowerCase().trim();
        if (seenLabels.has(labelKey)) return;
        seenLabels.add(labelKey);
        
        // Determine field ID if not set
        if (!fieldId) {
          const lowerLabel = fieldLabel.toLowerCase();
          if (/(?:full\s*)?name|nombre|nom/i.test(lowerLabel)) fieldId = 'name';
          else if (/(?:first\s*)?name|primer\s*nombre/i.test(lowerLabel)) fieldId = 'firstname';
          else if (/(?:last\s*)?name|surname|apellido/i.test(lowerLabel)) fieldId = 'lastname';
          else if (/address|dirección|direccion/i.test(lowerLabel)) fieldId = 'address';
          else if (/city|ciudad/i.test(lowerLabel)) fieldId = 'city';
          else if (/state|estado/i.test(lowerLabel)) fieldId = 'state';
          else if (/zip|postal/i.test(lowerLabel)) fieldId = 'zip';
          else fieldId = normalizedId || `field_${fields.length}`;
        }
        
        fields.push({
          id: `field_${fields.length}`,
          originalId: fieldId,
          label: line, // Keep original line
          displayLabel: fieldLabel, // Clean label
          type: fieldType,
          lineNumber: index + 1,
          context: lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 3)).join(' ')
        });
      }
    });
    
    // If we found fields, return them
    if (fields.length > 0) {
      // Sort by line number to maintain form order
      fields.sort((a, b) => a.lineNumber - b.lineNumber);
      console.log(`Detected ${fields.length} fields:`, fields.map(f => f.displayLabel)); // Debug
      return fields;
    }
    
    // FALLBACK: Extract ANY lines with colons (very permissive)
    console.log('No fields found with primary method, trying fallback...'); // Debug
    const fallbackFields = [];
    const seenFallback = new Set();
    
    lines.forEach((line, index) => {
      // More permissive: any line with colon
      if (line.includes(':')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const label = parts[0].trim();
          // Very permissive - accept almost any label before colon
          if (label.length > 0 && label.length < 80 && !seenFallback.has(label.toLowerCase())) {
            seenFallback.add(label.toLowerCase());
            const normalizedId = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 40);
            fallbackFields.push({
              id: `field_${fallbackFields.length}`,
              originalId: normalizedId,
              label: line,
              displayLabel: label,
              type: 'text',
              lineNumber: index + 1,
              context: line
            });
          }
        }
      }
      
      // Also try lines that are just short labels (no colon but look like fields)
      if (line.length > 2 && line.length < 50 && !line.includes(' ') && /^[A-Z]/.test(line)) {
        if (!seenFallback.has(line.toLowerCase())) {
          seenFallback.add(line.toLowerCase());
          const normalizedId = line.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 40);
          fallbackFields.push({
            id: `field_${fallbackFields.length}`,
            originalId: normalizedId,
            label: line,
            displayLabel: line,
            type: 'text',
            lineNumber: index + 1,
            context: line
          });
        }
      }
    });
    
    if (fallbackFields.length > 0) {
      console.log(`Fallback found ${fallbackFields.length} fields:`, fallbackFields.map(f => f.displayLabel)); // Debug
      return fallbackFields;
    }
    
    // LAST RESORT: Extract any unique short lines that might be field labels
    console.log('Trying last resort extraction...'); // Debug
    const lastResortFields = [];
    const seenLastResort = new Set();
    
    lines.forEach((line, index) => {
      // Accept any line that's reasonably short and looks like it could be a label
      if (line.length >= 3 && line.length <= 60 && !seenLastResort.has(line.toLowerCase())) {
        // Skip if it looks like a value (all lowercase with no capitals, or all numbers)
        if (!/^[a-z0-9\s@().,\-]+$/.test(line) || /^[A-Z]/.test(line) || line.includes(':')) {
          seenLastResort.add(line.toLowerCase());
          const normalizedId = line.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 40);
          lastResortFields.push({
            id: `field_${lastResortFields.length}`,
            originalId: normalizedId,
            label: line,
            displayLabel: line,
            type: 'text',
            lineNumber: index + 1,
            context: line
          });
        }
      }
    });
    
    if (lastResortFields.length > 0 && lastResortFields.length <= 30) {
      console.log(`Last resort found ${lastResortFields.length} fields:`, lastResortFields.map(f => f.displayLabel)); // Debug
      return lastResortFields;
    }
    
    console.log('No fields detected at all. Text sample:', text.substring(0, 200)); // Debug
    return [];
  }

  function generateDynamicFields(fields, useTranslated = false) {
    const container = $('#dynamicFields');
    if (!container) return;

    if (fields.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted small py-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-2 opacity-50">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <div>No fields detected. Upload a form to extract fields.</div>
        </div>
      `;
      return;
    }

    // Store current field values before regenerating
    const currentValues = {};
    container.querySelectorAll('.dynamic-field').forEach(input => {
      const fieldId = input.dataset.fieldId;
      if (fieldId && input.value) {
        currentValues[fieldId] = input.value;
      }
    });

    container.innerHTML = fields.map((field, index) => {
      const fieldId = field.id || `field_${index}`;
      const inputType = field.type === 'date' ? 'date' : 
                       field.type === 'email' ? 'email' : 
                       field.type === 'tel' ? 'tel' : 'text';
      
      // Use translated label if available, otherwise use original
      const displayLabel = useTranslated && fieldTranslations[field.originalId] 
        ? fieldTranslations[field.originalId] 
        : field.displayLabel;
      
      const placeholder = field.type === 'date' ? 'YYYY-MM-DD' : 
                         field.type === 'tel' ? '(555) 123-4567' : 
                         field.type === 'email' ? 'example@email.com' : 
                         `Enter ${displayLabel.toLowerCase()}`;
      
      // Restore value if it existed
      const savedValue = currentValues[field.originalId] || '';
      
      return `
        <div class="mb-3">
          <label for="${fieldId}" class="form-label small fw-semibold">${displayLabel}</label>
          <input 
            id="${fieldId}" 
            data-field-id="${field.originalId || fieldId}"
            data-field-type="${field.type}"
            type="${inputType}" 
            class="form-control form-control-sm dynamic-field" 
            placeholder="${placeholder}" 
            value="${savedValue}"
          />
        </div>
      `;
    }).join('');

    // Add formatting for specific field types
    container.querySelectorAll('.dynamic-field').forEach(input => {
      const fieldType = input.dataset.fieldType;
      const originalId = input.dataset.fieldId;

      if (originalId === 'ssn') {
        input.addEventListener('input', (e) => {
          let value = e.target.value.replace(/\D/g, '');
          if (value.length > 3) value = value.slice(0, 3) + '-' + value.slice(3);
          if (value.length > 6) value = value.slice(0, 6) + '-' + value.slice(6, 10);
          e.target.value = value;
        });
        input.maxLength = 11;
      } else if (originalId === 'phone') {
        input.addEventListener('input', (e) => {
          let value = e.target.value.replace(/\D/g, '');
          if (value.length > 0) {
            if (value.length <= 3) {
              value = `(${value}`;
            } else if (value.length <= 6) {
              value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else {
              value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            }
          }
          e.target.value = value;
        });
      }
    });
  }

  fileInput.addEventListener('change', handleFileSelect);
  resetFile.addEventListener('click', () => {
    fileInput.value = '';
    handleFileSelect();
    translated = false;
    updateTranslationOutput();
    messages.length = 0;
    chatLog.innerHTML = '';
  });

  // Translation
  const langSelect = $('#langSelect');
  const translateBtn = $('#translateBtn');
  const translateBtnText = $('.translate-btn-text', translateBtn);
  const translateBtnLoading = $('.translate-btn-loading', translateBtn);
  const translateOut = $('#translateOut');
  
  // Set initial language from select
  if (langSelect) {
    currentLanguage = langSelect.value || 'en';
  }

  const langCodes = {
    es: 'es',
    en: 'en',
    hi: 'hi',
    zh: 'zh',
    fr: 'fr',
    ar: 'ar'
  };

  const langLabels = {
    es: 'Spanish',
    en: 'English',
    hi: 'Hindi',
    zh: 'Chinese (Simplified)',
    fr: 'French',
    ar: 'Arabic'
  };

  async function translateText(text, targetLang) {
    // Ensure text is under 400 chars to avoid API limits
    if (text.length > 400) {
      // Split by sentences or words to stay under limit
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const chunks = [];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length < 400) {
          currentChunk += sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = sentence.length > 400 ? sentence.substring(0, 400) : sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
      
      const translatedChunks = [];
      for (const chunk of chunks) {
        const translated = await translateTextChunk(chunk, targetLang);
        translatedChunks.push(translated);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
      return translatedChunks.join(' ');
    }
    
    return await translateTextChunk(text, targetLang);
  }

  async function translateTextChunk(text, targetLang) {
    try {
      // Using LibreTranslate API (free, no key required)
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text.substring(0, 400), // Ensure under limit
          source: 'en',
          target: langCodes[targetLang] || 'es',
          format: 'text'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes('500')) {
          throw new Error('Translation service unavailable');
        }
        throw new Error('Translation service unavailable');
      }

      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback: try alternative service
      try {
        const textToTranslate = text.substring(0, 400);
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|${langCodes[targetLang] || 'es'}`);
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
          return data.responseData.translatedText;
        }
        throw new Error('Translation failed');
      } catch (fallbackError) {
        console.error('Fallback translation error:', fallbackError);
        // Last resort: return original with note
        return text;
      }
    }
  }

  function updateTranslationOutput() {
    if (!uploadedFile || !extractedText) {
      translateOut.innerHTML = `
        <div class="translation-placeholder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-2 opacity-50">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span class="small text-muted">Upload a form first to see translation</span>
        </div>
      `;
      translateOut.classList.remove('has-content');
      return;
    }

    if (!translated) {
      translateOut.innerHTML = `
        <div class="translation-placeholder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-2 opacity-50">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span class="small text-muted">Click Translate to see the form in your language</span>
        </div>
      `;
      translateOut.classList.remove('has-content');
    }
  }

  translateBtn.addEventListener('click', async () => {
    if (!uploadedFile || !extractedText) {
      showNotification('Please upload a form first', 'warning');
      return;
    }

    const lang = langSelect.value;
    translateBtn.disabled = true;
    translateBtnText.classList.add('d-none');
    translateBtnLoading.classList.remove('d-none');

    try {
      // Split text into smaller chunks (max 300 chars each to be safe)
      const maxChunkSize = 300;
      const chunks = [];
      const paragraphs = extractedText.split('\n\n').filter(c => c.trim().length > 0);
      
      for (const para of paragraphs) {
        if (para.length <= maxChunkSize) {
          chunks.push(para);
        } else {
          // Split long paragraphs by sentences
          const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
          let currentChunk = '';
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxChunkSize) {
              currentChunk += sentence;
            } else {
              if (currentChunk) chunks.push(currentChunk);
              // If sentence itself is too long, split by words
              if (sentence.length > maxChunkSize) {
                const words = sentence.split(' ');
                let wordChunk = '';
                for (const word of words) {
                  if ((wordChunk + ' ' + word).length <= maxChunkSize) {
                    wordChunk += (wordChunk ? ' ' : '') + word;
                  } else {
                    if (wordChunk) chunks.push(wordChunk);
                    wordChunk = word;
                  }
                }
                if (wordChunk) currentChunk = wordChunk;
              } else {
                currentChunk = sentence;
              }
            }
          }
          if (currentChunk) chunks.push(currentChunk);
        }
      }
      
      const translatedChunks = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim().length > 0) {
          const translated = await translateText(chunk, lang);
          translatedChunks.push(translated);
          
          // Update progress
          const progress = Math.round(((i + 1) / chunks.length) * 100);
          translateOut.innerHTML = `
            <div class="translation-placeholder">
              <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
              <span class="small text-muted">Translating... ${progress}%</span>
            </div>
          `;
          
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 300));
        }
      }

      translatedText = translatedChunks.join('\n\n');
      translateOut.innerHTML = `<div class="translation-content">${translatedText.replace(/\n/g, '<br>')}</div>`;
      translateOut.classList.add('has-content');
      translated = true;
      currentLanguage = lang;

      // Extract fields from the TRANSLATED text (this is what user sees)
      // Try AI extraction first, fallback to pattern matching
      try {
        formFields = await detectFormFieldsWithAI(translatedText);
        console.log('AI extracted fields:', formFields.length, formFields);
      } catch (error) {
        console.log('AI extraction failed, using pattern matching:', error);
        formFields = detectFormFields(translatedText);
        console.log('Pattern-based extracted fields:', formFields.length, formFields);
      }
      
      // Generate fields with translated labels (they're already in the target language)
      generateDynamicFields(formFields, false);
      
      // Update AI message with field count in current language
      const fieldCountMsg = lang === 'es' 
        ? `He analizado el formulario traducido. Encontré ${formFields.length} campos. ¡Pregúntame sobre cualquier sección o campo!`
        : lang === 'zh'
        ? `我已经分析了翻译后的表单。我找到了 ${formFields.length} 个字段。请询问任何部分或字段！`
        : lang === 'fr'
        ? `J'ai analysé le formulaire traduit. J'ai trouvé ${formFields.length} champs. Demandez-moi n'importe quelle section ou champ !`
        : lang === 'ar'
        ? `لقد حللت النموذج المترجم. وجدت ${formFields.length} حقول. اسألني عن أي قسم أو حقل!`
        : lang === 'hi'
        ? `मैंने अनुवादित फॉर्म का विश्लेषण किया है। मुझे ${formFields.length} फ़ील्ड मिले। किसी भी अनुभाग या फ़ील्ड के बारे में पूछें!`
        : `I've analyzed the translated form. I found ${formFields.length} fields. Ask me about any section or field!`;
      
      addChatMessage('ai', fieldCountMsg);

      showNotification(`Translated to ${langLabels[lang]}`, 'success');
    } catch (error) {
      showNotification('Translation failed. Please try again.', 'error');
      console.error('Translation error:', error);
    } finally {
      translateBtn.disabled = false;
      translateBtnText.classList.remove('d-none');
      translateBtnLoading.classList.add('d-none');
    }
  });

  updateTranslationOutput();

  // Translate field labels
  async function translateFieldLabels(targetLang) {
    if (!formFields.length) return;
    
    const labelsToTranslate = formFields.map(f => f.displayLabel).filter((v, i, a) => a.indexOf(v) === i);
    fieldTranslations = {};
    
    for (const label of labelsToTranslate) {
      try {
        const translated = await translateTextChunk(label, targetLang);
        // Find all fields with this label
        formFields.forEach(field => {
          if (field.displayLabel === label) {
            fieldTranslations[field.originalId] = translated;
          }
        });
      } catch (error) {
        console.error('Error translating field label:', error);
      }
    }
  }

  // Chat with AI that understands the form
  const chatLog = $('#chatLog');
  const chatForm = $('#chatForm');
  const chatInput = $('#chatInput');

  function addChatMessage(role, text) {
    messages.push({ role, text, timestamp: Date.now() });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-message-avatar';
    avatar.textContent = role === 'user' ? 'You' : 'AI';
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-message-bubble';
    bubble.textContent = text;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    chatLog.appendChild(messageDiv);
    
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // Multilingual AI responses
  const aiResponses = {
    es: {
      welcome: '¡Hola! Sube un formulario y te ayudaré a entenderlo y completarlo. ¡Pregúntame lo que quieras!',
      formAbout: 'Este formulario parece ser sobre: {summary}... Puedo ayudarte a entender cualquier sección específica.',
      needForm: 'Necesito analizar el formulario primero. Por favor, súbelo y te diré de qué se trata.',
      foundField: 'Encontré "{label}" en el formulario. {context}',
      foundSections: 'Encontré estas secciones en el formulario: {sections}. ¿Con cuál te gustaría ayuda?',
      nameHelp: 'Ingresa tu nombre legal completo exactamente como aparece en tu identificación oficial.',
      addressHelp: 'Proporciona tu dirección residencial actual incluyendo número de calle, nombre de calle, ciudad, estado y código postal.',
      dobHelp: 'Ingresa tu fecha de nacimiento en el formato solicitado (generalmente MM/DD/YYYY o YYYY-MM-DD).',
      phoneHelp: 'Proporciona un número de teléfono donde puedas ser contactado. Incluye el código de área.',
      ssnHelp: 'El SSN a menudo es opcional. Si es requerido, ingrésalo en formato XXX-XX-XXXX.',
      generalHelp: '¡Estoy aquí para ayudar! Puedes preguntarme sobre cualquier sección del formulario, qué significan campos específicos o cómo completarlos. ¿Qué te gustaría saber?',
      contextLabel: 'Contexto:',
      fieldRequiresInfo: 'Este campo requiere tu información.'
    },
    en: {
      welcome: 'Hi! Upload a form and I\'ll help you understand and fill it out. Ask me anything!',
      formAbout: 'This form appears to be about: {summary}... I can help you understand any specific section.',
      needForm: 'I need to analyze the form first. Please upload it and I\'ll tell you what it\'s about.',
      foundField: 'I found "{label}" in the form. {context}',
      foundSections: 'I found these sections in the form: {sections}. Which one would you like help with?',
      nameHelp: 'Enter your full legal name exactly as it appears on your government-issued ID.',
      addressHelp: 'Provide your current residential address including street number, street name, city, state, and ZIP code.',
      dobHelp: 'Enter your date of birth in the format requested (usually MM/DD/YYYY or YYYY-MM-DD).',
      phoneHelp: 'Provide a phone number where you can be reached. Include area code.',
      ssnHelp: 'SSN is often optional. If required, enter in format XXX-XX-XXXX.',
      generalHelp: 'I\'m here to help! You can ask me about any section of the form, what specific fields mean, or how to fill them out. What would you like to know?',
      contextLabel: 'Context:',
      fieldRequiresInfo: 'This field requires your input.'
    },
    zh: {
      welcome: '你好！上传表单，我会帮助您理解和填写。有什么问题尽管问我！',
      formAbout: '这个表单似乎是关于：{summary}...我可以帮助您理解任何特定部分。',
      needForm: '我需要先分析表单。请上传，我会告诉您它的内容。',
      foundField: '我在表单中找到了"{label}"。{context}',
      foundSections: '我在表单中找到了这些部分：{sections}。您需要哪个部分的帮助？',
      nameHelp: '请输入您的全名，与身份证件上的完全一致。',
      addressHelp: '请提供您当前的居住地址，包括街道号码、街道名称、城市、州和邮政编码。',
      dobHelp: '请按要求的格式输入您的出生日期（通常是MM/DD/YYYY或YYYY-MM-DD）。',
      phoneHelp: '请提供一个可以联系到您的电话号码。包括区号。',
      ssnHelp: 'SSN通常是可选的。如果需要，请以XXX-XX-XXXX格式输入。',
      generalHelp: '我在这里帮助您！您可以问我关于表单的任何部分、特定字段的含义或如何填写。您想知道什么？',
      contextLabel: '上下文：',
      fieldRequiresInfo: '此字段需要您提供信息。'
    },
    fr: {
      welcome: 'Bonjour ! Téléchargez un formulaire et je vous aiderai à le comprendre et à le remplir. Demandez-moi n\'importe quoi !',
      formAbout: 'Ce formulaire semble concerner : {summary}... Je peux vous aider à comprendre n\'importe quelle section spécifique.',
      needForm: 'J\'ai besoin d\'analyser le formulaire d\'abord. Veuillez le télécharger et je vous dirai de quoi il s\'agit.',
      foundField: 'J\'ai trouvé "{label}" dans le formulaire. {context}',
      foundSections: 'J\'ai trouvé ces sections dans le formulaire : {sections}. Avec laquelle aimeriez-vous de l\'aide ?',
      nameHelp: 'Entrez votre nom complet légal exactement tel qu\'il apparaît sur votre pièce d\'identité délivrée par le gouvernement.',
      addressHelp: 'Fournissez votre adresse résidentielle actuelle incluant le numéro de rue, le nom de la rue, la ville, l\'état et le code postal.',
      dobHelp: 'Entrez votre date de naissance au format demandé (généralement MM/JJ/AAAA ou AAAA-MM-JJ).',
      phoneHelp: 'Fournissez un numéro de téléphone où vous pouvez être joint. Incluez l\'indicatif régional.',
      ssnHelp: 'Le SSN est souvent optionnel. Si requis, entrez-le au format XXX-XX-XXXX.',
      generalHelp: 'Je suis là pour aider ! Vous pouvez me demander n\'importe quelle section du formulaire, ce que signifient des champs spécifiques ou comment les remplir. Que souhaitez-vous savoir ?',
      contextLabel: 'Contexte :',
      fieldRequiresInfo: 'Ce champ nécessite vos informations.'
    },
    ar: {
      welcome: 'مرحباً! ارفع نموذجاً وسأساعدك على فهمه وملئه. اسألني أي شيء!',
      formAbout: 'يبدو أن هذا النموذج يتعلق بـ: {summary}... يمكنني مساعدتك في فهم أي قسم محدد.',
      needForm: 'أحتاج إلى تحليل النموذج أولاً. يرجى رفعه وسأخبرك بما يتعلق به.',
      foundField: 'وجدت "{label}" في النموذج. {context}',
      foundSections: 'وجدت هذه الأقسام في النموذج: {sections}. أي قسم تريد المساعدة فيه؟',
      nameHelp: 'أدخل اسمك الكامل القانوني تماماً كما يظهر على بطاقة الهوية الصادرة عن الحكومة.',
      addressHelp: 'قدم عنوان سكنك الحالي بما في ذلك رقم الشارع واسم الشارع والمدينة والولاية والرمز البريدي.',
      dobHelp: 'أدخل تاريخ ميلادك بالتنسيق المطلوب (عادة MM/DD/YYYY أو YYYY-MM-DD).',
      phoneHelp: 'قدم رقم هاتف يمكن الوصول إليك عليه. قم بتضمين رمز المنطقة.',
      ssnHelp: 'SSN غالباً ما يكون اختيارياً. إذا كان مطلوباً، أدخله بالتنسيق XXX-XX-XXXX.',
      generalHelp: 'أنا هنا للمساعدة! يمكنك أن تسألني عن أي قسم من النموذج، أو ما تعني الحقول المحددة، أو كيفية ملئها. ماذا تريد أن تعرف؟',
      contextLabel: 'السياق:',
      fieldRequiresInfo: 'هذا الحقل يتطلب معلوماتك.'
    },
    hi: {
      welcome: 'नमस्ते! एक फॉर्म अपलोड करें और मैं आपको इसे समझने और भरने में मदद करूंगा। मुझसे कुछ भी पूछें!',
      formAbout: 'यह फॉर्म इसके बारे में प्रतीत होता है: {summary}... मैं आपको किसी भी विशिष्ट अनुभाग को समझने में मदद कर सकता हूं।',
      needForm: 'मुझे पहले फॉर्म का विश्लेषण करने की आवश्यकता है। कृपया इसे अपलोड करें और मैं आपको बताऊंगा कि यह किस बारे में है।',
      foundField: 'मुझे फॉर्म में "{label}" मिला। {context}',
      foundSections: 'मुझे फॉर्म में ये अनुभाग मिले: {sections}। आप किसके साथ मदद चाहेंगे?',
      nameHelp: 'अपना पूरा कानूनी नाम दर्ज करें जैसा कि आपके सरकारी आईडी पर दिखाई देता है।',
      addressHelp: 'अपना वर्तमान आवासीय पता प्रदान करें जिसमें सड़क संख्या, सड़क का नाम, शहर, राज्य और ज़िप कोड शामिल हो।',
      dobHelp: 'अनुरोधित प्रारूप में अपनी जन्म तिथि दर्ज करें (आमतौर पर MM/DD/YYYY या YYYY-MM-DD)।',
      phoneHelp: 'एक फोन नंबर प्रदान करें जहां आपसे संपर्क किया जा सके। क्षेत्र कोड शामिल करें।',
      ssnHelp: 'SSN अक्सर वैकल्पिक होता है। यदि आवश्यक हो, तो XXX-XX-XXXX प्रारूप में दर्ज करें।',
      generalHelp: 'मैं यहां मदद के लिए हूं! आप मुझसे फॉर्म के किसी भी अनुभाग, विशिष्ट फ़ील्ड का अर्थ, या उन्हें कैसे भरना है, के बारे में पूछ सकते हैं। आप क्या जानना चाहेंगे?',
      contextLabel: 'संदर्भ:',
      fieldRequiresInfo: 'इस फ़ील्ड के लिए आपकी जानकारी की आवश्यकता है।'
    }
  };

  function getAIResponse(question, formContent, fields) {
    const q = question.toLowerCase();
    const content = (formContent || extractedText || '').toLowerCase();
    const lang = currentLanguage || 'en';
    const responses = aiResponses[lang] || aiResponses.en;
    
    // Context-aware responses based on actual form content
    if (q.includes('what') && (q.includes('form') || q.includes('this'))) {
      if (formContent) {
        const summary = formContent.split('\n').slice(0, 5).join(' ');
        return responses.formAbout.replace('{summary}', summary.substring(0, 200));
      }
      return responses.needForm;
    }

    // Field-specific questions
    if (fields && fields.length > 0) {
      const matchingField = fields.find(f => 
        f.label.toLowerCase().includes(q.split(' ').find(word => word.length > 3)) ||
        q.includes(f.label.toLowerCase().substring(0, 10))
      );
      
      if (matchingField) {
        const context = matchingField.context 
          ? responses.contextLabel + ' ' + matchingField.context.substring(0, 150) 
          : responses.fieldRequiresInfo;
        return responses.foundField.replace('{label}', matchingField.label).replace('{context}', context);
      }
    }

    // Section questions
    if (q.includes('section') || q.includes('sección') || q.includes('section') || q.includes('قسم')) {
      const sectionMatch = content.match(/(?:section|sección|section|قسم)\s*[0-9]+[^\n]*/gi);
      if (sectionMatch) {
        return responses.foundSections.replace('{sections}', sectionMatch.slice(0, 3).join(', '));
      }
    }

    // Name field
    if (q.includes('name') || q.includes('nombre') || q.includes('nom')) {
      if (content.includes('name') || content.includes('nombre') || content.includes('nom') || fields.some(f => f.type === 'text' && (f.label.toLowerCase().includes('name') || f.label.toLowerCase().includes('nombre') || f.label.toLowerCase().includes('nom')))) {
        return responses.nameHelp;
      }
    }

    // Address field
    if (q.includes('address') || q.includes('dirección') || q.includes('direccion') || q.includes('adresse')) {
      if (content.includes('address') || content.includes('dirección') || content.includes('adresse') || fields.some(f => f.label.toLowerCase().includes('address') || f.label.toLowerCase().includes('dirección') || f.label.toLowerCase().includes('adresse'))) {
        return responses.addressHelp;
      }
    }

    // Date of birth
    if ((q.includes('birth') || q.includes('dob') || q.includes('date') || q.includes('nacimiento') || q.includes('naissance')) && (content.includes('birth') || content.includes('dob') || content.includes('date') || content.includes('nacimiento') || content.includes('naissance'))) {
      return responses.dobHelp;
    }

    // Phone
    if (q.includes('phone') || q.includes('teléfono') || q.includes('telefono') || q.includes('téléphone')) {
      if (content.includes('phone') || content.includes('telephone') || content.includes('teléfono') || content.includes('téléphone')) {
        return responses.phoneHelp;
      }
    }

    // SSN
    if (q.includes('ssn') || q.includes('social security') || q.includes('seguro social')) {
      return responses.ssnHelp;
    }

    // General help
    if (formContent && formContent.length > 0) {
      const keywords = lang === 'es' 
        ? ['required', 'optional', 'please', 'provide', 'enter', 'requerido', 'opcional', 'por favor']
        : ['required', 'optional', 'please', 'provide', 'enter'];
      const foundKeywords = keywords.filter(k => content.includes(k));
      if (foundKeywords.length > 0) {
        const fieldCount = fields.length > 0 
          ? (lang === 'es' ? `Detecté ${fields.length} campos. ` 
             : lang === 'zh' ? `我检测到 ${fields.length} 个字段。 `
             : lang === 'fr' ? `J'ai détecté ${fields.length} champs. `
             : lang === 'ar' ? `اكتشفت ${fields.length} حقول. `
             : lang === 'hi' ? `मैंने ${fields.length} फ़ील्ड का पता लगाया। `
             : `I detected ${fields.length} fields. `)
          : '';
        const helpMsg = lang === 'es' 
          ? `Basándome en el contenido del formulario, puedo ver que solicita información variada. ${fieldCount}¿En qué parte específica te gustaría ayuda?`
          : lang === 'zh'
          ? `根据表单内容，我可以看到它要求各种信息。${fieldCount}您需要哪个特定部分的帮助？`
          : lang === 'fr'
          ? `Basé sur le contenu du formulaire, je peux voir qu'il demande diverses informations. ${fieldCount}Dans quelle partie spécifique aimeriez-vous de l'aide ?`
          : lang === 'ar'
          ? `بناءً على محتوى النموذج، يمكنني أن أرى أنه يطلب معلومات متنوعة. ${fieldCount}في أي جزء محدد تريد المساعدة؟`
          : lang === 'hi'
          ? `फॉर्म की सामग्री के आधार पर, मैं देख सकता हूं कि यह विविध जानकारी मांगता है। ${fieldCount}आप किस विशिष्ट भाग में सहायता चाहेंगे?`
          : `Based on the form content, I can see it asks for various information. ${fieldCount}What specific part would you like help with?`;
        return helpMsg;
      }
    }

    return responses.generalHelp;
  }

  // Extract form fields using AI
  async function detectFormFieldsWithAI(text) {
    const API_KEY = window.OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    
    // If no API key, throw error to use fallback
    if (!API_KEY) {
      throw new Error('No API key available');
    }

    if (!text || text.trim().length === 0) {
      return [];
    }

    const prompt = `You are analyzing a medical form. Extract all form fields from the following text. For each field, identify:
1. The field label (what the field is asking for)
2. The field type (text, date, email, phone, number, etc.)
3. Any context that helps understand what information is needed

Return ONLY a valid JSON array with this structure:
[
  {
    "label": "Full field label as it appears",
    "displayLabel": "Clean label without colons or extra characters",
    "type": "text|date|email|tel|number",
    "context": "Brief context about what this field needs"
  }
]

Form text:
${text.substring(0, 3000)}

Return only the JSON array, no other text:`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a form field extraction assistant. Always return valid JSON arrays only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices[0]?.message?.content || '[]';
      
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extractedFields = JSON.parse(jsonMatch[0]);
      
      // Convert to our field format
      return extractedFields.map((field, index) => {
        const normalizedId = field.displayLabel.toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 40);
        
        // Determine field ID based on label
        let fieldId = normalizedId;
        const lowerLabel = field.displayLabel.toLowerCase();
        if (/(?:full\s*)?name|nombre|nom/i.test(lowerLabel)) fieldId = 'name';
        else if (/(?:first\s*)?name|primer\s*nombre/i.test(lowerLabel)) fieldId = 'firstname';
        else if (/(?:last\s*)?name|surname|apellido/i.test(lowerLabel)) fieldId = 'lastname';
        else if (/address|dirección|direccion|adresse/i.test(lowerLabel)) fieldId = 'address';
        else if (/city|ciudad/i.test(lowerLabel)) fieldId = 'city';
        else if (/state|estado/i.test(lowerLabel)) fieldId = 'state';
        else if (/zip|postal/i.test(lowerLabel)) fieldId = 'zip';
        else if (/(?:date\s*of\s*birth|dob|birth\s*date|fecha\s*de\s*nacimiento|date\s*de\s*naissance)/i.test(lowerLabel)) fieldId = 'dob';
        else if (/(?:phone|telephone|teléfono|téléphone)/i.test(lowerLabel)) fieldId = 'phone';
        else if (/email|e-mail|correo|courriel/i.test(lowerLabel)) fieldId = 'email';
        else if (/(?:ssn|social\s*security)/i.test(lowerLabel)) fieldId = 'ssn';
        else fieldId = normalizedId || `field_${index}`;

        return {
          id: `field_${index}`,
          originalId: fieldId,
          label: field.label,
          displayLabel: field.displayLabel,
          type: field.type || 'text',
          lineNumber: index + 1,
          context: field.context || field.label
        };
      });
    } catch (error) {
      console.error('AI field extraction failed:', error);
      throw error;
    }
  }

  // Call real AI API
  async function callAIAPI(question, originalText, translatedText, fields) {
    // API Configuration - You can set this via environment variable or config
    const API_KEY = window.OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    
    // If no API key, use fallback
    if (!API_KEY) {
      console.warn('No OpenAI API key found. Using fallback responses.');
      return getAIResponse(question, translatedText || originalText, fields);
    }

    // Build context about the form
    let formContext = '';
    if (translatedText) {
      formContext = `The user has uploaded and translated a form. Here is the translated form content:\n\n${translatedText.substring(0, 2000)}...\n\n`;
    } else if (originalText) {
      formContext = `The user has uploaded a form. Here is the form content:\n\n${originalText.substring(0, 2000)}...\n\n`;
    }
    
    if (fields && fields.length > 0) {
      formContext += `Detected form fields:\n${fields.map(f => `- ${f.displayLabel} (${f.type})`).join('\n')}\n\n`;
    }
    
    const langNames = {
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      zh: 'Chinese',
      ar: 'Arabic',
      hi: 'Hindi'
    };
    
    const systemPrompt = `You are a helpful AI assistant helping users fill out medical forms. ${formContext}Respond in ${langNames[currentLanguage] || 'English'}. Be concise, helpful, and focus on helping the user understand and complete the form. If the user provides information like "nombre kanthi" or "sid 405050", acknowledge it and help them fill the form.`;
    
    const conversationHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.text }));
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: question }
    ];

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('AI API call failed:', error);
      throw error;
    }
  }

  // Add welcome message in current language (after langSelect is defined)
  setTimeout(() => {
    if (messages.length === 0) {
      const lang = currentLanguage || langSelect?.value || 'en';
      currentLanguage = lang; // Ensure it's set
      const welcomeMsg = aiResponses[lang]?.welcome || aiResponses.en.welcome;
      addChatMessage('ai', welcomeMsg);
    }
  }, 500);
  
  // Update language when selection changes
  if (langSelect) {
    langSelect.addEventListener('change', () => {
    const newLang = langSelect.value;
    currentLanguage = newLang;
    
    // Update welcome message if chat is empty or only has welcome
    if (messages.length <= 1) {
      chatLog.innerHTML = '';
      messages.length = 0;
      const welcomeMsg = aiResponses[newLang]?.welcome || aiResponses.en.welcome;
      setTimeout(() => addChatMessage('ai', welcomeMsg), 100);
    } else {
      // If there are messages, add a note that language changed
      const langChangeMsg = newLang === 'es' 
        ? 'Idioma cambiado a español. ¿En qué puedo ayudarte?'
        : newLang === 'zh'
        ? '语言已更改为中文。我能为您做什么？'
        : newLang === 'fr'
        ? 'Langue changée en français. Comment puis-je vous aider ?'
        : newLang === 'ar'
        ? 'تم تغيير اللغة إلى العربية. كيف يمكنني مساعدتك؟'
        : newLang === 'hi'
        ? 'भाषा हिंदी में बदल दी गई है। मैं आपकी कैसे मदद कर सकता हूं?'
        : 'Language changed to English. How can I help you?';
      addChatMessage('ai', langChangeMsg);
    }
    });
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const question = chatInput.value.trim();
    if (!question) return;

    addChatMessage('user', question);
    chatInput.value = '';
    
    // Automatically try to extract and fill fields from the message
    if (formFields.length > 0) {
      const extracted = extractInfoFromText(question, formFields);
      let autoFilled = 0;
      Object.keys(extracted).forEach(originalId => {
        const input = getFieldByOriginalId(originalId);
        if (input && !input.value) {
          let value = extracted[originalId];
          const field = formFields.find(f => f.originalId === originalId);
          if (field) {
            if (field.originalId === 'name' || field.displayLabel.toLowerCase().includes('nombre') || field.displayLabel.toLowerCase().includes('name')) {
              value = value.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            }
          }
          input.value = value;
          autoFilled++;
        }
      });
      
      // Also try pattern matching for common fields like SID/ID
      const sidMatch = question.match(/(?:^|\s)(?:sid|id|student\s*id)[:\s]*([a-z0-9-]+)/i);
      if (sidMatch) {
        // Try to find a field that might be for ID/SID
        formFields.forEach(field => {
          const fieldLabel = field.displayLabel.toLowerCase();
          if ((fieldLabel.includes('id') || fieldLabel.includes('sid') || fieldLabel.includes('student')) && !fieldLabel.includes('name')) {
            const input = getFieldByOriginalId(field.originalId);
            if (input && !input.value) {
              input.value = sidMatch[1].trim();
              autoFilled++;
            }
          }
        });
      }
      
      if (autoFilled > 0) {
        // Show subtle notification
        setTimeout(() => {
          showNotification(`Auto-filled ${autoFilled} field${autoFilled > 1 ? 's' : ''}`, 'success');
        }, 500);
      }
    }

    // Call real AI API
    const chatInputBtn = chatForm.querySelector('button[type="submit"]');
    const originalBtnText = chatInputBtn.innerHTML;
    chatInputBtn.disabled = true;
    chatInputBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
    
    callAIAPI(question, extractedText, translatedText, formFields)
      .then(response => {
        addChatMessage('ai', response);
        chatInputBtn.disabled = false;
        chatInputBtn.innerHTML = originalBtnText;
      })
      .catch(error => {
        console.error('AI API error:', error);
        // Fallback to local responses if API fails
        const fallbackResponse = getAIResponse(question, extractedText, formFields);
        addChatMessage('ai', fallbackResponse);
        chatInputBtn.disabled = false;
        chatInputBtn.innerHTML = originalBtnText;
        showNotification('Using fallback responses. Check API configuration.', 'warning');
      });
  });

  // Helper to get all dynamic form fields
  function getDynamicFields() {
    return Array.from(document.querySelectorAll('.dynamic-field'));
  }

  function getFieldByOriginalId(originalId) {
    return document.querySelector(`[data-field-id="${originalId}"]`);
  }

  // Extract information from text using field labels
  function extractInfoFromText(text, fields) {
    const extracted = {};
    const lowerText = text.toLowerCase();
    
    // For each field, try to find its value in the text
    fields.forEach(field => {
      const fieldLabel = field.displayLabel.toLowerCase();
      const fieldWords = fieldLabel.split(/\s+/).filter(w => w.length > 2); // Get meaningful words
      
      // Get the first significant word (most likely to appear in user input)
      const firstWord = fieldWords[0] || fieldLabel.split(/\s+/)[0];
      
      // Try different patterns to find the value after the field label
      const patterns = [
        // Pattern 1: "nombre kanthi" - just the first word of label followed by value
        new RegExp(`(?:^|\\s)${firstWord}\\s+([a-záéíóúñü0-9\\s,.'-]+?)(?=\\s|$|,|\\.|\\n|sid|id)`, 'i'),
        // Pattern 2: "nombre: kanthi" or "name: john"
        new RegExp(`${firstWord}[:\s]+([a-záéíóúñü0-9\\s,.'-]+?)(?=\\s|$|,|\\.|\\n)`, 'i'),
        // Pattern 3: Match any word from the label followed by value
        new RegExp(`(?:^|\\s)(?:${fieldWords.slice(0, 3).join('|')})\\s+([a-záéíóúñü0-9]+(?:\\s+[a-záéíóúñü0-9]+)*)`, 'i'),
        // Pattern 4: For fields with "nombre" or "name" - catch standalone names
        (fieldLabel.includes('nombre') || fieldLabel.includes('name')) 
          ? /(?:^|\s)(?:nombre|name)\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)*)/i
          : null
      ].filter(p => p !== null);
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          // Validate the value - should be reasonable length and not be another field label
          if (value.length > 0 && value.length < 200 && !value.match(/^(nombre|name|address|dirección|phone|teléfono|email|correo|dob|date|fecha|ssn|sid|id)$/i)) {
            extracted[field.originalId] = value;
            break;
          }
        }
      }
    });
    
    return extracted;
  }

  // Autofill from chat
  $('#autofillBtn').addEventListener('click', () => {
    if (messages.length === 0) {
      showNotification('Chat with the AI first to extract information', 'info');
      return;
    }

    const allText = messages.filter(m => m.role === 'user').map(m => m.text).join('\n');
    let filledCount = 0;
    
    // First, try extracting using field labels (more flexible)
    const extractedByLabel = extractInfoFromText(allText, formFields);
    
    // Map of field IDs to extraction patterns (fallback)
    const fieldExtractors = {
      name: [
        /(?:my name is|name is|i'm|i am|me llamo|mi nombre es|nombre|name)\s+([a-záéíóúñü\s,.'-]+?)(?:\s|$|,|\.|$)/i,
        /(?:^|\s)(?:nombre|name)[:\s]*([a-záéíóúñü\s,.'-]+?)(?:\s|$|,|\.|$)/i,
        /(?:^|\s)([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)*)(?:\s+(?:is|es|my|mi))?$/i
      ],
      dob: [
        /(?:dob|date of birth|born|nacimiento|fecha de nacimiento)[:\s-]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{1,2}-\d{1,2})/
      ],
      address: [
        /(?:address|dirección|direccion|adresse)[:\s-]*([^\n,]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|city|state|zip|rue|avenue|boulevard)[^\n,]*)/i,
        /(?:address|dirección|direccion|adresse)[:\s-]*([a-z0-9\s,#.-]+)/i
      ],
      phone: [
        /(?:phone|teléfono|telefono|téléphone)[:\s-]*\(?(\d{3})\)?\s*-?\s*(\d{3})\s*-?\s*(\d{4})/i,
        /\(?(\d{3})\)?\s*-?\s*(\d{3})\s*-?\s*(\d{4})/
      ],
      email: [
        /(?:email|e-mail|correo)[:\s-]*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
        /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i
      ],
      ssn: [
        /(?:ssn|social security|sid|id)[:\s-]*([a-z0-9-]+)/i
      ],
      city: [
        /(?:city|ciudad)[:\s-]*([a-z\s]+)/i
      ],
      state: [
        /(?:state|estado)[:\s-]*([a-z\s]+)/i
      ],
      zip: [
        /(?:zip|zip code|postal code)[:\s-]*(\d{5}(?:-\d{4})?)/i
      ]
    };

    // First, fill using label-based extraction
    Object.keys(extractedByLabel).forEach(originalId => {
      const input = getFieldByOriginalId(originalId);
      if (input && !input.value) { // Only fill if empty
        let value = extractedByLabel[originalId];
        
        // Format based on field type
        const field = formFields.find(f => f.originalId === originalId);
        if (field) {
          if (field.originalId === 'name' || field.displayLabel.toLowerCase().includes('nombre') || field.displayLabel.toLowerCase().includes('name')) {
            value = value.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          }
        }
        
        input.value = value;
        filledCount++;
      }
    });

    // Then try pattern-based extraction for fields not yet filled
    formFields.forEach(field => {
      const input = getFieldByOriginalId(field.originalId);
      if (!input || input.value) return; // Skip if already filled

      const extractors = fieldExtractors[field.originalId];
      if (!extractors) {
        // For unknown fields, try to match by label
        const labelMatch = allText.match(new RegExp(`(?:^|\\s)${field.displayLabel.toLowerCase().split(/\s+/)[0]}\\s+([a-záéíóúñü0-9\\s,.'-]+?)(?=\\s|$|,|\\.|\\n)`, 'i'));
        if (labelMatch && labelMatch[1]) {
          input.value = labelMatch[1].trim();
          filledCount++;
        }
        return;
      }

      for (const pattern of extractors) {
        const match = allText.match(pattern);
        if (match) {
          let value = match[1] || (match[2] && match[3] ? `(${match[1]}) ${match[2]}-${match[3]}` : match[0]);
          
          // Format based on field type
          if (field.originalId === 'dob') {
            let dob = value.replace(/\//g, '-');
            if (dob.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
              const parts = dob.split('-');
              dob = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
            value = dob;
          } else if (field.originalId === 'name') {
            value = value.trim().split(/[,\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          }
          
          input.value = value;
          filledCount++;
          break;
        }
      }
    });

    if (filledCount > 0) {
      showNotification(`Filled ${filledCount} field${filledCount > 1 ? 's' : ''} from chat`, 'success');
      $('#autofillBtn').classList.add('success-pulse');
      setTimeout(() => $('#autofillBtn').classList.remove('success-pulse'), 400);
    } else {
      showNotification('Could not extract information from chat', 'info');
    }
  });

  $('#clearBtn').addEventListener('click', () => {
    getDynamicFields().forEach(field => field.value = '');
    showNotification('Form cleared', 'info');
  });

  // Download JSON
  $('#downloadJsonBtn').addEventListener('click', () => {
    const data = {};
    
    // Collect all dynamic field values
    formFields.forEach(field => {
      const input = getFieldByOriginalId(field.originalId);
      if (input && input.value) {
        const key = field.originalId || field.id.replace('field_', '');
        data[key] = input.value;
      }
    });
    
    data._meta = {
      demo: true,
      generatedAt: new Date().toISOString(),
      source: 'MedPull Demo',
      extractedFields: formFields.length,
      originalTextLength: extractedText.length,
      fieldLabels: formFields.map(f => ({ id: f.originalId, label: f.displayLabel }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medpull_form_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('JSON file downloaded', 'success');
  });

  // Download PDF
  $('#downloadPdfBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      showNotification('PDF library not loaded', 'error');
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(31, 42, 68);
    doc.text('MedPull — Completed Form', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(102, 114, 138);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 28);
    
    // Form data - use dynamic fields
    doc.setFontSize(12);
    doc.setTextColor(31, 42, 68);
    let yPos = 40;
    const lineHeight = 8;
    const maxY = doc.internal.pageSize.height - 20;
    
    formFields.forEach(field => {
      if (yPos > maxY) {
        doc.addPage();
        yPos = 20;
      }
      
      const input = getFieldByOriginalId(field.originalId);
      const value = input ? (input.value || 'Not provided') : 'Not provided';
      
      doc.setFont(undefined, 'bold');
      doc.text(`${field.displayLabel}:`, 20, yPos);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(value, 160);
      doc.text(lines, 60, yPos);
      yPos += lines.length * lineHeight + 4;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(138, 147, 167);
    doc.text('This is a demo form generated by MedPull', 20, doc.internal.pageSize.height - 10);
    
    doc.save(`medpull_form_${Date.now()}.pdf`);
    showNotification('PDF downloaded successfully', 'success');
  });

  // Send to Clinic functionality
  $('#sendToClinicBtn').addEventListener('click', () => {
    if (formFields.length === 0) {
      showNotification('Please upload and fill out a form first', 'warning');
      return;
    }
    
    // Check if form has any filled fields
    const hasFilledFields = getDynamicFields().some(field => field.value.trim().length > 0);
    if (!hasFilledFields) {
      showNotification('Please fill out at least one field before sending', 'warning');
      return;
    }
    
    // Show confirmation modal
    const modal = new bootstrap.Modal(document.getElementById('sendToClinicModal'));
    modal.show();
  });

  $('#confirmSendBtn').addEventListener('click', async () => {
    // Close confirmation modal
    const confirmModal = bootstrap.Modal.getInstance(document.getElementById('sendToClinicModal'));
    confirmModal.hide();
    
    // Show loading state
    $('#sendToClinicBtn').disabled = true;
    $('#sendToClinicBtn').innerHTML = `
      <span class="spinner-border spinner-border-sm me-1" role="status"></span>
      Sending...
    `;
    
    // Simulate sending (in production, this would be an API call)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Collect form data
    const formData = {};
    formFields.forEach(field => {
      const input = getFieldByOriginalId(field.originalId);
      if (input && input.value) {
        formData[field.originalId] = {
          label: field.displayLabel,
          value: input.value
        };
      }
    });
    
    // Log to console (in production, send to API)
    console.log('Form sent to clinic:', {
      timestamp: new Date().toISOString(),
      fields: formData,
      language: currentLanguage
    });
    
    // Show success modal
    const successModal = new bootstrap.Modal(document.getElementById('sendSuccessModal'));
    successModal.show();
    
    // Reset button
    $('#sendToClinicBtn').disabled = false;
    $('#sendToClinicBtn').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      Send to Clinic
    `;
    
    showNotification('Form sent to clinic successfully!', 'success');
  });

  // Notification system
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 250px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
})();
