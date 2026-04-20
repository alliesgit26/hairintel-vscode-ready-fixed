/* ================================================================
   HAIRINTEL AI — Core Engine
   Data models · AI Decision Logic · localStorage · SVG Icons
   ================================================================ */

/* ---- Namespace ---- */
const HI = {

  /* ---- Storage Keys ---- */
  K: {
    STYLIST:       'hi_stylist',
    CLIENTS:       'hi_clients',
    CONSULTATIONS: 'hi_consultations',
    SETTINGS:      'hi_settings',
    USAGE:         'hi_usage',
    SUB:           'hi_subscription',
    DEMO:          'hi_demo_v1',
    AI_PREVIEW_USAGE: 'hi_ai_preview_usage'
  },

  /* ---- Storage ---- */
  get(k)    { try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k)    { localStorage.removeItem(k); },

  getClients()       { return this.get(this.K.CLIENTS)       || []; },
  setClients(v)      { this.set(this.K.CLIENTS, v); },
  getConsults()      { return this.get(this.K.CONSULTATIONS) || []; },
  setConsults(v)     { this.set(this.K.CONSULTATIONS, v); },
  getStylist()       { return this.get(this.K.STYLIST); },
  setStylist(v)      { this.set(this.K.STYLIST, v); },
  getSettings()      { return this.get(this.K.SETTINGS) || { laborRate: 150, hairCostPerGram: 1.2, blendTrim: 45 }; },
  saveSettings(v)    { this.set(this.K.SETTINGS, v); },
  getSub()           { return this.get(this.K.SUB) || { plan: 'free' }; },
  setSub(v)          { this.set(this.K.SUB, v); },
  getUsage()         { return this.get(this.K.USAGE) || { consultCount: 0 }; },
  incUsage()         { const u = this.getUsage(); u.consultCount++; this.set(this.K.USAGE, u); },

  /* ---- ID Generator ---- */
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); },

  /* ---- Free Plan Limit ---- */
  FREE_LIMIT: 3,
  canStartConsult() {
    const sub = this.getSub();
    if (sub.plan !== 'free') return true;
    return this.getUsage().consultCount < this.FREE_LIMIT;
  },
  remainingFree() {
    return Math.max(0, this.FREE_LIMIT - this.getUsage().consultCount);
  },
  getAIPreviewUsage() {
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
  const saved = this.get(this.K.AI_PREVIEW_USAGE) || { period: currentPeriod, count: 0 };

  if (saved.period !== currentPeriod) {
    const reset = { period: currentPeriod, count: 0 };
    this.set(this.K.AI_PREVIEW_USAGE, reset);
    return reset;
  }

  return saved;
},

getAIPreviewLimit() {
  const plan = this.getSub()?.plan || 'free';
  if (plan === 'studio') return 50;
  if (plan === 'pro') return 10;
  return 0;
},

canGenerateAIPreview() {
  return this.remainingAIPreviews() > 0;
},

remainingAIPreviews() {
  const limit = this.getAIPreviewLimit();
  const usage = this.getAIPreviewUsage();
  return Math.max(0, limit - usage.count);
},

