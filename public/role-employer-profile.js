(function () {
  function renderEmployerProfile(user) {
    const c = user.company || {};
    return `
      ${layoutTitle('Company Profile', 'Maintain your company information to build trust with candidates.')}
      <div class="grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
            <div class="text-sm font-semibold">Company Information</div>
            <div class="mt-4 flex flex-col items-center gap-3">
              ${photoOrInitials(c.logo, c.name, 'h-24 w-24', 'text-2xl')}
              <label class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
                📷 Upload Logo
                <input type="file" accept="image/*" class="hidden" id="employerPhotoInput" />
              </label>
              <div class="text-[10px] text-slate-400">Max 800KB • JPG, PNG, GIF, WebP</div>
            </div>
            <form id="employerProfileForm" class="mt-5 grid gap-3">
              <div>
                <label class="text-xs text-slate-300/80">Company Name *</label>
                <input name="name" class="${inputBase()}" value="${escapeHtml(c.name || '')}" required />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Website</label>
                <input name="website" class="${inputBase()}" value="${escapeHtml(c.website || '')}" placeholder="https://..." />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Location *</label>
                <input name="location" list="cityListEmployerProfile" class="${inputBase()}" value="${escapeHtml(c.location || '')}" placeholder="Type city name (e.g. Ahmedabad)" required />
                <datalist id="cityListEmployerProfile">${cityOptionsHTML()}</datalist>
              </div>
              <div>
                <label class="text-xs text-slate-300/80">Phone</label>
                <input name="phone" class="${inputBase()}" value="${escapeHtml(c.phone || '')}" />
              </div>
              <div>
                <label class="text-xs text-slate-300/80">About Company</label>
                <textarea name="about" rows="4" class="${inputBase('resize-none')}" placeholder="Brief description...">${escapeHtml(c.about || '')}</textarea>
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
            <div class="mt-5 flex items-center gap-4">
              ${photoOrInitials(c.logo, c.name, 'h-16 w-16', 'text-lg')}
              <div>
                <div class="text-lg font-semibold">${escapeHtml(c.name || '—')}</div>
                <div class="text-xs text-slate-300/80">${escapeHtml(c.location || '—')}</div>
              </div>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              ${readOnlyField('Company Name', c.name)}
              ${readOnlyField('Location', c.location)}
              ${readOnlyField('Website', c.website)}
              ${readOnlyField('Contact Email', user.email)}
            </div>
            <div class="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div class="text-xs uppercase tracking-wide text-slate-300/70">About</div>
              <div class="mt-2 text-sm text-slate-200/85 whitespace-pre-wrap">${escapeHtml(c.about || 'No description provided.')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  registerRoleProfile('employer', renderEmployerProfile);
})();
