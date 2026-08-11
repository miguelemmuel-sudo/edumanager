/* ==============================================
   EduManager – Dashboard JS
   Fonctionnalites partagees sur toutes les pages
   
   OWASP A03:2021 – Injection (XSS Prevention)
   Toutes les injections innerHTML utilisent escapeHtml()
============================================== */

/* XSS helper alias */
const _e = (window.EduSecurity && window.EduSecurity.escapeHtml) || function(s) { return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

/* ---- SIDEBAR TOGGLE ---- */
document.addEventListener('DOMContentLoaded', function() {
  const sessionStr = localStorage.getItem('edu_session');
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (window.supabase) {
        window.supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            const meta = user.user_metadata || {};
            const prenom = meta.prenom || 'Utilisateur';
            const nom = meta.nom || '';
            const fonction = meta.fonction || session.role || 'Administrateur';
            const email = user.email || '';
            const tel = meta.tel || '';
            const ecole = meta.ecole || '';

            // Update user-name
            document.querySelectorAll('.user-name').forEach(el => {
              el.textContent = `${_e(prenom)} ${_e(nom)}`;
            });
            // Update user-role
            document.querySelectorAll('.user-role').forEach(el => {
              el.textContent = _e(fonction);
            });
            // Update user-av
            document.querySelectorAll('.user-av').forEach(el => {
              el.textContent = _e(prenom).charAt(0).toUpperCase();
            });
            
            // Profil.html inputs
            const profileForm = document.querySelector('form');
            if (profileForm && window.location.pathname.includes('profil.html')) {
              const inputs = profileForm.querySelectorAll('input');
              if(inputs[0]) inputs[0].value = prenom;
              if(inputs[1]) inputs[1].value = nom;
              if(inputs[2]) inputs[2].value = email;
              if(inputs[3]) inputs[3].value = tel;
              if(inputs[4]) inputs[4].value = ecole;
              if(inputs[5]) inputs[5].value = fonction;
            }
          }
        }).catch(err => console.error("Erreur getUser", err));
      }
    } catch(e) { console.error('Session parsing error', e); }
  }
});

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const tb = document.getElementById('topbar');
  const mc = document.getElementById('mainContent');
  const ov = document.getElementById('sidebarOverlay');
  if (!sb) return;

  if (window.innerWidth <= 992) {
    sb.classList.toggle('mobile-open');
    ov && ov.classList.toggle('show');
  } else {
    sb.classList.toggle('collapsed');
    tb && tb.classList.toggle('collapsed');
    mc && mc.classList.toggle('collapsed');
    // Persist state
    localStorage.setItem('sidebarCollapsed', sb.classList.contains('collapsed') ? '1' : '0');
  }
}

/* Restore sidebar state on load */
(function() {
  const sb = document.getElementById('sidebar');
  const tb = document.getElementById('topbar');
  const mc = document.getElementById('mainContent');
  if (!sb) return;
  if (localStorage.getItem('sidebarCollapsed') === '1' && window.innerWidth > 992) {
    sb.classList.add('collapsed');
    tb && tb.classList.add('collapsed');
    mc && mc.classList.add('collapsed');
  }
})();

/* Close sidebar overlay on resize */
window.addEventListener('resize', function () {
  if (window.innerWidth > 992) {
    const ov = document.getElementById('sidebarOverlay');
    const sb = document.getElementById('sidebar');
    ov && ov.classList.remove('show');
    sb && sb.classList.remove('mobile-open');
  }
});

/* ---- ACTIVE NAV LINK ---- */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.split('/').pop() === page) {
      link.classList.add('active');
    }
  });
})();

/* ---- ACTIVITY ICONS ---- */
document.querySelectorAll('.act-icon').forEach(el => {
  Object.assign(el.style, {
    width: '34px', height: '34px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '.8rem', flexShrink: '0'
  });
});

