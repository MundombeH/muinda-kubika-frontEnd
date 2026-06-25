export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();
  const docs = useDocumentsStore();
  const inst = useInstitutionsStore();
  const approvals = useApprovalsStore();

  if (!auth.isAuthenticated) {
    return navigateTo("/login");
  }

  const hydrated = await auth.hydrateFromSession();

  if (!hydrated || !auth.isAuthenticated) {
    return navigateTo("/login");
  }

  if (auth.shouldRefreshSoon()) {
    await auth.refreshAuthToken();
  }

  if (!auth.canAccessPath(to.path)) {
    return navigateTo("/dashboard");
  }

  docs.loadDocuments();
  inst.loadInstitutions();
  approvals.loadApprovals();
});
