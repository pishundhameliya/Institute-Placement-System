(function () {
  function wireEmployerHandlers({ r, user, userId }) {
    if (!user || user.role !== 'employer' || !userId) return;

    // ── Profile page ──────────────────────────────────────────────
    if (r.path === '/profile') {
      const form = $('#employerProfileForm');
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const c = {
            name: String(fd.get('name') || '').trim(),
            website: String(fd.get('website') || '').trim(),
            location: String(fd.get('location') || '').trim(),
            about: String(fd.get('about') || '').trim(),
            phone: String(fd.get('phone') || '').trim(),
            logo: user.company?.logo || null
          };
          await saveUserProfile(userId, { company: c });

          const batch = db.batch();
          CACHE.jobs.filter(j => j.employerId === userId).forEach(j => {
            batch.update(db.collection('jobs').doc(j.id), { companyName: c.name });
            j.companyName = c.name;
          });
          await batch.commit();

          toast('Profile Updated', 'Company profile saved.', 'success');
          render();
        };
      }
    }

    // ── Post Job page ─────────────────────────────────────────────
    if (r.path === '/employer' && r.parts[1] === 'post') {
      const form = $('#postJobForm');
      if (form) {

        // ── Institute chip selector ──────────────────────────────
        const searchInput   = $('#instituteSearchInput');
        const dropdown      = $('#instituteDropdown');
        const chipsWrap     = $('#selectedInstituteChips');
        const hiddenInputs  = $('#instituteHiddenInputs');
        const cntEl         = $('#selectedInstituteCount');

        let selectedInstitutes = []; // live array

        const updateCount = () => {
          if (cntEl) cntEl.textContent = selectedInstitutes.length
            ? `${selectedInstitutes.length} institute${selectedInstitutes.length > 1 ? 's' : ''} selected`
            : 'No institutes selected';
        };

        const syncHidden = () => {
          if (!hiddenInputs) return;
          hiddenInputs.innerHTML = selectedInstitutes.map(inst =>
            `<input type="hidden" name="targetedInstitutes" value="${inst.replace(/"/g, '&quot;')}" />`
          ).join('');
        };

        const addChip = (inst) => {
          if (selectedInstitutes.includes(inst)) return;
          selectedInstitutes.push(inst);

          const chip = document.createElement('span');
          chip.className = 'inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs text-indigo-100 font-medium';
          chip.style.cssText = 'background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);padding:4px 10px;border-radius:999px;font-size:12px;color:#c7d2fe;display:inline-flex;align-items:center;gap:6px';
          chip.innerHTML = `${inst.replace(/</g,'&lt;').replace(/>/g,'&gt;')} <button type="button" style="color:#a5b4fc;background:none;border:none;cursor:pointer;font-size:13px;line-height:1;padding:0" data-remove-inst>✕</button>`;
          chip.querySelector('[data-remove-inst]').addEventListener('click', () => {
            selectedInstitutes = selectedInstitutes.filter(i => i !== inst);
            chip.remove();
            syncHidden();
            updateCount();
            // Re-enable the option in the dropdown
            dropdown.querySelectorAll('.inst-option').forEach(btn => {
              if (btn.getAttribute('data-inst') === inst) {
                btn.setAttribute('data-selected', 'false');
                btn.style.display = 'block';
              }
            });
          });
          if (chipsWrap) chipsWrap.appendChild(chip);

          syncHidden();
          updateCount();

          // Mark the option as selected so it's hidden and skipped in filter
          dropdown.querySelectorAll('.inst-option').forEach(btn => {
            if (btn.getAttribute('data-inst') === inst) {
              btn.setAttribute('data-selected', 'true');
              btn.style.display = 'none';
            }
          });
        };

                // Search/filter dropdown options — only wire ONCE (guard against re-render duplicates)
        if (searchInput && dropdown && !dropdown.getAttribute('data-wired')) {
          dropdown.setAttribute('data-wired', '1');

          searchInput.addEventListener('focus', () => {
            // Show all unselected options when re-focusing
            dropdown.querySelectorAll('.inst-option').forEach(btn => {
              if (btn.getAttribute('data-selected') !== 'true') btn.style.display = 'block';
            });
            dropdown.style.display = 'block';
          });

          searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            dropdown.style.display = 'block';
            dropdown.querySelectorAll('.inst-option').forEach(btn => {
              if (btn.getAttribute('data-selected') === 'true') return; // skip already selected
              const matches = btn.textContent.toLowerCase().includes(q);
              btn.style.display = matches ? 'block' : 'none';
            });
          });

          // Prevent blur from firing when user clicks inside the dropdown
          dropdown.addEventListener('mousedown', (e) => e.preventDefault());

          // Close dropdown when search input loses focus
          searchInput.addEventListener('blur', () => {
            dropdown.style.display = 'none';
            searchInput.value = '';
            dropdown.querySelectorAll('.inst-option').forEach(btn => {
              btn.style.display = btn.getAttribute('data-selected') === 'true' ? 'none' : 'block';
            });
          });

          // Click on dropdown option to add chip
          dropdown.addEventListener('click', (e) => {
            const btn = e.target.closest('.inst-option');
            if (!btn) return;
            const inst = btn.getAttribute('data-inst');
            if (inst) {
              addChip(inst);
              searchInput.value = '';
              dropdown.style.display = 'none';
              // Focus back so user can add more immediately
              searchInput.focus();
            }
          });
        }

        // ── Form submission ──────────────────────────────────────
        form.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const targetedInstitutes = selectedInstitutes.slice();
          const allowIndependent = !!fd.get('allowIndependentStudents');

          // Derive targetAudience for legacy compatibility
          let targetAudience = 'all';
          if (targetedInstitutes.length > 0 && allowIndependent) targetAudience = 'custom';
          else if (targetedInstitutes.length > 0)                  targetAudience = 'institute';
          else if (allowIndependent)                                targetAudience = 'non-institute';

          const job = {
            employerId: userId,
            companyName: user.company?.name || 'Company',
            title: String(fd.get('title') || '').trim(),
            location: String(fd.get('location') || '').trim(),
            type: String(fd.get('type') || 'Full-time'),
            salary: String(fd.get('salary') || '').trim(),
            minCgpa: toNumber(fd.get('minCgpa'), 0),
            skills: String(fd.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 20),
            description: String(fd.get('description') || '').trim(),
            targetAudience,
            targetedInstitutes,
            allowIndependentStudents: allowIndependent
          };
          const jobId = await postJobToFirestore(job);
          if (jobId) {
            toast('Job Published', 'Your job posting is now live.', 'success');
            location.hash = '#/dashboard';
            render();
          }
        };
      }
    }

    // ── Manage Applicants page ────────────────────────────────────
    if (r.path === '/employer' && r.parts[1] === 'manage' && r.parts[2]) {

      // Status filter dropdown
      const statusFilter = $('#statusFilter');
      if (statusFilter) {
        statusFilter.onchange = () => {
          const val = statusFilter.value;
          $$('[data-app-card]').forEach(card => {
            card.style.display = (val === 'all' || card.getAttribute('data-app-status') === val) ? '' : 'none';
          });
        };
      }

      // Status change selects
      $$('[data-status]').forEach(sel => {
        sel.addEventListener('change', async () => {
          const appId = sel.getAttribute('data-status');
          await updateApplicationFirestore(appId, { status: sel.value });
          const app = CACHE.applications.find(a => a.id === appId);
          const student = app ? getUser(app.studentId) : null;
          const job = getJob(app?.jobId);
          if (student && job) {
            await pushNotification(student.id, {
              title: 'Application Status Updated',
              message: `Your application for ${job.title} has been updated to: ${sel.value}.`,
              link: '#/dashboard'
            });
          }
          toast('Status Updated', 'Application status saved.', 'success');
          render();
        });
      });

      // Edit Job button
      const editJobBtn = $('#editJobBtn');
      if (editJobBtn) {
        editJobBtn.onclick = () => {
          const jobId = r.parts[2];
          const job = getJob(jobId);
          if (!job) return;

          openModal({
            title: 'Edit Job Posting',
            subtitle: `Update details for ${job.title}`,
            bodyHTML: `
              <form id="editJobForm" class="grid gap-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="text-xs text-slate-300/80">Job Title *</label>
                    <input name="title" class="${inputBase()}" value="${escapeHtml(job.title)}" required />
                  </div>
                  <div>
                    <label class="text-xs text-slate-300/80">Employment Type *</label>
                    <select name="type" class="${selectBase()}" required>
                      <option ${job.type === 'Full-time' ? 'selected' : ''}>Full-time</option>
                      <option ${job.type === 'Internship' ? 'selected' : ''}>Internship</option>
                    </select>
                  </div>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="text-xs text-slate-300/80">Location *</label>
                    <input name="location" class="${inputBase()}" value="${escapeHtml(job.location)}" required />
                  </div>
                  <div>
                    <label class="text-xs text-slate-300/80">Salary/Stipend</label>
                    <input name="salary" class="${inputBase()}" value="${escapeHtml(job.salary || '')}" />
                  </div>
                </div>

                <!-- Institute Targeting -->
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <label class="text-xs font-semibold text-slate-300/80 block mb-3">🏛 Target Institutes (optional)</label>
                  <div id="editSelectedChips" class="flex flex-wrap gap-2 mb-3"></div>
                  <div class="relative">
                    <input id="editInstSearch" type="text" class="${inputBase()}" placeholder="Search and add an institute..." autocomplete="off" />
                    <div id="editInstDropdown" class="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl p-1" style="display:none">
                      ${(typeof GUJARAT_INSTITUTES !== 'undefined' ? GUJARAT_INSTITUTES : []).map(inst => `
                        <button type="button" class="edit-inst-option w-full text-left px-3 py-2 text-xs rounded-lg transition-colors" data-inst="${inst.replace(/"/g, '&quot;')}">${escapeHtml(inst)}</button>
                      `).join('')}
                    </div>
                  </div>
                  <div id="editInstCount" class="mt-2 text-[10px] text-slate-400">No institutes selected</div>
                  
                  <div class="mt-4 pt-4 border-t border-white/10">
                    <label class="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" name="allowIndependentStudents" class="hidden peer" ${job.allowIndependentStudents ? 'checked' : ''} />
                      <div class="w-5 h-5 rounded border border-white/20 bg-white/5 peer-checked:bg-indigo-500 peer-checked:border-indigo-400 flex items-center justify-center transition-all">
                        <svg class="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <span class="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">Include Independent Students</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label class="text-xs text-slate-300/80">Minimum CGPA Required</label>
                  <input name="minCgpa" type="number" step="0.1" min="0" max="10" class="${inputBase()}" value="${job.minCgpa ?? '7.0'}" />
                </div>
                <div>
                  <label class="text-xs text-slate-300/80">Required Skills (comma-separated)</label>
                  <input name="skills" class="${inputBase()}" value="${escapeHtml((job.skills || []).join(', '))}" />
                </div>
                <div>
                  <label class="text-xs text-slate-300/80">Job Description *</label>
                  <textarea name="description" rows="5" class="${inputBase('resize-none')}" required>${escapeHtml(job.description)}</textarea>
                </div>
                <div class="flex justify-end gap-2">
                  <button type="button" onclick="closeModal()" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel</button>
                  <button type="submit" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Save Changes</button>
                </div>
              </form>
            `,
            onMount: () => {
              const form = $('#editJobForm');
              const searchInput = $('#editInstSearch');
              const dropdown = $('#editInstDropdown');
              const chipsWrap = $('#editSelectedChips');
              const countEl = $('#editInstCount');
              
              let selected = [...(job.targetedInstitutes || [])];

              const updateDisplay = () => {
                countEl.textContent = selected.length ? `${selected.length} institute${selected.length > 1 ? 's' : ''} selected` : 'No institutes selected';
                
                // Update chips
                chipsWrap.innerHTML = '';
                selected.forEach(inst => {
                  const chip = document.createElement('span');
                  chip.style.cssText = 'background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);padding:4px 10px;border-radius:999px;font-size:12px;color:#c7d2fe;display:inline-flex;align-items:center;gap:6px';
                  chip.innerHTML = `${escapeHtml(inst)} <button type="button" style="color:#a5b4fc;background:none;border:none;cursor:pointer;font-size:13px;line-height:1;padding:0" class="remove-chip">✕</button>`;
                  chip.querySelector('.remove-chip').onclick = () => {
                    selected = selected.filter(i => i !== inst);
                    updateDisplay();
                  };
                  chipsWrap.appendChild(chip);
                });

                // Update dropdown option visibility
                dropdown.querySelectorAll('.edit-inst-option').forEach(btn => {
                  const inst = btn.getAttribute('data-inst');
                  btn.style.display = selected.includes(inst) ? 'none' : 'block';
                });
              };

              // Initial display
              updateDisplay();

              // Dropdown logic
              if (searchInput && dropdown) {
                searchInput.onfocus = () => { dropdown.style.display = 'block'; };
                searchInput.oninput = () => {
                  const q = searchInput.value.toLowerCase();
                  dropdown.style.display = 'block';
                  dropdown.querySelectorAll('.edit-inst-option').forEach(btn => {
                    const inst = btn.getAttribute('data-inst');
                    if (selected.includes(inst)) {
                      btn.style.display = 'none';
                    } else {
                      btn.style.display = btn.textContent.toLowerCase().includes(q) ? 'block' : 'none';
                    }
                  });
                };

                dropdown.onclick = (e) => {
                  const btn = e.target.closest('.edit-inst-option');
                  if (btn) {
                    const inst = btn.getAttribute('data-inst');
                    if (!selected.includes(inst)) {
                      selected.push(inst);
                      searchInput.value = '';
                      dropdown.style.display = 'none';
                      updateDisplay();
                    }
                  }
                };

                // Close on blur
                searchInput.onblur = () => {
                  setTimeout(() => { dropdown.style.display = 'none'; }, 200);
                };
              }

              form.onsubmit = async (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                const targetedInstitutes = [...selected];
                const allowIndependent = !!fd.get('allowIndependentStudents');

                // Derive targetAudience for legacy compatibility
                let targetAudience = 'all';
                if (targetedInstitutes.length > 0 && allowIndependent) targetAudience = 'custom';
                else if (targetedInstitutes.length > 0)                  targetAudience = 'institute';
                else if (allowIndependent)                                targetAudience = 'non-institute';

                const updateData = {
                  title: String(fd.get('title')).trim(),
                  type: fd.get('type'),
                  location: String(fd.get('location')).trim(),
                  salary: String(fd.get('salary')).trim(),
                  minCgpa: toNumber(fd.get('minCgpa'), 0),
                  skills: String(fd.get('skills')).split(',').map(s => s.trim()).filter(Boolean).slice(0, 20),
                  description: String(fd.get('description')).trim(),
                  targetAudience,
                  targetedInstitutes,
                  allowIndependentStudents: allowIndependent
                };

                showLoading('Updating Job...');
                const success = await updateJobFirestore(jobId, updateData);
                hideLoading();
                if (success) {
                  toast('Success', 'Job details updated.', 'success');
                  closeModal();
                  render();
                }
              };
            }
          });
        };
      }

      // Delete/Withdraw Job button
      $$('[data-delete-job]').forEach(btn => {
        btn.onclick = async () => {
          const jId = btn.getAttribute('data-delete-job');
          const selectedApps = CACHE.applications.filter(a => a.jobId === jId && a.status === STATUS.SELECTED);
          let msg = 'Delete this job posting and all its applications? This cannot be undone.';
          if (selectedApps.length > 0) msg = `This job has ${selectedApps.length} selected candidate(s). Delete anyway?`;
          if (!confirm(msg)) return;

          showLoading('Deleting Job...');
          const success = await deleteJobFirestore(jId);
          hideLoading();
          if (success) {
            toast('Job Deleted', 'The posting has been removed.', 'success');
            location.hash = '#/dashboard';
            render();
          }
        };
      });

      // View candidate profile
      $$('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          const appId = btn.getAttribute('data-view');
          const app = CACHE.applications.find(a => a.id === appId);
          const stu = app ? getUser(app.studentId) : null;
          const p = stu?.profile;
          if (!p) return;
          openModal({
            title: 'Candidate Profile',
            subtitle: 'Review candidate details',
            bodyHTML: `
              <div class="flex items-center gap-4 mb-4">
                ${photoOrInitials(p.photo, p.fullName, 'h-16 w-16', 'text-lg')}
                <div>
                  <div class="text-lg font-semibold">${escapeHtml(p.fullName)}</div>
                  <div class="text-xs text-slate-300/80">${escapeHtml(p.branch || '—')} • ${escapeHtml(p.year || '—')}</div>
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                ${readOnlyField('CGPA', String(p.cgpa ?? '—'))}
                ${readOnlyField('Phone', p.phone || '—')}
              </div>
              <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="text-xs uppercase tracking-wide text-slate-300/70">Skills</div>
                <div class="mt-2 flex flex-wrap gap-2">
                  ${(p.skills || []).map(s => `<span class="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[11px]">${escapeHtml(s)}</span>`).join('') || '<span class="text-sm text-slate-300/85">No skills listed</span>'}
                </div>
              </div>
              <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="text-xs uppercase tracking-wide text-slate-300/70">About</div>
                <div class="mt-2 text-sm text-slate-200/85 whitespace-pre-wrap">${escapeHtml(p.about || 'No description.')}</div>
              </div>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-xs uppercase tracking-wide text-slate-300/70">Semester Results</div>
                  <div class="mt-2">
                    ${(p.semesterResultPhotos || []).length
                      ? (p.semesterResultPhotos || []).map((url, idx) => url ? `<a href="${url}" target="_blank" class="mr-3 inline-flex text-xs text-indigo-200 hover:underline">Sem ${idx + 1}</a>` : '').join('')
                      : (p.semesterResultPhoto ? `<a href="${p.semesterResultPhoto}" target="_blank" class="text-xs text-indigo-200 hover:underline">View Result Photo</a>` : `<span class="text-sm text-slate-300/85">Not uploaded</span>`)}
                  </div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-xs uppercase tracking-wide text-slate-300/70">Resume PDF</div>
                  <div class="mt-2">
                    ${p.resumePdf?.dataUrl ? `<a href="${p.resumePdf.dataUrl}" download="${escapeHtml(p.resumePdf.name || 'resume.pdf')}" class="text-xs text-emerald-200 hover:underline">Download Resume</a>` : `<span class="text-sm text-slate-300/85">Not uploaded</span>`}
                  </div>
                </div>
              </div>
            `
          });
        });
      });

      // Schedule interview
      $$('[data-schedule]').forEach(btn => {
        btn.addEventListener('click', () => {
          const appId = btn.getAttribute('data-schedule');
          const app = CACHE.applications.find(a => a.id === appId);
          const job = getJob(app?.jobId);
          const stu = app ? getUser(app.studentId) : null;
          if (!app || !job || !stu) return;

          openModal({
            title: 'Schedule Interview',
            subtitle: `${job.title} • ${stu.profile?.fullName || 'Candidate'}`,
            bodyHTML: `
              <div class="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100">
                Plan an interview with clear date/time and optional meeting link. The student will get an instant notification.
              </div>
              <form id="scheduleForm" class="mt-4 grid gap-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="rounded-xl border border-white/10 bg-white/5 p-3">
                    <label class="text-xs text-slate-300/80 block mb-2">Interview Date *</label>
                    <input name="interviewDate" type="date" class="${inputBase()}" required />
                  </div>
                  <div class="rounded-xl border border-white/10 bg-white/5 p-3">
                    <label class="text-xs text-slate-300/80 block mb-2">Interview Time *</label>
                    <input name="interviewTime" type="time" class="${inputBase()}" required />
                  </div>
                </div>
                <div class="rounded-xl border border-white/10 bg-white/5 p-3">
                  <label class="text-xs text-slate-300/80 block mb-2">Meeting Link</label>
                  <input name="meetLink" class="${inputBase()}" placeholder="https://meet.google.com/..." />
                </div>
                <div class="rounded-xl border border-white/10 bg-white/5 p-3">
                  <label class="text-xs text-slate-300/80 block mb-2">Notes for Candidate</label>
                  <textarea name="note" rows="3" class="${inputBase('resize-none')}" placeholder="Add interview instructions, documents to carry, etc."></textarea>
                </div>
                <div class="flex justify-end gap-2">
                  <button type="button" onclick="closeModal()" class="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel</button>
                  <button type="submit" class="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Schedule Interview</button>
                </div>
              </form>
            `,
            onMount: () => {
              const form = $('#scheduleForm');
              form.onsubmit = async (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                const d = String(fd.get('interviewDate') || '').trim();
                const t = String(fd.get('interviewTime') || '').trim();
                if (!d || !t) {
                  toast('Error', 'Select date and time.', 'danger');
                  return;
                }
                const timeISO = new Date(`${d}T${t}:00`).toISOString();
                const meetLink = String(fd.get('meetLink') || '').trim();
                const note = String(fd.get('note') || '').trim();

                await updateApplicationFirestore(appId, {
                  interview: { time: timeISO, meetLink, note },
                  status: STATUS.INTERVIEW
                });

                await pushNotification(stu.id, {
                  title: 'Interview Scheduled!',
                  message: `${job.companyName} scheduled an interview for ${fmtDateTime(timeISO)}.${note ? ' Note: ' + note : ''}`,
                  link: '#/dashboard',
                  type: 'success'
                });

                toast('Interview Scheduled', 'The candidate has been notified.', 'success');
                closeModal();
                render();
              };
            }
          });
        });
      });

      // Delete / Withdraw job
      $$('[data-delete-job]').forEach(btn => {
        btn.onclick = async () => {
          const jId = btn.getAttribute('data-delete-job');
          const job = getJob(jId);
          const selectedApps = CACHE.applications.filter(a => a.jobId === jId && a.status === STATUS.SELECTED);

          let confirmMsg = 'Are you sure you want to withdraw/delete this job posting?\n\nThis action cannot be undone and it will be removed from all candidate dashboards.';
          if (selectedApps.length > 0) {
            confirmMsg = `This job has ${selectedApps.length} selected candidate(s). Are you sure you want to withdraw/delete it?\n\nAll applications will also be removed.`;
          }
          if (!confirm(confirmMsg)) return;

          showLoading('Removing Job...');
          try {
            // Delete all applications for this job first
            const appsSnap = await db.collection('applications').where('jobId', '==', jId).get();
            if (!appsSnap.empty) {
              const batch = db.batch();
              appsSnap.docs.forEach(d => batch.delete(d.ref));
              await batch.commit();
              CACHE.applications = CACHE.applications.filter(a => a.jobId !== jId);
            }

            await db.collection('jobs').doc(jId).delete();
            CACHE.jobs = CACHE.jobs.filter(j => j.id !== jId);

            toast('Job Removed', 'The job has been withdrawn successfully.', 'success');
            location.hash = '#/dashboard';
          } catch (err) {
            console.error('Error deleting job:', err);
            toast('Error', 'Could not remove job.', 'danger');
          } finally {
            hideLoading();
          }
        };
      });
    }

    // ── Withdraw job from Dashboard ─────────────────────────────────
    if (r.path === '/dashboard') {
      $$('[data-withdraw-job]').forEach(btn => {
        btn.onclick = async () => {
          const jId = btn.getAttribute('data-withdraw-job');
          const selectedApps = CACHE.applications.filter(a => a.jobId === jId && a.status === STATUS.SELECTED);
          let msg = 'Withdraw and delete this job posting? This cannot be undone.';
          if (selectedApps.length > 0) msg = `This job has ${selectedApps.length} selected candidate(s). Withdraw anyway?`;
          if (!confirm(msg)) return;
          showLoading('Withdrawing Job...');
          try {
            const appsSnap = await db.collection('applications').where('jobId', '==', jId).get();
            if (!appsSnap.empty) {
              const batch = db.batch();
              appsSnap.docs.forEach(d => batch.delete(d.ref));
              await batch.commit();
              CACHE.applications = CACHE.applications.filter(a => a.jobId !== jId);
            }
            await db.collection('jobs').doc(jId).delete();
            CACHE.jobs = CACHE.jobs.filter(j => j.id !== jId);
            toast('Job Withdrawn', 'The job posting has been removed.', 'success');
            render();
          } catch (err) {
            console.error('Error withdrawing job:', err);
            toast('Error', 'Could not withdraw job.', 'danger');
          } finally {
            hideLoading();
          }
        };
      });
    }
  }

  registerRoleViewHandlers('employer', wireEmployerHandlers);
})();
