(function () {
  function renderStudentProfile(user) {
    const p = user.profile || {};
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
              <span class="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-100">${escapeHtml(p.instituteId || 'Student')}</span>
            </div>
            <div class="mt-5 flex flex-col items-center gap-3">
              ${photoOrInitials(p.photo, p.fullName, 'h-24 w-24', 'text-2xl')}
              <label class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
                📷 Upload Photo
                <input type="file" accept="image/*" class="hidden" id="studentPhotoInput" />
              </label>
              <div class="text-[10px] text-slate-400">Max 800KB • JPG, PNG, GIF, WebP</div>
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
                    ${SEMESTERS.map(y => `<option ${p.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div id="extraAcademicFields" class="grid gap-3">
                ${isMaster(p.year) ? `
                  <div class="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-4">
                    <div class="text-xs font-semibold text-indigo-200 mb-3">📚 Graduation Academic History (All 8 Semesters Required)</div>
                    <div class="grid grid-cols-2 gap-3">
                      ${Array.from({ length: 8 }).map((_, i) => `
                        <div>
                          <label class="text-xs text-slate-300/80">Graduation Sem ${i + 1} SPI *</label>
                          <input name="gradSpi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${p.gradSpis?.[i] || ''}" required />
                          <label class="mt-2 block text-[11px] text-slate-300/80">Sem ${i + 1} Result Photo</label>
                          <input name="gradSemPhoto_${i + 1}" type="file" accept="image/*" class="${inputBase('mt-1 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white')}" />
                          <div class="mt-1 text-[10px] text-slate-400">
                            ${p.gradSemesterResultPhotos?.[i] ? `<a href="${p.gradSemesterResultPhotos[i]}" target="_blank" class="text-indigo-200 hover:underline">View uploaded photo</a>` : 'Optional photo'}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                    <div class="mt-3">
                      <label class="text-xs text-slate-300/80">Graduation CGPA (Auto-calculated)</label>
                      <input name="gradCgpa" type="number" step="0.01" readonly class="${inputBase('opacity-70 cursor-not-allowed')}" value="${p.gradCgpa || ''}" />
                    </div>
                  </div>
                  <div class="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
                    <div class="text-xs font-semibold text-fuchsia-200 mb-3">🎓 Master's Academic History</div>
                    <div id="spiContainer" class="grid grid-cols-2 gap-3">
                      ${Array.from({ length: prevSems }).map((_, i) => `
                        <div>
                          <label class="text-xs text-slate-300/80">Master Sem ${i + 1} SPI *</label>
                          <input name="spi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${p.spis?.[i] || ''}" required />
                          <label class="mt-2 block text-[11px] text-slate-300/80">Master Sem ${i + 1} Result Photo</label>
                          <input name="semPhoto_${i + 1}" type="file" accept="image/*" class="${inputBase('mt-1 file:mr-2 file:rounded-lg file:border-0 file:bg-fuchsia-500 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white')}" />
                          <div class="mt-1 text-[10px] text-slate-400">
                            ${p.semesterResultPhotos?.[i] ? `<a href="${p.semesterResultPhotos[i]}" target="_blank" class="text-indigo-200 hover:underline">View uploaded photo</a>` : 'Optional photo'}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : `
                  <div id="spiContainer" class="grid grid-cols-2 gap-3">
                    ${Array.from({ length: prevSems }).map((_, i) => `
                      <div>
                        <label class="text-xs text-slate-300/80">Sem ${i + 1} SPI *</label>
                        <input name="spi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" value="${p.spis?.[i] || ''}" required />
                        <label class="mt-2 block text-[11px] text-slate-300/80">Sem ${i + 1} Result Photo</label>
                        <input name="semPhoto_${i + 1}" type="file" accept="image/*" class="${inputBase('mt-1 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white')}" />
                        <div class="mt-1 text-[10px] text-slate-400">
                          ${p.semesterResultPhotos?.[i] ? `<a href="${p.semesterResultPhotos[i]}" target="_blank" class="text-indigo-200 hover:underline">View uploaded photo</a>` : 'Optional photo'}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
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
                <label class="text-xs text-slate-300/80">Institute Name (Optional)</label>
                <input name="institute" list="instituteListProfile" class="${inputBase()}" value="${escapeHtml(p.institute || '')}" placeholder="Search or type institute name" />
                <datalist id="instituteListProfile">${instituteOptionsHTML()}</datalist>
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Skills (comma-separated) *</label>
                <input name="skills" class="${inputBase()}" value="${escapeHtml(skills)}" placeholder="e.g. Java, Python, SQL, React" />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">About Me</label>
                <textarea name="about" rows="4" class="${inputBase('resize-none')}" placeholder="Brief description about yourself...">${escapeHtml(p.about || '')}</textarea>
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Resume URL</label>
                <input name="resumeUrl" class="${inputBase()}" value="${escapeHtml(p.resumeUrl || '')}" placeholder="https://drive.google.com/..." />
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="rounded-xl border border-white/10 bg-white/5 p-3">
                  <label class="text-xs text-slate-300/80">Resume PDF File</label>
                  <input name="resumePdfFile" type="file" accept="application/pdf" class="${inputBase('mt-2 file:mr-3 file:rounded-lg file:border-0 file:bg-fuchsia-500 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white')}" />
                  <div class="mt-1 text-[10px] text-slate-400">PDF under 700KB</div>
                </div>
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
            <div class="mt-5 flex items-center gap-4">
              ${photoOrInitials(p.photo, p.fullName, 'h-16 w-16', 'text-lg')}
              <div>
                <div class="text-lg font-semibold">${escapeHtml(p.fullName || '—')}</div>
                <div class="text-xs text-slate-300/80">${escapeHtml(p.branch || '—')} • ${escapeHtml(p.year || '—')}</div>
              </div>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              ${readOnlyField('Full Name', p.fullName)}
              ${readOnlyField('Institute', p.institute || 'Independent Student')}
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
              <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div class="text-xs uppercase tracking-wide text-slate-300/70">Resume PDF</div>
                <div class="mt-2">
                  ${p.resumePdf?.dataUrl ? `<a href="${p.resumePdf.dataUrl}" download="${escapeHtml(p.resumePdf.name || 'resume.pdf')}" class="inline-flex text-xs text-emerald-200 hover:underline">Download ${escapeHtml(p.resumePdf.name || 'Resume PDF')}</a>` : `<span class="text-sm text-slate-300/85">Not uploaded yet.</span>`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  registerRoleProfile('student', renderStudentProfile);
})();
