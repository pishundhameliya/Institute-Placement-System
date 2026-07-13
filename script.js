/***********************
 * Institute Placement System
 * Production-Ready SPA with Backend Simulation
 * - Roles: student | employer | faculty
 * - State: persisted in localStorage (simulating database)
 * - Routing: hash-based SPA
 ***********************/

const LS_KEY = 'ips_production_db';
const APP_VERSION = 2;

const STATUS = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview Scheduled',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
};

const stateSig = (s) => JSON.stringify({
  v: s.version,
  u: s.currentUserId,
  jobs: s.jobs?.length || 0,
  apps: s.applications?.length || 0,
  notif: s.notifications?.filter(n => !n.read).length || 0,
  stamp: s.updatedAt
});

const nowISO = () => new Date().toISOString();
const fmtDateTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const uid = (prefix='id') => `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

// Database simulation functions
function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return initializeDatabase();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== APP_VERSION) return initializeDatabase();
    return parsed;
  } catch {
    return initializeDatabase();
  }
}

function saveState(s) {
  s.updatedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(s));
  return s;
}

// Initialize empty database
function initializeDatabase() {
  const s = {
    version: APP_VERSION,
    updatedAt: Date.now(),
    currentUserId: null,
    users: [],
    jobs: [],
    applications: [],
    notifications: []
  };
  saveState(s);
  return s;
}

let STATE = loadState();
let lastSig = stateSig(STATE);
let lastNotifsSeen = new Set(STATE.notifications.map(n => n.id));

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

function getUser(id) { return STATE.users.find(u => u.id === id) || null; }
function currentUser() { return getUser(STATE.currentUserId); }

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
  const icon = {
    info: 'ℹ',
    success: '✓',
    warn: '⚠',
    danger: '✕'
  };
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

function pushNotification(userId, { title, message, link='#/dashboard', type='info', sendEmail=true, sendSMS=true }) {
  const n = { id: uid('not'), userId, title, message, link, type, read: false, createdAt: Date.now() };
  STATE.notifications.unshift(n);
  saveState(STATE);
  
  // Get user details for notifications
  const user = getUser(userId);
  if (user) {
    // Simulate sending email notification
    if (sendEmail && user.email) {
      simulateEmailNotification(user.email, title, message, user);
    }
    
    // Simulate sending SMS notification
    if (sendSMS) {
      const phone = getUserPhone(user);
      if (phone) {
        simulateSMSNotification(phone, title, message, user);
      }
    }
  }
  
  return n;
}

function getUserPhone(user) {
  if (user.role === 'student' && user.profile?.phone) {
    return user.profile.phone;
  }
  if (user.role === 'employer' && user.company?.phone) {
    return user.company.phone;
  }
  if (user.role === 'faculty' && user.faculty?.phone) {
    return user.faculty.phone;
  }
  return null;
}

function simulateEmailNotification(email, title, message, user) {
  // In a real app, this would call an email API
  // For demo purposes, we show a toast notification
  const userName = user.role === 'student' ? user.profile?.fullName : 
                   user.role === 'employer' ? user.company?.name : 
                   user.faculty?.fullName;
  
  console.log(`📧 Email sent to ${email}: ${title} - ${message}`);
  
  // Show a subtle toast to indicate email was sent (only for demo)
  setTimeout(() => {
    if (currentUser() && currentUser().id === user.id) {
      toast('📧 Email Sent', `Notification sent to ${email}`, 'info');
    }
  }, 500);
}

function simulateSMSNotification(phone, title, message, user) {
  // In a real app, this would call an SMS API (Twilio, etc.)
  // For demo purposes, we show a toast notification
  const userName = user.role === 'student' ? user.profile?.fullName : 
                   user.role === 'employer' ? user.company?.name : 
                   user.faculty?.fullName;
  
  console.log(`📱 SMS sent to ${phone}: ${title} - ${message}`);
  
  // Show a subtle toast to indicate SMS was sent (only for demo)
  setTimeout(() => {
    if (currentUser() && currentUser().id === user.id) {
      toast('📱 SMS Sent', `Text message sent to ${phone}`, 'info');
    }
  }, 800);
}

function verifyContactDetails(userId, type, value) {
  const user = getUser(userId);
  if (!user) return;
  
  const userName = user.role === 'student' ? user.profile?.fullName : 
                   user.role === 'employer' ? user.company?.name : 
                   user.faculty?.fullName;
  
  if (type === 'phone' && value) {
    // Send verification notification
    pushNotification(userId, {
      title: '📱 Phone Number Updated',
      message: `Your phone number has been updated to ${value}. You will now receive SMS notifications for important updates.`,
      type: 'info',
      sendEmail: false,
      sendSMS: true
    });
    
    toast('✓ Contact Updated', 'Phone number saved. You will receive SMS notifications for important updates.', 'success');
  }
  
  if (type === 'email' && value) {
    // Send verification notification
    pushNotification(userId, {
      title: '📧 Email Verified',
      message: `Your email ${value} has been verified. You will receive email notifications for all placement updates.`,
      type: 'info',
      sendEmail: true,
      sendSMS: false
    });
    
    toast('✓ Email Verified', `Verification email sent to ${value}`, 'success');
  }
}

function markNotificationRead(id) {
  const n = STATE.notifications.find(x => x.id === id);
  if (n) { n.read = true; saveState(STATE); }
}

function requireAuth(route) {
  const user = currentUser();
  if (!user) {
    location.hash = `#/auth?next=${encodeURIComponent(route)}`;
    return false;
  }
  return true;
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

function toNumber(x, fallback=0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function getJob(jobId) { return STATE.jobs.find(j => j.id === jobId) || null; }

function applicationsForStudent(studentId) {
  return STATE.applications.filter(a => a.studentId === studentId);
}

function applicationFor(studentId, jobId) {
  return STATE.applications.find(a => a.studentId === studentId && a.jobId === jobId) || null;
}

function applicationsForJob(jobId) {
  return STATE.applications.filter(a => a.jobId === jobId);
}

function readOnlyField(label, value) {
  return `
    <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div class="text-[11px] uppercase tracking-wide text-slate-300/70">${escapeHtml(label)}</div>
      <div class="mt-1 text-sm text-slate-100">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

/***********************
 * Header: nav + user menu + notifications
 ***********************/
function renderHeader() {
  const user = currentUser();
  const nav = $('#topNav');
  const mobileNav = $('#mobileNav');

  const common = [
    ['#/home', 'Home'],
    ['#/jobs', 'Jobs'],
  ];

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
    const unread = STATE.notifications.filter(n => n.userId === user.id && !n.read);
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
          ${renderNotificationList(user.id)}
        </div>
      </div>
    `;
  }

  // User menu
  const userMenuWrap = $('#userMenuWrap');
  if (!user) {
    userMenuWrap.innerHTML = `
      <a href="#/auth" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Login</a>
    `;
  } else {
    const name = user.role === 'student' ? user.profile.fullName : user.role === 'employer' ? user.company.name : user.faculty.fullName;
    const photoUrl = user.role === 'student' ? user.profile?.photoUrl : user.role === 'employer' ? user.company?.logoUrl : user.faculty?.photoUrl;
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    
    userMenuWrap.innerHTML = `
      <button id="userBtn" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2">
        <div class="h-7 w-7 rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-[11px] font-bold">
          ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" class="h-full w-full object-cover" alt="">` : escapeHtml(initials)}
        </div>
        <div class="hidden sm:block">
          <span class="font-semibold">${escapeHtml(name)}</span>
          <div class="text-[11px] text-slate-300/70">${escapeHtml(roleLabel(user.role))}</div>
        </div>
      </button>
      <div id="userMenu" class="card hidden absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur">
        <div class="px-4 py-3 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold">
              ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" class="h-full w-full object-cover" alt="">` : escapeHtml(initials)}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold truncate">${escapeHtml(name)}</div>
              <div class="text-xs text-slate-300/80 truncate">${escapeHtml(user.email)}</div>
            </div>
          </div>
        </div>
        <div class="p-2">
          <a href="#/profile" class="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">Profile</a>
          <a href="#/dashboard" class="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">Dashboard</a>
          ${user.role === 'employer' ? `<a href="#/employer/post" class="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">Post a Job</a>` : ''}
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
        notifMenu.querySelector('.max-h-80').innerHTML = renderNotificationList(user.id);
        const markAll = $('#markAllRead');
        if (markAll) markAll.onclick = () => {
          STATE.notifications.forEach(n => { if (n.userId === user.id) n.read = true; });
          saveState(STATE);
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
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      STATE.currentUserId = null;
      saveState(STATE);
      toast('Logged out', 'You have been logged out successfully.', 'info');
      location.hash = '#/home';
      render();
    };
  }

  document.onclick = () => {
    if ($('#notifMenu')) $('#notifMenu').classList.add('hidden');
    if ($('#userMenu')) $('#userMenu').classList.add('hidden');
  };
}

