(function () {
  function renderEmployerDashboard(user) {
    const userId = CACHE.currentUser?.uid;
    const myJobs = CACHE.jobs.filter(j => j.employerId === userId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const myJobIds = new Set(myJobs.map(j => j.id));
    const apps = CACHE.applications.filter(a => myJobIds.has(a.jobId));
    const totalApplicants = apps.length;
    const interviews = apps.filter(a => a.status === STATUS.INTERVIEW).length;
    const selected = apps.filter(a => a.status === STATUS.SELECTED).length;

    const jobCard = (job) => {
      const cnt = applicationsForJob(job.id).length;
      const intv = applicationsForJob(job.id).filter(a => a.status === STATUS.INTERVIEW).length;
      return `
        <div class="rounded-2xl border border-white/5 bg-white/5 p-5 hover:bg-white/8 transition-all hover-lift">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-base font-bold text-white tracking-tight">${escapeHtml(job.title)}</div>
                ${(job.targetAudience === 'institute' || job.targetAudience === 'custom') && (job.targetedInstitutes||[]).length > 0 ? `<span class="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">🏛 Institute</span>` : ''}
                ${(job.targetAudience === 'non-institute' || job.targetAudience === 'custom') ? `<span class="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">👤 Independent</span>` : ''}
              </div>
              <div class="mt-1.5 text-xs font-medium text-slate-400">${escapeHtml(job.location)} • ${escapeHtml(job.type)} • Min CGPA ${escapeHtml(String(job.minCgpa ?? '—'))}</div>
              <div class="mt-4 flex flex-wrap gap-4">
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-500">📝</span>
                  <span class="text-xs font-bold text-slate-200">${cnt} <span class="text-slate-500 font-medium">Applicants</span></span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-500">📅</span>
                  <span class="text-xs font-bold text-slate-200">${intv} <span class="text-slate-500 font-medium">Interviews</span></span>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <a href="#/employer/manage/${job.id}" class="rounded-xl bg-indigo-500 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 transition-all">Manage</a>
              <button data-withdraw-job="${job.id}" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all">Withdraw</button>
            </div>
          </div>
        </div>
      `;
    };

    return `
      <div class="animate-fade-in">
        ${layoutTitle('Recruiter Dashboard', 'Manage job postings, review applications, and coordinate interviews.')}
        <div class="grid gap-8 lg:grid-cols-12">
          <div class="lg:col-span-4">
            <div class="card rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur p-8">
              <div class="flex items-center justify-between mb-8">
                <div class="text-lg font-bold text-white tracking-tight">Hiring Pipeline</div>
                <a href="#/employer/post" class="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/25">+ New Job</a>
              </div>
              <div class="grid gap-4">
                ${readOnlyField('Active Postings', String(myJobs.length))}
                ${readOnlyField('Total Candidates', String(totalApplicants))}
                ${readOnlyField('Interviews', String(interviews))}
                ${readOnlyField('Hired', String(selected))}
              </div>
              <div class="mt-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
                <div class="text-sm font-bold text-indigo-200 tracking-tight">Need help?</div>
                <p class="mt-2 text-xs text-indigo-300/70 leading-relaxed">Boost your job visibility by targeting specific institutes or opening it to independent students.</p>
              </div>
            </div>
          </div>
          <div class="lg:col-span-8">
            <div class="card rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur overflow-hidden">
              <div class="px-8 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div>
                  <div class="text-lg font-bold text-white tracking-tight">Active Postings</div>
                  <div class="text-xs font-medium text-slate-500">Manage your published opportunities</div>
                </div>
                <div class="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-slate-400">${myJobs.length} Jobs</div>
              </div>
              <div class="p-8 grid gap-4">
                ${myJobs.length ? myJobs.map(jobCard).join('') : `
                  <div class="text-center py-20">
                    <div class="text-5xl mb-6 opacity-20">💼</div>
                    <div class="text-base font-bold text-white tracking-tight">No jobs posted yet</div>
                    <p class="mt-2 text-sm text-slate-500">Get started by creating your first job opportunity.</p>
                    <a href="#/employer/post" class="mt-8 inline-flex rounded-2xl bg-indigo-500 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-400 shadow-xl shadow-indigo-500/20 transition-all hover-lift">Create First Job</a>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  registerRoleDashboard('employer', renderEmployerDashboard);
})();
