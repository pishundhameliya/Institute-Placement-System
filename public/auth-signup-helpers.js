(function () {
  function renderStudentFields(roleFields) {
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
      <div class="grid sm:grid-cols-1 gap-3 mb-3">
        <div>
          <label class="text-xs text-slate-300/80">Institute Name (Optional for Independent Students)</label>
          <input name="institute" list="instituteListSignup" class="${inputBase()}" placeholder="Search or type institute name" />
          <datalist id="instituteListSignup">${instituteOptionsHTML()}</datalist>
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
            ${SEMESTERS.map(s => `<option ${s === 'Graduation Sem 7' ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="signupExtraFields" class="grid gap-3"></div>
    `;

    const signupYearSel = $('#signupYearSelect');
    const signupExtraFields = $('#signupExtraFields');
    const updateSignupSpis = () => {
      const val = signupYearSel.value;
      const count = getPrevSemCount(val);
      const master = isMaster(val);
      signupExtraFields.innerHTML = `
        ${master ? `
          <div class="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-4">
            <div class="text-xs font-semibold text-indigo-200 mb-3">📚 Graduation Academic History (All 8 Semesters Required)</div>
            <div class="grid grid-cols-2 gap-3">
              ${Array.from({ length: 8 }).map((_, i) => `
                <div>
                  <label class="text-xs text-slate-300/80">Graduation Sem ${i + 1} SPI *</label>
                  <input name="gradSpi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" required />
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
                  <input name="spi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" required />
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-2 gap-3">
            ${Array.from({ length: count }).map((_, i) => `
              <div>
                <label class="text-xs text-slate-300/80">Sem ${i + 1} SPI *</label>
                <input name="spi_${i + 1}" type="number" step="0.01" min="0" max="10" class="${inputBase()}" required />
              </div>
            `).join('')}
          </div>
        `}
      `;
    };
    signupYearSel.onchange = updateSignupSpis;
    updateSignupSpis();
  }

  function renderRoleFields(role, roleFields) {
    if (role === 'student') {
      renderStudentFields(roleFields);
      return;
    }
    if (role === 'employer') {
      roleFields.innerHTML = `
        <div>
          <label class="text-xs text-slate-300/80">Company Name *</label>
          <input name="companyName" class="${inputBase()}" placeholder="Your company name" required />
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-300/80">Location *</label>
            <input name="companyLocation" list="cityListSignupEmployer" class="${inputBase()}" placeholder="Type city name (e.g. Ahmedabad)" required />
            <datalist id="cityListSignupEmployer">${cityOptionsHTML()}</datalist>
          </div>
          <div>
            <label class="text-xs text-slate-300/80">Website</label>
            <input name="companyWebsite" class="${inputBase()}" placeholder="https://..." />
          </div>
        </div>
      `;
      return;
    }
    roleFields.innerHTML = `
      <div>
        <label class="text-xs text-slate-300/80">Full Name *</label>
        <input name="facultyName" class="${inputBase()}" placeholder="Your full name" required />
      </div>
      <div>
        <label class="text-xs text-slate-300/80">Department *</label>
        <input name="facultyDept" class="${inputBase()}" placeholder="e.g. Training & Placement Cell" required />
      </div>
      <div>
        <label class="text-xs text-slate-300/80">Institute Name *</label>
        <input name="institute" list="instituteListSignupFac" class="${inputBase()}" placeholder="Search or type institute name" required />
        <datalist id="instituteListSignupFac">${instituteOptionsHTML()}</datalist>
      </div>
    `;
  }

  function buildUserData(fd) {
    const role = String(fd.get('role') || 'student');
    if (role === 'student') {
      const year = String(fd.get('year') || '');
      const count = getPrevSemCount(year);
      const master = isMaster(year);
      let gradSpis = [];
      let gradCgpa = null;
      if (master) {
        for (let i = 1; i <= 8; i++) gradSpis.push(toNumber(fd.get(`gradSpi_${i}`), 0));
        gradCgpa = gradSpis.length ? parseFloat((gradSpis.reduce((a, b) => a + b, 0) / gradSpis.length).toFixed(2)) : 0;
      }
      const spis = [];
      for (let i = 1; i <= count; i++) spis.push(toNumber(fd.get(`spi_${i}`), 0));
      const cgpa = spis.length ? parseFloat((spis.reduce((a, b) => a + b, 0) / spis.length).toFixed(2)) : 0;
      return {
        role,
        profile: {
          fullName: String(fd.get('fullName') || '').trim(),
          instituteId: String(fd.get('instituteId') || '').trim(),
          branch: String(fd.get('branch') || '').trim(),
          year,
          gradSpis: gradSpis.length ? gradSpis : null,
          gradCgpa,
          spis,
          cgpa,
          phone: String(fd.get('phone') || '').trim(),
          institute: String(fd.get('institute') || '').trim(),
          skills: [],
          about: '',
          resumeUrl: '',
          links: { github: '', linkedin: '' },
          photo: null
        }
      };
    }
    if (role === 'employer') {
      return {
        role,
        company: {
          name: String(fd.get('companyName') || '').trim(),
          location: String(fd.get('companyLocation') || '').trim(),
          website: String(fd.get('companyWebsite') || '').trim(),
          about: '',
          phone: String(fd.get('phone') || '').trim(),
          logo: null
        }
      };
    }
    return {
      role: 'faculty',
      faculty: {
        fullName: String(fd.get('facultyName') || '').trim(),
        department: String(fd.get('facultyDept') || '').trim() || 'Training & Placement Cell',
        institute: String(fd.get('institute') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        photo: null
      }
    };
  }

  registerAuthSignupHelpers({
    renderRoleFields,
    buildUserData
  });
})();