/* ---- TOPBAR: NOTIFICATIONS DROPDOWN ---- */
(function () {
  const notifBtn = document.querySelector('.topbar-btn[title="Notifications"], .topbar-btn:has(.fa-bell)');
  if (!notifBtn) return;

  const dropdown = document.createElement('div');
  dropdown.id = 'notifDropdown';
  dropdown.innerHTML = `
    <div style="position:fixed;top:var(--topbar-h);right:1rem;width:340px;background:white;border:1px solid var(--border);border-radius:.875rem;box-shadow:0 16px 40px rgba(0,0,0,.12);z-index:999;display:none">
      <div style="padding:1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-weight:700;font-size:.9rem">Notifications</span>
        <span style="font-size:.75rem;color:var(--primary);cursor:pointer" onclick="document.getElementById('notifDropdown').firstElementChild.style.display='none'">Tout marquer lu</span>
      </div>
      <div style="max-height:300px;overflow-y:auto" id="topbarNotifList">
        <div style="padding:1.5rem 1rem;text-align:center;color:var(--muted);font-size:.8rem">
          Aucune notification
        </div>
      </div>
      <div style="padding:.75rem 1rem;border-top:1px solid var(--border);text-align:center">
        <a href="notifications.html" style="font-size:.8rem;color:var(--primary);text-decoration:none;font-weight:500">Voir toutes les notifications →</a>
      </div>
    </div>`;
  document.body.appendChild(dropdown);

  const panel = dropdown.firstElementChild;
  notifBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    profilePanel && (profilePanel.style.display = 'none');
  });
  document.addEventListener('click', function () { panel.style.display = 'none'; });
  panel.addEventListener('click', e => e.stopPropagation());
})();

/* ---- TOPBAR: PROFIL DROPDOWN ---- */
var profilePanel;
(function () {
  const av = document.querySelector('.topbar-actions .user-av');
  if (!av) return;

  const p = window.location.pathname;
  const idx = p.indexOf('/dashboard');
  const basePath = idx >= 0 ? p.substring(0, idx) + '/dashboard/' : '/dashboard/';

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="profilePanel" style="position:fixed;top:var(--topbar-h);right:1rem;width:240px;background:white;border:1px solid var(--border);border-radius:.875rem;box-shadow:0 16px 40px rgba(0,0,0,.12);z-index:999;display:none;overflow:hidden">
      <div style="padding:1rem;background:linear-gradient(135deg,#EFF6FF,#F0FDF4);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.75rem">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#2563EB,#10B981);display:flex;align-items:center;justify-content:center;color:white;font-weight:700">D</div>
        <div><div style="font-weight:700;font-size:.875rem">M. Directeur</div><div style="font-size:.75rem;color:var(--muted)">Administrateur</div></div>
      </div>
      <div style="padding:.4rem 0">
        <a href="${basePath}parametres.html" style="display:flex;align-items:center;gap:.75rem;padding:.6rem 1rem;text-decoration:none;color:var(--text);font-size:.875rem;transition:background .15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'"><i class="fas fa-user" style="width:16px;color:var(--muted)"></i>Mon profil</a>
        <a href="${basePath}parametres.html" style="display:flex;align-items:center;gap:.75rem;padding:.6rem 1rem;text-decoration:none;color:var(--text);font-size:.875rem;transition:background .15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'"><i class="fas fa-cog" style="width:16px;color:var(--muted)"></i>Paramètres</a>
        <a href="${basePath}rapports.html" style="display:flex;align-items:center;gap:.75rem;padding:.6rem 1rem;text-decoration:none;color:var(--text);font-size:.875rem;transition:background .15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'"><i class="fas fa-chart-line" style="width:16px;color:var(--muted)"></i>Rapports</a>
        <div style="height:1px;background:var(--border);margin:.3rem 0"></div>
        <a href="${basePath}../signin.html" style="display:flex;align-items:center;gap:.75rem;padding:.6rem 1rem;text-decoration:none;color:#EF4444;font-size:.875rem;transition:background .15s" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'"><i class="fas fa-sign-out-alt" style="width:16px"></i>Se déconnecter</a>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  profilePanel = document.getElementById('profilePanel');

  av.addEventListener('click', function (e) {
    e.stopPropagation();
    profilePanel.style.display = profilePanel.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', function () { profilePanel && (profilePanel.style.display = 'none'); });
  profilePanel.addEventListener('click', e => e.stopPropagation());
})();

/* ---- TOPBAR: SEARCH SHORTCUT ---- */
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const inp = document.querySelector('.topbar-search input');
    inp && inp.focus();
  }
});

/* ---- TOOLTIP ON COLLAPSED SIDEBAR ---- */
document.querySelectorAll('.nav-item-link').forEach(link => {
  const label = link.querySelector('.nav-item-label');
  if (label) link.setAttribute('title', label.textContent.trim());
});

