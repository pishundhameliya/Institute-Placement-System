const STATUS = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview Scheduled',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
};

const nowISO = () => new Date().toISOString();
const fmtDateTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};
const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function cls(...parts) { return parts.filter(Boolean).join(' '); }

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function currentUser() { return CACHE.userData; }
function getUser(id) { return CACHE.users.find(u => u.id === id) || null; }

function roleLabel(role) {
  return role === 'student' ? 'Student' : role === 'employer' ? 'Company Member' : 'Faculty/Admin';
}

const SEMESTERS = [
  'Graduation Sem 1', 'Graduation Sem 2', 'Graduation Sem 3', 'Graduation Sem 4',
  'Graduation Sem 5', 'Graduation Sem 6', 'Graduation Sem 7', 'Graduation Sem 8',
  'Graduation Completed',
  'Master Sem 1', 'Master Sem 2', 'Master Sem 3', 'Master Sem 4',
  'Master Completed'
];

const CITY_OPTIONS = [
  'Adalaj', 'Ahmedabad', 'Amreli', 'Anand', 'Anjar', 'Ankleshwar', 'Babra',
  'Balasinor', 'Bantwa', 'Bardoli', 'Bareja', 'Barwala', 'Bayad', 'Bhachau',
  'Bhanvad', 'Bharuch', 'Bhavnagar', 'Bhilad', 'Bhuj', 'Bilimora', 'Bodeli',
  'Bopal', 'Borsad', 'Botad', 'Chanasma', 'Chhota Udepur', 'Chikhli', 'Chorvad',
  'Dabhoi', 'Dahegam', 'Dahod', 'Dakor', 'Damnagar', 'Danta', 'Dediapada',
  'Deesa', 'Dehgam', 'Dhanera', 'Dhansura', 'Dharampur', 'Dholka', 'Dhoraji',
  'Dhrangadhra', 'Dhrol', 'Dwarka', 'Gadhada', 'Gandevi', 'Gandhidham',
  'Gandhinagar', 'Gariadhar', 'Godhra', 'Gondal', 'Halol', 'Halvad', 'Himatnagar',
  'Idar', 'Jafrabad', 'Jalalpore', 'Jam Jodhpur', 'Jambusar', 'Jamnagar',
  'Jasdan', 'Jetpur', 'Junagadh', 'Kadodara', 'Kalavad', 'Kalol', 'Kapadvanj',
  'Karjan', 'Keshod', 'Khambhat', 'Khambhaliya', 'Kheda', 'Khedbrahma', 'Kheralu',
  'Kodinar', 'Kutiyana', 'Lathi', 'Limbdi', 'Lunawada', 'Mahemdabad', 'Mahesana',
  'Mahuva', 'Malpur', 'Mandvi', 'Mangrol', 'Mansa', 'Mehmedabad', 'Modasa',
  'Morbi', 'Mundra', 'Nadiad', 'Navsari', 'Okha', 'Paddhari', 'Padra', 'Palanpur',
  'Palitana', 'Pardi', 'Patan', 'Petlad', 'Porbandar', 'Prantij', 'Radhanpur',
  'Rajkot', 'Rajpipla', 'Rajula', 'Ranavav', 'Ranip', 'Rapar', 'Sachin', 'Sanand',
  'Sankheda', 'Savarkundla', 'Savli', 'Sidhpur', 'Sihor', 'Songadh', 'Surat',
  'Surendranagar', 'Talaja', 'Talod', 'Tankara', 'Thangadh', 'Tharad', 'Umbergaon',
  'Umreth', 'Una', 'Unjha', 'Upleta', 'Vadnagar', 'Vadodara', 'Vallabh Vidyanagar',
  'Valsad', 'Vapi', 'Vartej', 'Veraval', 'Vijapur', 'Viramgam', 'Visnagar', 'Vyara',
  'Wadhwan', 'Wankaner'
];

