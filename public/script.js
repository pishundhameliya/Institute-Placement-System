/***********************
 * Institute Placement System
 * Firebase-Integrated SPA
 * - Auth: Firebase Authentication (Email/Password)
 * - Database: Cloud Firestore
 * - Photos: Stored as base64 in Firestore (NO Firebase Storage needed)
 * - Routing: hash-based SPA
 ***********************/

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
const uid = (prefix='id') => `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

// In-memory cache (synced from Firestore)
let CACHE = {
  currentUser: null,
  userData: null,
  jobs: [],
  applications: [],
  notifications: [],
  users: []
};

let unsubscribers = [];
const ROLE_DASHBOARD_SCRIPTS = {
  student: 'role-student-dashboard.js',
  employer: 'role-employer-dashboard.js',
  faculty: 'role-faculty-dashboard.js'
};
const ROLE_PROFILE_SCRIPTS = {
  student: 'role-student-profile.js',
  employer: 'role-employer-profile.js',
  faculty: 'role-faculty-profile.js'
};
const ROLE_VIEW_HANDLER_SCRIPTS = {
  student: 'role-student-handlers.js',
  employer: 'role-employer-handlers.js',
  faculty: 'role-faculty-handlers.js'
};
const AUTH_SIGNUP_HELPERS_SCRIPT = 'auth-signup-helpers.js';
const JOBS_WIRING_SCRIPT = 'jobs-wiring.js';
const ASSET_VERSION = '20260410-1';
const roleDashboardRenderers = {};
const roleDashboardPromises = {};
const roleProfileRenderers = {};
const roleProfilePromises = {};
const roleViewHandlers = {};
const roleViewHandlerPromises = {};
let authSignupHelpers = null;
let authSignupHelpersPromise = null;
let jobsWiringHandler = null;
let jobsWiringPromise = null;

window.registerRoleDashboard = function registerRoleDashboard(role, renderer) {
  if (role && typeof renderer === 'function') {
    roleDashboardRenderers[role] = renderer;
  }
};
window.registerRoleProfile = function registerRoleProfile(role, renderer) {
  if (role && typeof renderer === 'function') {
    roleProfileRenderers[role] = renderer;
  }
};
window.registerRoleViewHandlers = function registerRoleViewHandlers(role, handler) {
  if (role && typeof handler === 'function') {
    roleViewHandlers[role] = handler;
  }
};
window.registerAuthSignupHelpers = function registerAuthSignupHelpers(helpers) {
  if (helpers && typeof helpers.renderRoleFields === 'function' && typeof helpers.buildUserData === 'function') {
    authSignupHelpers = helpers;
  }
};
window.registerJobsWiring = function registerJobsWiring(handler) {
  if (typeof handler === 'function') jobsWiringHandler = handler;
};

function loadRoleDashboard(role) {
  if (!role || roleDashboardRenderers[role]) return Promise.resolve();
  if (roleDashboardPromises[role]) return roleDashboardPromises[role];

  roleDashboardPromises[role] = new Promise((resolve, reject) => {
    const src = ROLE_DASHBOARD_SCRIPTS[role];
    if (!src) {
      reject(new Error(`Unknown role: ${role}`));
      return;
    }
    const el = document.createElement('script');
    el.src = `${src}?v=${ASSET_VERSION}`;
    el.onload = () => {
      if (roleDashboardRenderers[role]) resolve();
      else reject(new Error(`Dashboard module did not register for role: ${role}`));
    };
    el.onerror = () => reject(new Error(`Failed to load dashboard module: ${src}`));
    document.body.appendChild(el);
  });

  return roleDashboardPromises[role];
}

function loadRoleProfile(role) {
  if (!role || roleProfileRenderers[role]) return Promise.resolve();
  if (roleProfilePromises[role]) return roleProfilePromises[role];

  roleProfilePromises[role] = new Promise((resolve, reject) => {
    const src = ROLE_PROFILE_SCRIPTS[role];
    if (!src) {
      reject(new Error(`Unknown role: ${role}`));
      return;
    }
    const el = document.createElement('script');
    el.src = `${src}?v=${ASSET_VERSION}`;
    el.onload = () => {
      if (roleProfileRenderers[role]) resolve();
      else reject(new Error(`Profile module did not register for role: ${role}`));
    };
    el.onerror = () => reject(new Error(`Failed to load profile module: ${src}`));
    document.body.appendChild(el);
  });

  return roleProfilePromises[role];
}

function loadRoleViewHandlers(role) {
  if (!role || roleViewHandlers[role]) return Promise.resolve();
  if (roleViewHandlerPromises[role]) return roleViewHandlerPromises[role];

  roleViewHandlerPromises[role] = new Promise((resolve, reject) => {
    const src = ROLE_VIEW_HANDLER_SCRIPTS[role];
    if (!src) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = `${src}?v=${ASSET_VERSION}`;
    el.onload = () => {
      if (roleViewHandlers[role]) resolve();
      else reject(new Error(`View handler module did not register for role: ${role}`));
    };
    el.onerror = () => reject(new Error(`Failed to load view handler module: ${src}`));
    document.body.appendChild(el);
  });

  return roleViewHandlerPromises[role];
}

function loadAuthSignupHelpers() {
  if (authSignupHelpers) return Promise.resolve();
  if (authSignupHelpersPromise) return authSignupHelpersPromise;

  authSignupHelpersPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = `${AUTH_SIGNUP_HELPERS_SCRIPT}?v=${ASSET_VERSION}`;
    el.onload = () => {
      if (authSignupHelpers) resolve();
      else reject(new Error('Auth signup helpers were not registered'));
    };
    el.onerror = () => reject(new Error(`Failed to load auth helper module: ${AUTH_SIGNUP_HELPERS_SCRIPT}`));
    document.body.appendChild(el);
  });

  return authSignupHelpersPromise;
}

function loadJobsWiring() {
  if (jobsWiringHandler) return Promise.resolve();
  if (jobsWiringPromise) return jobsWiringPromise;

  jobsWiringPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = `${JOBS_WIRING_SCRIPT}?v=${ASSET_VERSION}`;
    el.onload = () => {
      if (jobsWiringHandler) resolve();
      else reject(new Error('Jobs wiring module was not registered'));
    };
    el.onerror = () => reject(new Error(`Failed to load jobs wiring module: ${JOBS_WIRING_SCRIPT}`));
    document.body.appendChild(el);
  });

  return jobsWiringPromise;
}

/***********************
 * Helpers
 ***********************/
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function cls(...parts){ return parts.filter(Boolean).join(' '); }

function escapeHtml(str='') {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
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
  const match = semStr.match(/\d+/);
  return match ? parseInt(match[0]) - 1 : 0;
}

function isMaster(semStr) {
  return semStr && semStr.startsWith('Master');
}

function badge(status) {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium';
  const map = {
    [STATUS.APPLIED]: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200',
    [STATUS.SHORTLISTED]: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    [STATUS.INTERVIEW]: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
    [STATUS.REJECTED]: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    [STATUS.SELECTED]: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  };
  return `<span class="${base} ${map[status] || 'border-white/15 bg-white/5 text-slate-200'}">${escapeHtml(status || '—')}</span>`;
}

function toast(title, message, kind='info') {
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

function openModal({ title='Modal', subtitle='', bodyHTML='', onMount=null }) {
  $('#modalTitle').textContent = title;
  $('#modalSubtitle').textContent = subtitle;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modal').classList.remove('hidden');
  if (typeof onMount === 'function') onMount();
}

function closeModal(){ $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; }

$('#modalClose').addEventListener('click', closeModal);
$('#modalBackdrop').addEventListener('click', closeModal);

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

function toNumber(x, fallback=0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function getJob(jobId) { return CACHE.jobs.find(j => j.id === jobId) || null; }
function applicationsForStudent(studentId) { return CACHE.applications.filter(a => a.studentId === studentId); }
function applicationFor(studentId, jobId) { return CACHE.applications.find(a => a.studentId === studentId && a.jobId === jobId) || null; }
function applicationsForJob(jobId) { return CACHE.applications.filter(a => a.jobId === jobId); }

function readOnlyField(label, value) {
  return `
    <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div class="text-[11px] uppercase tracking-wide text-slate-300/70">${escapeHtml(label)}</div>
      <div class="mt-1 text-sm text-slate-100">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

