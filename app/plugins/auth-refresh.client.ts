export default defineNuxtPlugin(() => {
  const auth = useAuthStore();

  const interval = window.setInterval(async () => {
    if (!auth.isAuthenticated) {
      return;
    }

    if (auth.shouldRefreshSoon()) {
      await auth.refreshAuthToken();
    }
  }, 60_000);

  window.addEventListener('beforeunload', () => {
    clearInterval(interval);
  });
});
