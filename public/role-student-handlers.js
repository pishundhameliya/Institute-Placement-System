(function () {
  function wireStudentHandlers({ r, user, userId }) {
    if (!user || user.role !== 'student' || !userId) return;

    if (r.path === '/profile') {
      const form = $('#studentProfileForm');
      const profileYearSelect = $('#profileYearSelect');

      if (profileYearSelect && $('#extraAcademicFields')) {
        profileYearSelect.onchange = () => {
          const val = profileYearSelect.value;
          const count = getPrevSemCount(val);
          const master = isMaster(val);
          $('#extraAcademicFields').innerHTML = `
            ${master ? `
              <div class="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-4">
                <div class="text-xs font-semibold text-indigo-200 mb-3">📚 Graduation Academic History (All 8 Semesters Required)</div>
                <div class="grid grid-cols-2 gap-3">
                  ${Array.from({ length: 8 }).map((_, i) => `
                    <div>
                      <label class="text-xs text-slate-300/80">Graduation Sem ${i + 1} SPI *</label>
                      <input name="gradSpi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${user.profile?.gradSpis?.[i] || ''}" required />
                      <label class="mt-2 block text-[11px] text-slate-300/80">Sem ${i + 1} Result Photo</label>
                      <input name="gradSemPhoto_${i + 1}" type="file" accept="image/*" class="${inputBase('mt-1 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white')}" />
                      <div class="mt-1 text-[10px] text-slate-400">
                        ${user.profile?.gradSemesterResultPhotos?.[i] ? `<a href="${user.profile.gradSemesterResultPhotos[i]}" target="_blank" class="text-indigo-200 hover:underline">View uploaded photo</a>` : 'Optional photo'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
                <div class="text-xs font-semibold text-fuchsia-200 mb-3">🎓 Master's Academic History</div>
                <div class="grid grid-cols-2 gap-3">
                  ${Array.from({ length: count }).map((_, i) => `
                    <div>
                      <label class="text-xs text-slate-300/80">Master Sem ${i + 1} SPI *</label>
                      <input name="spi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${user.profile?.spis?.[i] || ''}" required />
                      <label class="mt-2 block text-[11px] text-slate-300/80">Master Sem ${i + 1} Result Photo</label>
                      <input name="semPhoto_${i + 1}" type="file" accept="image/*" class="${inputBase('mt-1 file:mr-2 file:rounded-lg file:border-0 file:bg-fuchsia-500 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white')}" />
                      <div class="mt-1 text-[10px] text-slate-400">
                        ${user.profile?.semesterResultPhotos?.[i] ? `<a href="${user.profile.semesterResultPhotos[i]}" target="_blank" class="text-indigo-200 hover:underline">View uploaded photo</a>` : 'Optional photo'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div class="grid grid-cols-2 gap-3">
                ${Array.from({ length: count }).map((_, i) => `
                  <div>
                    <label class="text-xs text-slate-300/80">Sem ${i + 1} SPI *</label>
                    <input name="spi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${user.profile?.spis?.[i] || ''}" required />
                    <label class="mt-2 block text-[11px] text-slate-300/80">Sem ${i + 1} Result Photo</label>
                    <input name="semPhoto_${i + 1}" type="file" accept="image/*" class="${inputBase('mt-1 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white')}" />
                    <div class="mt-1 text-[10px] text-slate-400">
                      ${user.profile?.semesterResultPhotos?.[i] ? `<a href="${user.profile.semesterResultPhotos[i]}" target="_blank" class="text-indigo-200 hover:underline">View uploaded photo</a>` : 'Optional photo'}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          `;
        };
      }

      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          try {
            const fd = new FormData(form);
            const p = { ...user.profile };
            p.fullName = String(fd.get('fullName') || '').trim();
            p.branch = String(fd.get('branch') || '').trim();
            p.year = String(fd.get('year') || '').trim();
            const count = getPrevSemCount(p.year);
            const master = isMaster(p.year);
            if (master) {
              p.gradSpis = [];
              for (let i = 1; i <= 8; i++) p.gradSpis.push(toNumber(fd.get(`gradSpi_${i}`), 0));
              p.gradCgpa = p.gradSpis.length ? parseFloat((p.gradSpis.reduce((a, b) => a + b, 0) / p.gradSpis.length).toFixed(2)) : 0;
            }
            p.spis = [];
            for (let i = 1; i <= count; i++) p.spis.push(toNumber(fd.get(`spi_${i}`), 0));
            p.cgpa = p.spis.length ? parseFloat((p.spis.reduce((a, b) => a + b, 0) / p.spis.length).toFixed(2)) : 0;
            p.phone = String(fd.get('phone') || '').trim();
            p.institute = String(fd.get('institute') || '').trim();
            p.about = String(fd.get('about') || '').trim();
            p.resumeUrl = String(fd.get('resumeUrl') || '').trim();
            p.links = { github: String(fd.get('github') || '').trim(), linkedin: String(fd.get('linkedin') || '').trim() };
            p.skills = String(fd.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);

            p.semesterResultPhotos = Array.isArray(p.semesterResultPhotos) ? p.semesterResultPhotos : [];
            for (let i = 1; i <= count; i++) {
              const semPhotoFile = fd.get(`semPhoto_${i}`);
              if (semPhotoFile && semPhotoFile.size > 0) {
                showLoading(`Uploading Sem ${i} result photo...`);
                const semPhoto = await fileToDataUrlWithLimit(semPhotoFile, 350, 'image/', `Sem ${i} result photo`);
                p.semesterResultPhotos[i - 1] = semPhoto;
                hideLoading();
              }
            }

            if (master) {
              p.gradSemesterResultPhotos = Array.isArray(p.gradSemesterResultPhotos) ? p.gradSemesterResultPhotos : [];
              for (let i = 1; i <= 8; i++) {
                const gradPhotoFile = fd.get(`gradSemPhoto_${i}`);
                if (gradPhotoFile && gradPhotoFile.size > 0) {
                  showLoading(`Uploading Graduation Sem ${i} result photo...`);
                  const gradPhoto = await fileToDataUrlWithLimit(gradPhotoFile, 350, 'image/', `Graduation Sem ${i} result photo`);
                  p.gradSemesterResultPhotos[i - 1] = gradPhoto;
                  hideLoading();
                }
              }
            }

            const resumePdfFile = fd.get('resumePdfFile');
            if (resumePdfFile && resumePdfFile.size > 0) {
              showLoading('Uploading resume PDF...');
              const resumeDataUrl = await fileToDataUrlWithLimit(resumePdfFile, 700, 'application/pdf', 'Resume PDF');
              p.resumePdf = { name: String(resumePdfFile.name || 'resume.pdf'), dataUrl: resumeDataUrl };
              hideLoading();
            }

            await saveUserProfile(userId, { profile: p });
            toast('Profile Updated', 'Your profile has been saved successfully.', 'success');
            render();
          } catch (err) {
            hideLoading();
            toast('Upload Error', String(err), 'danger');
          }
        };
      }
    }

    if (r.path === '/dashboard') {
      $$('[data-withdraw]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Withdraw this application?')) return;
          const id = btn.getAttribute('data-withdraw');
          const app = CACHE.applications.find(a => a.id === id && a.studentId === userId);
          if (!app) return;
          const job = getJob(app.jobId);
          await deleteApplicationFirestore(id);
          if (job) {
            await pushNotification(job.employerId, {
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

  registerRoleViewHandlers('student', wireStudentHandlers);
})();
