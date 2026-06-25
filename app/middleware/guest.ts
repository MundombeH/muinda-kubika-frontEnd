export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore();

  if (!auth.isAuthenticated) {
    return;
  }

  const hydrated = await auth.hydrateFromSession();

  if (hydrated && auth.isAuthenticated) {
    return navigateTo("/dashboard");
  }
});
