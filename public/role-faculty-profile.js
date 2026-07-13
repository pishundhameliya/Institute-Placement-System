(function () {
  function renderFacultyProfile(user) {
    const f = user.faculty || {};
    return `
      ${layoutTitle('Faculty / Admin Profile', 'Manage training & placement operations and monitor analytics.')}
      <div class="card rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur p-6">
        <div class="flex flex-col items-center gap-3 mb-5">
          ${photoOrInitials(f.photo, f.fullName, 'h-24 w-24', 'text-2xl')}
          <label class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
            📷 Upload Photo
            <input type="file" accept="image/*" class="hidden" id="facultyPhotoInput" />
          </label>
          <div class="text-[10px] text-slate-400">Max 800KB • JPG, PNG, GIF, WebP</div>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          ${readOnlyField('Name', f.fullName)}
          ${readOnlyField('Department', f.department)}
          ${readOnlyField('Institute', f.institute || 'Not specified')}
          ${readOnlyField('Email', user.email)}
        </div>
        <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div class="text-sm font-semibold">Administrative Actions</div>
          <div class="mt-4 flex flex-wrap gap-2">
            <a href="#/dashboard" class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">View Analytics</a>
          </div>
        </div>
      </div>
    `;
  }

  registerRoleProfile('faculty', renderFacultyProfile);
})();