/***********************
 * Photo Helper — Convert to base64 and store in Firestore
 ***********************/
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject('No file');
    // Limit to 800KB for Firestore document size limits
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

// Compress image before storing
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

/***********************
 * Firebase Database Operations
 ***********************/

// Save/update user profile in Firestore
async function saveUserProfile(userId, data) {
  try {
    await db.collection('users').doc(userId).set(data, { merge: true });
    // Update local cache
    const idx = CACHE.users.findIndex(u => u.id === userId);
    if (idx >= 0) CACHE.users[idx] = { ...CACHE.users[idx], ...data, id: userId };
    else CACHE.users.push({ ...data, id: userId });
    if (CACHE.currentUser && CACHE.currentUser.uid === userId) {
      CACHE.userData = { ...CACHE.userData, ...data, id: userId };
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    toast('Error', 'Failed to save profile. Please try again.', 'danger');
  }
}

// Post a job to Firestore
async function postJobToFirestore(jobData) {
  try {
    const docRef = await db.collection('jobs').add({
      ...jobData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    jobData.id = docRef.id;
    jobData.createdAt = Date.now();
    CACHE.jobs.unshift(jobData);
    return docRef.id;
  } catch (err) {
    console.error('Error posting job:', err);
    toast('Error', 'Failed to post job. Please try again.', 'danger');
    return null;
  }
}

// Update an existing job
async function updateJobFirestore(jobId, updateData) {
  try {
    await db.collection('jobs').doc(jobId).update(updateData);
    const idx = CACHE.jobs.findIndex(j => j.id === jobId);
    if (idx >= 0) CACHE.jobs[idx] = { ...CACHE.jobs[idx], ...updateData };
    return true;
  } catch (err) {
    console.error('Error updating job:', err);
    toast('Error', 'Failed to update job.', 'danger');
    return false;
  }
}

// Approve a job posting for a specific institute
async function approveJobForInstituteFirestore(jobId, instituteName) {
  try {
    await db.collection('jobs').doc(jobId).update({
      approvedInstitutes: firebase.firestore.FieldValue.arrayUnion(instituteName)
    });
    // Update local cache
    const idx = CACHE.jobs.findIndex(j => j.id === jobId);
    if (idx >= 0) {
      if (!CACHE.jobs[idx].approvedInstitutes) CACHE.jobs[idx].approvedInstitutes = [];
      if (!CACHE.jobs[idx].approvedInstitutes.includes(instituteName)) {
        CACHE.jobs[idx].approvedInstitutes.push(instituteName);
      }
    }
    return true;
  } catch (err) {
    console.error('Error approving job:', err);
    toast('Error', 'Failed to approve job.', 'danger');
    return false;
  }
}

// Reject a job posting for a specific institute
async function rejectJobForInstituteFirestore(jobId, instituteName) {
  try {
    await db.collection('jobs').doc(jobId).update({
      rejectedInstitutes: firebase.firestore.FieldValue.arrayUnion(instituteName)
    });
    // Update local cache
    const idx = CACHE.jobs.findIndex(j => j.id === jobId);
    if (idx >= 0) {
      if (!CACHE.jobs[idx].rejectedInstitutes) CACHE.jobs[idx].rejectedInstitutes = [];
      if (!CACHE.jobs[idx].rejectedInstitutes.includes(instituteName)) {
        CACHE.jobs[idx].rejectedInstitutes.push(instituteName);
      }
    }
    return true;
  } catch (err) {
    console.error('Error rejecting job:', err);
    toast('Error', 'Failed to reject job request.', 'danger');
    return false;
  }
}

// Delete a job (and its applications)
async function deleteJobFirestore(jobId) {
  try {
    const batch = db.batch();
    batch.delete(db.collection('jobs').doc(jobId));
    
    // Delete applications for this job
    const appsSnap = await db.collection('applications').where('jobId', '==', jobId).get();
    appsSnap.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    CACHE.jobs = CACHE.jobs.filter(j => j.id !== jobId);
    CACHE.applications = CACHE.applications.filter(a => a.jobId !== jobId);
    return true;
  } catch (err) {
    console.error('Error deleting job:', err);
    toast('Error', 'Failed to delete job.', 'danger');
    return false;
  }
}

// Apply for a job
async function applyForJobFirestore(appData) {
  try {
    const docRef = await db.collection('applications').add({
      ...appData,
      appliedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    appData.id = docRef.id;
    appData.appliedAt = Date.now();
    CACHE.applications.unshift(appData);
    return docRef.id;
  } catch (err) {
    console.error('Error applying:', err);
    toast('Error', 'Failed to submit application. Please try again.', 'danger');
    return null;
  }
}

// Update application status
async function updateApplicationFirestore(appId, updateData) {
  try {
    await db.collection('applications').doc(appId).update({
      ...updateData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const idx = CACHE.applications.findIndex(a => a.id === appId);
    if (idx >= 0) CACHE.applications[idx] = { ...CACHE.applications[idx], ...updateData };
  } catch (err) {
    console.error('Error updating application:', err);
    toast('Error', 'Failed to update application.', 'danger');
  }
}

// Delete an application (withdraw)
async function deleteApplicationFirestore(appId) {
  try {
    await db.collection('applications').doc(appId).delete();
    CACHE.applications = CACHE.applications.filter(a => a.id !== appId);
  } catch (err) {
    console.error('Error deleting application:', err);
    toast('Error', 'Failed to withdraw application.', 'danger');
  }
}

// Push notification
async function pushNotification(userId, { title, message, link='#/dashboard', type='info' }) {
  try {
    const notifData = {
      userId,
      title,
      message,
      link,
      type,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('notifications').add(notifData);
    notifData.id = docRef.id;
    notifData.createdAt = Date.now();
    if (userId === CACHE.currentUser?.uid) {
      CACHE.notifications.unshift(notifData);
    }

    // Simulate email/SMS logging
    const user = getUser(userId);
    if (user && user.email) {
      console.log(`📧 Email notification to ${user.email}: ${title} - ${message}`);
    }
    const phone = user?.profile?.phone || user?.company?.phone || user?.faculty?.phone;
    if (phone) {
      console.log(`📱 SMS notification to ${phone}: ${title} - ${message}`);
    }
  } catch (err) {
    console.error('Error pushing notification:', err);
  }
}

// Mark notification as read
async function markNotificationRead(notifId) {
  try {
    await db.collection('notifications').doc(notifId).update({ read: true });
    const n = CACHE.notifications.find(x => x.id === notifId);
    if (n) n.read = true;
  } catch (err) {
    console.error('Error marking notification:', err);
  }
}

/***********************
 * Firebase Real-time Listeners
 ***********************/
function setupRealtimeListeners(userId) {
  // Clear previous listeners
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  // Listen to all users
  const unsubUsers = db.collection('users').onSnapshot(snapshot => {
    CACHE.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (CACHE.currentUser) {
      CACHE.userData = CACHE.users.find(u => u.id === CACHE.currentUser.uid) || CACHE.userData;
    }
  }, err => console.error('Users listener error:', err));
  unsubscribers.push(unsubUsers);

  // Listen to all jobs
  const unsubJobs = db.collection('jobs').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    CACHE.jobs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
      };
    });
    render();
  }, err => console.error('Jobs listener error:', err));
  unsubscribers.push(unsubJobs);

  // Listen to applications
  const unsubApps = db.collection('applications').onSnapshot(snapshot => {
    CACHE.applications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        appliedAt: data.appliedAt?.toMillis ? data.appliedAt.toMillis() : data.appliedAt || Date.now()
      };
    });
    render();
  }, err => console.error('Applications listener error:', err));
  unsubscribers.push(unsubApps);

  // Listen to notifications for current user
  const unsubNotifs = db.collection('notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot(snapshot => {
      const prevCount = CACHE.notifications.filter(n => n.userId === userId && !n.read).length;
      CACHE.notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
        };
      });
      const newCount = CACHE.notifications.filter(n => !n.read).length;
      if (newCount > prevCount) {
        const latest = CACHE.notifications.find(n => !n.read);
        if (latest) toast(latest.title, latest.message, latest.type === 'success' ? 'success' : 'info');
      }
      render();
    }, err => console.error('Notifications listener error:', err));
  unsubscribers.push(unsubNotifs);
}