incAIPreviewUsage() {
  const usage = this.getAIPreviewUsage();
  usage.count += 1;
  this.set(this.K.AI_PREVIEW_USAGE, usage);
},

  /* ================================================================
     AI CONSULTATION DECISION ENGINE
     Hybrid rules-based system generating:
     - readiness score (green/yellow/red)
     - placement flags
     - install plan
     - hair capacity score
     - summaries
     ================================================================ */

  analyze(consult) {
    const { hairProfile, stylistFlags, clientFlags, goals } = consult;

    /* --- 1. Integrity Score (0–100, starts high, deductions apply) --- */
    let integrity = 100;
    const warnings = [];
    const avoidZones = [];
    const cautionZones = [];
    const modifications = [];
    let installBlocked = false;

    /* --- Chemical history deductions --- */
    if (hairProfile.chemHistory === 'lightened')          { integrity -= 12; warnings.push('Lightened hair requires weight reduction and careful placement.'); }
    if (hairProfile.chemHistory === 'heavily-processed')  { integrity -= 22; warnings.push('Heavily processed hair has reduced tensile strength. Install must be minimal or deferred.'); }
    if (hairProfile.chemHistory === 'color-treated')      { integrity -= 5; }

    /* --- Density deductions --- */
    if (hairProfile.density === 'low') { integrity -= 18; warnings.push('Low hair density limits safe extension load and row placement.'); }

    /* --- Stylist flags --- */
    if (stylistFlags.includes('temple_thinning'))       { integrity -= 10; avoidZones.push('temples'); modifications.push('avoid_temples'); warnings.push('Temple thinning detected — side tension zones must be avoided.'); }
    if (stylistFlags.includes('crown_thinning'))        { integrity -= 10; cautionZones.push('crown'); modifications.push('lighten_crown'); warnings.push('Crown thinning requires reduced density in upper rows.'); }
    if (stylistFlags.includes('traction_alopecia'))     { integrity -= 18; avoidZones.push('perimeter'); modifications.push('avoid_temples'); modifications.push('reduce_rows'); warnings.push('Traction alopecia present — avoid perimeter tension and reduce row count.'); }
    if (stylistFlags.includes('postpartum_hair_loss'))  { integrity -= 14; modifications.push('reduce_grams'); modifications.push('reduce_rows'); warnings.push('Postpartum shedding phase may compromise hold. Lighter install recommended.'); }
    if (stylistFlags.includes('fragile_perimeter'))     { integrity -= 12; cautionZones.push('perimeter'); modifications.push('avoid_perimeter_fill'); warnings.push('Fragile perimeter — avoid placement near hairline.'); }
    if (stylistFlags.includes('breakage_zones'))        { integrity -= 10; cautionZones.push('breakage'); modifications.push('reduce_grams'); warnings.push('Active breakage zones detected. Reduce install weight.'); }
    if (stylistFlags.includes('chemical_damage'))       { integrity -= 14; modifications.push('reduce_grams'); modifications.push('lower_tension'); warnings.push('Chemical damage requires tension reduction and lighter install.'); }
    if (stylistFlags.includes('prior_extension_damage')){ integrity -= 12; modifications.push('reduce_rows'); modifications.push('lower_tension'); warnings.push('Previous extension damage — must reduce aggression of this install.'); }
    if (stylistFlags.includes('scalp_irritation'))      { integrity -= 8; modifications.push('lower_tension'); warnings.push('Scalp irritation noted. Ensure low-tension method.'); }
    if (stylistFlags.includes('scalp_condition'))       { integrity -= 10; modifications.push('lower_tension'); warnings.push('Scalp condition present — consult dermatologist before proceeding.'); }
    if (stylistFlags.includes('uneven_density'))        { integrity -= 8; cautionZones.push('sparse_areas'); modifications.push('strategic_placement'); warnings.push('Uneven density — row placement must follow density map.'); }
    if (stylistFlags.includes('short_crown_layers'))    { integrity -= 6; cautionZones.push('crown'); warnings.push('Short crown layers will affect blend quality.'); }

    /* --- Client flags --- */
    if (clientFlags.scalp_sensitivity === 'severe')     { integrity -= 14; modifications.push('lower_tension'); modifications.push('reduce_rows'); warnings.push('Severe scalp sensitivity — must use lowest-tension method available.'); }
    if (clientFlags.scalp_sensitivity === 'moderate')   { integrity -= 7; modifications.push('lower_tension'); warnings.push('Moderate scalp sensitivity — tension reduction recommended.'); }
    if (clientFlags.prior_extension_issues?.includes('tension'))   { modifications.push('lower_tension'); warnings.push('Client previously experienced tension issues.'); }
    if (clientFlags.prior_extension_issues?.includes('breakage'))  { integrity -= 8; modifications.push('reduce_grams'); warnings.push('Client previously experienced breakage from extensions.'); }
    if (clientFlags.shedding === 'heavy')               { integrity -= 10; modifications.push('reduce_grams'); warnings.push('Heavy shedding reported — install weight must be carefully managed.'); }
    if (clientFlags.shedding === 'increased')           { integrity -= 5; warnings.push('Increased shedding noted.'); }
    if (clientFlags.sensitivity_location?.includes('nape'))   { avoidZones.push('nape'); modifications.push('avoid_nape'); warnings.push('Nape sensitivity — lowest row must be adjusted or removed.'); }
    if (clientFlags.sensitivity_location?.includes('temples')) { avoidZones.push('temples'); modifications.push('avoid_temples'); }

    /* --- Block threshold --- */
    if (integrity <= 35) installBlocked = true;

    /* --- 2. Readiness Score --- */
    integrity = Math.max(0, Math.min(100, integrity));
    let readiness = integrity >= 72 ? 'green' : integrity >= 48 ? 'yellow' : 'red';
    if (installBlocked) readiness = 'red';

    /* --- 3. Deduplicate modifications --- */
    const mods = [...new Set(modifications)];

    /* --- 4. Generate Install Plan --- */
    const plan = this._buildInstallPlan(consult, integrity, mods, readiness, avoidZones, cautionZones);

    /* --- 5. Hair Capacity Score --- */
    const capacity = this._buildCapacityScore(consult, integrity, plan);

    /* --- 6. Build summaries --- */
    const summaries = this._buildSummaries(consult, plan, capacity, readiness, warnings, mods, avoidZones);

    /* --- 7. Placement map data --- */
    const placementMap = this._buildPlacementMap(consult, mods, avoidZones, cautionZones, plan);

    /* --- 8. Alternatives --- */
    const alternatives = this._buildAlternatives(consult, integrity, plan, mods);

    /* --- 9. Service estimate --- */
    const estimate = this._buildEstimate(consult, plan);

    return {
      integrityScore: integrity,
      readiness,
      warnings: warnings.slice(0, 6),
      modifications: mods,
      avoidZones,
      cautionZones,
      plan,
      capacity,
      summaries,
      placementMap,
      alternatives,
      estimate,
      analyzedAt: new Date().toISOString()
    };
  },

  /* ---- Build Install Plan ---- */
  _buildInstallPlan(consult, integrity, mods, readiness, avoidZones, cautionZones) {
    const { hairProfile, goals } = consult;
    const density = hairProfile.density;
    const length = hairProfile.length;
    const texture = hairProfile.texture;
    const scalp = consult.clientFlags.scalp_sensitivity;
    const desiredLength = goals.desiredLength;
    const volume = goals.transformLevel;

    if (readiness === 'red') {
      return {
        method: 'Not recommended',
        rows: 0,
        grams: 0,
        wefts: 0,
        extensionLength: 'N/A',
        complexity: 'N/A',
        maintenance: 'Reassess in 6–12 weeks',
        appointmentDuration: 'N/A',
        rationale: 'Hair integrity is too compromised for a safe extension install at this time.'
      };
    }

    /* Method selection */
    let method = 'Hand-Tied Wefts';
    if (scalp === 'severe' || mods.includes('lower_tension'))        method = 'Tape-Ins';
    if (density === 'low')                                           method = 'Tape-Ins';
    if (mods.includes('reduce_rows') && density !== 'low')           method = 'I-Tips';
    if (texture === 'coily' || texture === 'curly')                  method = 'Hand-Tied Wefts';
    if (integrity >= 80 && density === 'high')                       method = 'Hand-Tied Wefts';
    if (mods.includes('lower_tension') && density !== 'low')         method = 'I-Tips';

    /* Row count */
    let rows = density === 'high' ? 3 : density === 'medium' ? 2 : 1;
    if (mods.includes('reduce_rows'))    rows = Math.max(1, rows - 1);
    if (avoidZones.includes('nape'))     rows = Math.max(1, rows - 1);
    if (volume === 'subtle')             rows = Math.max(1, rows - 1);
    if (volume === 'dramatic')           rows = Math.min(4, rows + 1);

    /* Grams */
    const baseGrams = { 'low': 60, 'medium': 100, 'high': 140 }[density] || 100;
    let grams = baseGrams;
    if (volume === 'subtle')   grams = Math.round(grams * 0.75);
    if (volume === 'dramatic') grams = Math.round(grams * 1.35);
    if (mods.includes('reduce_grams'))   grams = Math.round(grams * 0.72);

    /* Extension length */
    const lengthMap = {
      'maintain':  { pixie: '8"', chin: '10"', shoulder: '14"', chest: '16"', 'mid-back': '20"', waist: '24"' },
      '+2':        { pixie: '10"', chin: '12"', shoulder: '16"', chest: '18"', 'mid-back': '22"', waist: '26"' },
      '+4':        { pixie: '12"', chin: '14"', shoulder: '18"', chest: '20"', 'mid-back': '24"', waist: '28"' },
      '+6':        { pixie: '14"', chin: '16"', shoulder: '20"', chest: '22"', 'mid-back': '26"', waist: '30"' },
      '+8':        { pixie: '16"', chin: '18"', shoulder: '22"', chest: '24"', 'mid-back': '28"', waist: '30"' }
    };
    const extLen = lengthMap[desiredLength]?.[length] || '18"';

    /* Complexity */
    let complexity = 'Moderate';
    if (method === 'I-Tips' || method === 'K-Tips')   complexity = 'Advanced';
    if (method === 'Tape-Ins')                        complexity = 'Standard';
    if (rows >= 3 && method === 'Hand-Tied Wefts')    complexity = 'Advanced';

    /* Maintenance */
    const maintMap = { 'Tape-Ins': '5–7 weeks', 'Hand-Tied Wefts': '7–9 weeks', 'I-Tips': '10–14 weeks', 'K-Tips': '10–14 weeks', 'Hybrid': '7–9 weeks' };
    const maintenance = maintMap[method] || '6–8 weeks';

    /* Duration */
    const durMap = { 'Tape-Ins': '2–3 hours', 'Hand-Tied Wefts': '4–6 hours', 'I-Tips': '3–5 hours', 'K-Tips': '3–5 hours', 'Hybrid': '3–5 hours' };
    const duration = durMap[method] || '3–4 hours';
    const wefts = method === 'Tape-Ins' ? Math.round(grams / 2.5) : method.includes('Tips') ? Math.round(grams / 1.2) : rows * 2;

    return { method, rows, grams, wefts, extensionLength: extLen, complexity, maintenance, appointmentDuration: duration, rationale: '' };
  },

  /* ---- Build Capacity Score ---- */
  _buildCapacityScore(consult, integrity, plan) {
    const density = consult.hairProfile.density;
    const baseCapacity = density === 'high' ? 90 : density === 'medium' ? 70 : 50;
    const score = Math.min(100, Math.round(baseCapacity * (integrity / 100) * 1.2));
    const safeMin = Math.round(plan.grams * 0.7);
    const safeMax = Math.round(plan.grams * 1.3);
    const recommended = plan.grams;
    const status = plan.grams <= safeMax ? 'SAFE' : 'OVERLOAD RISK';
    return { score, safeMin, safeMax, recommended, status };
  },

  /* ---- Build Placement Map Data ---- */
  _buildPlacementMap(consult, mods, avoidZones, cautionZones, plan) {
    const rows = plan.rows;
    const zones = [];

    // Row positions (from nape up): 0=nape, 1=mid, 2=occipital, 3=crown area
    const allRows = ['nape','mid-occipital','occipital','crown-blend'];
    const activeRows = allRows.slice(0, Math.min(rows + 1, 4));

    activeRows.forEach((row, i) => {
      const isAvoid = (row === 'nape' && avoidZones.includes('nape')) ||
                      (row === 'crown-blend' && avoidZones.includes('temples'));
      const isCaution = cautionZones.includes('crown') && row === 'crown-blend';
      zones.push({ row, status: isAvoid ? 'avoid' : isCaution ? 'caution' : 'place', index: i });
    });

    return {
      rows: zones,
      avoidTemples: avoidZones.includes('temples'),
      avoidNape: avoidZones.includes('nape'),
      cautionCrown: cautionZones.includes('crown'),
      density: plan.rows
    };
  },

  /* ---- Build Summaries ---- */
  _buildSummaries(consult, plan, capacity, readiness, warnings, mods, avoidZones) {
    const dn = { low:'low', medium:'medium', high:'full' }[consult.hairProfile.density] || 'medium';
    const method = plan.method;
    const rows = plan.rows;
    const grams = plan.grams;
    const goal = consult.goals.primaryGoal;
    const level = consult.goals.transformLevel;
    const clientName = consult.clientInfo?.firstName || 'your client';

    let clientSummary = '';
    let stylistSummary = '';

    if (readiness === 'red') {
      clientSummary = `Based on your current hair assessment, extensions are not recommended at this time. Your hair needs a recovery period focused on restoring strength and density before an install can be safely performed. We want to protect your hair's long-term health.`;
      stylistSummary = `Hair integrity score: ${capacity.score}/100. Install not advised. Recommend: strengthening treatments, trim damaged ends, and scalp recovery protocol. Reassess in 6–12 weeks.`;
    } else if (readiness === 'yellow') {
      clientSummary = `Your hair supports extensions with a carefully modified approach. ${method} is recommended using ${rows} ${rows === 1 ? 'row' : 'rows'} with ${grams}g — a lighter install that protects vulnerable areas while still giving you ${goal === 'add-volume' ? 'beautiful fullness' : 'added length and movement'}. Certain zones will be avoided to keep your hair healthy.`;
      stylistSummary = `Modified install plan: ${method}, ${rows} ${rows === 1 ? 'row' : 'rows'}, ${grams}g. Modifications applied: ${mods.map(m=>m.replace(/_/g,' ')).join(', ')}. Avoid zones: ${avoidZones.join(', ') || 'none'}. Monitor tension closely and schedule first check-in at 4 weeks.`;
    } else {
      clientSummary = `Your hair density and integrity fully support a ${rows}-row ${method} install. We're recommending ${grams}g of extensions at ${plan.extensionLength} for ${level === 'dramatic' ? 'a dramatic, full transformation' : level === 'noticeable' ? 'a beautifully noticeable result' : 'a refined, natural enhancement'}. Maintenance is every ${plan.maintenance}.`;
      stylistSummary = `Full install approved: ${method}, ${rows} ${rows === 1 ? 'row' : 'rows'}, ${grams}g at ${plan.extensionLength}. Hair integrity score: ${capacity.score}/100. Hair capacity: ${capacity.safeMin}g–${capacity.safeMax}g safe load. No major restrictions. Standard maintenance at ${plan.maintenance}.`;
    }

    return { clientSummary, stylistSummary };
  },

  /* ---- Build Alternatives ---- */
  _buildAlternatives(consult, integrity, plan, mods) {
    const alts = [];
    const density = consult.hairProfile.density;

    if (plan.method !== 'Tape-Ins') {
      alts.push({
        title: 'Lower Maintenance Option',
        method: 'Tape-Ins',
        description: 'Tape-in wefts offer a seamless, flat application that can be moved up every 5–7 weeks. Less chair time and easier maintenance for active lifestyles.',
        grams: Math.round(plan.grams * 0.85),
        maintenance: '5–7 weeks',
        priceNote: 'Generally lower labor cost'
      });
    }

    if (plan.grams > 80) {
      alts.push({
        title: 'Lighter Install Option',
        method: plan.method,
        description: `A reduced weight install using ${Math.round(plan.grams * 0.7)}g focuses on strategic volume rather than full coverage. Ideal for protecting density-compromised areas.`,
        grams: Math.round(plan.grams * 0.7),
        maintenance: plan.maintenance,
        priceNote: 'Lower hair cost'
      });
    }

    if (plan.method !== 'I-Tips' && density !== 'low') {
      alts.push({
        title: 'Strand-by-Strand Option',
        method: 'I-Tips',
        description: 'Individual I-tip strands allow precise placement with zero tension at the weft row. Best for long-lasting wear and natural movement with minimal daily maintenance.',
        grams: plan.grams,
        maintenance: '10–14 weeks',
        priceNote: 'Higher upfront, longer interval'
      });
    }

    return alts.slice(0, 3);
  },

  /* ---- Build Service Estimate ---- */
  _buildEstimate(consult, plan) {
    if (plan.rows === 0) return { total: 0, breakdown: [], note: 'No service recommended at this time.' };
    const s = HI.getSettings();
    const laborHrs = { 'Tape-Ins': 2.5, 'Hand-Tied Wefts': 5, 'I-Tips': 4, 'K-Tips': 4, 'Hybrid': 4 }[plan.method] || 3;
    const laborCost = Math.round(laborHrs * (s.laborRate || 150));
    const hairCost = Math.round(plan.grams * (s.hairCostPerGram || 1.2));
    const blendTrim = s.blendTrim || 45;
    const total = laborCost + hairCost + blendTrim;
    return {
      total,
      breakdown: [
        { label: 'Installation Labor', value: laborCost, note: `${laborHrs} hrs` },
        { label: 'Hair Cost (approx.)', value: hairCost, note: `${plan.grams}g` },
        { label: 'Blend & Trim', value: blendTrim, note: 'Finish cut' }
      ]
    };
  },

  /* ---- Demo Data ---- */
  loadDemo() {
    if (this.get(this.K.DEMO)) return;
    this.setStylist({ name: 'Allison Marks', salon: 'Allison Marks Extension Studio', email: 'allison@marksstudio.com' });
    const clients = [
      { id: 'c01', firstName: 'Sienna', lastName: 'Rhodes', phone: '(404) 555-0181', email: 'sienna@email.com', notes: 'Prefers natural look', createdAt: new Date(Date.now()-30*86400000).toISOString() },
      { id: 'c02', firstName: 'Madison', lastName: 'Cross', phone: '(770) 555-0282', email: 'madison@email.com', notes: 'Color-treated, wants length', createdAt: new Date(Date.now()-14*86400000).toISOString() },
      { id: 'c03', firstName: 'Priya', lastName: 'Sharma', phone: '(678) 555-0333', email: 'priya@email.com', notes: 'First extension client', createdAt: new Date(Date.now()-7*86400000).toISOString() }
    ];
    this.setClients(clients);
    this.set(this.K.DEMO, true);
  }
};

/* ---- Active Consultation State (in-memory) ---- */
const HIConsult = {
  data: {},
  reset()     { this.data = {}; },
  set(k, v)   { this.data[k] = v; },
  get(k)      { return this.data[k]; },
  merge(k, v) { this.data[k] = { ...(this.data[k] || {}), ...v }; },
  full()      { return this.data; }
};
