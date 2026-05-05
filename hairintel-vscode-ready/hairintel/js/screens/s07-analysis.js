/* ================================================================
   S07 - ANALYSIS (Animated Processing Steps)
   ================================================================ */
function renderS07Analysis() {
  return `
  <div class="hi-screen" id="screen-analysis" style="background:var(--bg);">
    ${hiProgressBar(5, 6)}
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Analyzing Hair</div><div class="hi-header-sub">Step 6 of 6</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 120px);padding-top:20px;">

      <!-- Brain icon with pulse -->
      <div class="hi-analysis-orb" id="analysis-orb">
        <div class="hi-analysis-orb-ring"></div>
        <div class="hi-analysis-orb-ring hi-analysis-orb-ring-2"></div>
        <div class="hi-analysis-orb-core">
          ${HIcons.brain}
        </div>
      </div>

      <div style="margin-top:28px;margin-bottom:32px;text-align:center;">
        <h2 class="hi-heading hi-mb-2" style="font-size:22px;">Analyzing Hair Profile</h2>
        <p class="hi-body" id="analysis-subtitle" style="min-height:40px;transition:opacity 0.3s;">Running consultation decision engine...</p>
      </div>

      <!-- Steps List -->
      <div class="hi-analysis-steps" id="analysis-steps">
        ${[
          { id:'step-density',   label:'Evaluating hair density & texture' },
          { id:'step-integrity', label:'Calculating structural integrity' },
          { id:'step-load',      label:'Determining safe extension load' },
          { id:'step-concerns',  label:'Processing concern flags' },
          { id:'step-strategy',  label:'Building install strategy' },
          { id:'step-summary',   label:'Generating consultation summary' }
        ].map(s => `
        <div class="hi-analysis-step" id="${s.id}">
          <div class="hi-analysis-step-icon" id="${s.id}-icon">
            <div class="hi-analysis-spinner"></div>
          </div>
          <span class="hi-analysis-step-label">${s.label}</span>
        </div>`).join('')}
      </div>

    </div>
  </div>`;
}

function initS07Analysis() {
  const steps = [
    { id:'step-density',   delay: 400  },
    { id:'step-integrity', delay: 900  },
    { id:'step-load',      delay: 1500 },
    { id:'step-concerns',  delay: 2100 },
    { id:'step-strategy',  delay: 2700 },
    { id:'step-summary',   delay: 3200 }
  ];

  const subtitles = [
    { at: 0,    text: 'Running consultation decision engine...' },
    { at: 500,  text: 'Evaluating density and chemical history...' },
    { at: 1200, text: 'Analyzing concern flags and client data...' },
    { at: 2000, text: 'Building install plan and placement map...' },
    { at: 2800, text: 'Preparing your consultation results...' }
  ];

  subtitles.forEach(s => {
    setTimeout(() => {
      const el = hEl('analysis-subtitle');
      if (el) { el.style.opacity = '0'; setTimeout(() => { el.textContent = s.text; el.style.opacity = '1'; }, 150); }
    }, s.at);
  });

  steps.forEach((step, i) => {
    setTimeout(() => {
      const icon = hEl(`${step.id}-icon`);
      const row  = hEl(step.id);
      if (icon) {
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`;
        icon.style.background = 'var(--gold-pale)';
        icon.style.borderColor = 'var(--gold-border)';
      }
      if (row) row.classList.add('done');
    }, step.delay);
  });

  /* Run actual analysis and navigate */
  setTimeout(() => {
    /* Build full consult payload */
    const consult = {
      clientId:    HIConsult.get('clientId'),
      clientInfo:  HIConsult.get('clientInfo') || {},
      photos:      HIConsult.get('photos') || {},
      goals:       HIConsult.get('goals') || { primaryGoal:'add-length', transformLevel:'noticeable', desiredLength:'+4' },
      hairProfile: HIConsult.get('hairProfile') || { density:'medium', texture:'straight', length:'shoulder', chemHistory:'none' },
      stylistFlags: HIConsult.get('stylistFlags') || [],
      clientFlags:  HIConsult.get('clientFlags') || { scalp_sensitivity:'none', shedding:'normal', prior_extensions:'no', prior_extension_issues:[], sensitivity_location:[] },
      stylistNotes: HIConsult.get('stylistNotes') || ''
    };

    const result = HI.analyze(consult);
    consult.result = result;
    consult.id = HI.genId();
    consult.createdAt = new Date().toISOString();

    /* Save consultation */
    const consults = HI.getConsults();
    consults.push(consult);
    HI.setConsults(consults);
    HI.incUsage();

    /* Store result in session */
    HIConsult.set('result', result);
    HIConsult.set('consultId', consult.id);

    HIApp.go('readiness', { consultId: consult.id });
  }, 3800);
}

