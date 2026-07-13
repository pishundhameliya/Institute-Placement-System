(function () {
  function renderFacultyDashboard(user) {
    const facultyInst = user.faculty?.institute || '';
    const facultyInstLower = facultyInst.toLowerCase();

    const stats = computeStats(facultyInst);
    const placementRate = stats.studentCount ? Math.round((stats.placedCount / stats.studentCount) * 100) : 0;
    const topCompanies = stats.companyStats.slice(0, 5);

    // Only approved jobs targeted to this institute
    const openJobs = [...CACHE.jobs].filter(j => {
      const targets = (j.targetedInstitutes || []).map(i => i.toLowerCase());
      const approved = (j.approvedInstitutes || []).map(i => i.toLowerCase());
      return targets.includes(facultyInstLower) && approved.includes(facultyInstLower);
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Pending jobs targeted to this institute
    const pendingApprovalJobs = [...CACHE.jobs].filter(j => {
      const targets = (j.targetedInstitutes || []).map(i => i.toLowerCase());
      const approved = (j.approvedInstitutes || []).map(i => i.toLowerCase());
      const rejected = (j.rejectedInstitutes || []).map(i => i.toLowerCase());
      return targets.includes(facultyInstLower) && !approved.includes(facultyInstLower) && !rejected.includes(facultyInstLower);
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const jobRow = (job) => {
      const appCount = CACHE.applications.filter(a => a.jobId === job.id).length;
      const selectedCount = CACHE.applications.filter(a => a.jobId === job.id && a.status === STATUS.SELECTED).length;
      return `
        <div class="rounded-2xl border border-white/5 bg-white/5 p-5 hover:bg-white/8 transition-all hover-lift">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-base font-bold text-white tracking-tight">${escapeHtml(job.title)}</div>
                <span class="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(job.type)}</span>
              </div>
              <div class="mt-1.5 text-xs font-medium text-slate-400">${escapeHtml(job.companyName)} • ${escapeHtml(job.location)}</div>
              <div class="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-4">
                ${readOnlyField('Min CGPA', String(job.minCgpa ?? '—'))}
                ${readOnlyField('Applicants', String(appCount))}
                ${readOnlyField('Selected', String(selectedCount))}
                ${readOnlyField('Posted', fmtDateTime(job.createdAt))}
              </div>
            </div>
          </div>
        </div>
      `;
    };

    return `
      <div class="animate-fade-in">
        ${layoutTitle('Faculty / Admin Dashboard', 'Monitor placement statistics and institutional performance metrics.')}
        <div class="grid gap-8 lg:grid-cols-12">
          <div class="lg:col-span-4">
            <div class="card rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur p-8">
              <div class="text-lg font-bold text-white tracking-tight">Placement Metrics</div>
              <div class="mt-6 grid gap-4">
                ${readOnlyField('Registered Students', String(stats.studentCount))}
                ${readOnlyField('Active Job Postings', String(stats.jobCount))}
                ${readOnlyField('Total Applications', String(stats.appCount))}
                ${readOnlyField('Interviews Scheduled', String(stats.interviewCount))}
                ${readOnlyField('Students Placed', String(stats.placedCount))}
                <div class="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-4 mt-2">
                  <div class="text-[10px] uppercase tracking-widest font-bold text-indigo-300/70">Placement Rate</div>
                  <div class="mt-2 flex items-end gap-2">
                    <div class="text-3xl font-bold text-white">${placementRate}%</div>
                    <div class="mb-1 h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div class="h-full bg-indigo-500 rounded-full" style="width: ${placementRate}%"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="lg:col-span-8">
            <div class="card rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur overflow-hidden">
              <div class="px-8 py-5 border-b border-white/10 bg-white/5">
                <div class="text-lg font-bold text-white tracking-tight">Company-wise Performance</div>
              </div>
              <div class="p-8 grid gap-4">
                ${topCompanies.length ? topCompanies.map(c => `
                  <div class="rounded-2xl border border-white/5 bg-white/5 p-5 hover-lift transition">
                    <div class="text-base font-bold text-white">${escapeHtml(c.company)}</div>
                    <div class="mt-4 grid gap-3 grid-cols-3">
                      ${readOnlyField('Applications', String(c.applications))}
                      ${readOnlyField('Interviews', String(c.interviews))}
                      ${readOnlyField('Selected', String(c.selected))}
                    </div>
                  </div>
                `).join('') : `<div class="text-center py-12 text-sm text-slate-400">No data available yet.</div>`}
              </div>
            </div>

          <div class="mt-6 card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
            <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold">Students in My Institute</div>
                <div class="text-xs text-slate-300/80">Registered students from ${escapeHtml(user.faculty?.institute || 'your institute')}</div>
              </div>
            </div>
            <div class="p-5 grid gap-4 max-h-96 overflow-y-auto scrollbar-thin">
              ${CACHE.users.filter(u => u.role === 'student' && u.profile?.institute && u.profile.institute.toLowerCase() === (user.faculty?.institute || '').toLowerCase()).map(s => {
      const p = s.profile;
      return `
                  <div class="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      ${photoOrInitials(p.photo, p.fullName)}
                      <div>
                        <div class="text-sm font-semibold">${escapeHtml(p.fullName)}</div>
                        <div class="text-xs text-slate-300/80">${escapeHtml(p.branch || '—')} • CGPA: ${escapeHtml(String(p.cgpa ?? '—'))}</div>
                      </div>
                    </div>
                  </div>
                `;
    }).join('') || `<div class="text-center py-8 text-sm text-slate-300/85">No students found from your institute.</div>`}
            </div>
          </div>

          <div class="mt-6 card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
            <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold">Job Approval Requests</div>
                <div class="text-xs text-slate-300/80">Pending permission requests from companies to post jobs at ${escapeHtml(user.faculty?.institute || 'your institute')}</div>
              </div>
              <span class="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300">${pendingApprovalJobs.length} Pending</span>
            </div>
            <div class="p-5 grid gap-4 max-h-96 overflow-y-auto scrollbar-thin">
              ${pendingApprovalJobs.length ? pendingApprovalJobs.map(job => `
                <div class="rounded-2xl border border-white/5 bg-white/5 p-5 hover:bg-white/8 transition-all hover-lift">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <div class="text-base font-bold text-white tracking-tight">${escapeHtml(job.title)}</div>
                        <span class="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(job.type)}</span>
                      </div>
                      <div class="mt-1.5 text-xs font-medium text-slate-400">${escapeHtml(job.companyName)} • ${escapeHtml(job.location)}</div>
                      <div class="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3">
                        ${readOnlyField('Min CGPA', String(job.minCgpa ?? '—'))}
                        ${readOnlyField('Salary', String(job.salary || '—'))}
                        ${readOnlyField('Posted', fmtDateTime(job.createdAt))}
                      </div>
                      <div class="mt-3 text-xs text-slate-300/85 line-clamp-2">${escapeHtml(job.description || '')}</div>
                    </div>
                    <div class="flex flex-wrap sm:flex-col gap-2">
                      <button data-approve-job="${job.id}" class="rounded-xl bg-indigo-500 hover:bg-indigo-400 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all">Approve</button>
                      <button data-reject-job="${job.id}" class="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all">Reject</button>
                    </div>
                  </div>
                </div>
              `).join('') : `
                <div class="text-center py-8">
                  <div class="text-3xl mb-2">🎉</div>
                  <div class="text-sm font-semibold text-slate-200">No pending requests</div>
                  <div class="mt-1 text-xs text-slate-400">All company job postings for your institute have been reviewed.</div>
                </div>
              `}
            </div>
          </div>

          <div class="mt-6 card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur">
            <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold">Open Job Positions</div>
                <div class="text-xs text-slate-300/80">Approved active job postings for your institute</div>
              </div>
              <div class="text-xs text-slate-300/80">${openJobs.length} total</div>
            </div>
            <div class="p-5 grid gap-4">
              ${openJobs.length ? openJobs.map(jobRow).join('') : `
                <div class="text-center py-8">
                  <div class="text-4xl mb-3">📋</div>
                  <div class="text-sm font-semibold">No job postings yet</div>
                  <div class="mt-1 text-xs text-slate-300/80">Company members can post new job openings.</div>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  registerRoleDashboard('faculty', renderFacultyDashboard);
})();
