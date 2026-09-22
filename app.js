/**
 * MAST APPLICATION SCRIPT
 * Centralized Store & UI Controllers for all 3 Scenarios
 * Clean, Compact, DRY & Accessible
 */

// ==========================================================
// 1. CENTRAL MOCK DATA STORE (Single Source of Truth)
// ==========================================================
const Store = {
  activeView: 'noa', // 'noa' | 'agent' | 'admin'
  currentRequestId: '10293',

  // Master applications database
  applications: {
    '10293': {
      id: '10293',
      customerName: 'נועה לוי',
      israeliId: '039847125',
      phone: '052-4412389',
      email: 'noa.levy@example.com',
      role: 'דייר נכנס',
      vipStatus: 'לקוח חדש',
      address: 'סוקולוב 42, הרצליה (דירה 7)',
      consumerId: '9842103',
      entryDate: '2026-10-01',
      meterReading: 482,
      systemMeterReading: 495, // Mismatch for agent review!
      waterMeterNumber: 'WM-981240',
      occupantsCount: 2,
      adultOccupants: [{ name: 'יונתן לוי', id: '038291487', relation: 'בן זוג' }],
      status: 'under_review', // 'submitted' | 'under_review' | 'needs_documents' | 'approved' | 'blocked'
      missingReason: '',
      submittedAt: '22/09/2026, 11:20',
      assignedAgent: 'דניאל ר.',
      hasSignedPoa: false
    }
  },

  // Active exceptions for Admin Ops Center
  exceptions: [
    { id: '#99281', type: 'חריגת SLA', waitTime: '04:12:00', status: 'בהמתנה', agent: 'לא משויך', actionLabel: 'שיוך מהיר' },
    { id: '#99304', type: 'כשל העלאה', waitTime: '00:05:00', status: 'נכשל', agent: 'מיכל כ.', actionLabel: 'ניסיון חוזר' },
    { id: '#99312', type: 'ללא נציג', waitTime: '00:45:00', status: 'פתוח', agent: 'לא משויך', actionLabel: 'העברה לצוות' },
    { id: '#99315', type: 'כשל הגשה', waitTime: '00:02:00', status: 'חסום', agent: 'מערכת', actionLabel: 'שחרור חסימה' },
    { id: '#10293', type: 'חריגת מונה (נועה)', waitTime: '00:28:15', status: 'בבדיקה', agent: 'דניאל ר.', actionLabel: 'בדיקת נציג' }
  ],

  // Agents list for Management Drawer
  agents: [
    { id: 1, name: 'דניאל ר.', role: 'נציג בכיר', active: true, load: '3 פניות' },
    { id: 2, name: 'מיכל כ.', role: 'נציגה', active: true, load: '4 פניות' },
    { id: 3, name: 'רון א.', role: 'נציג תמיכה', active: false, load: '0 פניות' },
    { id: 4, name: 'הילה ב.', role: 'ראש צוות', active: true, load: '1 פנייה' }
  ],

  // Audit Log History
  auditLog: [
    { time: '11:20:05', user: 'נועה לוי', action: 'הגשת בקשה מקוונת מס׳ #10293' },
    { time: '11:21:40', user: 'מערכת אוטומטית', action: 'הצלבת נתונים: זוהתה חריגה בקריאת מונה' },
    { time: '11:22:15', user: 'דניאל ר. (נציג)', action: 'פתיחת תיק פנייה וטעינת מסמכים' }
  ]
};