function cityOptionsHTML() {
  return CITY_OPTIONS.map(city => `<option value="${escapeHtml(city)}"></option>`).join('');
}

const GUJARAT_INSTITUTES = [
  'Ahmedabad University',
  'B. H. Gardi College of Engineering and Technology',
  'BVM Engineering College',
  'C.U. Shah College of Engineering & Technology',
  'Chandubhai S Patel Institute of Technology (CSPIT)',
  'CK Pithawalla College of Engineering and Technology',
  'Dhirubhai Ambani Institute of Information and Communication Technology (DA-IICT)',
  'Dharmsinh Desai University (DDU)',
  'Dr. S. & S. S. Ghandhy Government Engineering College',
  'Faculty of Technology and Engineering, MSU',
  'Ganpat University',
  'GEC Bharuch',
  'GEC Bhavnagar',
  'GEC Dahod',
  'GEC Gandhinagar',
  'GEC Modasa',
  'GEC Palanpur',
  'GEC Patan',
  'GEC Rajkot',
  'GEC Surat',
  'GEC Valsad',
  'GLS University',
  'GSFC University',
  'Gujarat Technological University (GTU)',
  'Gujarat University',
  'IIT Gandhinagar',
  'Indus University',
  'Institute of Infrastructure, Technology, Research and Management (IITRAM)',
  'Karnavati University',
  'L.D. College of Engineering (LDCE)',
  'L.E. College, Morbi',
  'LDRP Institute of Technology and Research',
  'Marwadi University',
  'Navrachana University',
  'Nirma University',
  'Pandit Deendayal Energy University (PDEU)',
  'Parul University',
  'R.K. University',
  'Sal College of Engineering',
  'Sardar Vallabhbhai National Institute of Technology (SVNIT)',
  'Shantilal Shah Engineering College',
  'Shree Swami Atmanand Saraswati Institute of Technology (SSASIT)',
  'Silver Oak University',
  'Sardar Patel University',
  'UKA Tarsadia University',
  'V.V.P. Engineering College',
  'Vishwakarma Government Engineering College (VGEC)'
];

function instituteOptionsHTML() {
  return GUJARAT_INSTITUTES.map(inst => `<option value="${escapeHtml(inst)}"></option>`).join('');
}

function getPasswordIssues(password) {
  const issues = [];
  if ((password || '').length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(password || '')) issues.push('one uppercase letter (A-Z)');
  if (!/[a-z]/.test(password || '')) issues.push('one lowercase letter (a-z)');
  if (!/[0-9]/.test(password || '')) issues.push('one number (0-9)');
  if (!/[^A-Za-z0-9]/.test(password || '')) issues.push('one symbol (e.g. @, #, $, !)');
  return issues;
}

function getPrevSemCount(semStr) {
  if (!semStr) return 0;
  if (semStr === 'Graduation Completed') return 8;
  if (semStr === 'Master Completed') return 4;
  const match = semStr.match(/\\d+/);
  return match ? parseInt(match[0]) - 1 : 0;
}

function isMaster(semStr) {
  return semStr && semStr.startsWith('Master');
}

function badge(status) {
  const base = 'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm';
  const map = {
    [STATUS.APPLIED]: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200',
    [STATUS.SHORTLISTED]: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    [STATUS.INTERVIEW]: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200',
    [STATUS.REJECTED]: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    [STATUS.SELECTED]: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  };
  return `<span class="${base} ${map[status] || 'border-white/15 bg-white/5 text-slate-200'}">${escapeHtml(status || '—')}</span>`;
}

