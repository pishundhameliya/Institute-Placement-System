(function () {
  function wireJobsInteractions() {
    const jobList = $('#jobList');

    const getJobs = () => {
      const user = currentUser();
      let jobs = [...CACHE.jobs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (user && user.role === 'student') {
        const studentInst = (user.profile?.institute || '').toLowerCase();
        jobs = jobs.filter(j => {
          const ta = j.targetAudience || 'all';
          const institutes = (j.targetedInstitutes || []).map(i => i.toLowerCase());
          const allowIndep = j.allowIndependentStudents === true;

          // Legacy "all" = everyone
          if (ta === 'all') return true;

          // New "custom" = specific institutes + independent
          if (ta === 'custom') {
            if (studentInst && institutes.includes(studentInst)) {
              const approved = (j.approvedInstitutes || []).map(i => i.toLowerCase());
              return approved.includes(studentInst);
            }
            if (!studentInst && allowIndep) return true;
            return false;
          }

          // Legacy "non-institute" (or new independent-only)
          if (ta === 'non-institute') return !studentInst;

          // Legacy/new "institute" = only those institutes
          if (ta === 'institute') {
            if (!studentInst) return allowIndep; // if independent student check is also on
            if (institutes.includes(studentInst)) {
              const approved = (j.approvedInstitutes || []).map(i => i.toLowerCase());
              return approved.includes(studentInst);
            }
            return false;
          }

          return true;
        });
      }
      return jobs;
    };

    const renderJobCard = (job) => {
      const user = currentUser();
      const userId = CACHE.currentUser?.uid;
      const app = user?.role === 'student' ? CACHE.applications.find(a => a.studentId === userId && a.jobId === job.id) : null;
      const eligible = user?.role === 'student' ? (Number(user.profile?.cgpa || 0) >= Number(job.minCgpa || 0)) : true;

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
                ${(job.targetAudience === 'institute' || job.targetAudience === 'custom') && (job.targetedInstitutes||[]).length > 0 ? `<span class="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-200">🏛 Institute-Specific</span>` : ''}
                ${(job.targetAudience === 'non-institute' || job.targetAudience === 'custom') ? `<span class="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">👤 Independent Students</span>` : ''}
              </div>
              <div class="mt-1 text-sm text-slate-200/85">${escapeHtml(job.companyName)} • ${escapeHtml(job.location)}</div>
              ${(job.targetAudience === 'institute' || job.targetAudience === 'custom') && (job.targetedInstitutes || []).length > 0 ? `
                <div class="mt-2 flex flex-wrap gap-1 items-center">
                  <span class="text-[11px] text-slate-400">Targeting:</span>
                  ${(job.targetedInstitutes || []).slice(0, 3).map(inst => `<span class="rounded-full border border-indigo-400/20 bg-indigo-500/8 px-2 py-0.5 text-[11px] text-indigo-200">${escapeHtml(inst)}</span>`).join('')}
                  ${(job.targetedInstitutes || []).length > 3 ? `<span class="text-[11px] text-slate-400">+${(job.targetedInstitutes||[]).length - 3} more</span>` : ''}
                </div>
              ` : ''}
              <div class="mt-2 flex flex-wrap gap-2">
                ${(job.skills || []).slice(0, 8).map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('')}
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
              ${currentUser()?.role === 'employer' && job.employerId === CACHE.currentUser?.uid ? `<a href="#/employer/manage/${job.id}" class="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">Manage</a>` : ''}
            </div>
          </div>
        </div>
      `;
    };

    const wireJobCardHandlers = () => {
      $$('[data-apply]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const jobId = btn.getAttribute('data-apply');
          const user = currentUser();
          const userId = CACHE.currentUser?.uid;
          if (!user || user.role !== 'student' || !userId) return;
          const job = getJob(jobId);
          if (!job) return;
          if (CACHE.applications.find(a => a.studentId === userId && a.jobId === jobId)) return;

          const appData = { jobId, studentId: userId, status: STATUS.APPLIED, interview: null };
          const appId = await applyForJobFirestore(appData);
          if (appId) {
            await pushNotification(job.employerId, {
              title: 'New Application Received',
              message: `${user.profile?.fullName || 'A student'} applied for ${job.title}.`,
              link: `#/employer/manage/${job.id}`
            });
            toast('Application Submitted', `You have successfully applied for ${job.title}.`, 'success');
            render();
          }
        });
      });
    };

    const applyFilters = () => {
      const jobs = getJobs();
      const q = String($('#jobSearch')?.value || '').trim().toLowerCase();
      // Normalize the selected type value — trim whitespace just in case
      const type = String($('#jobType')?.value || '').trim();
      const cgpaText = String($('#minCgpa')?.value || '').trim();
      const minCgpa = cgpaText === '' ? NaN : toNumber(cgpaText, NaN);
      const loc = String($('#jobLocation')?.value || '').trim().toLowerCase();

      let filtered = jobs;

      if (q) {
        filtered = filtered.filter(j =>
          `${j.title} ${j.companyName} ${j.location} ${j.type} ${(j.skills || []).join(' ')}`
            .toLowerCase().includes(q)
        );
      }

      // Fix: compare trimmed lowercase for robustness
      if (type) {
        filtered = filtered.filter(j => String(j.type || '').trim() === type);
      }

      if (Number.isFinite(minCgpa)) {
        filtered = filtered.filter(j => Number(j.minCgpa || 0) >= minCgpa);
      }

      if (loc) {
        filtered = filtered.filter(j => String(j.location || '').toLowerCase().includes(loc));
      }

      let activeCount = 0;
      if (q) activeCount++;
      if (type) activeCount++;
      if (Number.isFinite(minCgpa)) activeCount++;
      if (loc) activeCount++;

      const filterInfo = activeCount > 0
        ? `<span class="text-indigo-300">${filtered.length}</span> jobs found with <span class="text-indigo-300">${activeCount} filter${activeCount > 1 ? 's' : ''}</span> applied`
        : `${jobs.length} jobs found`;

      const jobCountEl = $('#jobCount');
      if (jobCountEl) jobCountEl.innerHTML = filterInfo;

      if (jobList) {
        jobList.innerHTML = filtered.length
          ? filtered.map(renderJobCard).join('')
          : `<div class="text-center py-8 text-sm text-slate-300/85">No jobs match your criteria.</div>`;
        wireJobCardHandlers();
      }
    };

    // Initial render
    const jobs = getJobs();
    if (jobs.length > 0) {
      jobList.innerHTML = jobs.map(renderJobCard).join('');
      wireJobCardHandlers();
    }

    const af = $('#applyFilters');
    if (af) af.onclick = applyFilters;

    const cf = $('#clearFilters');
    if (cf) cf.onclick = () => {
      if ($('#jobSearch')) $('#jobSearch').value = '';
      if ($('#jobType')) $('#jobType').value = '';
      if ($('#minCgpa')) $('#minCgpa').value = '';
      if ($('#jobLocation')) $('#jobLocation').value = '';
      const jc = $('#jobCount');
      const allJobs = getJobs();
      if (jc) jc.innerHTML = `${allJobs.length} jobs found`;
      jobList.innerHTML = allJobs.length
        ? allJobs.map(renderJobCard).join('')
        : `<div class="text-center py-8 text-sm text-slate-300/85">No jobs posted yet.</div>`;
      wireJobCardHandlers();
    };

    // Wire filters: both input and change events, covering text inputs and selects
    ['#jobSearch', '#jobType', '#minCgpa', '#jobLocation'].forEach(sel => {
      const el = $(sel);
      if (el) {
        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
      }
    });
  }

  registerJobsWiring(wireJobsInteractions);
})();