// ==========================================================
// 2. GENERAL APP CONTROLLER & TOASTS
// ==========================================================
const App = {
  init() {
    this.setupRoleSwitcher();
    this.renderAdminExceptions();
    this.renderDrawerAgents();
    this.renderAuditFeed();
    NoaWizard.init();
    DocViewer.init();
    AgentOps.initSlaTimer();
  },

  setupRoleSwitcher() {
    document.querySelectorAll('.role-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = tab.getAttribute('data-view');
        this.switchRole(view);
      });
    });
  },

  switchRole(view) {
    Store.activeView = view;
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.role-tab[data-view="${view}"]`).classList.add('active');

    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(`view-${view}`);
    if (targetSection) targetSection.classList.add('active');

    // Scenario specific refreshes
    if (view === 'agent') {
      AgentOps.refreshWorkspace();
    } else if (view === 'admin') {
      this.renderAdminExceptions();
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  addAudit(user, action) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    Store.auditLog.unshift({ time: timeStr, user, action });
    this.renderAuditFeed();
  },

  openAuditModal() {
    const modal = document.getElementById('modal-audit');
    const list = document.getElementById('full-audit-list');
    list.innerHTML = Store.auditLog.map(item => `
      <div class="audit-item" style="margin-bottom: 8px;">
        <span class="audit-time">${item.time} | מבצע: <strong>${item.user}</strong></span>
        <div>${item.action}</div>
      </div>
    `).join('');
    modal.style.display = 'flex';
  },

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  },

  renderAuditFeed() {
    const feed = document.getElementById('drawer-audit-feed');
    if (!feed) return;
    feed.innerHTML = Store.auditLog.slice(0, 8).map(item => `
      <div class="audit-item">
        <span class="audit-time">${item.time} | ${item.user}</span>
        <div>${item.action}</div>
      </div>
    `).join('');
  },

  renderAdminExceptions() {
    const tbody = document.getElementById('exceptions-table-body');
    if (!tbody) return;

    tbody.innerHTML = Store.exceptions.map((exc, idx) => `
      <tr>
        <td><strong>${exc.id}</strong></td>
        <td><span class="badge ${exc.type.includes('חריגת') ? 'badge-danger' : exc.type.includes('כשל') ? 'badge-warning' : 'badge-info'}">${exc.type}</span></td>
        <td><code>${exc.waitTime}</code></td>
        <td>${exc.status}</td>
        <td>${exc.agent}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="AdminOps.handleQuickAction(${idx})">
            ${exc.actionLabel}
          </button>
        </td>
      </tr>
    `).join('');

    // Update KPI counters
    const slaCount = Store.exceptions.filter(e => e.type.includes('SLA')).length;
    const unassignedCount = Store.exceptions.filter(e => e.agent === 'לא משויך').length;
    const failCount = Store.exceptions.filter(e => e.type.includes('כשל')).length;

    const elSla = document.getElementById('kpi-sla-count');
    const elUnassigned = document.getElementById('kpi-unassigned-count');
    const elFailures = document.getElementById('kpi-failures-count');

    if (elSla) elSla.textContent = `${slaCount} פניות`;
    if (elUnassigned) elUnassigned.textContent = `${unassignedCount} משימות`;
    if (elFailures) elFailures.textContent = `${failCount} אירועים`;
  },

  renderDrawerAgents() {
    const list = document.getElementById('drawer-agents-list');
    if (!list) return;
    list.innerHTML = Store.agents.map(ag => `
      <div class="agent-row">
        <div class="agent-info">
          <strong>${ag.name} (${ag.role})</strong>
          <span>עומס: ${ag.load}</span>
        </div>
        <label class="switch">
          <input type="checkbox" ${ag.active ? 'checked' : ''} onchange="AdminOps.toggleAgent(${ag.id})">
          <span class="slider"></span>
        </label>
      </div>
    `).join('');
  }
};

// ==========================================================
// 3. SCENARIO 1: NOA'S JOURNEY (CITIZEN PORTAL)
// ==========================================================
const NoaWizard = {
  currentStep: 0,
  canvas: null,
  ctx: null,
  isDrawing: false,
  hasSigned: false,

  init() {
    this.setupCanvas();
    this.setupRoleSelection();
  },

  setupRoleSelection() {
    const cards = document.querySelectorAll('.role-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const role = card.querySelector('input').value;
        const poaGroup = document.getElementById('poa-upload-group');
        if (poaGroup) {
          poaGroup.style.display = (role === 'attorney') ? 'block' : 'none';
        }
      });
    });
  },

  goToStep(stepIndex) {
    this.currentStep = stepIndex;

    // Update Wizard Stepper UI
    document.querySelectorAll('.wizard-stepper .step-indicator').forEach((ind, i) => {
      ind.classList.remove('active', 'completed');
      if (i === stepIndex) ind.classList.add('active');
      else if (i < stepIndex) ind.classList.add('completed');
    });

    // Update Steps display
    document.querySelectorAll('.wizard-step').forEach((st, i) => {
      st.classList.toggle('active', i === stepIndex);
    });

    // If step 4 (Summary), refresh summary values
    if (stepIndex === 4) {
      this.populateSummary();
      setTimeout(() => this.resizeCanvas(), 50);
    }
  },

  // Israeli ID checksum validation algorithm (Modulo 10)
  validateIsraeliId(idStr) {
    const cleanId = String(idStr).trim();
    if (!/^\d{9}$/.test(cleanId)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let num = Number(cleanId.charAt(i)) * ((i % 2) + 1);
      if (num > 9) num -= 9;
      sum += num;
    }
    return sum % 10 === 0;
  },

  sendOtp() {
    const phone = document.getElementById('id-phone').value.trim();
    if (!phone) {
      App.showToast('נא להזין מספר טלפון תקין', 'warning');
      return;
    }
    document.getElementById('otp-container').style.display = 'block';
    App.showToast(`קוד SMS נשלח בהצלחה לנייד: 1234`, 'info');
  },

  verifyOtp() {
    const otp = document.getElementById('id-otp').value.trim();
    const statusMsg = document.getElementById('otp-status-msg');
    if (otp === '1234') {
      statusMsg.textContent = '✓ מספר הנייד אומת בהצלחה';
      App.showToast('הטלפון אומת בהצלחה!', 'success');
    } else {
      statusMsg.className = 'input-helper text-danger';
      statusMsg.textContent = 'קוד אימות שגוי. הזן 1234 להדגמה';
    }
  },

  toggleCompanyFields(isCompany) {
    document.getElementById('company-fields').style.display = isCompany ? 'block' : 'none';
  },

  simulateFileUpload(fileType) {
    App.showToast('קובץ נבחר והועלה בהצלחה למערכת!', 'success');
  },

  validateStep1() {
    const name = document.getElementById('id-fullname').value.trim();
    const id = document.getElementById('id-israeliId').value.trim();
    const hint = document.getElementById('id-validation-hint');

    if (!name) {
      App.showToast('נא להזין שם מלא', 'warning');
      return;
    }
    if (!this.validateIsraeliId(id)) {
      hint.className = 'input-helper text-danger';
      hint.textContent = 'מספר תעודת זהות אינו תקין (ספרת ביקורת שגויה)';
      App.showToast('מספר תעודת זהות לא תקין', 'warning');
      return;
    }
    hint.textContent = '';
    this.goToStep(2);
  },

  validateStep2() {
    const street = document.getElementById('prop-street').value.trim();
    if (!street) {
      App.showToast('נא להזין רחוב ומספר בית', 'warning');
      return;
    }
    this.goToStep(3);
  },

  validateStep3() {
    const reading = document.getElementById('meter-reading').value;
    if (!reading || Number(reading) <= 0) {
      App.showToast('נא להזין קריאת מונה תקינה', 'warning');
      return;
    }
    this.goToStep(4);
  },

  handleOccupantsChange(val) {
    // optional logic
  },

  addOccupantRow() {
    const table = document.getElementById('adults-table').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    newRow.innerHTML = `
      <td><input type="text" class="cell-input" placeholder="שם מלא"></td>
      <td><input type="text" class="cell-input" placeholder="9 ספרות"></td>
      <td><input type="text" class="cell-input" placeholder="קרבה"></td>
      <td><button type="button" class="btn-icon text-danger" onclick="NoaWizard.removeOccupantRow(this)">🗑️</button></td>
    `;
    App.showToast('דייר נוסף נוסף לטבלה', 'info');
  },

  removeOccupantRow(btn) {
    const row = btn.closest('tr');
    row.remove();
  },

  populateSummary() {
    document.getElementById('sum-name').textContent = document.getElementById('id-fullname').value;
    document.getElementById('sum-id').textContent = document.getElementById('id-israeliId').value;
    document.getElementById('sum-phone').textContent = document.getElementById('id-phone').value;
    document.getElementById('sum-address').textContent = `${document.getElementById('prop-street').value}, ${document.getElementById('prop-city').value} (דירה ${document.getElementById('prop-apartment').value})`;
    document.getElementById('sum-consumer').textContent = document.getElementById('prop-consumer-id').value || 'לא צוין';
    document.getElementById('sum-date').textContent = document.getElementById('prop-date').value;
    document.getElementById('sum-reading').textContent = `${document.getElementById('meter-reading').value} מ"ק`;
    document.getElementById('sum-occupants').textContent = `${document.getElementById('occupants-count').value} נפשות`;
  },

  setupCanvas() {
    this.canvas = document.getElementById('signature-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#1A3A5F';

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => {
      this.isDrawing = true;
      this.hasSigned = true;
      const hint = document.getElementById('canvas-hint');
      if (hint) hint.style.display = 'none';
      const pos = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    };

    const stop = () => { this.isDrawing = false; };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stop);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stop);
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = 150;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#1A3A5F';
  },

  clearSignature() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasSigned = false;
    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'block';
  },

  submitApplication() {
    const isDeclared = document.getElementById('legal-declaration').checked;
    if (!isDeclared) {
      App.showToast('יש לאשר את הצהרת נכונות הנתונים', 'warning');
      return;
    }
    if (!this.hasSigned) {
      App.showToast('נא לחתום בחתימה דיגיטלית', 'warning');
      return;
    }

    // Update Store
    const req = Store.applications['10293'];
    req.status = 'under_review';
    App.addAudit('נועה לוי', 'שיגור בקשה #10293 לתאגיד המים עם חתימה דיגיטלית');

    // Show Tracking Card
    document.getElementById('wizard-container').style.display = 'none';
    document.getElementById('noa-stepper').style.display = 'none';
    const trackingScreen = document.getElementById('noa-tracking-screen');
    trackingScreen.style.display = 'block';

    App.showToast('הבקשה נשלחה בהצלחה לתאגיד המים! 🚀', 'success');
  },

  openResubmitModal() {
    document.getElementById('modal-resubmit').style.display = 'flex';
  },

  confirmResubmit() {
    const req = Store.applications['10293'];
    req.status = 'under_review';
    document.getElementById('noa-missing-alert').style.display = 'none';
    App.closeModals();
    App.addAudit('נועה לוי', 'העלאה חוזרת של צילום ת"ז תקין לבקשה #10293');
    App.showToast('המסמך הועלה בהצלחה והועבר לבדיקת הנציג!', 'success');
  },

  restartFlow() {
    document.getElementById('wizard-container').style.display = 'block';
    document.getElementById('noa-stepper').style.display = 'flex';
    document.getElementById('noa-tracking-screen').style.display = 'none';
    this.goToStep(0);
  }
};