// Real-time listeners for guest users (public data only)
function setupPublicRealtimeListeners() {
  // Clear previous listeners before attaching public ones
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  const unsubUsers = db.collection('users').onSnapshot(snapshot => {
    CACHE.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  }, err => console.error('Public users listener error:', err));
  unsubscribers.push(unsubUsers);

  const unsubJobs = db.collection('jobs').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    CACHE.jobs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
      };
    });
    render();
  }, err => console.error('Public jobs listener error:', err));
  unsubscribers.push(unsubJobs);
}

// Load initial data (for guest view)
// Quick connection check to ensure Firestore is reachable
async function verifyFirestoreConnection() {
  try {
    await db.collection('jobs').limit(1).get();
    console.log('Firestore connection verified.');
  } catch (err) {
    console.error('Firestore connectivity check failed:', err);
    toast('Firestore Error', 'Firebase connected but Firestore query failed. Check rules/indexes.', 'danger');
  }
}

/***********************
 * Auth Functions
 ***********************/
async function loginWithEmail(email, password) {
  try {
    showLoading('Signing in...');
    await auth.signInWithEmailAndPassword(email, password);
    // Auth state listener handles the rest
  } catch (err) {
    hideLoading();
    let msg = 'Login failed. Please try again.';
    if (err.code === 'auth/user-not-found') msg = 'No account found with this email. Please sign up first.';
    else if (err.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email address format.';
    else if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password. Please check and try again.';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please wait and try again later.';
    toast('Login Failed', msg, 'danger');
  }
}

async function signupWithEmail(email, password, userData) {
  try {
    showLoading('Creating account...');
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const userId = cred.user.uid;

    // Save user data to Firestore
    await db.collection('users').doc(userId).set({
      ...userData,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Push welcome notification
    await db.collection('notifications').add({
      userId,
      title: 'Welcome to IPS!',
      message: 'Your account has been created successfully. Complete your profile to get started.',
      link: userData.role === 'employer' ? '#/employer/post' : '#/profile',
      type: 'info',
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Auth state listener handles the rest
  } catch (err) {
    hideLoading();
    let msg = 'Registration failed. Please try again.';
    if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists. Try logging in instead.';
    else if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters long.';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email address format.';
    toast('Registration Failed', msg, 'danger');
  }
}

async function logoutUser() {
  try {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    await auth.signOut();
    CACHE.currentUser = null;
    CACHE.userData = null;
    CACHE.notifications = [];
    location.hash = '#/home';
    render();
    toast('Logged Out', 'You have been logged out successfully.', 'info');
  } catch (err) {
    console.error('Logout error:', err);
    toast('Error', 'Failed to log out.', 'danger');
  }
}

async function deleteDocsByQuery(queryFactory, pageSize = 200) {
  let totalDeleted = 0;
  while (true) {
    const snap = await queryFactory().limit(pageSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snap.size;
    if (snap.size < pageSize) break;
  }
  return totalDeleted;
}

async function removeCurrentAccount() {
  const authUser = auth.currentUser;
  const userId = authUser?.uid;
  const user = currentUser();
  if (!authUser || !userId || !user) {
    toast('Account Error', 'Please login again and retry account removal.', 'danger');
    return;
  }

  const shouldDelete = confirm('Do you want to delete your account?');
  if (!shouldDelete) {
    toast('Cancelled', 'Account deletion cancelled.', 'info');
    return;
  }

  try {
    showLoading('Removing account data...');

    // Remove student-owned applications
    await deleteDocsByQuery(() => db.collection('applications').where('studentId', '==', userId));

    // Remove employer-owned jobs and corresponding applications
    const myJobsSnap = await db.collection('jobs').where('employerId', '==', userId).get();
    for (const jobDoc of myJobsSnap.docs) {
      await deleteDocsByQuery(() => db.collection('applications').where('jobId', '==', jobDoc.id));
    }
    if (!myJobsSnap.empty) {
      const batchJobs = db.batch();
      myJobsSnap.docs.forEach(d => batchJobs.delete(d.ref));
      await batchJobs.commit();
    }

    // Remove user notifications and profile
    await deleteDocsByQuery(() => db.collection('notifications').where('userId', '==', userId));
    await db.collection('users').doc(userId).delete();

    // Remove auth account last
    await authUser.delete();

    CACHE.currentUser = null;
    CACHE.userData = null;
    CACHE.jobs = [];
    CACHE.applications = [];
    CACHE.notifications = [];
    CACHE.users = [];
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    hideLoading();
    location.hash = '#/home';
    toast('Account Removed', 'Your account has been deleted permanently.', 'success');
    render();
  } catch (err) {
    hideLoading();
    console.error('Account deletion error:', err);
    if (err?.code === 'auth/requires-recent-login') {
      toast('Re-login Required', 'For security, please logout/login again and then delete your account.', 'warn');
      return;
    }
    toast('Delete Failed', 'Could not remove account. Please try again.', 'danger');
  }
}

/***********************
 * Navigation
 ***********************/
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
      'px-3 py-2 rounded-xl text-sm border transition',
      active ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100' : 'border-transparent hover:border-white/10 hover:bg-white/5 text-slate-200'
    )}">${escapeHtml(label)}</a>
  `;
}

function inputBase(extra='') {
  return cls('focus-ring w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400', extra);
}

function selectBase(extra='') {
  return cls('focus-ring w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100', extra);
}

function requireAuth(route) {
  const user = currentUser();
  if (!user) {
    location.hash = `#/auth?next=${encodeURIComponent(route)}`;
    return false;
  }
  return true;
}

/***********************
 * Photo Display Helper
 ***********************/
function photoOrInitials(photoData, name, sizeClass='h-10 w-10', textSize='text-xs') {
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  if (photoData) {
    return `<div class="${sizeClass} rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center ${textSize} font-bold"><img src="${photoData}" class="h-full w-full object-cover" alt=""></div>`;
  }
  return `<div class="${sizeClass} rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center ${textSize} font-bold">${escapeHtml(initials)}</div>`;
}

/***********************
 * Header
 ***********************/
function renderHeader() {
  const user = currentUser();
  const nav = $('#topNav');
  const mobileNav = $('#mobileNav');

  const common = [['#/home', 'Home'], ['#/jobs', 'Jobs']];
  let roleLinks = [];
  if (user?.role === 'student') roleLinks = [['#/profile','Profile'], ['#/dashboard','Dashboard']];
  if (user?.role === 'employer') roleLinks = [['#/dashboard','Dashboard'], ['#/employer/post','Post Job']];
  if (user?.role === 'faculty') roleLinks = [['#/dashboard','Dashboard'], ['#/profile','Profile']];
  const authLink = user ? [] : [['#/auth', 'Login']];
  const links = [...common, ...roleLinks, ...authLink];

  const navHtml = links.map(([href,label]) => navLink(href,label)).join('');
  nav.innerHTML = navHtml;
  mobileNav.innerHTML = `<div class="mt-3 flex flex-col gap-2">${navHtml}</div>`;

  // Notifications
  const notifWrap = $('#notifWrap');
  if (!user) {
    notifWrap.innerHTML = '';
  } else {
    const unread = CACHE.notifications.filter(n => n.userId === (CACHE.currentUser?.uid) && !n.read);
    notifWrap.innerHTML = `
      <button id="notifBtn" class="relative rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" aria-label="Notifications">
        <span class="font-semibold">🔔</span>
        ${unread.length ? `<span class="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold">${unread.length}</span>` : ''}
      </button>
      <div id="notifMenu" class="card hidden absolute right-0 mt-2 w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur">
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div class="text-sm font-semibold">Notifications</div>
          <button id="markAllRead" class="text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10">Mark all read</button>
        </div>
        <div class="max-h-80 overflow-auto scrollbar-thin">
          ${renderNotificationList()}
        </div>
      </div>
    `;
  }

  // User menu
  const userMenuWrap = $('#userMenuWrap');
  if (!user) {
    userMenuWrap.innerHTML = `<a href="#/auth" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Login</a>`;
  } else {
    const name = user.role === 'student' ? user.profile?.fullName : user.role === 'employer' ? user.company?.name : user.faculty?.fullName;
    const displayName = name || user.email || 'User';
    const photoData = user.role === 'student' ? user.profile?.photo : user.role === 'employer' ? user.company?.logo : user.faculty?.photo;

    userMenuWrap.innerHTML = `
      <button id="userBtn" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2">
        ${photoOrInitials(photoData, displayName, 'h-7 w-7', 'text-[11px]')}
        <div class="hidden sm:block">
          <span class="font-semibold">${escapeHtml(displayName)}</span>
          <div class="text-[11px] text-slate-300/70">${escapeHtml(roleLabel(user.role))}</div>
        </div>
      </button>
      <div id="userMenu" class="card hidden absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur">
        <div class="px-4 py-3 border-b border-white/10">
          <div class="flex items-center gap-3">
            ${photoOrInitials(photoData, displayName, 'h-10 w-10', 'text-sm')}
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold truncate">${escapeHtml(displayName)}</div>
              <div class="text-xs text-slate-300/80 truncate">${escapeHtml(user.email || '')}</div>
            </div>
          </div>
        </div>
        <div class="p-2">
          <a href="#/profile" class="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">Profile</a>
          <a href="#/dashboard" class="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">Dashboard</a>
          ${user.role === 'employer' ? `<a href="#/employer/post" class="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">Post a Job</a>` : ''}
          <button id="deleteAccountBtn" class="mt-1 w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-white/5 text-rose-200">Delete Account</button>
          <button id="logoutBtn" class="mt-1 w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-white/5 text-rose-300">Logout</button>
        </div>
      </div>
    `;
  }

  // Handlers
  $('#mobileMenuBtn').onclick = () => mobileNav.classList.toggle('hidden');

  const notifBtn = $('#notifBtn');
  const notifMenu = $('#notifMenu');
  if (notifBtn && notifMenu) {
    notifBtn.onclick = (e) => {
      e.stopPropagation();
      notifMenu.classList.toggle('hidden');
      if (!notifMenu.classList.contains('hidden')) {
        notifMenu.querySelector('.max-h-80').innerHTML = renderNotificationList();
        const markAll = $('#markAllRead');
        if (markAll) markAll.onclick = async () => {
          const batch = db.batch();
          CACHE.notifications.filter(n => !n.read).forEach(n => {
            batch.update(db.collection('notifications').doc(n.id), { read: true });
            n.read = true;
          });
          await batch.commit();
          toast('Done', 'All notifications marked as read.', 'success');
          render();
        };
      }
    };
  }

  const userBtn = $('#userBtn');
  const userMenu = $('#userMenu');
  if (userBtn && userMenu) {
    userBtn.onclick = (e) => { e.stopPropagation(); userMenu.classList.toggle('hidden'); };
  }

  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.onclick = logoutUser;
  const deleteAccountBtn = $('#deleteAccountBtn');
  if (deleteAccountBtn) deleteAccountBtn.onclick = removeCurrentAccount;

  document.onclick = () => {
    if ($('#notifMenu')) $('#notifMenu').classList.add('hidden');
    if ($('#userMenu')) $('#userMenu').classList.add('hidden');
  };
}

function renderNotificationList() {
  const userId = CACHE.currentUser?.uid;
  const items = CACHE.notifications.filter(n => n.userId === userId).slice(0, 20);
  if (!items.length) {
    return `<div class="px-4 py-6 text-sm text-slate-300/80 text-center">No notifications yet.</div>`;
  }
  return items.map(n => {
    const dot = n.read ? '' : `<span class="mt-1.5 inline-block h-2 w-2 rounded-full bg-indigo-400"></span>`;
    return `
      <button data-notif="${n.id}" class="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-b-0">
        <div class="flex gap-3">
          ${dot}
          <div class="min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-semibold truncate">${escapeHtml(n.title)}</div>
              <div class="text-[11px] text-slate-300/70">${fmtDateTime(n.createdAt)}</div>
            </div>
            <div class="mt-0.5 text-xs text-slate-300/85">${escapeHtml(n.message)}</div>
          </div>
        </div>
      </button>
    `;
  }).join('');
}

function wireNotificationClicks() {
  $$('[data-notif]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-notif');
      const n = CACHE.notifications.find(x => x.id === id);
      if (!n) return;
      await markNotificationRead(id);
      if (n.link) location.hash = n.link;
      render();
    });
  });
}

