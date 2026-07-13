(function () {
  function wireFacultyHandlers({ r, user, userId }) {
    if (!user || user.role !== 'faculty' || !userId) return;

    if (r.path === '/dashboard') {
      // Approve buttons
      $$('[data-approve-job]').forEach(btn => {
        btn.onclick = async () => {
          const jobId = btn.getAttribute('data-approve-job');
          const institute = user.faculty?.institute;
          if (!jobId || !institute) return;

          showLoading('Approving job...');
          const success = await approveJobForInstituteFirestore(jobId, institute);
          hideLoading();

          if (success) {
            toast('Job Approved', `Job approved for ${institute} students.`, 'success');
            const job = getJob(jobId);
            if (job && job.employerId) {
              await pushNotification(job.employerId, {
                title: 'Job Approved',
                message: `Your job posting "${job.title}" has been approved for ${institute}.`,
                link: '#/dashboard'
              });
            }
            render();
          }
        };
      });

      // Reject/Deny buttons
      $$('[data-reject-job]').forEach(btn => {
        btn.onclick = async () => {
          const jobId = btn.getAttribute('data-reject-job');
          const institute = user.faculty?.institute;
          if (!jobId || !institute) return;

          showLoading('Rejecting job...');
          const success = await rejectJobForInstituteFirestore(jobId, institute);
          hideLoading();

          if (success) {
            toast('Job Request Rejected', `Job request rejected for ${institute}.`, 'success');
            const job = getJob(jobId);
            if (job && job.employerId) {
              await pushNotification(job.employerId, {
                title: 'Job Request Rejected',
                message: `Your job request for "${job.title}" has been rejected for ${institute}.`,
                link: '#/dashboard'
              });
            }
            render();
          }
        };
      });
    }
  }

  registerRoleViewHandlers('faculty', wireFacultyHandlers);
})();