function toast(title, message, kind = 'info') {
  const host = $('#toastHost');
  const id = uid('toast');
  const styles = {
    info: 'border-indigo-400/25 bg-slate-950/85',
    success: 'border-emerald-400/25 bg-slate-950/85',
    warn: 'border-amber-400/25 bg-slate-950/85',
    danger: 'border-rose-400/25 bg-slate-950/85'
  };
  const icon = { info: 'ℹ', success: '✓', warn: '⚠', danger: '✕' };
  const el = document.createElement('div');
  el.id = id;
  el.className = `card rounded-2xl border ${styles[kind] || styles.info} p-4 backdrop-blur`;
  el.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="mt-0.5 h-7 w-7 shrink-0 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-sm text-slate-200">${icon[kind] || 'ℹ'}</div>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold">${escapeHtml(title || '')}</div>
        <div class="mt-0.5 text-xs text-slate-300/85">${escapeHtml(message || '')}</div>
      </div>
      <button class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10" data-x>Close</button>
    </div>
  `;
  host.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').addEventListener('click', close);
  setTimeout(() => { if (document.getElementById(id)) close(); }, 4500);
}

function openModal({ title = 'Modal', subtitle = '', bodyHTML = '', onMount = null }) {
  $('#modalTitle').textContent = title;
  $('#modalSubtitle').textContent = subtitle;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modal').classList.remove('hidden');
  if (typeof onMount === 'function') onMount();
}

function closeModal() { $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; }

$('#modalClose')?.addEventListener('click', closeModal);
$('#modalBackdrop')?.addEventListener('click', closeModal);

function showLoading(text) {
  const el = $('#loadingOverlay');
  if (el) {
    el.classList.remove('hidden');
    const txt = $('#loadingText');
    if (txt && text) txt.textContent = text;
  }
}
function hideLoading() {
  const el = $('#loadingOverlay');
  if (el) el.classList.add('hidden');
}

function toNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function getJob(jobId) { return CACHE.jobs.find(j => j.id === jobId) || null; }
function applicationsForStudent(studentId) { return CACHE.applications.filter(a => a.studentId === studentId); }
function applicationFor(studentId, jobId) { return CACHE.applications.find(a => a.studentId === studentId && a.jobId === jobId) || null; }
function applicationsForJob(jobId) { return CACHE.applications.filter(a => a.jobId === jobId); }

function readOnlyField(label, value) {
  return `
    <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover-lift transition">
      <div class="text-[10px] uppercase tracking-wider font-semibold text-slate-400/80">${escapeHtml(label)}</div>
      <div class="mt-1 text-sm font-medium text-slate-100">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject('No file');
    if (file.size > 800 * 1024) {
      reject('Photo must be under 800KB. Please use a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxWidth = 300, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = () => reject('Failed to load image');
      img.src = e.target.result;
    };
    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
}

function fileToDataUrlWithLimit(file, maxKB, allowedMimePrefix, label) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(`No ${label || 'file'} selected.`);
    if (allowedMimePrefix && !String(file.type || '').startsWith(allowedMimePrefix)) {
      return reject(`Please upload a valid ${label || 'file'}.`);
    }
    if (file.size > maxKB * 1024) {
      return reject(`${label || 'File'} must be under ${maxKB}KB.`);
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(`Failed to read ${label || 'file'}.`);
    reader.readAsDataURL(file);
  });
}

function parseRoute() {
  const raw = location.hash || '#/home';
  const [path, qs] = raw.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs || '').entries());
  return { raw, path: '/' + (parts[0] || 'home'), parts, query };
}

function isActive(href) {
  const r = parseRoute();
  return r.raw.startsWith(href);
}

function navLink(href, label) {
  const active = isActive(href);
  return `
    <a href="${href}" class="${cls(
    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
    active ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
  )}">${escapeHtml(label)}</a>
  `;
}

function inputBase(extra = '') {
  return cls('focus-ring w-full rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all', extra);
}

function selectBase(extra = '') {
  return cls('focus-ring w-full rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-2.5 text-sm text-slate-100 transition-all cursor-pointer', extra);
}

function requireAuth(route) {
  const user = currentUser();
  if (!user) {
    location.hash = `#/auth?next=${encodeURIComponent(route)}`;
    return false;
  }
  return true;
}