/***********************
 * Views
 ***********************/

function layoutTitle(title, subtitle) {
  return `
    <div class="mb-8 animate-fade-in">
      <div class="flex flex-col gap-1.5">
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-gradient">${escapeHtml(title)}</h1>
        <p class="text-sm sm:text-base text-slate-400 font-medium">${escapeHtml(subtitle || '')}</p>
      </div>
    </div>
  `;
}

function renderHome() {
  const user = currentUser();
  const stats = computeStats();
  return `
    <section class="grid gap-8 lg:grid-cols-12 animate-fade-in">
      <div class="lg:col-span-8">
        <div class="card relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 sm:p-12 shadow-2xl">
          <!-- Decorative Background Blobs -->
          <div class="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
          <div class="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl"></div>

          <div class="relative z-10">
            <div class="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-200 tracking-wide uppercase">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Campus Recruitment 2024
            </div>
            <h2 class="mt-6 text-4xl sm:text-6xl font-bold leading-[1.1] tracking-tight">
              Elevate Your <br/>
              <span class="text-gradient">Career Path</span>
            </h2>
            <p class="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
              The premier destination connecting the brightest minds with industry leaders. Streamline your placement journey with precision and ease.
            </p>
            <div class="mt-10 flex flex-wrap gap-4">
              ${user ? `
                <a href="#/dashboard" class="rounded-2xl bg-indigo-500 px-8 py-4 text-sm font-bold text-white hover:bg-indigo-400 shadow-xl shadow-indigo-500/20 transition-all hover-lift">Go to Dashboard</a>
                <a href="#/jobs" class="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold hover:bg-white/10 transition-all hover-lift">Explore Opportunities</a>
              ` : `
                <a href="#/auth" class="rounded-2xl bg-indigo-500 px-8 py-4 text-sm font-bold text-white hover:bg-indigo-400 shadow-xl shadow-indigo-500/20 transition-all hover-lift">Get Started Now</a>
                <a href="#/jobs" class="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold hover:bg-white/10 transition-all hover-lift">View Open Jobs</a>
              `}
            </div>
            <div class="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div class="space-y-1">
                <div class="text-2xl font-bold text-white">${stats.jobCount}</div>
                <div class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Active Jobs</div>
              </div>
              <div class="space-y-1">
                <div class="text-2xl font-bold text-white">${stats.studentCount}</div>
                <div class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Students</div>
              </div>
              <div class="space-y-1">
                <div class="text-2xl font-bold text-white">${stats.appCount}</div>
                <div class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Applications</div>
              </div>
              <div class="space-y-1">
                <div class="text-2xl font-bold text-white">${stats.placedCount}</div>
                <div class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Placed</div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          ${featureCard('🎯 Job Matching', 'Smart matching based on your skills, CGPA, and preferences.', 'Apply • Track • Succeed')}
          ${featureCard('📋 Profile Management', 'Build a comprehensive profile with academic records and skills.', 'Resume • Portfolio • Links')}
          ${featureCard('📅 Interview Scheduling', 'Seamless coordination between students and recruiters.', 'Calendar • Notifications')}
        </div>
      </div>
      <aside class="lg:col-span-4">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
          <div class="text-sm font-semibold">Platform Roles</div>
          <div class="mt-1 text-xs text-slate-300/80">Choose your role to get started</div>
          <div class="mt-4 grid gap-3">
            ${roleCard('🎓', 'Student', 'Create profile, apply for jobs, track applications and interviews.')}
            ${roleCard('🏢', 'Company Member', 'Post job vacancies, review applicants, schedule interviews.')}
            ${roleCard('👨‍🏫', 'Faculty/Admin', 'Monitor placement statistics, track outcomes, generate reports.')}
          </div>
          ${!user ? `
            <div class="mt-5 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
              <div class="text-sm font-semibold text-indigo-100">Ready to begin?</div>
              <div class="mt-1 text-xs text-indigo-200/80">Create an account to access all features.</div>
              <a href="#/auth" class="mt-3 inline-flex rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Create Account</a>
            </div>
          ` : `
            <div class="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div class="text-sm font-semibold text-emerald-100">Welcome back!</div>
              <div class="mt-1 text-xs text-emerald-200/80">You're logged in as ${escapeHtml(roleLabel(user.role))}.</div>
              <a href="#/dashboard" class="mt-3 inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400">View Dashboard</a>
            </div>
          `}
        </div>
      </aside>
    </section>
  `;
}

