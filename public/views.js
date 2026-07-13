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
            <div class="grid gap-4">
              <div>
                <label class="text-xs text-slate-300/80 mb-2 block">🏛 Target Institutes <span class="text-slate-400">(optional — leave empty to target all institutes)</span></label>
                <div class="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <!-- Selected institute chips -->
                  <div id="selectedInstituteChips" class="flex flex-wrap gap-2 mb-2 empty:hidden"></div>
                  <!-- Search + dropdown -->
                  <div class="relative">
                    <input id="instituteSearchInput" class="${inputBase()}" placeholder="🔍 Search and add an institute..." autocomplete="off" />
                    <div id="instituteDropdown" class="hidden absolute z-20 left-0 right-0 mt-1 rounded-xl border border-white/15 bg-slate-900/95 backdrop-blur shadow-xl max-h-52 overflow-y-auto scrollbar-thin">
                      ${GUJARAT_INSTITUTES.map(inst => `
                        <button type="button" data-inst="${escapeHtml(inst)}" class="inst-option w-full text-left px-3 py-2 text-xs hover:bg-indigo-500/20 transition border-b border-white/5 last:border-b-0">${escapeHtml(inst)}</button>
                      `).join('')}
                    </div>
                  </div>
                  <!-- Hidden inputs for selected institutes will be injected here -->
                  <div id="instituteHiddenInputs"></div>
                  <div class="mt-2 text-[11px] text-indigo-200/70" id="selectedInstituteCount">No institutes selected</div>
                </div>
              </div>
              <!-- Independent Student checkbox -->
              <label id="independentStudentLabel" class="flex items-center gap-3 cursor-pointer rounded-xl border border-white/10 bg-slate-950/30 px-4 py-3 hover:bg-indigo-500/5 transition-all" style="border-color:rgba(255,255,255,0.1)">
                <div style="position:relative;width:20px;height:20px;flex-shrink:0">
                  <input type="checkbox" id="allowIndependentStudents" name="allowIndependentStudents" value="1"
                    style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;margin:0;z-index:1"
                    onchange="(function(cb,box){box.style.background=cb.checked?'#6366f1':'rgba(255,255,255,0.05)';box.style.borderColor=cb.checked?'#6366f1':'rgba(255,255,255,0.2)';box.querySelector('svg').style.display=cb.checked?'block':'none';})(this,this.nextElementSibling)" />
                  <div id="indepCheckBox" style="width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;transition:all 0.15s;pointer-events:none">
                    <svg style="display:none;width:12px;height:12px;color:white" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
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
            <button data-delete-job="${job.id}" class="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15">Withdraw / Delete Job</button>
            <a href="#/dashboard" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Back</a>
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

function computeStats() {
  const studentUsers = CACHE.users.filter(u => u.role === 'student');
  const jobCount = CACHE.jobs.length;
  const appCount = CACHE.applications.length;
  const interviewCount = CACHE.applications.filter(a => a.status === STATUS.INTERVIEW).length;
  const placedCount = CACHE.applications.filter(a => a.status === STATUS.SELECTED).length;

  const byCompany = new Map();
  for (const job of CACHE.jobs) {
    const key = job.companyName || 'Unknown';
    if (!byCompany.has(key)) byCompany.set(key, { company: key, jobs: 0, applications: 0, interviews: 0, selected: 0 });
    byCompany.get(key).jobs += 1;
  }
  for (const app of CACHE.applications) {
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
