/* ================================================================
   HAIRINTEL AI - Core Engine
   Data models - Professional Decision Logic - localStorage - State
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
  getSub()           { return this.get(this.K.SUB) || { plan: 'free', status: 'inactive' }; },
  setSub(v)          { this.set(this.K.SUB, { ...(this.getSub() || {}), ...(v || {}) }); },
  getUsage()         { return this.get(this.K.USAGE) || { consultCount: 0 }; },
  incUsage()         { const u = this.getUsage(); u.consultCount++; this.set(this.K.USAGE, u); },

  /* ---- ID Generator ---- */
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); },

  /* ---- Free Plan Limit ---- */
  FREE_LIMIT: 3,
  canStartConsult() {
    const sub = this.getSub();
    if (sub.plan && sub.plan !== 'free') return true;
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
    const plan = String(this.getSub()?.plan || 'free').toLowerCase();
    if (plan === 'studio' || plan === 'salon' || plan === 'team') return 50;
    if (plan === 'pro' || plan === 'professional') return 10;
    return 0;
  },

  canGenerateAIPreview() {
    const sub = this.getSub();
    const plan = String(sub.plan || 'free').toLowerCase();
    const status = String(sub.status || '').toLowerCase();
    const active = ['active', 'trialing'].includes(status);
    const paidPreviewPlan = ['pro', 'professional', 'studio', 'salon', 'team'].includes(plan);
    return active && paidPreviewPlan && this.remainingAIPreviews() > 0;
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

  _goalNeedsLength(goal) {
    return goal === 'add-length' || goal === 'volume-length';
  },

  _lengthIncreaseValue(desiredLength) {
    if (desiredLength === 'maintain') return 0;
    const n = Number(String(desiredLength || '').replace(/[^0-9]/g, ''));
    return Number.isFinite(n) ? n : 0;
  },

  _capReadiness(current, cap) {
    const rank = { red: 0, yellow: 1, green: 2 };
    return rank[current] > rank[cap] ? cap : current;
  },

  _uniquePush(arr, value) {
    if (!arr.includes(value)) arr.push(value);
  },

  /* ================================================================
     CONSULTATION DECISION ENGINE
     Generates:
     - readiness rating
     - placement restrictions
     - install plan
     - capacity score
     - client/stylist summaries
     ================================================================ */

  analyze(consult) {
    const { hairProfile = {}, stylistFlags = [], clientFlags = {}, goals = {} } = consult;

    let integrity = 100;
    const warnings = [];
    const avoidZones = [];
    const cautionZones = [];
    const modifications = [];
    let installBlocked = false;

    const currentLength = hairProfile.length;
    const desiredIncrease = this._lengthIncreaseValue(goals.desiredLength);
    const primaryGoal = goals.primaryGoal;
    const transformLevel = goals.transformLevel;

    /* --- Chemical history deductions --- */
    if (hairProfile.chemHistory === 'lightened') {
      integrity -= 12;
      warnings.push('Lightened hair requires reduced weight, careful color matching, and lower-tension placement.');
      modifications.push('reduce_grams', 'lower_tension');
    }
    if (hairProfile.chemHistory === 'heavily-processed') {
      integrity -= 24;
      warnings.push('Heavily processed hair has reduced tensile strength. A minimal or deferred install may be safer.');
      modifications.push('reduce_grams', 'lower_tension', 'reduce_rows');
    }
    if (hairProfile.chemHistory === 'color-treated') {
      integrity -= 5;
      warnings.push('Color-treated hair needs compatibility review before adhesive, heat, or bead-based methods.');
    }

    /* --- Density deductions --- */
    if (hairProfile.density === 'low') {
      integrity -= 20;
      warnings.push('Low hair density limits safe extension load and may expose rows, beads, or attachment points.');
      modifications.push('reduce_grams', 'reduce_rows', 'lower_tension', 'lightweight_method');
      cautionZones.push('sparse_areas');
    }

    /* --- Current length / blend-risk deductions --- */
    if (currentLength === 'pixie') {
      integrity -= 25;
      warnings.push('Pixie-length hair has major blend limitations. Recommend an in-person consultation and staged transition before a full extension transformation.');
      modifications.push('blend_required', 'strategic_placement', 'reduce_grams', 'reduce_rows');
      cautionZones.push('short_hair_blend');
      if (desiredIncrease >= 6 || transformLevel === 'dramatic') {
        warnings.push('A dramatic jump from pixie length has high shelf-line and attachment-visibility risk. Full install should be deferred or manually approved by the stylist.');
        installBlocked = true;
      }
    }

    if (currentLength === 'chin') {
      integrity -= 12;
      warnings.push('Chin-length hair requires advanced blending, layering, and density matching to avoid a visible shelf line.');
      modifications.push('blend_required', 'strategic_placement');
      cautionZones.push('short_hair_blend');
      if (desiredIncrease >= 8 || transformLevel === 'dramatic') {
        integrity -= 8;
        warnings.push('Chin-length hair with an 8-inch or dramatic length goal needs a shelf-line warning, face-framing blend work, and possible staged length increase.');
        modifications.push('advanced_blending', 'reduce_rows');
      }
    }

    if (currentLength === 'shoulder' && desiredIncrease >= 8) {
      warnings.push('An 8-inch increase from shoulder length may require layering and added density to prevent a disconnected perimeter.');
      modifications.push('blend_required');
    }

    /* --- Goal-specific logic --- */
    if (primaryGoal === 'color-blend') {
      warnings.push('Color blending should prioritize tone, melt, and placement strategy over dramatic length change.');
      modifications.push('color_strategy', 'reduce_grams');
    }
    if (primaryGoal === 'add-volume' && desiredIncrease > 0) {
      warnings.push('The selected goal is volume, but a length increase was also selected. Recommendation will favor fullness and avoid an aggressive length jump.');
      modifications.push('volume_priority');
    }
    if (primaryGoal === 'correction') {
      integrity -= 8;
      warnings.push('Extension correction requires conservative placement until previous install issues are identified.');
      modifications.push('correction_plan', 'lower_tension', 'strategic_placement');
    }

    /* --- Stylist flags --- */
    if (stylistFlags.includes('temple_thinning')) {
      integrity -= 12; avoidZones.push('temples'); modifications.push('avoid_temples');
      warnings.push('Temple thinning detected - side tension zones must be avoided.');
    }
    if (stylistFlags.includes('crown_thinning')) {
      integrity -= 12; cautionZones.push('crown'); modifications.push('lighten_crown');
      warnings.push('Crown thinning requires reduced density in upper rows.');
    }
    if (stylistFlags.includes('traction_alopecia')) {
      integrity -= 25; avoidZones.push('perimeter', 'temples', 'nape'); modifications.push('avoid_perimeter_fill', 'avoid_temples', 'avoid_nape', 'reduce_rows', 'reduce_grams', 'lower_tension');
      warnings.push('Traction alopecia present - avoid perimeter, temples, nape tension, and heavy installs.');
    }
    if (stylistFlags.includes('postpartum_hair_loss')) {
      integrity -= 14; modifications.push('reduce_grams', 'reduce_rows');
      warnings.push('Postpartum shedding phase may compromise hold. Lighter install recommended.');
    }
    if (stylistFlags.includes('fragile_perimeter')) {
      integrity -= 14; avoidZones.push('perimeter'); modifications.push('avoid_perimeter_fill', 'lower_tension');
      warnings.push('Fragile perimeter - avoid placement near hairline and reduce edge tension.');
    }
    if (stylistFlags.includes('breakage_zones')) {
      integrity -= 12; cautionZones.push('breakage'); modifications.push('reduce_grams', 'strategic_placement');
      warnings.push('Active breakage zones detected. Reduce install weight and avoid compromised areas.');
    }
    if (stylistFlags.includes('chemical_damage')) {
      integrity -= 16; modifications.push('reduce_grams', 'lower_tension', 'reduce_rows');
      warnings.push('Chemical damage requires tension reduction and lighter install.');
    }
    if (stylistFlags.includes('prior_extension_damage')) {
      integrity -= 14; modifications.push('reduce_rows', 'lower_tension', 'reduce_grams');
      warnings.push('Previous extension damage - reduce aggression of this install and document tension tolerance.');
    }
    if (stylistFlags.includes('scalp_irritation')) {
      integrity -= 10; modifications.push('lower_tension');
      warnings.push('Scalp irritation noted. Use low-tension placement and avoid irritated zones.');
    }
    if (stylistFlags.includes('scalp_condition')) {
      integrity -= 16; modifications.push('lower_tension');
      warnings.push('Scalp condition present - consult a dermatologist or defer if active irritation, lesions, or inflammation are present.');
    }
    if (stylistFlags.includes('uneven_density')) {
      integrity -= 10; cautionZones.push('sparse_areas'); modifications.push('strategic_placement');
      warnings.push('Uneven density - row placement must follow the density map, not a standard pattern.');
    }
    if (stylistFlags.includes('short_crown_layers')) {
      integrity -= 8; cautionZones.push('crown'); modifications.push('blend_required');
      warnings.push('Short crown layers will affect blend quality and may need face-framing or crown blending.');
    }

    /* --- Client flags --- */
    if (clientFlags.scalp_sensitivity === 'severe') {
      integrity -= 22; modifications.push('lower_tension', 'reduce_rows', 'reduce_grams', 'lightweight_method');
      warnings.push('Severe scalp sensitivity - avoid heavy or high-tension methods and require a conservative trial approach.');
    }
    if (clientFlags.scalp_sensitivity === 'moderate') {
      integrity -= 9; modifications.push('lower_tension');
      warnings.push('Moderate scalp sensitivity - tension reduction and early follow-up recommended.');
    }
    if (clientFlags.prior_extension_issues?.includes('tension')) {
      integrity -= 6; modifications.push('lower_tension', 'reduce_rows');
      warnings.push('Client previously experienced tension issues.');
    }
    if (clientFlags.prior_extension_issues?.includes('breakage')) {
      integrity -= 10; modifications.push('reduce_grams', 'lower_tension');
      warnings.push('Client previously experienced breakage from extensions.');
    }
    if (clientFlags.prior_extension_issues?.includes('slipping')) {
      warnings.push('Prior slipping reported - attachment method and maintenance interval should be reassessed.');
      modifications.push('method_review');
    }
    if (clientFlags.shedding === 'heavy') {
      integrity -= 14; modifications.push('reduce_grams', 'reduce_rows');
      warnings.push('Heavy shedding reported - install weight must be carefully managed or deferred if shedding is active.');
    }
    if (clientFlags.shedding === 'increased') {
      integrity -= 7; modifications.push('reduce_grams');
      warnings.push('Increased shedding noted. Use a lighter install and schedule an early check-in.');
    }
    if (clientFlags.sensitivity_location?.includes('nape')) {
      avoidZones.push('nape'); modifications.push('avoid_nape');
      warnings.push('Nape sensitivity - lowest row must be adjusted or removed.');
    }
    if (clientFlags.sensitivity_location?.includes('temples')) {
      avoidZones.push('temples'); modifications.push('avoid_temples');
      warnings.push('Temple sensitivity - avoid side tension and perimeter fill.');
    }

    /* --- Block and readiness thresholds --- */
    integrity = Math.max(0, Math.min(100, integrity));
    if (integrity <= 35) installBlocked = true;

    let readiness = integrity >= 72 ? 'green' : integrity >= 48 ? 'yellow' : 'red';

    if (currentLength === 'chin' || currentLength === 'pixie') readiness = this._capReadiness(readiness, 'yellow');
    if (clientFlags.scalp_sensitivity === 'severe') readiness = this._capReadiness(readiness, 'yellow');
    if (stylistFlags.includes('traction_alopecia') || stylistFlags.includes('chemical_damage') || stylistFlags.includes('prior_extension_damage')) readiness = this._capReadiness(readiness, 'yellow');
    if (installBlocked) readiness = 'red';

    const mods = [...new Set(modifications)];
    const uniqueAvoidZones = [...new Set(avoidZones)];
    const uniqueCautionZones = [...new Set(cautionZones)];
    const uniqueWarnings = [...new Set(warnings)];

    const plan = this._buildInstallPlan(consult, integrity, mods, readiness, uniqueAvoidZones, uniqueCautionZones);
    const capacity = this._buildCapacityScore(consult, integrity, plan, mods, uniqueAvoidZones, uniqueCautionZones);
    const placementMap = this._buildPlacementMap(consult, mods, uniqueAvoidZones, uniqueCautionZones, plan);
    const summaries = this._buildSummaries(consult, plan, capacity, readiness, uniqueWarnings, mods, uniqueAvoidZones);
    const alternatives = this._buildAlternatives(consult, integrity, plan, mods, readiness);
    const estimate = this._buildEstimate(consult, plan);

    return {
      integrityScore: integrity,
      readiness,
      warnings: uniqueWarnings.slice(0, 9),
      modifications: mods,
      avoidZones: uniqueAvoidZones,
      cautionZones: uniqueCautionZones,
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
    const { hairProfile = {}, goals = {}, clientFlags = {} } = consult;
    const density = hairProfile.density;
    const currentLength = hairProfile.length;
    const texture = hairProfile.texture;
    const scalp = clientFlags.scalp_sensitivity;
    const desiredIncrease = this._lengthIncreaseValue(goals.desiredLength);
    const volume = goals.transformLevel;
    const primaryGoal = goals.primaryGoal;
    const highRisk = mods.includes('lower_tension') || mods.includes('lightweight_method') || mods.includes('reduce_grams') || avoidZones.length > 0;

    if (readiness === 'red') {
      return {
        method: 'Not recommended',
        rows: 0,
        grams: 0,
        wefts: 0,
        extensionLength: 'N/A',
        complexity: 'N/A',
        maintenance: 'Reassess in 6-12 weeks',
        appointmentDuration: 'N/A',
        rationale: 'Hair or scalp conditions are too compromised for a safe extension install at this time.'
      };
    }

    /* Method selection - safety overrides win before texture preferences. */
    let method = 'Hand-Tied Wefts';
    if (density === 'low' || mods.includes('lightweight_method')) method = 'Tape-Ins';
    if (mods.includes('lower_tension') && density !== 'low' && scalp !== 'severe') method = 'I-Tips';
    if (scalp === 'severe') method = 'Tape-Ins';
    if (mods.includes('traction_alopecia') || avoidZones.includes('perimeter')) method = density === 'low' ? 'Tape-Ins' : 'I-Tips';
    if ((texture === 'curly' || texture === 'coily') && !highRisk && density !== 'low') method = 'Hand-Tied Wefts';
    if (currentLength === 'chin' && primaryGoal !== 'add-volume' && density !== 'low' && scalp !== 'severe') method = 'Hybrid';
    if (currentLength === 'pixie') method = 'Consultation/Staged Transition';

    /* Row count */
    let rows = density === 'high' ? 3 : density === 'medium' ? 2 : 1;
    if (mods.includes('reduce_rows')) rows = Math.max(1, rows - 1);
    if (avoidZones.includes('nape')) rows = Math.max(1, rows - 1);
    if (volume === 'subtle') rows = Math.max(1, rows - 1);
    if (volume === 'dramatic' && !highRisk && currentLength !== 'chin' && currentLength !== 'pixie') rows = Math.min(4, rows + 1);
    if (currentLength === 'chin') rows = Math.min(rows, density === 'high' ? 2 : 1);
    if (currentLength === 'pixie') rows = 0;

    /* Grams */
    const baseGrams = { low: 55, medium: 95, high: 130 }[density] || 95;
    let grams = baseGrams;
    if (primaryGoal === 'add-volume') grams = Math.round(grams * 0.85);
    if (primaryGoal === 'color-blend') grams = Math.round(grams * 0.7);
    if (volume === 'subtle') grams = Math.round(grams * 0.75);
    if (volume === 'dramatic' && !highRisk) grams = Math.round(grams * 1.25);
    if (desiredIncrease >= 8 && density !== 'low' && !mods.includes('reduce_grams')) grams = Math.round(grams * 1.1);
    if (mods.includes('reduce_grams')) grams = Math.round(grams * 0.7);
    if (currentLength === 'chin') grams = Math.min(grams, density === 'high' ? 110 : density === 'medium' ? 85 : 55);
    if (currentLength === 'pixie') grams = 0;

    /* Extension length. These are recommended finished extension lengths, not inches added. */
    const lengthMap = {
      maintain: { pixie: 'Consult only', chin: '10-12"', shoulder: '14"', chest: '16"', 'mid-back': '20"', waist: '24"' },
      '+2':     { pixie: 'Consult only', chin: '12"',    shoulder: '16"', chest: '18"', 'mid-back': '22"', waist: '26"' },
      '+4':     { pixie: 'Consult only', chin: '14-16"', shoulder: '18"', chest: '20"', 'mid-back': '24"', waist: '28"' },
      '+6':     { pixie: 'Consult only', chin: '16"',    shoulder: '20"', chest: '22"', 'mid-back': '26"', waist: '30"' },
      '+8':     { pixie: 'Consult only', chin: '18"',    shoulder: '22"', chest: '24"', 'mid-back': '28"', waist: '30"' }
    };
    let extLen = lengthMap[goals.desiredLength]?.[currentLength] || '18"';
    if (primaryGoal === 'add-volume' || primaryGoal === 'color-blend') {
      extLen = lengthMap.maintain[currentLength] || extLen;
    }

    /* Complexity */
    let complexity = 'Moderate';
    if (['I-Tips', 'K-Tips', 'Hybrid', 'Consultation/Staged Transition'].includes(method)) complexity = 'Advanced';
    if (rows >= 3 && method === 'Hand-Tied Wefts') complexity = 'Advanced';
    if (mods.includes('advanced_blending') || mods.includes('blend_required')) complexity = 'Advanced';

    /* Maintenance */
    const maintMap = {
      'Tape-Ins': '5-7 weeks',
      'Hand-Tied Wefts': '7-9 weeks',
      'I-Tips': '10-14 weeks',
      'K-Tips': '10-14 weeks',
      'Hybrid': '6-8 weeks',
      'Consultation/Staged Transition': 'Reassess after grow-out or transitional service'
    };
    const maintenance = maintMap[method] || '6-8 weeks';

    /* Duration */
    const durMap = {
      'Tape-Ins': '2-3 hours',
      'Hand-Tied Wefts': '4-6 hours',
      'I-Tips': '3-5 hours',
      'K-Tips': '3-5 hours',
      'Hybrid': '4-6 hours',
      'Consultation/Staged Transition': 'Consultation only'
    };
    const duration = durMap[method] || '3-4 hours';
    const wefts = rows === 0 ? 0 : method === 'Tape-Ins' ? Math.round(grams / 2.5) : method.includes('Tips') ? Math.round(grams / 1.2) : rows * 2;

    const rationaleBits = [];
    if (mods.includes('blend_required')) rationaleBits.push('Advanced blending required due to current length or layering.');
    if (mods.includes('lower_tension')) rationaleBits.push('Lower-tension method selected because of sensitivity or damage flags.');
    if (mods.includes('reduce_grams')) rationaleBits.push('Weight reduced to protect density and hair integrity.');
    if (primaryGoal === 'color-blend') rationaleBits.push('Color strategy prioritized over length gain.');

    return {
      method,
      rows,
      grams,
      wefts,
      extensionLength: extLen,
      complexity,
      maintenance,
      appointmentDuration: duration,
      rationale: rationaleBits.join(' ')
    };
  },

  /* ---- Build Capacity Score ---- */
  _buildCapacityScore(consult, integrity, plan, mods = [], avoidZones = [], cautionZones = []) {
    if (!plan || plan.rows === 0) {
      return { score: Math.max(0, Math.round(integrity)), safeMin: 0, safeMax: 0, recommended: 0, status: 'NOT RECOMMENDED' };
    }

    const { hairProfile = {}, clientFlags = {} } = consult;
    const density = hairProfile.density;
    const length = hairProfile.length;
    const baseMax = { low: 70, medium: 115, high: 155 }[density] || 115;
    let safeMax = baseMax;

    safeMax *= Math.max(0.35, integrity / 100);
    if (length === 'pixie') safeMax *= 0.35;
    if (length === 'chin') safeMax *= 0.7;
    if (mods.includes('reduce_grams')) safeMax *= 0.82;
    if (mods.includes('lower_tension')) safeMax *= 0.9;
    if (mods.includes('blend_required')) safeMax *= 0.92;
    if (avoidZones.includes('nape') || avoidZones.includes('temples') || avoidZones.includes('perimeter')) safeMax *= 0.85;
    if (clientFlags.scalp_sensitivity === 'severe') safeMax *= 0.72;
    if (clientFlags.shedding === 'heavy') safeMax *= 0.78;

    safeMax = Math.max(0, Math.round(safeMax));
    const safeMin = safeMax === 0 ? 0 : Math.max(30, Math.round(safeMax * 0.45));
    const recommended = plan.grams;
    const status = recommended > safeMax ? 'OVERLOAD RISK' : recommended > safeMax * 0.9 ? 'BORDERLINE' : 'SAFE';
    const score = Math.max(0, Math.min(100, Math.round((safeMax / baseMax) * 100)));

    return { score, safeMin, safeMax, recommended, status };
  },

  /* ---- Build Placement Map Data ---- */
  _buildPlacementMap(consult, mods, avoidZones, cautionZones, plan) {
    const rows = Math.max(0, plan.rows || 0);
    const zones = [];
    const allRows = ['nape', 'mid-occipital', 'occipital', 'crown-blend'];
    const activeRows = allRows.slice(0, Math.min(rows, 4));
    const avoidPerimeter = avoidZones.includes('perimeter');

    activeRows.forEach((row, i) => {
      const isNape = row === 'nape';
      const isCrown = row === 'crown-blend';
      const isAvoid =
        (isNape && (avoidZones.includes('nape') || avoidPerimeter)) ||
        (isCrown && avoidZones.includes('temples')) ||
        (row === 'mid-occipital' && avoidPerimeter && rows <= 1);
      const isCaution =
        (cautionZones.includes('crown') && isCrown) ||
        (cautionZones.includes('sparse_areas') && (row === 'crown-blend' || row === 'occipital')) ||
        (cautionZones.includes('short_hair_blend')) ||
        (cautionZones.includes('breakage'));
      zones.push({ row, status: isAvoid ? 'avoid' : isCaution ? 'caution' : 'place', index: i });
    });

    return {
      rows: zones,
      avoidTemples: avoidZones.includes('temples') || avoidPerimeter,
      avoidNape: avoidZones.includes('nape') || avoidPerimeter,
      avoidPerimeter,
      cautionCrown: cautionZones.includes('crown'),
      cautionShortBlend: cautionZones.includes('short_hair_blend'),
      density: rows
    };
  },

  /* ---- Build Summaries ---- */
  _buildSummaries(consult, plan, capacity, readiness, warnings, mods, avoidZones) {
    const method = plan.method;
    const rows = plan.rows;
    const grams = plan.grams;
    const goal = consult.goals?.primaryGoal;
    const level = consult.goals?.transformLevel;
    const shortBlend = mods.includes('blend_required') || mods.includes('advanced_blending');

    let clientSummary = '';
    let stylistSummary = '';

    if (readiness === 'red') {
      clientSummary = 'Based on the current hair and scalp assessment, extensions are not recommended at this time. A recovery or transitional plan is safer before adding extension weight or attachment tension.';
      stylistSummary = `Install not advised. Integrity/capacity score: ${capacity.score}/100. Recommend treatment, trim or grow-out strategy, and reassessment in 6-12 weeks.`;
    } else if (readiness === 'yellow') {
      clientSummary = `Your hair may support extensions with a modified, conservative approach. The current recommendation is ${method} with ${rows} ${rows === 1 ? 'row' : 'rows'} and ${grams}g. ${shortBlend ? 'Because your current length or layers create blending risk, the final result needs advanced shaping and density matching.' : 'The install should be kept lighter and monitored closely.'}`;
      stylistSummary = `Modified install: ${method}, ${rows} ${rows === 1 ? 'row' : 'rows'}, ${grams}g, ${plan.extensionLength}. Capacity: ${capacity.safeMin}g-${capacity.safeMax}g, status ${capacity.status}. Modifications: ${mods.map(m => m.replace(/_/g, ' ')).join(', ') || 'none'}. Avoid zones: ${avoidZones.join(', ') || 'none'}. First check-in recommended at 3-4 weeks.`;
    } else {
      clientSummary = `Your hair appears suitable for a ${rows}-row ${method} install using approximately ${grams}g at ${plan.extensionLength}. This is a professional recommendation based on the selected goals and hair profile, with final placement confirmed in person.`;
      stylistSummary = `Install appears suitable: ${method}, ${rows} ${rows === 1 ? 'row' : 'rows'}, ${grams}g at ${plan.extensionLength}. Hair capacity: ${capacity.safeMin}g-${capacity.safeMax}g, status ${capacity.status}. Maintain professional tension checks and adjust placement to observed density.`;
    }

    if (warnings.length) {
      stylistSummary += ` Key cautions: ${warnings.slice(0, 3).join(' ')}`;
    }

    return { clientSummary, stylistSummary };
  },

  /* ---- Build Alternatives ---- */
  _buildAlternatives(consult, integrity, plan, mods, readiness) {
    if (!plan || plan.rows === 0 || readiness === 'red') {
      return [
        {
          title: 'Recovery & Reassessment Plan',
          method: 'No install',
          description: 'Focus on scalp/hair recovery, density improvement, trim strategy, and reassessment before adding extension weight or tension.',
          grams: 0,
          maintenance: 'Reassess in 6-12 weeks',
          priceNote: 'Safer than forcing an install'
        }
      ];
    }

    const alts = [];
    const density = consult.hairProfile?.density;
    const shortHair = ['pixie', 'chin'].includes(consult.hairProfile?.length);

    if (plan.method !== 'Tape-Ins') {
      alts.push({
        title: 'Lighter Flat Application',
        method: 'Tape-Ins',
        description: 'Tape-ins can provide a flatter, lighter application when lower density or sensitivity makes heavier row work less desirable. Placement must still avoid fragile zones.',
        grams: Math.max(30, Math.round(plan.grams * 0.75)),
        maintenance: '5-7 weeks',
        priceNote: 'Lower chair time, more frequent maintenance'
      });
    }

    if (plan.grams > 60) {
      alts.push({
        title: shortHair ? 'Transitional Blend Option' : 'Lighter Install Option',
        method: plan.method,
        description: shortHair
          ? `A reduced-weight transitional plan using ${Math.round(plan.grams * 0.65)}g focuses on blend and shape first, rather than forcing a dramatic length jump.`
          : `A reduced-weight install using ${Math.round(plan.grams * 0.7)}g focuses on strategic fullness while reducing strain on the natural hair.`,
        grams: Math.round(plan.grams * 0.7),
        maintenance: plan.maintenance,
        priceNote: 'Lower hair load'
      });
    }

    if (plan.method !== 'I-Tips' && density !== 'low') {
      alts.push({
        title: 'Precision Placement Option',
        method: 'I-Tips',
        description: 'Individual I-tip strands allow more precise placement around density changes. This is useful when standard row placement needs more customization.',
        grams: plan.grams,
        maintenance: '10-14 weeks',
        priceNote: 'Higher labor, more placement control'
      });
    }

    return alts.slice(0, 3);
  },

  /* ---- Build Service Estimate ---- */
  _buildEstimate(consult, plan) {
    if (plan.rows === 0) return { total: 0, breakdown: [], note: 'No service recommended at this time.' };
    const s = HI.getSettings();
    const laborHrs = {
      'Tape-Ins': 2.5,
      'Hand-Tied Wefts': 5,
      'I-Tips': 4,
      'K-Tips': 4,
      'Hybrid': 5,
      'Consultation/Staged Transition': 1
    }[plan.method] || 3;
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