function featureCard(title, desc, chips) {
  return `
    <div class="card rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition">
      <div class="text-sm font-semibold">${escapeHtml(title)}</div>
      <div class="mt-1 text-xs text-slate-300/85">${escapeHtml(desc)}</div>
      <div class="mt-3 flex flex-wrap gap-2">
        ${String(chips).split('•').map(s => s.trim()).filter(Boolean).map(s => `
          <span class="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-[11px] text-slate-200">${escapeHtml(s)}</span>
        `).join('')}
      </div>
    </div>
  `;
}

function roleCard(icon, title, desc) {
  return `
    <div class="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/4 p-4 hover:from-white/10 hover:to-white/6 transition">
      <div class="flex items-start gap-3">
        <div class="text-2xl">${icon}</div>
        <div>
          <div class="text-sm font-semibold">${escapeHtml(title)}</div>
          <div class="mt-0.5 text-xs text-slate-300/80">${escapeHtml(desc)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderAuth() {
  const r = parseRoute();
  return `
    <div class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-5">
        ${layoutTitle('Welcome', 'Sign in to your account or create a new one to get started.')}
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
          <div class="grid gap-3 sm:grid-cols-2">
            <button id="tabLogin" class="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold">Login</button>
            <button id="tabSignup" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Sign Up</button>
          </div>
          <div id="authForms" class="mt-4"></div>
        </div>
      </div>
      <div class="lg:col-span-7">
        <div class="card rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-white/5 to-fuchsia-500/10 p-6 sm:p-8">
          <div class="text-sm font-semibold">Why Join IPS?</div>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-2xl mb-2">📊</div>
              <div class="text-sm font-semibold">Real-time Tracking</div>
              <div class="mt-1 text-xs text-slate-300/85">Monitor your application status and receive instant updates.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-2xl mb-2">🤝</div>
              <div class="text-sm font-semibold">Direct Connection</div>
              <div class="mt-1 text-xs text-slate-300/85">Connect directly with top recruiters and companies.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-2xl mb-2">📈</div>
              <div class="text-sm font-semibold">Smart Matching</div>
              <div class="mt-1 text-xs text-slate-300/85">Job recommendations based on your profile and skills.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-2xl mb-2">🔔</div>
              <div class="text-sm font-semibold">Instant Notifications</div>
              <div class="mt-1 text-xs text-slate-300/85">Never miss an interview or application update.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderJobs() {
  const user = currentUser();
  const subtitle = user
    ? (user.role === 'employer' ? 'Manage your job postings and review applicants.' : user.role === 'faculty' ? 'View all job postings and placement pipeline.' : 'Browse openings and apply based on your eligibility.')
    : 'Browse available positions. Create an account to apply.';
  const jobs = [...CACHE.jobs].sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  return `
    ${layoutTitle('Job Openings', subtitle)}
    <div class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-5">
          <div class="text-sm font-semibold">Search & Filters</div>
          <div class="mt-4 grid gap-3">
            <div>
              <label class="text-xs text-slate-300/80">Search</label>
              <input id="jobSearch" class="${inputBase()}" placeholder="Title, company, skills..." />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-300/80">Type</label>
                <select id="jobType" class="${selectBase()}">
                  <option value="">All Types</option>
                  <option>Full-time</option>
                  <option>Internship</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Min CGPA</label>
                <input id="minCgpa" type="number" step="0.1" class="${inputBase()}" placeholder="e.g. 7.0" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-300/80">Location</label>
              <input id="jobLocation" list="cityListFilter" class="${inputBase()}" placeholder="Type city name (e.g. Ahmedabad)" />
              <datalist id="cityListFilter">${cityOptionsHTML()}</datalist>
            </div>
            <div class="flex gap-2">
              <button id="applyFilters" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Search</button>
              <button id="clearFilters" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Clear</button>
            </div>
          </div>
        </div>
        ${user?.role === 'employer' ? `
          <div class="mt-4 card rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/12 to-white/5 p-5">
            <div class="text-sm font-semibold">Company Member Tools</div>
            <div class="mt-2 text-xs text-slate-300/85">Post new vacancies and manage applications.</div>
            <div class="mt-4 flex gap-2">
              <a href="#/employer/post" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Post Job</a>
              <a href="#/dashboard" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Dashboard</a>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="lg:col-span-8">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
            <div>
              <div class="text-sm font-semibold">Available Positions</div>
              <div class="text-xs text-slate-300/80" id="jobCount">${jobs.length} jobs found</div>
            </div>
            <div class="text-xs text-slate-300/80">${user ? `Logged in as ${escapeHtml(roleLabel(user.role))}` : 'Guest view'}</div>
          </div>
          <div id="jobList" class="p-5 grid gap-4">
            ${jobs.length === 0 ? `
              <div class="text-center py-12">
                <div class="text-4xl mb-3">📋</div>
                <div class="text-sm font-semibold">No jobs posted yet</div>
                <div class="mt-1 text-xs text-slate-300/80">Company members can post new job openings.</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProfile() {
  const r = parseRoute();
  if (!requireAuth(r.raw)) return '';
  const user = currentUser();
  if (!roleProfileRenderers[user.role]) {
    loadRoleProfile(user.role)
      .then(() => render())
      .catch((err) => {
        console.error('Role profile load error:', err);
        toast('Load Error', 'Could not load profile module. Please refresh.', 'danger');
      });
  }
  const renderer = roleProfileRenderers[user.role];
  if (typeof renderer === 'function') return renderer(user);
  return `<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300/85">Loading profile...</div>`;
}

function renderDashboard() {
  const r = parseRoute();
  if (!requireAuth(r.raw)) return '';
  const user = currentUser();
  if (!roleDashboardRenderers[user.role]) {
    loadRoleDashboard(user.role)
      .then(() => render())
      .catch((err) => {
        console.error('Role dashboard load error:', err);
        toast('Load Error', 'Could not load dashboard module. Please refresh.', 'danger');
      });
  }
  if (user.role === 'student') return renderStudentDashboard(user);
  if (user.role === 'employer') return renderEmployerDashboard(user);
  return renderFacultyDashboard(user);
}

function renderEmployerPostJob() {
  const r = parseRoute();
  if (!requireAuth(r.raw)) return '';
  const user = currentUser();
  if (user.role !== 'employer') return `${layoutTitle('Access Denied', 'Only Company Members can post jobs.')}`;

  return `
    <style>.inst-option:hover{background:rgba(99,102,241,0.2)!important;color:#fff}</style>
    ${layoutTitle('Post a New Job', 'Create a job posting to start receiving applications from qualified candidates.')}
    <div class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-7">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
          <form id="postJobForm" class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-xs text-slate-300/80">Job Title *</label>
                <input name="title" class="${inputBase()}" placeholder="e.g. Software Engineer" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Employment Type *</label>
                <select name="type" class="${selectBase()}" required>
                  <option>Full-time</option>
                  <option>Internship</option>
                </select>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-xs text-slate-300/80">Location *</label>
                <input name="location" list="cityListPostJob" class="${inputBase()}" placeholder="Type city name (e.g. Ahmedabad)" required />
                <datalist id="cityListPostJob">${cityOptionsHTML()}</datalist>
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Salary/Stipend</label>
                <input name="salary" class="${inputBase()}" placeholder="e.g. ₹6-8 LPA" />
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-xs text-slate-300/80">Minimum CGPA Required</label>
                <input name="minCgpa" type="number" step="0.1" min="0" max="10" class="${inputBase()}" value="7.0" />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Required Skills (comma-separated)</label>
                <input name="skills" class="${inputBase()}" placeholder="e.g. Java, SQL, React" />
              </div>
            </div>

            <div class="grid gap-3">
              <div>
                <label class="text-xs text-slate-300/80 mb-2 block">🏢 Target Institutes <span class="text-slate-400">(optional — leave empty to target all institutes)</span></label>
                <div class="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div id="selectedInstituteChips" class="flex flex-wrap gap-2 mb-2" style="min-height:0"></div>
                  <div class="relative">
                    <input id="instituteSearchInput" class="${inputBase()}" placeholder="🔍 Search and add an institute..." autocomplete="off" />
                    <div id="instituteDropdown" style="display:none;position:absolute;z-index:20;left:0;right:0;margin-top:4px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(15,15,30,0.98);backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,0.5);max-height:208px;overflow-y:auto">
                      ${GUJARAT_INSTITUTES.map(inst => `<button type="button" data-inst="${escapeHtml(inst)}" class="inst-option" style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:12px;border:none;background:transparent;color:#e2e8f0;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05)">${escapeHtml(inst)}</button>`).join('')}
                    </div>
                  </div>
                  <div id="instituteHiddenInputs"></div>
                  <div class="mt-2 text-[11px] text-indigo-200/70" id="selectedInstituteCount">No institutes selected</div>
                </div>
              </div>
              <label style="display:flex;align-items:center;gap:12px;cursor:pointer;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(15,15,30,0.3);padding:12px 16px">
                <div style="position:relative;width:20px;height:20px;flex-shrink:0">
                  <input type="checkbox" id="allowIndependentStudents" name="allowIndependentStudents" value="1"
                    style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;margin:0;z-index:1"
                    onchange="(function(cb){var box=document.getElementById('indepCheckBox');var svg=box.querySelector('svg');box.style.background=cb.checked?'#6366f1':'rgba(255,255,255,0.05)';box.style.borderColor=cb.checked?'#6366f1':'rgba(255,255,255,0.2)';svg.style.display=cb.checked?'block':'none';})(this)" />
                  <div id="indepCheckBox" style="width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;transition:all 0.15s;pointer-events:none">
                    <svg style="display:none;width:12px;height:12px" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium">Include Independent Students</div>
                  <div class="text-[11px] text-slate-400">Students not affiliated with any institute can also see and apply for this job</div>
                </div>
              </label>
            </div>

            <div>
              <label class="text-xs text-slate-300/80">Job Description *</label>
              <textarea name="description" rows="5" class="${inputBase('resize-none')}" placeholder="Describe the role..." required></textarea>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Publish Job</button>
              <a href="#/dashboard" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel</a>
            </div>
          </form>
        </div>
      </div>
      <div class="lg:col-span-5">
        <div class="card rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="text-sm font-semibold">Posting Guidelines</div>
          <ul class="mt-3 space-y-2 text-sm text-slate-200/85">
            <li class="flex gap-2"><span class="text-indigo-300">✓</span><span>Use a clear and descriptive job title</span></li>
            <li class="flex gap-2"><span class="text-indigo-300">✓</span><span>Set appropriate CGPA requirements</span></li>
            <li class="flex gap-2"><span class="text-indigo-300">✓</span><span>List relevant skills for better matching</span></li>
            <li class="flex gap-2"><span class="text-indigo-300">✓</span><span>Provide detailed job description</span></li>
            <li class="flex gap-2"><span class="text-indigo-300">✓</span><span>Select institutes to target specific students</span></li>
          </ul>
          <div class="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <div class="text-xs uppercase tracking-wide text-slate-300/70">Posting As</div>
            <div class="mt-2 text-sm font-semibold">${escapeHtml(user.company?.name || 'Company')}</div>
            <div class="mt-1 text-xs text-slate-300/85">${escapeHtml(user.company?.location || '')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEmployerManage(jobId) {
  const r = parseRoute();
  if (!requireAuth(r.raw)) return '';
  const user = currentUser();
  if (user.role !== 'employer') return `${layoutTitle('Access Denied', 'Only Company Members can manage applicants.')}`;
  const job = getJob(jobId);
  if (!job) return `${layoutTitle('Job Not Found', 'The job you are looking for does not exist.')}`;
  if (job.employerId !== (CACHE.currentUser?.uid)) return `${layoutTitle('Access Denied', 'You can only manage your own job postings.')}`;

  const apps = applicationsForJob(job.id).sort((a,b) => (b.appliedAt||0) - (a.appliedAt||0));
  const rows = apps.map(a => {
    const stu = getUser(a.studentId);
    const p = stu?.profile;
    const skills = (p?.skills || []).slice(0,4);
    const interview = a.interview?.time ? `<div class="text-xs text-slate-300/80">Interview: <span class="text-slate-100">${fmtDateTime(a.interview.time)}</span></div>` : '';
    return `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4" data-app-card="${a.id}" data-app-status="${a.status}">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex items-start gap-3">
            ${photoOrInitials(p?.photo, p?.fullName)}
            <div>
              <div class="flex items-center gap-2">
                <div class="text-sm font-semibold truncate">${escapeHtml(p?.fullName || 'Student')}</div>
                ${badge(a.status)}
              </div>
              <div class="mt-1 text-xs text-slate-300/80">${escapeHtml(p?.branch || '—')} • CGPA ${escapeHtml(String(p?.cgpa ?? '—'))}</div>
              <div class="mt-2 flex flex-wrap gap-2">
                ${skills.map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('')}
              </div>
              <div class="mt-2 text-xs text-slate-300/80">Applied: ${fmtDateTime(a.appliedAt)}</div>
              ${interview}
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:items-end">
            <select data-status="${a.id}" class="${selectBase('w-52')}">
              ${Object.values(STATUS).map(s => `<option ${a.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
            <button data-schedule="${a.id}" class="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Schedule Interview</button>
            <button data-view="${a.id}" class="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10">View Profile</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    ${layoutTitle('Manage Applicants', `${job.title} • ${job.companyName}`)}
    <div class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-5">
          <div class="text-sm font-semibold">Job Details</div>
          <div class="mt-4 grid gap-3">
            ${readOnlyField('Title', job.title)}
            ${readOnlyField('Location', job.location)}
            ${readOnlyField('Type', job.type)}
            ${readOnlyField('Min CGPA', String(job.minCgpa ?? '—'))}
            ${readOnlyField('Targeting', (job.targetAudience === 'all' || !job.targetAudience) ? 'All Students' : 
              ((job.targetedInstitutes || []).length > 0 ? (job.targetedInstitutes || []).join(', ') : '') + 
              (job.allowIndependentStudents ? ( (job.targetedInstitutes || []).length > 0 ? ' + Independent' : 'Independent Students') : '')
            )}
            ${readOnlyField('Total Applicants', String(apps.length))}
          </div>
          <div class="mt-4">
            <label class="text-xs text-slate-300/80">Filter by Status</label>
            <select id="statusFilter" class="${selectBase()}">
              <option value="all">All</option>
              <option value="Applied">Applied</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Rejected">Rejected</option>
              <option value="Selected">Selected</option>
            </select>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button id="editJobBtn" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Edit Job</button>
            <button data-delete-job="${job.id}" class="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15">Withdraw / Delete</button>
            <a href="#/dashboard" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Back</a>
          </div>
        </div>
      </div>
      <div class="lg:col-span-8">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
          <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">Applicants</div>
              <div class="text-xs text-slate-300/80">Review applications and schedule interviews</div>
            </div>
            <div class="text-xs text-slate-300/80">${apps.length} total</div>
          </div>
          <div id="applicantsList" class="p-5 grid gap-4">
            ${rows || `<div class="text-center py-8 text-sm text-slate-300/85">No applications received yet.</div>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStudentDashboard(user) {
  const renderer = roleDashboardRenderers.student;
  if (typeof renderer === 'function') return renderer(user);
  return `<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300/85">Loading student dashboard...</div>`;
}

function renderStudentApplicationCard(app, job) {
  const reqSkills = (job.skills || []).slice(0, 6);
  const interviewInfo = app.interview?.time ? `<div class="mt-2 text-xs text-slate-300/80">📅 Interview: <span class="text-slate-100">${fmtDateTime(app.interview.time)}</span></div>` : '';
  return `
    <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <div class="text-sm font-semibold truncate">${escapeHtml(job.title)}</div>
            ${badge(app.status)}
          </div>
          <div class="mt-1 text-xs text-slate-300/80">${escapeHtml(job.companyName)} • ${escapeHtml(job.location)} • ${escapeHtml(job.type)}</div>
          <div class="mt-2 flex flex-wrap gap-2">
            ${reqSkills.map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('')}
          </div>
          <div class="mt-2 text-xs text-slate-300/80">Applied: ${fmtDateTime(app.appliedAt)}</div>
          ${interviewInfo}
        </div>
        <button data-withdraw="${app.id}" class="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/15">Withdraw</button>
      </div>
    </div>
  `;
}

function renderEmployerDashboard(user) {
  const renderer = roleDashboardRenderers.employer;
  if (typeof renderer === 'function') return renderer(user);
  return `<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300/85">Loading company dashboard...</div>`;
}

function renderFacultyDashboard(user) {
  const renderer = roleDashboardRenderers.faculty;
  if (typeof renderer === 'function') return renderer(user);
  return `<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300/85">Loading faculty dashboard...</div>`;
}

function computeStats(instituteFilter) {
  let studentUsers = CACHE.users.filter(u => u.role === 'student');
  let jobs = CACHE.jobs;
  let apps = CACHE.applications;

  if (instituteFilter) {
    const instLower = instituteFilter.toLowerCase();
    
    // Filter students to only those in the faculty's institute
    studentUsers = studentUsers.filter(u => (u.profile?.institute || '').toLowerCase() === instLower);
    
    const studentIds = new Set(studentUsers.map(u => u.id));
    
    // Filter jobs: jobs targeting this institute and approved by it
    jobs = jobs.filter(j => {
      const targets = (j.targetedInstitutes || []).map(i => i.toLowerCase());
      const approved = (j.approvedInstitutes || []).map(i => i.toLowerCase());
      return targets.includes(instLower) && approved.includes(instLower);
    });
    
    // Filter applications: applications belonging to the students of this institute
    apps = apps.filter(a => studentIds.has(a.studentId));
  }

  const jobCount = jobs.length;
  const appCount = apps.length;
  const interviewCount = apps.filter(a => a.status === STATUS.INTERVIEW).length;
  const placedCount = apps.filter(a => a.status === STATUS.SELECTED).length;

  const byCompany = new Map();
  for (const job of jobs) {
    const key = job.companyName || 'Unknown';
    if (!byCompany.has(key)) byCompany.set(key, { company: key, jobs: 0, applications: 0, interviews: 0, selected: 0 });
    byCompany.get(key).jobs += 1;
  }
  for (const app of apps) {
    const job = getJob(app.jobId);
    if (!job) continue;
    const key = job.companyName || 'Unknown';
    if (!byCompany.has(key)) byCompany.set(key, { company: key, jobs: 0, applications: 0, interviews: 0, selected: 0 });
    const row = byCompany.get(key);
    row.applications += 1;
    if (app.status === STATUS.INTERVIEW) row.interviews += 1;
    if (app.status === STATUS.SELECTED) row.selected += 1;
  }

  return {
    studentCount: studentUsers.length,
    jobCount,
    appCount,
    interviewCount,
    placedCount,
    companyStats: Array.from(byCompany.values()).sort((a,b) => b.selected - a.selected || b.applications - a.applications)
  };
}

/***********************
 * Render + Routing
 ***********************/
let renderLock = false;

function render() {
  if (renderLock) return;
  renderLock = true;
  try {
    renderHeader();
    const r = parseRoute();
    const app = $('#app');
    if (!location.hash) location.hash = '#/home';

    if (r.path === '/home') app.innerHTML = renderHome();
    else if (r.path === '/auth') app.innerHTML = renderAuth();
    else if (r.path === '/jobs') app.innerHTML = renderJobs();
    else if (r.path === '/profile') app.innerHTML = renderProfile();
    else if (r.path === '/dashboard') app.innerHTML = renderDashboard();
    else if (r.path === '/employer' && r.parts[1] === 'post') app.innerHTML = renderEmployerPostJob();
    else if (r.path === '/employer' && r.parts[1] === 'manage' && r.parts[2]) app.innerHTML = renderEmployerManage(r.parts[2]);
    else app.innerHTML = `${layoutTitle('Page Not Found', 'The page you are looking for does not exist.')}<a href="#/home" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Go Home</a>`;

    wireCommonHandlers();
    wireNotificationClicks();
    wireViewHandlers();
  } catch (err) {
    console.error('Render error:', err);
  } finally {
    renderLock = false;
  }
}

function wireCommonHandlers() {
  // Photo uploads — convert to base64 and save in Firestore (NO Firebase Storage)
  const photoHandlers = [
    { sel: '#studentPhotoInput', profileKey: 'profile', photoField: 'photo' },
    { sel: '#employerPhotoInput', profileKey: 'company', photoField: 'logo' },
    { sel: '#facultyPhotoInput', profileKey: 'faculty', photoField: 'photo' }
  ];

  photoHandlers.forEach(({ sel, profileKey, photoField }) => {
    const el = $(sel);
    if (el) {
      el.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const userId = CACHE.currentUser?.uid;
        if (!userId) return;

        try {
          showLoading('Processing photo...');
          // Compress and convert to base64
          const base64 = await compressImage(file, 300, 0.7);
          hideLoading();

          // Save to Firestore under user's profile
          const user = currentUser();
          const profileData = { ...(user[profileKey] || {}) };
          profileData[photoField] = base64;

          await saveUserProfile(userId, { [profileKey]: profileData });
          toast('Photo Updated', 'Your photo has been saved successfully.', 'success');
          render();
        } catch (err) {
          hideLoading();
          toast('Photo Error', String(err), 'danger');
        }
      };
    }
  });
}

function wireViewHandlers() {
  const r = parseRoute();
  const user = currentUser();
  const userId = CACHE.currentUser?.uid;

  if (user?.role) {
    if (ROLE_VIEW_HANDLER_SCRIPTS[user.role]) {
      if (!roleViewHandlers[user.role]) {
        loadRoleViewHandlers(user.role)
          .then(() => wireViewHandlers())
          .catch((err) => {
            console.error('Role view handlers load error:', err);
            toast('Load Error', 'Could not load role handlers. Please refresh.', 'danger');
          });
      } else {
        roleViewHandlers[user.role]({ r, user, userId });
      }
    }
  }

  // Auth tabs
  if (r.path === '/auth') {
    const next = r.query.next || '#/dashboard';
    const container = $('#authForms');
    loadAuthSignupHelpers().catch((err) => console.warn('Auth signup helper load warning:', err));

    const renderLoginForm = () => {
      container.innerHTML = `
        <form id="loginForm" class="grid gap-3 mt-4">
          <div>
            <label class="text-xs text-slate-300/80">Email Address</label>
            <input name="email" type="email" class="${inputBase()}" placeholder="you@example.com" required />
          </div>
          <div>
            <label class="text-xs text-slate-300/80">Password</label>
            <div class="relative">
              <input id="loginPassword" name="password" type="password" class="${inputBase('pr-10')}" placeholder="Enter your password" required />
              <button type="button" id="toggleLoginPwd" tabindex="-1" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 text-base select-none" title="Show/Hide password">👁</button>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Login</button>
          </div>
        </form>
        <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div class="text-xs text-slate-300/80 mb-2">Don't have an account? Click "Sign Up" above to create one.</div>
        </div>
      `;

      // Show/hide password toggle — login
      const loginPwdInput = $('#loginPassword');
      const toggleLoginPwd = $('#toggleLoginPwd');
      if (loginPwdInput && toggleLoginPwd) {
        toggleLoginPwd.onclick = () => {
          const show = loginPwdInput.type === 'password';
          loginPwdInput.type = show ? 'text' : 'password';
          toggleLoginPwd.textContent = show ? '\uD83D\uDE48' : '\uD83D\uDC41';
        };
      }

      $('#loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const email = String(fd.get('email')||'').trim();
        const password = String(fd.get('password')||'');
        if (!email || !password) { toast('Error', 'Please enter email and password.', 'danger'); return; }
        await loginWithEmail(email, password);
      };
    };

    const renderSignupForm = () => {
      container.innerHTML = `
        <form id="signupForm" class="grid gap-3 mt-4">
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300/80">Account Type *</label>
              <select name="role" class="${selectBase()}" required>
                <option value="student">Student</option>
                <option value="employer">Company Member</option>
                <option value="faculty">Faculty/Admin</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-300/80">Email Address *</label>
              <input name="email" type="email" class="${inputBase()}" placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-300/80">Mobile Number *</label>
            <input name="phone" type="tel" class="${inputBase()}" placeholder="e.g. 9876543210" required />
          </div>
          <div>
            <label class="text-xs text-slate-300/80">Password * (min 8 chars, A-Z, a-z, 0-9, symbol)</label>
            <div class="relative">
              <input id="signupPassword" name="password" type="password" class="${inputBase('pr-10')}" placeholder="Create a strong password" required minlength="8" />
              <button type="button" id="toggleSignupPwd" tabindex="-1" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 text-base select-none" title="Show/Hide password">👁</button>
            </div>
            <div id="passwordHint" class="mt-1 text-[11px] text-slate-300/80">
              Use at least 8 characters with uppercase, lowercase, number and symbol.
            </div>
          </div>
          <div id="roleFields" class="grid gap-3"></div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Create Account</button>
          </div>
        </form>
      `;

      const roleFields = $('#roleFields');
      const roleSel = $('#signupForm select[name="role"]');
      const renderRoleFields = () => {
        if (!authSignupHelpers) {
          roleFields.innerHTML = `<div class="text-xs text-slate-300/80">Loading signup fields...</div>`;
          return;
        }
        authSignupHelpers.renderRoleFields(roleSel.value, roleFields);
      };
      roleSel.onchange = renderRoleFields;
      renderRoleFields();

      const signupPasswordInput = $('#signupPassword');
      const passwordHint = $('#passwordHint');

      // Show/hide password toggle — signup
      const toggleSignupPwd = $('#toggleSignupPwd');
      if (toggleSignupPwd && signupPasswordInput) {
        toggleSignupPwd.onclick = () => {
          const show = signupPasswordInput.type === 'password';
          signupPasswordInput.type = show ? 'text' : 'password';
          toggleSignupPwd.textContent = show ? '\uD83D\uDE48' : '\uD83D\uDC41';
        };
      }

      if (signupPasswordInput && passwordHint) {
        signupPasswordInput.addEventListener('input', () => {
          const pwd = String(signupPasswordInput.value || '');
          const issues = getPasswordIssues(pwd);
          if (!pwd) {
            passwordHint.textContent = 'Use at least 8 characters with uppercase, lowercase, number and symbol.';
            passwordHint.className = 'mt-1 text-[11px] text-slate-300/80';
            return;
          }
          if (issues.length) {
            passwordHint.textContent = `Missing: ${issues.join(', ')}.`;
            passwordHint.className = 'mt-1 text-[11px] text-amber-300';
          } else {
            passwordHint.textContent = 'Strong password format looks good.';
            passwordHint.className = 'mt-1 text-[11px] text-emerald-300';
          }
        });
      }

      $('#signupForm').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const role = String(fd.get('role'));
        const email = String(fd.get('email')||'').trim();
        const password = String(fd.get('password')||'');

        if (!email || !password) { toast('Error', 'Please fill in email and password.', 'danger'); return; }
        const passwordIssues = getPasswordIssues(password);
        if (passwordIssues.length) {
          toast('Weak Password', `Missing: ${passwordIssues.join(', ')}`, 'warn');
          return;
        }

        const userData = authSignupHelpers
          ? authSignupHelpers.buildUserData(fd)
          : { role: role || 'student', profile: { fullName: email.split('@')[0], phone: '', skills: [], about: '', resumeUrl: '', links: { github: '', linkedin: '' }, photo: null } };

        await signupWithEmail(email, password, userData);
      };
    };

    let mode = 'login';
    const activate = () => {
      $('#tabLogin').className = cls('rounded-xl border px-4 py-2 text-sm font-semibold', mode==='login' ? 'border-indigo-400/30 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10');
      $('#tabSignup').className = cls('rounded-xl border px-4 py-2 text-sm font-semibold', mode==='signup' ? 'border-indigo-400/30 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10');
      if (mode === 'login') renderLoginForm(); else renderSignupForm();
    };
    $('#tabLogin').onclick = () => { mode = 'login'; activate(); };
    $('#tabSignup').onclick = () => { mode = 'signup'; activate(); };
    activate();
  }

  // Jobs page wiring
  if (r.path === '/jobs') {
    if (!jobsWiringHandler) {
      loadJobsWiring()
        .then(() => wireViewHandlers())
        .catch((err) => {
          console.error('Jobs wiring load error:', err);
          toast('Load Error', 'Could not load jobs interactions. Please refresh.', 'danger');
        });
    } else {
      jobsWiringHandler({ r, user, userId });
    }
  }

}

/***********************
 * Initialize App
 ***********************/
window.addEventListener('hashchange', render);

window.addEventListener('DOMContentLoaded', () => {
  showLoading('Connecting to server...');

  verifyFirestoreConnection(); // non-blocking check

  // Start listeners immediately; data hydration will trigger render()
  setupPublicRealtimeListeners();

  // Listen to auth state changes
  auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      CACHE.currentUser = firebaseUser;

      // Load user data from Firestore
      const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
      if (userDoc.exists) {
        CACHE.userData = { id: firebaseUser.uid, ...userDoc.data() };
      } else {
        // Create minimal user record if missing
        CACHE.userData = { id: firebaseUser.uid, email: firebaseUser.email, role: 'student', profile: { fullName: firebaseUser.email.split('@')[0] } };
        await db.collection('users').doc(firebaseUser.uid).set(CACHE.userData);
      }

      // Setup real-time listeners
      setupRealtimeListeners(firebaseUser.uid);

      hideLoading();
      toast('Welcome Back!', `Logged in as ${roleLabel(CACHE.userData.role)}.`, 'success');

      // Redirect to dashboard if on auth page
      const r = parseRoute();
      if (r.path === '/auth') {
        const next = r.query.next || '#/dashboard';
        location.hash = next;
      }
      render();
    } else {
      CACHE.currentUser = null;
      CACHE.userData = null;
      CACHE.notifications = [];

      // Keep real-time public listeners when logged out
      setupPublicRealtimeListeners();

      hideLoading();
      render();
    }
  });
});