/* ---- TOAST NOTIFICATION HELPER ---- */
function showToast(msg, type = 'success') {
  const colors = { success: '#10B981', danger: '#EF4444', warning: '#F59E0B', info: '#2563EB' };
  const icons  = { success: 'check-circle', danger: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
  const toast = document.createElement('div');
  toast.innerHTML = `
    <div style="position:fixed;bottom:1.5rem;right:1.5rem;background:white;border-left:4px solid ${colors[type]};border-radius:.75rem;padding:1rem 1.25rem;box-shadow:0 8px 30px rgba(0,0,0,.12);z-index:9999;display:flex;align-items:center;gap:.75rem;min-width:280px;animation:slideIn .3s ease">
      <i class="fas fa-${icons[type]}" style="color:${colors[type]};font-size:1.1rem;flex-shrink:0"></i>
      <span style="font-size:.875rem;font-weight:500;color:#1E293B">${_e(msg)}</span>
      <button onclick="this.closest('div').parentElement.remove()" style="margin-left:auto;background:none;border:none;color:#94A3B8;cursor:pointer;font-size:.9rem;padding:0">×</button>
    </div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* Inject keyframe */
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .flex-1 { flex: 1; }
  [title]:not(.nav-item-link) { position: relative; }
`;
document.head.appendChild(style);

/* ---- CONFIRM DELETE HELPER ---- */
document.querySelectorAll('[data-confirm]').forEach(btn => {
  btn.addEventListener('click', function () {
    const msg = this.dataset.confirm || 'Êtes-vous sûr de vouloir supprimer cet élément ?';
    if (confirm(msg)) {
      const row = this.closest('tr');
      if (row) { row.style.opacity = '0'; row.style.transition = 'opacity .3s'; setTimeout(() => row.remove(), 300); }
      showToast('Élément supprimé avec succès.', 'success');
    }
  });
});

/* ---- FORM SAVE BUTTONS ---- */
document.querySelectorAll('form [type="submit"], .btn-save').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const form = this.closest('form');
    if (form && !form.checkValidity()) return;
    e.preventDefault();
    const original = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Enregistrement…';
    this.disabled = true;
    setTimeout(() => {
      this.innerHTML = original;
      this.disabled = false;
      showToast('Modifications enregistrées avec succès !', 'success');
    }, 1200);
  });
});

/* ---- INTERACTIVE SIMULATIONS FOR DASHBOARD ELEMENTS ---- */

