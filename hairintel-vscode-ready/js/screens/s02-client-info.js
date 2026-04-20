/* ================================================================
   S02 — CLIENT INFO
   ================================================================ */
function renderS02ClientInfo(params = {}) {
  const clients = HI.getClients();
  const preClient = params.clientId ? clients.find(c => c.id === params.clientId) : null;

  return `
  <div class="hi-screen" id="screen-client-info">
    ${hiProgressBar(0, 6)}
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Client Info</div><div class="hi-header-sub">Step 1 of 6</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-5">
        <h2 class="hi-heading hi-mb-2">Who is this consultation for?</h2>
        <p class="hi-body">Select an existing client or enter new client information.</p>
      </div>

      <!-- Existing Client Select -->
      ${clients.length > 0 ? `
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Returning Client</div>
        <div style="display:flex;flex-direction:column;gap:8px;" id="existing-client-list">
          ${clients.slice(0,5).map(c => `
          <div class="hi-card-raised" style="cursor:pointer;display:flex;align-items:center;gap:12px;" data-cid="${c.id}" onclick="selectExistingClient('${c.id}')">
            <div class="hi-avatar">${hiInitials(c.firstName, c.lastName)}</div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;color:var(--text);">${c.firstName} ${c.lastName}</div>
              ${c.notes ? `<div style="font-size:12px;color:var(--text-muted);">${c.notes}</div>` : ''}
            </div>
            <span id="check-${c.id}" style="display:none;color:var(--gold);">${HIcons.check}</span>
          </div>`).join('')}
        </div>
        <div class="hi-section-divider hi-mt-4"><span class="hi-section-divider-text">or new client</span></div>
      </div>
      ` : ''}

      <!-- New Client Form -->
      <div class="hi-card">
        <div class="hi-label hi-mb-3">New Client Details</div>

        <div class="hi-field-row hi-mb-2">
          <div class="hi-field">
            <label class="hi-field-label">First Name *</label>
            <input class="hi-input" id="ci-first" type="text" placeholder="Sienna" value="${preClient?.firstName || ''}" />
          </div>
          <div class="hi-field">
            <label class="hi-field-label">Last Name *</label>
            <input class="hi-input" id="ci-last" type="text" placeholder="Rhodes" value="${preClient?.lastName || ''}" />
          </div>
        </div>

        <div class="hi-field">
          <label class="hi-field-label">Phone (optional)</label>
          <input class="hi-input" id="ci-phone" type="tel" placeholder="(404) 555-0000" value="${preClient?.phone || ''}" />
        </div>

        <div class="hi-field">
          <label class="hi-field-label">Email (optional)</label>
          <input class="hi-input" id="ci-email" type="email" placeholder="client@email.com" value="${preClient?.email || ''}" />
        </div>

        <div class="hi-field" style="margin-bottom:0;">
          <label class="hi-field-label">Stylist Notes</label>
          <textarea class="hi-input" id="ci-notes" placeholder="Pre-consultation notes...">${preClient?.notes || ''}</textarea>
        </div>
      </div>

      <div style="margin-top:20px;">
        <button class="hi-btn hi-btn-gold" id="ci-next-btn">Continue →</button>
      </div>
    </div>
  </div>`;
}

function initS02ClientInfo(params = {}) {
  let selectedClientId = params.clientId || null;

  window.selectExistingClient = (cid) => {
    selectedClientId = cid;
    hQsa('#existing-client-list [data-cid]').forEach(el => el.style.borderColor = '');
    hQsa('#existing-client-list [id^="check-"]').forEach(el => el.style.display = 'none');
    const card = hQs(`[data-cid="${cid}"]`);
    if (card) card.style.borderColor = 'var(--gold-border)';
    const check = hEl(`check-${cid}`);
    if (check) check.style.display = 'inline';
    const c = HI.getClients().find(cl => cl.id === cid);
    if (c) {
      if (hEl('ci-first')) hEl('ci-first').value = c.firstName;
      if (hEl('ci-last'))  hEl('ci-last').value  = c.lastName;
      if (hEl('ci-phone')) hEl('ci-phone').value = c.phone || '';
      if (hEl('ci-email')) hEl('ci-email').value = c.email || '';
      if (hEl('ci-notes')) hEl('ci-notes').value = c.notes || '';
    }
  };

  hEl('ci-next-btn')?.addEventListener('click', () => {
    const first = hEl('ci-first')?.value.trim();
    const last  = hEl('ci-last')?.value.trim();
    if (!first) { hiToast('First name is required','warning'); hEl('ci-first')?.classList.add('error'); return; }

    let clientId = selectedClientId;
    if (!clientId) {
      const newClient = {
        id: HI.genId(), firstName: first, lastName: last,
        phone: hEl('ci-phone')?.value.trim() || '',
        email: hEl('ci-email')?.value.trim() || '',
        notes: hEl('ci-notes')?.value.trim() || '',
        createdAt: new Date().toISOString()
      };
      const cls = HI.getClients();
      cls.push(newClient);
      HI.setClients(cls);
      clientId = newClient.id;
    } else {
      const cls = HI.getClients();
      const idx = cls.findIndex(c => c.id === clientId);
      if (idx > -1) {
        cls[idx] = { ...cls[idx], firstName: first, lastName: last,
          phone: hEl('ci-phone')?.value.trim() || cls[idx].phone || '',
          email: hEl('ci-email')?.value.trim() || cls[idx].email || '',
          notes: hEl('ci-notes')?.value.trim() || cls[idx].notes || ''
        };
        HI.setClients(cls);
      }
    }

    HIConsult.set('clientId', clientId);
    HIConsult.set('clientInfo', { firstName: first, lastName: last });
    HIApp.go('photos');
  });
}