function renderNotificationList(userId) {
  const items = STATE.notifications.filter(n => n.userId === userId).slice(0, 20);
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
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-notif');
      const n = STATE.notifications.find(x => x.id === id);
      if (!n) return;
      markNotificationRead(id);
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
    <div class="mb-6">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl sm:text-3xl font-semibold">${escapeHtml(title)}</h1>
        <p class="text-sm text-slate-300/85">${escapeHtml(subtitle || '')}</p>
      </div>
    </div>
  `;
}

function renderHome() {
  const user = currentUser();
  const stats = computeStats();
  return `
    <section class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-8">
        <div class="card rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 sm:p-8">
          <div class="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100">
            <span class="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Campus Recruitment Platform
          </div>
          <h2 class="mt-4 text-3xl sm:text-4xl font-semibold leading-tight">
            Welcome to
            <span class="text-indigo-200">Institute Placement System</span>
          </h2>
          <p class="mt-3 text-sm text-slate-200/85 max-w-2xl">
            A comprehensive platform connecting students with top employers. Manage your profile, apply for jobs, track applications, and coordinate interviews—all in one place.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            ${user ? `
              <a href="#/dashboard" class="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition">Go to Dashboard</a>
              <a href="#/jobs" class="rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition">Browse Jobs</a>
            ` : `
              <a href="#/auth" class="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition">Get Started</a>
              <a href="#/jobs" class="rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition">View Open Positions</a>
            `}
          </div>

          <div class="mt-8 grid gap-3 sm:grid-cols-4">
            ${readOnlyField('Active Jobs', String(stats.jobCount))}
            ${readOnlyField('Registered Students', String(stats.studentCount))}
            ${readOnlyField('Applications', String(stats.appCount))}
            ${readOnlyField('Placements', String(stats.placedCount))}
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
  const next = r.query.next || '#/dashboard';
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
              <div class="mt-1 text-xs text-slate-300/85">AI-powered job recommendations based on your profile.</div>
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

  const jobs = [...STATE.jobs].sort((a,b) => b.createdAt - a.createdAt);

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
              <input id="jobLocation" class="${inputBase()}" placeholder="e.g. Remote, Ahmedabad" />
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
              <div class="text-xs text-slate-300/80"><span id="jobCount">${jobs.length}</span> jobs found</div>
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

  if (user.role === 'student') {
    const p = user.profile;
    const skills = (p.skills || []).join(', ');
    const prevSems = getPrevSemCount(p.year || '');

    return `
      ${layoutTitle('Student Profile', 'Maintain your profile to improve job matching and visibility to recruiters.')}

      <div class="grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold">Personal Information</div>
                <div class="text-xs text-slate-300/80">This information is visible to recruiters</div>
              </div>
              <span class="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-100">${escapeHtml(user.profile.instituteId || 'Student')}</span>
            </div>

            <form id="studentProfileForm" class="mt-5 grid gap-3">
              <div>
                <label class="text-xs text-slate-300/80">Full Name *</label>
                <input name="fullName" class="${inputBase()}" value="${escapeHtml(p.fullName || '')}" required />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-300/80">Branch/Department *</label>
                  <input name="branch" class="${inputBase()}" value="${escapeHtml(p.branch || '')}" required />
                </div>
                <div>
                  <label class="text-xs text-slate-300/80">Current Semester *</label>
                  <select id="profileYearSelect" name="year" class="${selectBase()}">
                    ${SEMESTERS.map(y => `<option ${p.year===y?'selected':''}>${y}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- SPI Inputs -->
              <div id="extraAcademicFields" class="grid gap-3">
                ${isMaster(p.year) ? `
                  <div>
                    <label class="text-xs text-slate-300/80">Graduation CGPA (Required for Masters) *</label>
                    <input name="gradCgpa" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${p.gradCgpa || ''}" required />
                  </div>
                ` : ''}
                <div id="spiContainer" class="grid grid-cols-2 gap-3">
                  ${Array.from({length: prevSems}).map((_, i) => `
                    <div>
                      <label class="text-xs text-slate-300/80">${isMaster(p.year) ? 'Master Sem' : 'Sem'} ${i+1} SPI *</label>
                      <input name="spi_${i+1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${p.spis?.[i] || ''}" required />
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-300/80">CGPA (Auto-calculated)</label>
                  <input name="cgpa" type="number" step="0.01" readonly class="${inputBase('opacity-70 cursor-not-allowed')}" value="${escapeHtml(p.cgpa ?? '')}" />
                </div>
                <div>
                  <label class="text-xs text-slate-300/80">Phone</label>
                  <input name="phone" class="${inputBase()}" value="${escapeHtml(p.phone || '')}" />
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Skills (comma-separated) *</label>
                <input name="skills" class="${inputBase()}" value="${escapeHtml(skills)}" placeholder="e.g. Java, Python, SQL, React" />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">About Me</label>
                <textarea name="about" rows="4" class="${inputBase('resize-none')}" placeholder="Brief description about yourself, your goals, and strengths...">${escapeHtml(p.about || '')}</textarea>
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Resume URL</label>
                <input name="resumeUrl" class="${inputBase()}" value="${escapeHtml(p.resumeUrl || '')}" placeholder="https://drive.google.com/..." />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-300/80">GitHub Profile</label>
                  <input name="github" class="${inputBase()}" value="${escapeHtml(p.links?.github || '')}" placeholder="https://github.com/username" />
                </div>
                <div>
                  <label class="text-xs text-slate-300/80">LinkedIn Profile</label>
                  <input name="linkedin" class="${inputBase()}" value="${escapeHtml(p.links?.linkedin || '')}" placeholder="https://linkedin.com/in/username" />
                </div>
              </div>

              <div class="flex flex-wrap gap-2 pt-2">
                <button class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Save Profile</button>
                <a href="#/jobs" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Browse Jobs</a>
              </div>
            </form>
          </div>
        </div>

        <div class="lg:col-span-7">
          <div class="card rounded-3xl border border-white/10 bg-white/5 p-6">
            <div class="text-sm font-semibold">Profile Preview</div>
            <div class="mt-1 text-xs text-slate-300/80">This is how recruiters will see your profile</div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              ${readOnlyField('Full Name', p.fullName)}
              ${readOnlyField('Branch / Semester', `${p.branch || '—'} • ${p.year || '—'}`)}
              ${readOnlyField('CGPA', String(p.cgpa ?? '—'))}
              ${readOnlyField('Phone', p.phone)}
            </div>

            <div class="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-xs uppercase tracking-wide text-slate-300/70">Skills</div>
              <div class="mt-2 flex flex-wrap gap-2">
                ${(p.skills || []).length ? (p.skills || []).map(s => `<span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('') : `<span class="text-sm text-slate-300/85">No skills added yet.</span>`}
              </div>
            </div>

            <div class="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-xs uppercase tracking-wide text-slate-300/70">About</div>
              <div class="mt-2 text-sm text-slate-200/85 whitespace-pre-wrap">${escapeHtml(p.about || 'No description provided.')}</div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              ${readOnlyField('Resume', p.resumeUrl ? 'Uploaded ✓' : 'Not uploaded')}
              ${readOnlyField('Links', `${p.links?.github ? 'GitHub ✓' : ''}${p.links?.github && p.links?.linkedin ? ' • ' : ''}${p.links?.linkedin ? 'LinkedIn ✓' : ''}` || 'None')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (user.role === 'employer') {
    const c = user.company;
    return `
      ${layoutTitle('Company Profile', 'Maintain your company information to build trust with candidates.')}
      <div class="grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
            <div class="text-sm font-semibold">Company Information</div>
            <form id="employerProfileForm" class="mt-5 grid gap-3">
              <div>
                <label class="text-xs text-slate-300/80">Company Name *</label>
                <input name="name" class="${inputBase()}" value="${escapeHtml(c?.name || '')}" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Website</label>
                <input name="website" class="${inputBase()}" value="${escapeHtml(c?.website || '')}" placeholder="https://..." />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Location *</label>
                <input name="location" class="${inputBase()}" value="${escapeHtml(c?.location || '')}" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">About Company</label>
                <textarea name="about" rows="4" class="${inputBase('resize-none')}" placeholder="Brief description about your company...">${escapeHtml(c?.about || '')}</textarea>
              </div>
              <div class="flex gap-2 pt-2">
                <button class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Save Profile</button>
                <a href="#/employer/post" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Post Job</a>
              </div>
            </form>
          </div>
        </div>
        <div class="lg:col-span-7">
          <div class="card rounded-3xl border border-white/10 bg-white/5 p-6">
            <div class="text-sm font-semibold">Company Preview</div>
            <div class="mt-1 text-xs text-slate-300/80">How students see your company profile</div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              ${readOnlyField('Company Name', c?.name)}
              ${readOnlyField('Location', c?.location)}
              ${readOnlyField('Website', c?.website)}
              ${readOnlyField('Contact Email', user.email)}
            </div>
            <div class="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-xs uppercase tracking-wide text-slate-300/70">About</div>
              <div class="mt-2 text-sm text-slate-200/85 whitespace-pre-wrap">${escapeHtml(c?.about || 'No description provided.')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Faculty
  return `
    ${layoutTitle('Faculty / Admin Profile', 'Manage training & placement operations and monitor analytics.')}
    <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
      <div class="grid gap-4 sm:grid-cols-3">
        ${readOnlyField('Name', user.faculty?.fullName)}
        ${readOnlyField('Department', user.faculty?.department)}
        ${readOnlyField('Email', user.email)}
      </div>
      <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="text-sm font-semibold">Administrative Actions</div>
        <div class="mt-2 text-xs text-slate-300/85">Access placement analytics and manage system data.</div>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="#/dashboard" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">View Analytics</a>
          <button id="resetData" class="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15">Reset All Data</button>
        </div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const r = parseRoute();
  if (!requireAuth(r.raw)) return '';
  const user = currentUser();

  if (user.role === 'student') return renderStudentDashboard(user);
  if (user.role === 'employer') return renderEmployerDashboard(user);
  return renderFacultyDashboard(user);
}

function renderEmployerPostJob() {
  const r = parseRoute();
  if (!requireAuth(r.raw)) return '';
  const user = currentUser();
  if (user.role !== 'employer') {
    return `
      ${layoutTitle('Access Denied', 'Only Company Members can post jobs.')}
      <div class="card rounded-3xl border border-white/10 bg-white/5 p-6">
        <a href="#/jobs" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Browse Jobs</a>
      </div>
    `;
  }

  return `
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
                <input name="location" class="${inputBase()}" placeholder="e.g. Remote, Ahmedabad" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Salary/Stipend</label>
                <input name="salary" class="${inputBase()}" placeholder="e.g. ₹6-8 LPA or ₹20k/month" />
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
            <div>
              <label class="text-xs text-slate-300/80">Job Description *</label>
              <textarea name="description" rows="5" class="${inputBase('resize-none')}" placeholder="Describe the role, responsibilities, requirements, and selection process..." required></textarea>
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
            <li class="flex gap-2"><span class="text-indigo-300">✓</span><span>Include salary/stipend information</span></li>
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
  if (user.role !== 'employer') return `
    ${layoutTitle('Access Denied', 'Only Company Members can manage applicants.')}
    <div class="card rounded-3xl border border-white/10 bg-white/5 p-6"><a href="#/jobs" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Browse Jobs</a></div>
  `;

  const job = getJob(jobId);
  if (!job) return `
    ${layoutTitle('Job Not Found', 'The job you are looking for does not exist.')}
    <div class="card rounded-3xl border border-white/10 bg-white/5 p-6"><a href="#/dashboard" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Back to Dashboard</a></div>
  `;

  if (job.employerId !== user.id) return `
    ${layoutTitle('Access Denied', 'You can only manage your own job postings.')}
    <div class="card rounded-3xl border border-white/10 bg-white/5 p-6"><a href="#/dashboard" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Back to Dashboard</a></div>
  `;

  const apps = applicationsForJob(job.id).sort((a,b) => b.appliedAt - a.appliedAt);
  const rows = apps.map(a => {
    const stu = getUser(a.studentId);
    const p = stu?.profile;
    const skills = (p?.skills || []).slice(0,4);
    const interview = a.interview?.time ? `<div class="text-xs text-slate-300/80">Interview: <span class="text-slate-100">${fmtDateTime(a.interview.time)}</span></div>` : '';
    return `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
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
            ${readOnlyField('Total Applicants', String(apps.length))}
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <a href="#/dashboard" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Back</a>
            <a href="#/jobs" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">All Jobs</a>
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
          <div class="p-5 grid gap-4">
            ${rows || `<div class="text-center py-8 text-sm text-slate-300/85">No applications received yet.</div>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStudentDashboard(user) {
  const apps = applicationsForStudent(user.id).sort((a,b) => b.appliedAt - a.appliedAt);
  const enriched = apps.map(a => ({ a, job: getJob(a.jobId) })).filter(x => x.job);

  const total = enriched.length;
  const interviewCount = enriched.filter(x => x.a.status === STATUS.INTERVIEW).length;
  const selectedCount = enriched.filter(x => x.a.status === STATUS.SELECTED).length;
  const rejectedCount = enriched.filter(x => x.a.status === STATUS.REJECTED).length;

  const upcoming = enriched
    .filter(x => x.a.interview?.time)
    .map(x => ({...x, t: new Date(x.a.interview.time).getTime()}))
    .filter(x => x.t > Date.now() - 1000*60*30)
    .sort((x,y) => x.t - y.t)
    .slice(0, 5);

  const kpiCard = (icon, label, value, hint) => `
    <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div class="flex items-center gap-2">
        <span class="text-lg">${icon}</span>
        <div class="text-[11px] uppercase tracking-wide text-slate-300/70">${escapeHtml(label)}</div>
      </div>
      <div class="mt-2 text-2xl font-semibold">${escapeHtml(String(value))}</div>
      <div class="mt-1 text-xs text-slate-300/80">${escapeHtml(hint || '')}</div>
    </div>
  `;

  const bar = (label, value, totalMax, colorClass) => {
    const pct = totalMax ? Math.round((value/totalMax)*100) : 0;
    return `
      <div>
        <div class="flex items-center justify-between text-xs text-slate-300/85">
          <span>${escapeHtml(label)}</span>
          <span class="text-slate-100">${value}</span>
        </div>
        <div class="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <div class="h-full ${colorClass} transition-all" style="width:${Math.min(100, Math.max(0, pct))}%"></div>
        </div>
      </div>
    `;
  };

  return `
    ${layoutTitle('Student Dashboard', 'Track your applications, interviews, and placement outcomes.')}

    <div class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">Your Statistics</div>
              <div class="text-xs text-slate-300/80">Application pipeline overview</div>
            </div>
            <a href="#/jobs" class="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">Find Jobs</a>
          </div>
          <div class="mt-5 grid gap-3">
            ${kpiCard('📝', 'Applications', total, 'Total jobs applied')}
            ${kpiCard('📅', 'Interviews', interviewCount, 'Scheduled interviews')}
            ${kpiCard('🎉', 'Offers', selectedCount, 'Selection offers received')}
          </div>
          <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div class="text-sm font-semibold">Status Breakdown</div>
            <div class="mt-4 space-y-3">
              ${bar('Applied', enriched.filter(x => x.a.status === STATUS.APPLIED).length, Math.max(1,total), 'bg-indigo-500')}
              ${bar('Shortlisted', enriched.filter(x => x.a.status === STATUS.SHORTLISTED).length, Math.max(1,total), 'bg-amber-500')}
              ${bar('Interview', interviewCount, Math.max(1,total), 'bg-cyan-500')}
              ${bar('Rejected', rejectedCount, Math.max(1,total), 'bg-rose-500')}
              ${bar('Selected', selectedCount, Math.max(1,total), 'bg-emerald-500')}
            </div>
          </div>
        </div>

        <div class="mt-4 card rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/12 to-white/5 p-6">
          <div class="text-sm font-semibold">Profile Completeness</div>
          ${renderProfileHealth(user)}
          <div class="mt-4">
            <a href="#/profile" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Update Profile</a>
          </div>
        </div>
      </div>

      <div class="lg:col-span-8">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
          <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">My Applications</div>
              <div class="text-xs text-slate-300/80">Recent applications first</div>
            </div>
            <div class="text-xs text-slate-300/80">${total} total</div>
          </div>
          <div class="p-5 grid gap-4">
            ${enriched.length ? enriched.map(({a, job}) => renderStudentApplicationCard(a, job)).join('') : `
              <div class="text-center py-12">
                <div class="text-4xl mb-3">📋</div>
                <div class="text-sm font-semibold">No applications yet</div>
                <div class="mt-1 text-xs text-slate-300/80">Start applying to jobs to see them here.</div>
                <a href="#/jobs" class="mt-4 inline-flex rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Browse Jobs</a>
              </div>
            `}
          </div>
        </div>

        <div class="mt-6 card rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">Upcoming Interviews</div>
              <div class="text-xs text-slate-300/80">Scheduled interview sessions</div>
            </div>
          </div>
          <div class="mt-4 grid gap-3">
            ${upcoming.length ? upcoming.map(x => `
              <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div class="text-sm font-semibold">${escapeHtml(x.job.title)}</div>
                    <div class="text-xs text-slate-300/80">${escapeHtml(x.job.companyName)} • ${escapeHtml(x.job.location)}</div>
                    <div class="mt-2 text-xs text-slate-300/80">📅 <span class="text-slate-100">${fmtDateTime(x.a.interview.time)}</span></div>
                    ${x.a.interview?.meetLink ? `<div class="mt-1 text-xs text-slate-300/80">🔗 <a class="text-indigo-200 hover:underline" target="_blank" href="${escapeHtml(x.a.interview.meetLink)}">Join Meeting</a></div>` : ''}
                  </div>
                  <div>${badge(x.a.status)}</div>
                </div>
              </div>
            `).join('') : `<div class="text-center py-6 text-sm text-slate-300/85">No upcoming interviews scheduled.</div>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProfileHealth(user) {
  const p = user.profile;
  const checks = [
    { label: 'Full name', ok: Boolean(p.fullName) },
    { label: 'CGPA', ok: Number.isFinite(Number(p.cgpa)) },
    { label: 'Skills (3+)', ok: (p.skills || []).length >= 3 },
    { label: 'About section', ok: Boolean(p.about && p.about.trim().length >= 20) },
    { label: 'Resume URL', ok: Boolean(p.resumeUrl) },
  ];
  const score = checks.filter(c => c.ok).length;
  const pct = Math.round((score / checks.length) * 100);
  return `
    <div class="mt-4">
      <div class="flex items-center justify-between text-xs text-slate-300/85">
        <span>Completeness</span>
        <span class="text-slate-100 font-semibold">${pct}%</span>
      </div>
      <div class="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
        <div class="h-full bg-indigo-500 transition-all" style="width:${pct}%"></div>
      </div>
      <div class="mt-4 grid gap-2">
        ${checks.map(c => `
          <div class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs">
            <span class="text-slate-200">${escapeHtml(c.label)}</span>
            <span class="${c.ok ? 'text-emerald-300' : 'text-slate-400'}">${c.ok ? '✓ Complete' : '○ Missing'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStudentApplicationCard(app, job) {
  const reqSkills = (job.skills || []).slice(0, 6);
  const interviewInfo = app.interview?.time ? `
    <div class="mt-2 text-xs text-slate-300/80">📅 Interview: <span class="text-slate-100">${fmtDateTime(app.interview.time)}</span></div>
  ` : '';

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
        <div class="flex flex-wrap gap-2">
          <button data-withdraw="${app.id}" class="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/15">Withdraw</button>
        </div>
      </div>
    </div>
  `;
}

function renderEmployerDashboard(user) {
  const myJobs = STATE.jobs.filter(j => j.employerId === user.id).sort((a,b)=>b.createdAt-a.createdAt);
  const myJobIds = new Set(myJobs.map(j => j.id));
  const apps = STATE.applications.filter(a => myJobIds.has(a.jobId));
  const totalApplicants = apps.length;
  const interviews = apps.filter(a => a.status === STATUS.INTERVIEW).length;
  const selected = apps.filter(a => a.status === STATUS.SELECTED).length;

  const jobCard = (job) => {
    const cnt = applicationsForJob(job.id).length;
    const intv = applicationsForJob(job.id).filter(a => a.status === STATUS.INTERVIEW).length;
    return `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold truncate">${escapeHtml(job.title)}</div>
            <div class="mt-1 text-xs text-slate-300/80">${escapeHtml(job.location)} • ${escapeHtml(job.type)} • Min CGPA ${escapeHtml(String(job.minCgpa ?? '—'))}</div>
            <div class="mt-2 flex flex-wrap gap-2">
              ${(job.skills || []).slice(0,6).map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('')}
            </div>
            <div class="mt-2 text-xs text-slate-300/80">Posted: ${fmtDateTime(job.createdAt)}</div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div class="text-xs text-slate-300/80">📝 Applicants: <span class="text-slate-100 font-semibold">${cnt}</span></div>
            <div class="text-xs text-slate-300/80">📅 Interviews: <span class="text-slate-100 font-semibold">${intv}</span></div>
            <a href="#/employer/manage/${job.id}" class="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400">Manage</a>
          </div>
        </div>
      </div>
    `;
  };

  return `
    ${layoutTitle('Company Member Dashboard', 'Manage job postings, review applications, and coordinate interviews.')}

    <div class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">Recruitment Stats</div>
              <div class="text-xs text-slate-300/80">Your hiring pipeline</div>
            </div>
            <a href="#/employer/post" class="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400">+ Post Job</a>
          </div>
          <div class="mt-5 grid gap-3">
            ${readOnlyField('Jobs Posted', String(myJobs.length))}
            ${readOnlyField('Total Applicants', String(totalApplicants))}
            ${readOnlyField('Interviews Scheduled', String(interviews))}
            ${readOnlyField('Candidates Selected', String(selected))}
          </div>
        </div>
      </div>

      <div class="lg:col-span-8">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
          <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">Your Job Postings</div>
              <div class="text-xs text-slate-300/80">Manage applications for each position</div>
            </div>
            <a href="#/jobs" class="text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10">View All Jobs</a>
          </div>
          <div class="p-5 grid gap-4">
            ${myJobs.length ? myJobs.map(jobCard).join('') : `
              <div class="text-center py-12">
                <div class="text-4xl mb-3">📋</div>
                <div class="text-sm font-semibold">No jobs posted yet</div>
                <div class="mt-1 text-xs text-slate-300/80">Create your first job posting to start receiving applications.</div>
                <a href="#/employer/post" class="mt-4 inline-flex rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Post a Job</a>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFacultyDashboard(user) {
  const stats = computeStats();
  const placementRate = stats.studentCount ? Math.round((stats.placedCount / stats.studentCount) * 100) : 0;

  const topCompanies = stats.companyStats.slice(0,5);
  const topSkills = stats.topSkills.slice(0,8);

  return `
    ${layoutTitle('Faculty / Admin Dashboard', 'Monitor placement statistics and institutional performance metrics.')}

    <div class="grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
          <div class="text-sm font-semibold">Placement Metrics</div>
          <div class="mt-5 grid gap-3">
            ${readOnlyField('Registered Students', String(stats.studentCount))}
            ${readOnlyField('Active Job Postings', String(stats.jobCount))}
            ${readOnlyField('Total Applications', String(stats.appCount))}
            ${readOnlyField('Interviews Scheduled', String(stats.interviewCount))}
            ${readOnlyField('Students Placed', String(stats.placedCount))}
            ${readOnlyField('Placement Rate', placementRate + '%')}
          </div>
        </div>

        <div class="mt-4 card rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="text-sm font-semibold">Top Skills (Among Placed Students)</div>
          <div class="mt-4 flex flex-wrap gap-2">
            ${topSkills.length ? topSkills.map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s.skill)} <span class="text-slate-300/80">(${s.count})</span></span>`).join('') : `<div class="text-sm text-slate-300/85">No placement data available yet.</div>`}
          </div>
        </div>
      </div>

      <div class="lg:col-span-8">
        <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
          <div class="px-5 py-4 border-b border-white/10">
            <div class="text-sm font-semibold">Company-wise Performance</div>
            <div class="text-xs text-slate-300/80">Applications, interviews, and selections by company</div>
          </div>
          <div class="p-5 grid gap-3">
            ${topCompanies.length ? topCompanies.map(c => `
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold">${escapeHtml(c.company)}</div>
                  <div class="text-xs text-slate-300/80">Jobs: <span class="text-slate-100 font-semibold">${c.jobs}</span></div>
                </div>
                <div class="mt-3 grid gap-3 sm:grid-cols-3">
                  ${readOnlyField('Applications', String(c.applications))}
                  ${readOnlyField('Interviews', String(c.interviews))}
                  ${readOnlyField('Selected', String(c.selected))}
                </div>
              </div>
            `).join('') : `
              <div class="text-center py-12">
                <div class="text-4xl mb-3">📊</div>
                <div class="text-sm font-semibold">No data available</div>
                <div class="mt-1 text-xs text-slate-300/80">Statistics will appear once companies post jobs and students apply.</div>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function computeStats() {
  const studentUsers = STATE.users.filter(u => u.role === 'student');
  const jobCount = STATE.jobs.length;
  const appCount = STATE.applications.length;
  const interviewCount = STATE.applications.filter(a => a.status === STATUS.INTERVIEW).length;
  const placedCount = STATE.applications.filter(a => a.status === STATUS.SELECTED).length;

  const byCompany = new Map();
  for (const job of STATE.jobs) {
    const key = job.companyName || 'Unknown';
    if (!byCompany.has(key)) byCompany.set(key, { company: key, jobs: 0, applications: 0, interviews: 0, selected: 0 });
    byCompany.get(key).jobs += 1;
  }
  for (const app of STATE.applications) {
    const job = getJob(app.jobId);
    if (!job) continue;
    const key = job.companyName || 'Unknown';
    if (!byCompany.has(key)) byCompany.set(key, { company: key, jobs: 0, applications: 0, interviews: 0, selected: 0 });
    const row = byCompany.get(key);
    row.applications += 1;
    if (app.status === STATUS.INTERVIEW) row.interviews += 1;
    if (app.status === STATUS.SELECTED) row.selected += 1;
  }

  const placedStudentIds = new Set(
    STATE.applications.filter(a => a.status === STATUS.SELECTED).map(a => a.studentId)
  );
  const skillCounts = new Map();
  for (const stu of studentUsers) {
    if (!placedStudentIds.has(stu.id)) continue;
    for (const s of (stu.profile?.skills || [])) {
      const k = String(s).trim();
      if (!k) continue;
      skillCounts.set(k, (skillCounts.get(k) || 0) + 1);
    }
  }

  return {
    studentCount: studentUsers.length,
    jobCount,
    appCount,
    interviewCount,
    placedCount,
    companyStats: Array.from(byCompany.values()).sort((a,b) => b.selected - a.selected || b.interviews - a.interviews || b.applications - a.applications),
    topSkills: Array.from(skillCounts.entries()).map(([skill,count]) => ({skill, count})).sort((a,b) => b.count - a.count)
  };
}

/***********************
 * Render + Routing
 ***********************/

function render() {
  STATE = loadState();

  renderHeader();

  const r = parseRoute();
  const app = $('#app');

  if (!location.hash) location.hash = '#/home';

  if (r.path === '/home') {
    app.innerHTML = renderHome();
  } else if (r.path === '/auth') {
    app.innerHTML = renderAuth();
  } else if (r.path === '/jobs') {
    app.innerHTML = renderJobs();
  } else if (r.path === '/profile') {
    app.innerHTML = renderProfile();
  } else if (r.path === '/dashboard') {
    app.innerHTML = renderDashboard();
  } else if (r.path === '/employer' && r.parts[1] === 'post') {
    app.innerHTML = renderEmployerPostJob();
  } else if (r.path === '/employer' && r.parts[1] === 'manage' && r.parts[2]) {
    app.innerHTML = renderEmployerManage(r.parts[2]);
  } else {
    app.innerHTML = `
      ${layoutTitle('Page Not Found', 'The page you are looking for does not exist.')}
      <div class="card rounded-3xl border border-white/10 bg-white/5 p-6">
        <a href="#/home" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Go to Home</a>
      </div>
    `;
  }

  wireCommonHandlers();
  wireNotificationClicks();
  wireViewHandlers();
}

function wireCommonHandlers() {}

function wireViewHandlers() {
  const r = parseRoute();

  // Auth tabs
  if (r.path === '/auth') {
    const next = r.query.next || '#/dashboard';
    const container = $('#authForms');

    const renderLoginForm = () => {
      container.innerHTML = `
        <form id="loginForm" class="grid gap-3 mt-4">
          <div>
            <label class="text-xs text-slate-300/80">Email Address</label>
            <input name="email" type="email" class="${inputBase()}" placeholder="you@example.com" required />
          </div>
          <div>
            <label class="text-xs text-slate-300/80">Password</label>
            <input name="password" type="password" class="${inputBase()}" placeholder="Enter your password" required />
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Login</button>
          </div>
        </form>
      `;

      $('#loginForm').onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const email = String(fd.get('email')||'').trim().toLowerCase();
        const password = String(fd.get('password')||'');
        const user = STATE.users.find(u => u.email.toLowerCase() === email && u.password === password);
        if (!user) {
          toast('Login Failed', 'Invalid email or password. Please try again.', 'danger');
          return;
        }
        STATE.currentUserId = user.id;
        saveState(STATE);
        toast('Welcome Back!', `Logged in as ${roleLabel(user.role)}.`, 'success');
        location.hash = next;
        render();
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
            <label class="text-xs text-slate-300/80">Password *</label>
            <input name="password" type="password" class="${inputBase()}" placeholder="Create a strong password" required minlength="6" />
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
        const role = roleSel.value;
        if (role === 'student') {
          roleFields.innerHTML = `
            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-300/80">Full Name *</label>
                <input name="fullName" class="${inputBase()}" placeholder="Your full name" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Institute ID</label>
                <input name="instituteId" class="${inputBase()}" placeholder="e.g. CS-21-001" />
              </div>
            </div>
            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-300/80">Branch/Department *</label>
                <input name="branch" class="${inputBase()}" placeholder="e.g. Computer Science" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Current Semester *</label>
                <select id="signupYearSelect" name="year" class="${selectBase()}">
                  ${SEMESTERS.map(s => `<option ${s==='Graduation Sem 7'?'selected':''}>${s}</option>`).join('')}
                </select>
              </div>
            </div>
            <div id="signupExtraFields" class="grid gap-3">
              <div id="signupSpiContainer" class="grid grid-cols-2 gap-3"></div>
            </div>
          `;

          const signupYearSel = $('#signupYearSelect');
          const signupExtraFields = $('#signupExtraFields');

          const updateSignupSpis = () => {
            const val = signupYearSel.value;
            const count = getPrevSemCount(val);
            const master = isMaster(val);
            signupExtraFields.innerHTML = `
              ${master ? `
                <div>
                  <label class="text-xs text-slate-300/80">Graduation CGPA *</label>
                  <input name="gradCgpa" type="number" step="0.01" min="0" max="10" class="${inputBase()}" required />
                </div>
              ` : ''}
              <div id="signupSpiContainer" class="grid grid-cols-2 gap-3">
                ${Array.from({length: count}).map((_, i) => `
                  <div>
                    <label class="text-xs text-slate-300/80">${master ? 'Master Sem' : 'Sem'} ${i+1} SPI *</label>
                    <input name="spi_${i+1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" required />
                  </div>
                `).join('')}
              </div>
            `;
          };

          signupYearSel.onchange = updateSignupSpis;
          updateSignupSpis();
        } else if (role === 'employer') {
          roleFields.innerHTML = `
            <div>
              <label class="text-xs text-slate-300/80">Company Name *</label>
              <input name="companyName" class="${inputBase()}" placeholder="Your company name" required />
            </div>
            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-300/80">Location *</label>
                <input name="companyLocation" class="${inputBase()}" placeholder="City, Country" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Website</label>
                <input name="companyWebsite" class="${inputBase()}" placeholder="https://..." />
              </div>
            </div>
          `;
        } else {
          roleFields.innerHTML = `
            <div>
              <label class="text-xs text-slate-300/80">Full Name *</label>
              <input name="facultyName" class="${inputBase()}" placeholder="Your full name" required />
            </div>
            <div>
              <label class="text-xs text-slate-300/80">Department *</label>
              <input name="facultyDept" class="${inputBase()}" placeholder="e.g. Training & Placement Cell" required />
            </div>
          `;
        }
      };
      roleSel.onchange = renderRoleFields;
      renderRoleFields();

      $('#signupForm').onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const role = String(fd.get('role'));
        const email = String(fd.get('email')||'').trim().toLowerCase();
        const password = String(fd.get('password')||'');

        if (STATE.users.some(u => u.email.toLowerCase() === email)) {
          toast('Registration Failed', 'An account with this email already exists.', 'warn');
          return;
        }

        let user;
        if (role === 'student') {
          const year = String(fd.get('year')||'');
          const count = getPrevSemCount(year);
          const gradCgpa = isMaster(year) ? parseFloat(fd.get('gradCgpa') || 0) : null;
          
          const spis = [];
          for(let i=1; i<=count; i++) {
            spis.push(toNumber(fd.get(`spi_${i}`), 0));
          }
          const cgpa = spis.length ? (spis.reduce((a,b)=>a+b,0) / spis.length).toFixed(2) : 0;

          user = {
            id: uid('stu'),
            role,
            email,
            password,
            profile: {
              fullName: String(fd.get('fullName')||'').trim(),
              instituteId: String(fd.get('instituteId')||'').trim(),
              branch: String(fd.get('branch')||'').trim(),
              year: year,
              gradCgpa: gradCgpa,
              spis: spis,
              cgpa: parseFloat(cgpa),
              phone: '',
              skills: [],
              about: '',
              resumeUrl: '',
              links: { github: '', linkedin: '' }
            }
          };
        } else if (role === 'employer') {
          user = {
            id: uid('emp'),
            role,
            email,
            password,
            company: {
              name: String(fd.get('companyName')||'').trim(),
              location: String(fd.get('companyLocation')||'').trim(),
              website: String(fd.get('companyWebsite')||'').trim(),
              about: '',
              phone: ''
            }
          };
        } else {
          user = {
            id: uid('fac'),
            role: 'faculty',
            email,
            password,
            faculty: {
              fullName: String(fd.get('facultyName')||'').trim(),
              department: String(fd.get('facultyDept')||'').trim() || 'Training & Placement Cell',
              phone: ''
            }
          };
        }

        STATE.users.unshift(user);
        STATE.currentUserId = user.id;
        saveState(STATE);
        pushNotification(user.id, {
          title: 'Welcome to IPS!',
          message: 'Your account has been created successfully. Complete your profile to get started.',
          link: user.role === 'employer' ? '#/employer/post' : '#/profile'
        });
        toast('Account Created', `Welcome! You are now logged in as ${roleLabel(user.role)}.`, 'success');
        location.hash = next;
        render();
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
    const jobList = $('#jobList');
    const jobs = [...STATE.jobs].sort((a,b)=>b.createdAt-a.createdAt);

    const applyFilters = () => {
      const q = String($('#jobSearch').value || '').trim().toLowerCase();
      const type = String($('#jobType').value || '');
      const minCgpa = toNumber($('#minCgpa').value, NaN);
      const loc = String($('#jobLocation').value || '').trim().toLowerCase();

      let filtered = jobs;
      if (q) {
        filtered = filtered.filter(j => {
          const hay = `${j.title} ${j.companyName} ${j.location} ${(j.skills||[]).join(' ')}`.toLowerCase();
          return hay.includes(q);
        });
      }
      if (type) filtered = filtered.filter(j => j.type === type);
      if (Number.isFinite(minCgpa)) filtered = filtered.filter(j => Number(j.minCgpa || 0) >= minCgpa);
      if (loc) filtered = filtered.filter(j => String(j.location||'').toLowerCase().includes(loc));

      $('#jobCount').textContent = filtered.length;
      jobList.innerHTML = filtered.length ? filtered.map(renderJobCard).join('') : `<div class="text-center py-8 text-sm text-slate-300/85">No jobs match your search criteria.</div>`;
      wireJobCardHandlers();
    };

    const renderJobCard = (job) => {
      const user = currentUser();
      const app = user?.role === 'student' ? applicationFor(user.id, job.id) : null;
      const eligible = user?.role === 'student'
        ? (Number(user.profile?.cgpa || 0) >= Number(job.minCgpa || 0))
        : true;

      const matchScore = user?.role === 'student' ? computeMatchScore(user, job) : null;

      const applyBtn = (() => {
        if (!user) return `<a href="#/auth?next=${encodeURIComponent('#/jobs')}" class="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400">Login to Apply</a>`;
        if (user.role !== 'student') return `<span class="text-xs text-slate-300/80">${escapeHtml(roleLabel(user.role))} view</span>`;
        if (!eligible) return `<button class="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 cursor-not-allowed" disabled>CGPA Not Eligible</button>`;
        if (app) return `<button class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 cursor-not-allowed" disabled>✓ Applied</button>`;
        return `<button data-apply="${job.id}" class="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400">Apply Now</button>`;
      })();

      return `
        <div class="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-base font-semibold truncate">${escapeHtml(job.title)}</div>
                <span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(job.type)}</span>
                ${user?.role === 'student' && matchScore !== null ? `<span class="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-100">${matchScore}% Match</span>` : ''}
              </div>
              <div class="mt-1 text-sm text-slate-200/85">${escapeHtml(job.companyName)} • <span class="text-slate-300/85">${escapeHtml(job.location)}</span></div>
              <div class="mt-2 flex flex-wrap gap-2">
                ${(job.skills||[]).slice(0,8).map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('')}
              </div>
              <div class="mt-3 grid gap-2 sm:grid-cols-3">
                ${readOnlyField('Salary', job.salary || '—')}
                ${readOnlyField('Min CGPA', String(job.minCgpa ?? '—'))}
                ${readOnlyField('Posted', fmtDateTime(job.createdAt))}
              </div>
              <div class="mt-3 text-xs text-slate-300/85 line-clamp-2">${escapeHtml(job.description || '')}</div>
            </div>
            <div class="flex flex-col items-end gap-2">
              ${applyBtn}
              ${user?.role === 'employer' && job.employerId === user.id ? `<a href="#/employer/manage/${job.id}" class="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">Manage</a>` : ''}
            </div>
          </div>
        </div>
      `;
    };

    const computeMatchScore = (user, job) => {
      const sSkills = new Set((user.profile?.skills || []).map(s => String(s).toLowerCase().trim()).filter(Boolean));
      const jSkills = (job.skills || []).map(s => String(s).toLowerCase().trim()).filter(Boolean);
      if (!jSkills.length) return 60;
      const hits = jSkills.filter(s => sSkills.has(s)).length;
      const skillScore = Math.round((hits / jSkills.length) * 70);
      const cgpaScore = Number(user.profile?.cgpa || 0) >= Number(job.minCgpa || 0) ? 30 : 10;
      return Math.max(0, Math.min(100, skillScore + cgpaScore));
    };

    const wireJobCardHandlers = () => {
      $$('[data-apply]').forEach(btn => {
        btn.addEventListener('click', () => {
          const jobId = btn.getAttribute('data-apply');
          const user = currentUser();
          if (!user || user.role !== 'student') return;
          const job = getJob(jobId);
          if (!job) return;

          const eligible = Number(user.profile?.cgpa || 0) >= Number(job.minCgpa || 0);
          if (!eligible) {
            toast('Not Eligible', `Minimum CGPA required is ${job.minCgpa}.`, 'warn');
            return;
          }

          if (applicationFor(user.id, jobId)) return;

          const app = {
            id: uid('app'),
            jobId,
            studentId: user.id,
            status: STATUS.APPLIED,
            appliedAt: Date.now(),
            interview: null
          };
          STATE.applications.unshift(app);
          saveState(STATE);

          const employerId = job.employerId;
          pushNotification(employerId, {
            title: 'New Application Received',
            message: `${user.profile?.fullName || 'A student'} applied for ${job.title}.`,
            link: `#/employer/manage/${job.id}`,
            type: 'info'
          });

          toast('Application Submitted', `You have successfully applied for ${job.title}.`, 'success');
          render();
        });
      });
    };

    if (jobs.length > 0) {
      jobList.innerHTML = jobs.map(renderJobCard).join('');
      wireJobCardHandlers();
    }

    $('#applyFilters').onclick = applyFilters;
    $('#clearFilters').onclick = () => {
      $('#jobSearch').value = '';
      $('#jobType').value = '';
      $('#minCgpa').value = '';
      $('#jobLocation').value = '';
      $('#jobCount').textContent = jobs.length;
      if (jobs.length > 0) {
        jobList.innerHTML = jobs.map(renderJobCard).join('');
        wireJobCardHandlers();
      }
    };
  }

  // Profile submit handlers
  if (r.path === '/profile') {
    const user = currentUser();
    if (user?.role === 'student') {
      const form = $('#studentProfileForm');
      const profileYearSelect = $('#profileYearSelect');

      if (profileYearSelect && $('#extraAcademicFields')) {
        profileYearSelect.onchange = () => {
          const val = profileYearSelect.value;
          const count = getPrevSemCount(val);
          const master = isMaster(val);
          $('#extraAcademicFields').innerHTML = `
            ${master ? `
              <div>
                <label class="text-xs text-slate-300/80">Graduation CGPA (Required for Masters) *</label>
                <input name="gradCgpa" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${user.profile.gradCgpa || ''}" required />
              </div>
            ` : ''}
            <div id="spiContainer" class="grid grid-cols-2 gap-3">
              ${Array.from({length: count}).map((_, i) => `
                <div>
                  <label class="text-xs text-slate-300/80">${master ? 'Master Sem' : 'Sem'} ${i+1} SPI *</label>
                  <input name="spi_${i+1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${user.profile.spis?.[i] || ''}" required />
                </div>
              `).join('')}
            </div>
          `;
        };
      }

      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const p = user.profile;
          p.fullName = String(fd.get('fullName')||'').trim();
          p.branch = String(fd.get('branch')||'').trim();
          p.year = String(fd.get('year')||'').trim();
          
          const count = getPrevSemCount(p.year);
          if (isMaster(p.year)) {
            p.gradCgpa = parseFloat(fd.get('gradCgpa') || 0);
          }

          p.spis = [];
          for(let i=1; i<=count; i++) {
            p.spis.push(toNumber(fd.get(`spi_${i}`), 0));
          }
          p.cgpa = p.spis.length ? parseFloat((p.spis.reduce((a,b)=>a+b,0) / p.spis.length).toFixed(2)) : 0;

          const newPhone = String(fd.get('phone')||'').trim();
          if (p.phone !== newPhone && newPhone) {
            p.phone = newPhone;
            // Verify phone number email/SMS notifications
            verifyContactDetails(user.id, 'phone', newPhone);
          } else {
            p.phone = newPhone;
          }
          p.about = String(fd.get('about')||'').trim();
          p.resumeUrl = String(fd.get('resumeUrl')||'').trim();
          p.links = p.links || { github:'', linkedin:'' };
          p.links.github = String(fd.get('github')||'').trim();
          p.links.linkedin = String(fd.get('linkedin')||'').trim();

          const rawSkills = String(fd.get('skills')||'');
          p.skills = rawSkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);

          saveState(STATE);
          toast('Profile Updated', 'Your profile has been saved successfully.', 'success');
          render();
        };
      }
    }

    if (user?.role === 'employer') {
      const form = $('#employerProfileForm');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          user.company = user.company || {};
          user.company.name = String(fd.get('name')||'').trim();
          user.company.website = String(fd.get('website')||'').trim();
          user.company.location = String(fd.get('location')||'').trim();
          user.company.about = String(fd.get('about')||'').trim();
          
          const newPhone = String(fd.get('phone')||'').trim();
          if (user.company.phone !== newPhone && newPhone) {
            user.company.phone = newPhone;
            verifyContactDetails(user.id, 'phone', newPhone);
          } else {
            user.company.phone = newPhone;
          }
          
          STATE.jobs.forEach(j => { if (j.employerId === user.id) j.companyName = user.company.name || j.companyName; });
          saveState(STATE);
          toast('Profile Updated', 'Company profile has been saved successfully.', 'success');
          render();
        };
      }
    }

    if (user?.role === 'faculty') {
      const reset = $('#resetData');
      if (reset) {
        reset.onclick = () => {
          if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            localStorage.removeItem(LS_KEY);
            STATE = loadState();
            toast('Data Reset', 'All system data has been cleared.', 'success');
            location.hash = '#/home';
            render();
          }
        };
      }
    }
  }

  // Student dashboard withdraw
  if (r.path === '/dashboard') {
    const user = currentUser();
    if (user?.role === 'student') {
      $$('[data-withdraw]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm('Are you sure you want to withdraw this application?')) return;
          const id = btn.getAttribute('data-withdraw');
          const idx = STATE.applications.findIndex(a => a.id === id && a.studentId === user.id);
          if (idx === -1) return;
          const job = getJob(STATE.applications[idx].jobId);
          STATE.applications.splice(idx, 1);
          saveState(STATE);
          if (job) {
            pushNotification(job.employerId, {
              title: 'Application Withdrawn',
              message: `${user.profile?.fullName || 'A student'} withdrew their application for ${job.title}.`,
              link: `#/employer/manage/${job.id}`,
              type: 'warn'
            });
          }
          toast('Application Withdrawn', 'Your application has been removed.', 'info');
          render();
        });
      });
    }
  }

  // Employer post job
  if (r.path === '/employer' && r.parts[1] === 'post') {
    const user = currentUser();
    const form = $('#postJobForm');
    if (form && user?.role === 'employer') {
      form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const job = {
          id: uid('job'),
          employerId: user.id,
          companyName: user.company?.name || 'Company',
          title: String(fd.get('title')||'').trim(),
          location: String(fd.get('location')||'').trim(),
          type: String(fd.get('type')||'Full-time'),
          salary: String(fd.get('salary')||'').trim(),
          minCgpa: toNumber(fd.get('minCgpa'), 0),
          skills: String(fd.get('skills')||'').split(',').map(s => s.trim()).filter(Boolean).slice(0, 20),
          description: String(fd.get('description')||'').trim(),
          createdAt: Date.now()
        };
        STATE.jobs.unshift(job);
        saveState(STATE);
        toast('Job Published', 'Your job posting is now live and visible to students.', 'success');
        location.hash = '#/dashboard';
        render();
      };
    }
  }

  // Employer manage applicants
  if (r.path === '/employer' && r.parts[1] === 'manage' && r.parts[2]) {
    const user = currentUser();
    const jobId = r.parts[2];
    if (user?.role === 'employer') {
      $$('[data-status]').forEach(sel => {
        sel.addEventListener('change', () => {
          const appId = sel.getAttribute('data-status');
          const app = STATE.applications.find(a => a.id === appId);
          if (!app) return;
          app.status = sel.value;
          saveState(STATE);
          const student = getUser(app.studentId);
          const job = getJob(app.jobId);
          if (student && job) {
            pushNotification(student.id, {
              title: 'Application Status Updated',
              message: `Your application for ${job.title} has been updated to: ${app.status}.`,
              link: '#/dashboard',
              type: 'info'
            });
          }
          toast('Status Updated', 'Application status has been saved.', 'success');
          render();
        });
      });

      $$('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          const appId = btn.getAttribute('data-view');
          const app = STATE.applications.find(a => a.id === appId);
          if (!app) return;
          const stu = getUser(app.studentId);
          const p = stu?.profile;
          if (!p) return;
          openModal({
            title: 'Candidate Profile',
            subtitle: 'Review candidate details',
            bodyHTML: `
              <div class="grid gap-4 sm:grid-cols-2">
                ${readOnlyField('Name', p.fullName)}
                ${readOnlyField('Branch', p.branch)}
                ${readOnlyField('Semester', p.year)}
                ${readOnlyField('CGPA', String(p.cgpa ?? '—'))}
                ${readOnlyField('Phone', p.phone)}
                ${readOnlyField('Resume', p.resumeUrl ? `<a href="${escapeHtml(p.resumeUrl)}" target="_blank" class="text-indigo-200 hover:underline">View Resume</a>` : '—')}
              </div>
              <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="text-xs uppercase tracking-wide text-slate-300/70">Skills</div>
                <div class="mt-2 flex flex-wrap gap-2">
                  ${(p.skills||[]).map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('') || '<span class="text-sm text-slate-300/85">No skills listed</span>'}
                </div>
              </div>
              <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="text-xs uppercase tracking-wide text-slate-300/70">About</div>
                <div class="mt-2 text-sm text-slate-200/85 whitespace-pre-wrap">${escapeHtml(p.about || 'No description provided.')}</div>
              </div>
            `
          });
        });
      });

      $$('[data-schedule]').forEach(btn => {
        btn.addEventListener('click', () => {
          const appId = btn.getAttribute('data-schedule');
          const app = STATE.applications.find(a => a.id === appId);
          const job = getJob(app?.jobId);
          const stu = getUser(app?.studentId);
          if (!app || !job || !stu) return;

          openModal({
            title: 'Schedule Interview',
            subtitle: `${job.title} • ${stu.profile?.fullName || 'Candidate'}`,
            bodyHTML: `
              <form id="scheduleForm" class="grid gap-4">
                <div class="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs text-slate-300/80 block mb-2">Interview Date *</label>
                    <input name="interviewDate" type="date" class="${inputBase()}" required />
                  </div>
                  <div>
                    <label class="text-xs text-slate-300/80 block mb-2">Interview Time *</label>
                    <input name="interviewTime" type="time" class="${inputBase()}" required />
                  </div>
                </div>
                <div>
                  <label class="text-xs text-slate-300/80">Meeting Link (Optional)</label>
                  <input name="meetLink" class="${inputBase()}" placeholder="https://meet.google.com/..." />
                </div>
                <div>
                  <label class="text-xs text-slate-300/80">Additional Notes</label>
                  <textarea name="note" rows="3" class="${inputBase('resize-none')}" placeholder="Instructions for the candidate..."></textarea>
                </div>
                <div class="flex justify-end gap-2 pt-1">
                  <button type="button" onclick="closeModal()" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel</button>
                  <button type="submit" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Schedule Interview</button>
                </div>
              </form>
            `,
            onMount: () => {
              const form = $('#scheduleForm');
              form.onsubmit = (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                const interviewDate = String(fd.get('interviewDate')||'').trim();
                const interviewTime = String(fd.get('interviewTime')||'').trim();
                
                if (!interviewDate || !interviewTime) {
                  toast('Error', 'Please select both date and time.', 'danger');
                  return;
                }
                
                const dateTimeStr = `${interviewDate}T${interviewTime}:00`;
                const timeISO = new Date(dateTimeStr).toISOString();
                
                const meetLink = String(fd.get('meetLink')||'').trim();
                const note = String(fd.get('note')||'').trim();

                app.interview = { time: timeISO, meetLink, note };
                app.status = STATUS.INTERVIEW;
                saveState(STATE);

                pushNotification(stu.id, {
                  title: 'Interview Scheduled!',
                  message: `${job.companyName} has scheduled an interview for ${fmtDateTime(timeISO)}.${note ? ' Note: ' + note : ''}`,
                  link: '#/dashboard',
                  type: 'success'
                });

                toast('Interview Scheduled', 'The candidate has been notified.', 'success');
                closeModal();
                location.hash = `#/employer/manage/${jobId}`;
                render();
              };
            }
          });
        });
      });
    }
  }
}

/***********************
 * Real-time updates (poll localStorage)
 ***********************/
function startPolling() {
  setInterval(() => {
    const s = loadState();
    const sig = stateSig(s);
    if (sig !== lastSig) {
      const user = getUser(s.currentUserId);
      if (user) {
        const newNotifs = s.notifications
          .filter(n => n.userId === user.id)
          .filter(n => !lastNotifsSeen.has(n.id));

        for (const n of newNotifs.slice(0, 2)) {
          toast(n.title, n.message, n.type === 'success' ? 'success' : n.type === 'warn' ? 'warn' : n.type === 'danger' ? 'danger' : 'info');
        }
      }

      STATE = s;
      lastSig = sig;
      lastNotifsSeen = new Set(s.notifications.map(n => n.id));
      render();
    }
  }, 1500);
}

// Initialize
window.addEventListener('hashchange', render);
window.addEventListener('load', () => {
  render();
  startPolling();
});
