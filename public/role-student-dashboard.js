(function () {
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

  function renderStudentDashboard(user) {
    const userId = CACHE.currentUser?.uid;
    const apps = CACHE.applications.filter(a => a.studentId === userId).sort((a, b) => (b.appliedAt || 0) - (a.appliedAt || 0));
    const enriched = apps.map(a => ({ a, job: getJob(a.jobId) })).filter(x => x.job);
    const total = enriched.length;
    const interviewCount = enriched.filter(x => x.a.status === STATUS.INTERVIEW).length;
    const selectedCount = enriched.filter(x => x.a.status === STATUS.SELECTED).length;
    const rejectedCount = enriched.filter(x => x.a.status === STATUS.REJECTED).length;
    const upcoming = enriched
      .filter(x => x.a.interview?.time)
      .map(x => ({ ...x, t: new Date(x.a.interview.time).getTime() }))
      .filter(x => x.t > Date.now() - 1000 * 60 * 30)
      .sort((x, y) => x.t - y.t)
      .slice(0, 5);

    const kpiCard = (icon, label, value, hint) => `
      <div class="rounded-2xl border border-white/5 bg-white/5 p-5 hover-lift transition">
        <div class="flex items-center gap-2">
          <span class="text-xl">${icon}</span>
          <div class="text-[10px] uppercase tracking-widest font-bold text-slate-500">${escapeHtml(label)}</div>
        </div>
        <div class="mt-2 text-3xl font-bold text-white tracking-tight">${escapeHtml(String(value))}</div>
        <div class="mt-1 text-xs font-medium text-slate-400/80">${escapeHtml(hint || '')}</div>
      </div>
    `;

    const bar = (label, value, totalMax, colorClass) => {
      const pct = totalMax ? Math.round((value / totalMax) * 100) : 0;
      return `
        <div class="group">
          <div class="flex items-center justify-between text-xs font-medium mb-2">
            <span class="text-slate-400 group-hover:text-slate-200 transition-colors">${escapeHtml(label)}</span>
            <span class="text-white">${value}</span>
          </div>
          <div class="h-2 rounded-full bg-white/5 overflow-hidden">
            <div class="h-full ${colorClass} rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.1)]" style="width:${Math.min(100, Math.max(0, pct))}%"></div>
          </div>
        </div>
      `;
    };

    return `
      <div class="animate-fade-in">
        ${layoutTitle('Student Dashboard', 'Track your applications, interviews, and placement outcomes.')}
        <div class="grid gap-8 lg:grid-cols-12">
          <div class="lg:col-span-4">
            <div class="card rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur p-8">
              <div class="flex items-center justify-between">
                <div class="text-lg font-bold text-white tracking-tight">Your Statistics</div>
                <a href="#/jobs" class="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20 transition-all">Find Jobs</a>
              </div>
              <div class="mt-8 grid gap-4">
                ${kpiCard('📝', 'Applications', total, 'Total applied')}
                ${kpiCard('📅', 'Interviews', interviewCount, 'Scheduled')}
                ${kpiCard('🎉', 'Offers', selectedCount, 'Accepted')}
              </div>
              <div class="mt-6 rounded-[1.5rem] border border-white/5 bg-white/5 p-6">
                <div class="text-sm font-bold text-white tracking-tight mb-6">Pipeline Breakdown</div>
                <div class="space-y-5">
                  ${bar('Applied', enriched.filter(x => x.a.status === STATUS.APPLIED).length, Math.max(1, total), 'bg-indigo-500')}
                  ${bar('Shortlisted', enriched.filter(x => x.a.status === STATUS.SHORTLISTED).length, Math.max(1, total), 'bg-amber-500')}
                  ${bar('Interview', interviewCount, Math.max(1, total), 'bg-cyan-500')}
                  ${bar('Rejected', rejectedCount, Math.max(1, total), 'bg-rose-500')}
                  ${bar('Selected', selectedCount, Math.max(1, total), 'bg-emerald-500')}
                </div>
              </div>
            </div>
          </div>
          <div class="lg:col-span-8">
            <div class="card rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur overflow-hidden">
              <div class="px-8 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div>
                  <div class="text-lg font-bold text-white tracking-tight">My Applications</div>
                  <div class="text-xs font-medium text-slate-500">Recent updates first</div>
                </div>
                <div class="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-slate-400">${total} Applications</div>
              </div>
              <div class="p-8 grid gap-4">
                ${enriched.length ? enriched.map(({ a, job }) => renderStudentApplicationCard(a, job)).join('') : `
                  <div class="text-center py-16">
                    <div class="text-5xl mb-6 opacity-20">📋</div>
                    <div class="text-base font-bold text-white tracking-tight">No applications yet</div>
                    <p class="mt-2 text-sm text-slate-500">Start your journey by applying to your dream jobs.</p>
                    <a href="#/jobs" class="mt-8 inline-flex rounded-2xl bg-indigo-500 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-400 shadow-xl shadow-indigo-500/20 transition-all hover-lift">Browse Jobs</a>
                  </div>
                `}
              </div>
            </div>
          <div class="mt-6 card rounded-3xl border border-white/10 bg-white/5 p-6">
            <div class="text-sm font-semibold">Upcoming Interviews</div>
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

  registerRoleDashboard('student', renderStudentDashboard);
})();