// ==========================================================
// 4. SCENARIO 2: AGENT WORKSPACE (BACK-OFFICE)
// ==========================================================
const AgentOps = {
  slaSeconds: 9910, // 2h 45m 10s
  slaTimerInterval: null,

  initSlaTimer() {
    this.slaTimerInterval = setInterval(() => {
      if (this.slaSeconds > 0) {
        this.slaSeconds--;
        const hours = String(Math.floor(this.slaSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((this.slaSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(this.slaSeconds % 60).padStart(2, '0');
        const timerEl = document.getElementById('agent-sla-timer');
        if (timerEl) timerEl.textContent = `${hours}:${minutes}:${seconds}`;
      }
    }, 1000);
  },

  refreshWorkspace() {
    const req = Store.applications['10293'];
    document.getElementById('agent-cust-name').textContent = req.customerName;
    document.getElementById('agent-cust-id').textContent = `ת"ז: ${req.israeliId}`;
    document.getElementById('agent-req-id').textContent = `#${req.id}`;
    document.getElementById('agent-role-display').textContent = req.role;

    // Sticky bar handling
    const stickyBar = document.getElementById('agent-sticky-bar');
    if (stickyBar) {
      if (req.status === 'needs_documents') {
        stickyBar.className = 'sticky-exceptions-bar alert-warning';
        document.getElementById('agent-sticky-message').innerHTML = `<strong>הבקשה ממתינה להשלמת מסמכים מהלקוח.</strong> נשלח SMS ישיר.`;
      }
    }
  },

  approveApplication() {
    const req = Store.applications['10293'];
    req.status = 'approved';
    App.addAudit('דניאל ר. (נציג)', 'אישור סופי של בקשה #10293 והפקת מסמך חילופי מחזיקים');

    // Update Noa's tracking UI
    const stepApproved = document.getElementById('track-step-approved');
    if (stepApproved) stepApproved.classList.add('done');

    App.showToast('הבקשה אושרה בהצלחה! מסמך אישור הופק ונשלח ללקוח', 'success');
  },

  openMissingDocsModal() {
    document.getElementById('modal-missing-docs').style.display = 'flex';
  },

  sendMissingDocsRequest() {
    const note = document.getElementById('missing-custom-note').value.trim();
    const req = Store.applications['10293'];
    req.status = 'needs_documents';
    req.missingReason = note || 'צילום תעודת זהות אינו קריא ומספר המונה חורג';

    App.addAudit('דניאל ר. (נציג)', `שליחת בקשת השלמת מסמכים ב-SMS לנועה לוי (#10293)`);
    App.closeModals();

    // Trigger alert banner inside Noa's view!
    const alertBanner = document.getElementById('noa-missing-alert');
    const reasonText = document.getElementById('noa-missing-reason');
    if (alertBanner && reasonText) {
      reasonText.textContent = req.missingReason;
      alertBanner.style.display = 'flex';
    }

    App.showToast('הודעת SMS ובקשת השלמה נשלחו בהצלחה ללקוח! 📲', 'warning');
  },

  escalateToAdmin() {
    const req = Store.applications['10293'];
    req.status = 'blocked';
    App.addAudit('דניאל ר. (נציג)', 'הסלמת בקשה #10293 לדרג מנהל לבדיקת חריגת מונה');

    // Add to admin exceptions table if not present
    if (!Store.exceptions.some(e => e.id === '#10293')) {
      Store.exceptions.unshift({
        id: '#10293',
        type: 'חריגת מונה מורכבת',
        waitTime: '00:01:00',
        status: 'בבדיקת מנהל',
        agent: 'דניאל ר.',
        actionLabel: 'שחרור חסימה'
      });
    }
    App.renderAdminExceptions();
    App.showToast('הבקשה הועברה ישירות למרכז השליטה של המנהל 🛡️', 'info');
  }
};

// ==========================================================
// 5. INTERACTIVE DOCUMENT VIEWER (Agent Tool)
// ==========================================================
const DocViewer = {
  currentDoc: 'meter',
  zoom: 1,
  rotation: 0,
  isHighlightActive: false,

  docsData: {
    meter: {
      name: 'WaterMeter_Photo_482.jpg',
      html: `
        <div style="text-align: center; margin-top: 20px;">
          <h4 style="color: #1A3A5F;">תצלום מונה מים רשמי</h4>
          <div style="margin: 25px auto; padding: 20px; border: 3px solid #000; display: inline-block; background: #FFF9E6; border-radius: 8px;">
            <div style="font-size: 0.85rem; color: #555;">ARAD WATER METERS - D15</div>
            <div style="display: flex; gap: 4px; margin-top: 10px; font-size: 1.8rem; font-family: monospace; font-weight: 800;">
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">0</span>
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">4</span>
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">8</span>
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">2</span>
              <span style="background: #EF4444; color: #fff; padding: 4px 8px; border-radius: 2px;">7</span>
            </div>
            <div style="font-size: 0.75rem; color: #777; margin-top: 8px;">קוד מכשיר: WM-981240</div>
          </div>
          <div style="font-size: 0.85rem; color: #64748B;">צולם בתאריך: 22/09/2026 09:40</div>
        </div>
      `
    },
    contract: {
      name: 'Rental_Agreement_Sokolov42.pdf',
      html: `
        <div style="font-size: 0.85rem; line-height: 1.6;">
          <h4 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px;">הסכם שכירות בלתי מוגנת</h4>
          <p><strong>המשכיר:</strong> ישראל ישראלי (ת"ז 012345678)</p>
          <p><strong>השוכר:</strong> נועה לוי (ת"ז 039847125)</p>
          <p><strong>הנכס:</strong> דירת מגורים ברח' סוקולוב 42, הרצליה, דירה מס' 7.</p>
          <p><strong>תקופת השכירות:</strong> החל מיום 01/10/2026 ועד 30/09/2027.</p>
          <div style="margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 15px;">
            <div>חתימת המשכיר: <i>ישראל</i></div>
            <div>חתימת השוכר: <i>נועה לוי</i></div>
          </div>
        </div>
      `
    },
    tz: {
      name: 'ID_Noa_Levy.jpg',
      html: `
        <div style="background: #E0F2FE; border: 2px solid #0284C7; border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #0284C7; padding-bottom: 6px;">
            <strong>מדינת ישראל - תעודת זהות</strong>
            <span>🇮🇱</span>
          </div>
          <div style="margin-top: 14px; display: flex; gap: 14px;">
            <div style="width: 70px; height: 90px; background: #94A3B8; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 2rem;">👤</div>
            <div style="font-size: 0.85rem;">
              <p>שם משפחה: <strong>לוי</strong></p>
              <p>שם פרטי: <strong>נועה</strong></p>
              <p>מספר זהות: <strong>039847125</strong></p>
              <p>תאריך לידה: <strong>14/05/1995</strong></p>
            </div>
          </div>
          <div style="margin-top: 12px; font-size: 0.78rem; background: #fff; padding: 6px; border-radius: 4px;">
            ספח רשום: סוקולוב 42, הרצליה
          </div>
        </div>
      `
    }
  },

  init() {
    this.switchDoc('meter');
    this.setupDocHighlightClick();
  },

  switchDoc(docKey) {
    this.currentDoc = docKey;
    document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
    event?.target?.classList?.add('active');

    const data = this.docsData[docKey];
    document.getElementById('mock-doc-body').innerHTML = data.html;
    document.getElementById('doc-filename').textContent = `קובץ: ${data.name}`;
    this.reset();
  },

  zoomIn() {
    this.zoom = Math.min(this.zoom + 0.15, 2.0);
    this.applyTransform();
  },

  zoomOut() {
    this.zoom = Math.max(this.zoom - 0.15, 0.6);
    this.applyTransform();
  },

  rotate() {
    this.rotation = (this.rotation + 90) % 360;
    this.applyTransform();
  },

  reset() {
    this.zoom = 1;
    this.rotation = 0;
    this.applyTransform();
    // remove existing highlights
    document.querySelectorAll('.doc-highlight-overlay').forEach(el => el.remove());
  },

  applyTransform() {
    const stage = document.getElementById('doc-stage');
    if (stage) {
      stage.style.transform = `scale(${this.zoom}) rotate(${this.rotation}deg)`;
    }
  },

  toggleHighlight() {
    this.isHighlightActive = !this.isHighlightActive;
    const btn = document.getElementById('tool-highlight');
    if (btn) btn.classList.toggle('active-tool', this.isHighlightActive);
    App.showToast(this.isHighlightActive ? 'מרקר פעיל: לחץ על המסמך כדי לסמן' : 'מרקר כבוי', 'info');
  },

  setupDocHighlightClick() {
    const doc = document.getElementById('mock-doc-content');
    if (!doc) return;
    doc.addEventListener('click', (e) => {
      if (!this.isHighlightActive) return;
      const rect = doc.getBoundingClientRect();
      const x = e.clientX - rect.left - 40;
      const y = e.clientY - rect.top - 10;

      const hl = document.createElement('div');
      hl.className = 'doc-highlight-overlay';
      hl.style.left = `${x}px`;
      hl.style.top = `${y}px`;
      hl.style.width = '100px';
      hl.style.height = '24px';
      doc.appendChild(hl);

      App.addAudit('דניאל ר. (נציג)', `סימון מרקר על גבי מסמך ${this.currentDoc}`);
      App.showToast('הדגשה נשמרה על המסמך', 'success');
    });
  }
};

// ==========================================================
// 6. SCENARIO 3: ADMIN OPS CONTROL CENTER
// ==========================================================
const AdminOps = {
  toggleDrawer(open) {
    document.getElementById('management-drawer').classList.toggle('open', open);
    document.getElementById('drawer-backdrop').classList.toggle('open', open);
  },

  toggleAgent(agentId) {
    const agent = Store.agents.find(a => a.id === agentId);
    if (agent) {
      agent.active = !agent.active;
      App.addAudit('מנהל מערכת', `שינוי הרשאת פעילות לנציג: ${agent.name} (סטטוס: ${agent.active ? 'פעיל' : 'כבוי'})`);
      App.showToast(`הרשאת נציג ${agent.name} עודכנה בהצלחה`, 'info');
    }
  },

  autoAssignAll() {
    Store.exceptions.forEach(exc => {
      if (exc.agent === 'לא משויך') {
        exc.agent = 'מיכל כ.';
        exc.status = 'בטיפול';
      }
    });
    App.addAudit('מנהל מערכת', 'הפעלת אלגוריתם שיוך אוטומטי לחלוקת עומסים');
    App.renderAdminExceptions();
    App.showToast('כל הפניות הלא משויכות חולקו בהצלחה לנציגים זמינים! 🤖', 'success');
  },

  unblockAll() {
    Store.exceptions = Store.exceptions.filter(e => !e.status.includes('חסום'));
    App.addAudit('מנהל מערכת', 'שחרור חסימות גורף לכשלי הגשה');
    App.renderAdminExceptions();
    App.showToast('כל התהליכים החסומים שוחררו בהצלחה! 🔓', 'success');
  },

  handleQuickAction(index) {
    const exc = Store.exceptions[index];
    if (exc.actionLabel === 'שיוך מהיר' || exc.actionLabel === 'העברה לצוות') {
      exc.agent = 'דניאל ר.';
      exc.status = 'בטיפול';
      exc.actionLabel = 'הושלם ✔️';
      App.showToast(`אירוע ${exc.id} שויך בהצלחה לנציג דניאל ר.`, 'success');
    } else if (exc.actionLabel === 'ניסיון חוזר') {
      exc.status = 'סונכרן';
      exc.actionLabel = 'הושלם ✔️';
      App.showToast(`בוצע סנכרון חוזר מוצלח לאירוע ${exc.id}`, 'success');
    } else if (exc.actionLabel === 'שחרור חסימה') {
      exc.status = 'פתוח לטיפול';
      exc.actionLabel = 'הושלם ✔️';
      App.showToast(`החסימה שוחררה בהצלחה לאירוע ${exc.id}`, 'success');
    } else if (exc.actionLabel === 'בדיקת נציג') {
      App.switchRole('agent');
      return;
    }
    App.addAudit('מנהל מערכת', `ביצוע פעולה מהירה על אירוע ${exc.id} (${exc.type})`);
    App.renderAdminExceptions();
  }
};

// Initialize Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