// Buttons that trigger a PDF download or print action
document.addEventListener('click', function(e) {
  // Check if click was on or inside a button
  const btn = e.target.closest('button');
  if (!btn) return;
  
  const text = btn.textContent.toLowerCase();
  const html = btn.innerHTML.toLowerCase();
  
  // Ignore already handled buttons or those with specific logic
  if ((btn.type === 'submit' && btn.closest('form')) || btn.hasAttribute('data-bs-toggle') || btn.classList.contains('btn-save') || btn.classList.contains('topbar-btn') || btn.classList.contains('topbar-toggle') || btn.id === 'bAnnuel' || btn.id === 'bMensuel') return;

  // Print simulation (real print)
  if (html.includes('fa-print') || text.includes('imprimer')) {
    e.preventDefault();
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Préparation...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      window.print();
    }, 800);
    return;
  }
  
  // Export CSV/Excel simulation (real CSV generation)
  if (text.includes('excel') || text.includes('csv') || text.includes('exporter')) {
    e.preventDefault();
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Export...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      
      // Find nearest table or the main dash-table
      const table = btn.closest('.dash-card')?.querySelector('table') || document.querySelector('table');
      if (table) {
        let csvContent = "\uFEFF"; // BOM for UTF-8 Excel compatibility
        const rows = table.querySelectorAll("tr");
        rows.forEach(function(row) {
          let rowData = [];
          row.querySelectorAll("th, td").forEach(cell => rowData.push('"' + cell.innerText.replace(/"/g, '""').replace(/\n/g, ' ') + '"'));
          csvContent += rowData.join(";") + "\r\n";
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "export.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast('Export réussi.', 'success');
      } else {
        showToast('Aucune donnée à exporter.', 'warning');
      }
    }, 1000);
    return;
  }
  
  // Receipt / PDF download simulation (downloads a text receipt)
  if (html.includes('fa-download') || html.includes('fa-file-pdf') || text.includes('pdf') || text.includes('reçu') || text.includes('telecharger') || text.includes('télécharger')) {
    e.preventDefault();
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Téléchargement...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      
      const content = "====================================\n" +
                      "          REÇU / DOCUMENT           \n" +
                      "====================================\n\n" +
                      "Établissement: EduManager\n" +
                      "Date: " + new Date().toLocaleDateString() + "\n\n" +
                      "Ce document a été généré automatiquement.\n" +
                      "====================================\n";
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "document_edumanager.txt");
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Le document a été téléchargé.', 'success');
    }, 1500);
    return;
  }

  // Send (Envoyer bulletins, Relancer, etc.)
  if (html.includes('fa-paper-plane') || text.includes('envoyer') || text.includes('relancer')) {
    e.preventDefault();
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Envoi...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      showToast('Envoi effectué avec succès.', 'success');
    }, 1200);
    return;
  }
  
  // Load notes / Specific logic for Notes page
  if (text.includes('charger les notes') || text.includes('charger')) {
    e.preventDefault();
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Chargement...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      showToast('Données chargées avec succès.', 'success');
    }, 800);
    return;
  }
  
  // Action "Saisir les notes" -> "Continuer vers la saisie" in the first modal
  if (btn.id === 'btnContinueSaisie') {
    e.preventDefault();
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Ouverture...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      
      // Close the first modal
      const modal1 = document.getElementById('addNoteModal');
      if (modal1) {
        if (typeof bootstrap !== 'undefined') {
          const m1 = bootstrap.Modal.getInstance(modal1) || new bootstrap.Modal(modal1);
          m1.hide();
        } else {
          modal1.classList.remove('show');
          modal1.style.display = 'none';
        }
      }
      
      // Open the second modal
      const modal2 = document.getElementById('saisieGrilleModal');
      if (modal2) {
        if (typeof bootstrap !== 'undefined') {
          const m2 = new bootstrap.Modal(modal2);
          m2.show();
        } else {
          modal2.classList.add('show');
          modal2.style.display = 'block';
        }
      }
    }, 800);
    return;
  }
  
  // Save Grid
  if (btn.id === 'btnSaveGrille') {
    e.preventDefault();
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Enregistrement...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      
      // Update main table
      const tbodyGrid = document.getElementById('grilleSaisieBody');
      const mainTableBody = document.querySelector('.dash-table tbody');
      
      if (tbodyGrid && mainTableBody) {
        const rows = tbodyGrid.querySelectorAll('tr');
        rows.forEach(row => {
          const inputs = row.querySelectorAll('input');
          if (inputs.length >= 2) {
            const nom = inputs[0].value.trim();
            const note = parseFloat(inputs[1].value);
            const appreciation = inputs[2] ? inputs[2].value.trim() : '';
            
            if (nom && !isNaN(note)) {
              // Determine status and color based on note
              let statusClass = 'danger', statusText = 'Insuffisant', colorClass = 'text-danger', bgClass = '#EF4444';
              if (note >= 16) { statusClass = 'success'; statusText = 'Excellent'; colorClass = 'text-success'; bgClass = '#10B981'; }
              else if (note >= 14) { statusClass = 'success'; statusText = 'Très bien'; colorClass = 'text-success'; bgClass = '#10B981'; }
              else if (note >= 12) { statusClass = 'info'; statusText = 'Assez bien'; colorClass = 'text-primary'; bgClass = '#2563EB'; }
              else if (note >= 10) { statusClass = 'warning'; statusText = 'Passable'; colorClass = 'text-warning'; bgClass = '#F59E0B'; }
              
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td><div class="d-flex align-items-center gap-2"><div class="table-av" style="background:${bgClass}">${EduSecurity.escapeHtml(nom.charAt(0).toUpperCase())}</div><span style="font-weight:600;font-size:.85rem">${EduSecurity.escapeHtml(nom)}</span></div></td>
                <td class="text-center" style="font-size:.85rem">-</td>
                <td class="text-center" style="font-size:.85rem">-</td>
                <td class="text-center" style="font-size:.85rem">${note}</td>
                <td class="text-center"><span class="fw-bold ${colorClass}" style="font-size:.9rem">${note.toFixed(1)}</span></td>
                <td class="text-center"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><button class="btn btn-sm" style="padding:2px 8px;background:rgba(37,99,235,.1);color:var(--primary);border-radius:6px;font-size:.75rem"><i class="fas fa-file-pdf me-1"></i>PDF</button></td>
              `;
              mainTableBody.appendChild(tr);
            }
          }
        });
        
        // Clear grid after save
        tbodyGrid.innerHTML = `
          <tr>
            <td><input type="text" class="form-control" placeholder="Nom de l'élève"></td>
            <td><input type="number" class="form-control text-center" placeholder="0" min="0" max="20"></td>
            <td><input type="text" class="form-control" placeholder="Bon travail, etc."></td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
          </tr>
        `;
      }
      
      const modal2 = document.getElementById('saisieGrilleModal');
      if (modal2 && typeof bootstrap !== 'undefined') {
        const m2 = bootstrap.Modal.getInstance(modal2) || new bootstrap.Modal(modal2);
        m2.hide();
      }
      showToast('Les notes ont été enregistrées avec succès.', 'success');
    }, 1200);
    return;
  }
});

// Function to add a student row dynamically
window.addStudentRow = function() {
  const tbody = document.getElementById('grilleSaisieBody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="form-control" placeholder="Nom de l'élève"></td>
    <td><input type="number" class="form-control text-center" placeholder="0" min="0" max="20"></td>
    <td><input type="text" class="form-control" placeholder="Bon travail, etc."></td>
    <td><button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
  `;
  tbody.appendChild(tr);
};

/* ---- SPECIFIC REPORTS/RAPPORT LOGIC ---- */
document.addEventListener('DOMContentLoaded', function() {
  // Annuel / Mensuel toggles on reports
  const bAnnuel = document.getElementById('bAnnuel');
  const bMensuel = document.getElementById('bMensuel');
  
  if (bAnnuel && bMensuel) {
    bAnnuel.addEventListener('click', function(e) {
      e.preventDefault();
      bAnnuel.classList.add('btn-primary', 'active');
      bAnnuel.classList.remove('btn-outline-secondary');
      bMensuel.classList.add('btn-outline-secondary');
      bMensuel.classList.remove('btn-primary', 'active');
      showToast('Données annuelles chargées.', 'info');
    });
    
    bMensuel.addEventListener('click', function(e) {
      e.preventDefault();
      bMensuel.classList.add('btn-primary', 'active');
      bMensuel.classList.remove('btn-outline-secondary');
      bAnnuel.classList.add('btn-outline-secondary');
      bAnnuel.classList.remove('btn-primary', 'active');
      showToast('Données mensuelles chargées.', 'info');
    });
  }
});

/* ---- SUPABASE DYNAMIC CHARTS FOR DASHBOARD INDEX ---- */
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/dashboard/')) {
    initDashboardDynamicCharts();
  }
});

function initDashboardDynamicCharts() {
  const yearSelect = document.getElementById('academicYearSelect');
  if (!yearSelect) return;

  const currentYear = new Date().getFullYear();
  let startYear = 2026;
  const maxYear = Math.max(currentYear, startYear);
  
  let options = '';
  for (let y = maxYear; y >= startYear; y--) {
    options += `<option value="${y}-${y+1}">${y}-${y+1}</option>`;
  }
  yearSelect.innerHTML = options;

  yearSelect.addEventListener('change', loadDashboardSupabaseData);
  // Delay loading slightly to ensure Supabase client is ready
  setTimeout(loadDashboardSupabaseData, 200);
}

async function loadDashboardSupabaseData() {
  const client = window.SupabaseEdu && window.SupabaseEdu.client;
  if (!client) {
    console.warn("Supabase client not initialized.");
    return;
  }

  const yearSelect = document.getElementById('academicYearSelect');
  const selectedYear = yearSelect ? yearSelect.value : '2026-2027';
  const startY = parseInt(selectedYear.split('-')[0], 10);
  const endY = parseInt(selectedYear.split('-')[1], 10);
  const startDate = new Date(startY, 8, 1).toISOString(); // Sept 1st
  const endDate = new Date(endY, 7, 31, 23, 59, 59).toISOString(); // Aug 31st

  // 1. Fetch Eleves for Inscriptions Chart
  const { data: eleves, error: errEleves } = await client
    .from('eleves')
    .select('created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
    
  if (!errEleves) {
    renderEnrollmentsChart(eleves || []);
  }

  // 2. Fetch Paiements for Donut
  const { data: paiements, error: errPaiements } = await client
    .from('paiements')
    .select('statut, montant')
    .gte('date_paiement', startDate)
    .lte('date_paiement', endDate);
    
  if (!errPaiements) {
    renderPaymentsDonut(paiements || []);
  }

  // 3. Update Top Stats cards
  const scValues = document.querySelectorAll('.sc-value');
  if (scValues.length > 0 && !errEleves) {
    scValues[0].textContent = (eleves || []).length;
  }
  if (scValues.length > 1 && !errPaiements) {
    const totalAmount = (paiements || []).reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
    scValues[1].textContent = totalAmount.toLocaleString() + ' FCFA'; // Or appropriate currency
  }
}

function renderEnrollmentsChart(eleves) {
  const chart = document.getElementById('enrollmentsChart');
  const labelsContainer = document.getElementById('enrollmentsLabels');
  if (!chart || !labelsContainer) return;

  const months = ['Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr']; // Showing 8 months
  const monthCounts = new Array(8).fill(0);
  
  eleves.forEach(e => {
    const d = new Date(e.created_at);
    let m = d.getMonth(); // 0 = Jan, 8 = Sep
    let academicMonthIndex = m >= 8 ? m - 8 : m + 4;
    if (academicMonthIndex >= 0 && academicMonthIndex < 8) {
      monthCounts[academicMonthIndex]++;
    }
  });

  const maxCount = Math.max(...monthCounts, 5); // Avoid division by 0 and keep a min scale

  let chartHTML = '';
  let labelsHTML = '';

  months.forEach((m, idx) => {
    const count = monthCounts[idx];
    const percentage = Math.max(Math.round((count / maxCount) * 100), 5); // min 5% height
    
    const isOdd = idx % 2 !== 0;
    const bg = isOdd ? 'linear-gradient(180deg,#10B981,#34D399)' : 'linear-gradient(180deg,#2563EB,#60A5FA)';
    
    chartHTML += `<div class="bar-item" style="height:${percentage}%;background:${bg}" title="${m}: ${count} inscriptions"></div>`;
    labelsHTML += `<span>${m}</span>`;
  });

  chart.innerHTML = chartHTML;
  labelsContainer.innerHTML = labelsHTML;
}

function renderPaymentsDonut(paiements) {
  const donut = document.getElementById('paymentsDonut');
  if (!donut) return;

  let payes = 0, partiels = 0, impayes = 0;
  paiements.forEach(p => {
    const st = (p.statut || '').toLowerCase();
    if (st.includes('payé') && !st.includes('impayé')) payes++;
    else if (st.includes('partiel')) partiels++;
    else if (st.includes('impayé')) impayes++;
  });

  const total = payes + partiels + impayes;
  const paidText = document.getElementById('paymentsPaidText');
  const partialText = document.getElementById('paymentsPartialText');
  const unpaidText = document.getElementById('paymentsUnpaidText');

  if (total === 0) {
    donut.style.background = '#e2e8f0'; // Empty state gray
    if(paidText) paidText.textContent = `0% · 0 paiements`;
    if(partialText) partialText.textContent = `0% · 0 paiements`;
    if(unpaidText) unpaidText.textContent = `0% · 0 paiements`;
    return;
  }

  const pPayes = Math.round((payes / total) * 100);
  const pPartiels = Math.round((partiels / total) * 100);
  const pImpayes = 100 - pPayes - pPartiels;

  const warnStart = pPayes;
  const dangerStart = pPayes + pPartiels;
  
  donut.style.background = `conic-gradient(var(--primary) ${warnStart}%, var(--warning) ${warnStart}% ${dangerStart}%, var(--danger) ${dangerStart}%)`;

  if(paidText) paidText.textContent = `${pPayes}% · ${payes} paiements`;
  if(partialText) partialText.textContent = `${pPartiels}% · ${partiels} paiements`;
  if(unpaidText) unpaidText.textContent = `${pImpayes}% · ${impayes} paiements`;
}


