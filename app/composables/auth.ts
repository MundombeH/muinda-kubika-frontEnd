import { useLocalStorage, useSessionStorage } from "@vueuse/core";
import { useToast } from "vue-toastification";
import type {
  AccountRecord,
  AppUser,
  LoginPayload,
  RegisterPayload,
  SessionState,
  UserProfile,
  UserRole,
} from "~/types/platform";
import { usePlatformMeta } from "~/composables/usePlatformMeta";
import { decodeJwtExp, getApiBaseUrl, toFriendlyApiErrorMessage } from "~/utils/api";

interface ProfileDataRecord {
  estudante?: Record<string, unknown>;
  docente?: Record<string, unknown>;
  adminInstituicao?: Record<string, unknown>;
  admin?: Record<string, unknown>;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs?: number;
  refreshExpiresInMs?: number;
  userId: string;
  roles: string[];
  permissions: string[];
}

interface UserMeResponse {
  id: string;
  nome: string;
  email: string;
  numeroDeTelefone: string;
  dataDeNascimento: string;
}

const ROLE_PRIORITY: UserRole[] = [
  "ROLE_ADMIN",
  "ROLE_ADMIN_INSTITUICAO",
  "ROLE_DOCENTE",
  "ROLE_ESTUDANTE",
  "ROLE_USUARIO",
];

const PATH_ACCESS_RULES: {
  startsWith: string;
  roles?: UserRole[];
  permissions?: string[];
}[] = [
  { startsWith: "/usuarios", roles: ["ROLE_ADMIN"], permissions: ["USUARIO_GERIR"] },
  { startsWith: "/aprovacoes", roles: ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"], permissions: ["USUARIO_GERIR"] },
  { startsWith: "/documentos/revisao", roles: ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"] },
  { startsWith: "/instituicoes", roles: ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"], permissions: ["INSTITUICAO_GERIR"] },
  { startsWith: "/localizacao", roles: ["ROLE_ADMIN"] },
  { startsWith: "/categorias", roles: ["ROLE_ADMIN"] },
  { startsWith: "/tags", roles: ["ROLE_ADMIN"] },
];

export const useAuthStore = defineStore("auth", () => {
  const toast = useToast();
  const { getRoleMeta } = usePlatformMeta();

  const accounts = useLocalStorage<AccountRecord[]>(
    "muinda-kubika-accounts",
    [],
  );
  const session = useSessionStorage<SessionState>(
    "muinda-kubika-session",
    {
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      activeRole: null,
      roles: [],
      permissions: [],
      user: null,
    },
  );

  const profileData = ref<ProfileDataRecord>({});

  function buildProfilesFromSession(): UserProfile[] {
    return session.value.roles.map((role) => {
      const meta = getRoleMeta(role);
      return {
        role,
        label: meta.label,
        description: meta.description,
        status: "ACTIVE",
        permissions: role === session.value.activeRole ? session.value.permissions : meta.permissions,
      };
    });
  }

  const isAuthenticated = computed(() =>
    Boolean(session.value.accessToken && session.value.user && session.value.activeRole),
  );
  const currentUser = computed(() => session.value.user);
  const activeRole = computed(() => session.value.activeRole);
  const permissions = computed(() => session.value.permissions);
  const roles = computed(() => session.value.roles);

  const currentAccount = computed(
    () => accounts.value.find((item) => item.user.id === session.value.user?.id) ?? null,
  );

  const fallbackProfilesFromToken = computed<UserProfile[]>(buildProfilesFromSession);

  const availableProfiles = computed(() =>
    currentAccount.value?.profiles?.length
      ? currentAccount.value.profiles
      : fallbackProfilesFromToken.value,
  );

  const activeProfile = computed(
    () => availableProfiles.value.find((item) => item.role === session.value.activeRole) ?? null,
  );

  function hasRole(role: UserRole) {
    return session.value.roles.includes(role);
  }

  function hasAnyRole(rolesInput: UserRole[]) {
    return rolesInput.some((role) => hasRole(role));
  }

  function hasPermission(permission: string) {
    return permissions.value.includes(permission);
  }

  function canAccessPath(path: string) {
    const rule = PATH_ACCESS_RULES.find((item) => path.startsWith(item.startsWith));
    if (!rule) return true;
    const roleGranted = rule.roles ? hasAnyRole(rule.roles) : true;
    const permissionGranted = rule.permissions
      ? rule.permissions.some((p) => hasPermission(p))
      : true;
    return roleGranted && permissionGranted;
  }

  function isAccessTokenExpired() {
    if (!session.value.accessToken) return true;
    if (!session.value.accessTokenExpiresAt) return false;
    return Date.now() >= session.value.accessTokenExpiresAt;
  }

  function shouldRefreshSoon(bufferMs = 120_000) {
    if (!session.value.accessTokenExpiresAt) return false;
    return Date.now() >= session.value.accessTokenExpiresAt - bufferMs;
  }

  function toValidRoles(input: string[] = []): UserRole[] {
    const valid = new Set<UserRole>([
      "ROLE_USUARIO", "ROLE_ESTUDANTE", "ROLE_DOCENTE",
      "ROLE_ADMIN_INSTITUICAO", "ROLE_ADMIN",
    ]);
    return input.filter((role): role is UserRole => valid.has(role as UserRole));
  }

  function pickPreferredRole(rolesInput: UserRole[], preferred?: UserRole | null): UserRole {
    if (preferred && rolesInput.includes(preferred)) return preferred;
    return ROLE_PRIORITY.find((role) => rolesInput.includes(role)) ?? "ROLE_USUARIO";
  }

  function setAuthSessionFromResponse(auth: AuthResponse, preferredRole?: UserRole | null) {
    const validRoles = toValidRoles(auth.roles);
    const selectedRole = pickPreferredRole(validRoles, preferredRole ?? session.value.activeRole);
    const now = Date.now();
    const accessTokenExpiresAt =
      typeof auth.expiresInMs === "number"
        ? now + auth.expiresInMs
        : decodeJwtExp(auth.token);
    const refreshTokenExpiresAt =
      typeof auth.refreshExpiresInMs === "number"
        ? now + auth.refreshExpiresInMs
        : session.value.refreshTokenExpiresAt;

    session.value = {
      ...session.value,
      accessToken: auth.token,
      refreshToken: auth.refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      roles: validRoles,
      activeRole: selectedRole,
      permissions: auth.permissions ?? [],
    };
  }

  async function apiRequest<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
    retryOn401 = true,
  ) {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (session.value.accessToken) {
      headers.Authorization = `Bearer ${session.value.accessToken}`;
    }
    try {
      return await $fetch<T>(path, {
        baseURL: getApiBaseUrl(),
        method: options.method,
        body: options.body as Record<string, unknown> | undefined,
        headers,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (retryOn401 && status === 401 && session.value.refreshToken) {
        const refreshed = await refreshAuthToken(true);
        if (refreshed) {
          return apiRequest<T>(path, options, false);
        }
      }
      throw error;
    }
  }

  async function fetchCurrentUser() {
    const me = await apiRequest<UserMeResponse>("/usuario/me", { method: "GET" });
    const user: AppUser = {
      id: me.id,
      nome: me.nome,
      email: me.email,
      numeroDeTelefone: me.numeroDeTelefone,
      dataDeNascimento: me.dataDeNascimento,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(me.nome)}`,
    };
    session.value = { ...session.value, user };

    const profiles = buildProfilesFromSession();
    const idx = accounts.value.findIndex((a) => a.user.id === user.id);
    if (idx >= 0) {
      accounts.value[idx] = { user: accounts.value[idx]!.user, profiles };
    } else {
      accounts.value = [...accounts.value, { user, profiles }];
    }

    return user;
  }

  async function refreshAuthToken(force = false): Promise<boolean> {
    if (!session.value.refreshToken) return false;
    if (session.value.refreshTokenExpiresAt && Date.now() >= session.value.refreshTokenExpiresAt) {
      clearSession(false);
      return false;
    }
    if (!force && !shouldRefreshSoon()) return true;

    try {
      const auth = await $fetch<AuthResponse>("/auth/refresh", {
        baseURL: getApiBaseUrl(),
        method: "POST",
        body: { refreshToken: session.value.refreshToken },
      });
      setAuthSessionFromResponse(auth, session.value.activeRole);
      if (!session.value.user) await fetchCurrentUser();
      return true;
    } catch {
      clearSession(false);
      return false;
    }
  }

  async function fetchActiveProfileData() {
    const role = session.value.activeRole;
    if (!role) return;
    try {
      switch (role) {
        case "ROLE_ESTUDANTE":
          profileData.value.estudante = await apiRequest("/usuario/estudante/me");
          break;
        case "ROLE_DOCENTE":
          profileData.value.docente = await apiRequest("/usuario/docente/me");
          break;
        case "ROLE_ADMIN_INSTITUICAO":
          profileData.value.adminInstituicao = await apiRequest("/usuario/admin/instituicao/me");
          break;
        case "ROLE_ADMIN":
          profileData.value.admin = await apiRequest("/usuario/admin/me");
          break;
      }
    } catch (error) {
      console.error("Falha ao carregar dados do perfil:", role, error);
    }
  }

  async function hydrateFromSession() {
    if (!session.value.accessToken || !session.value.refreshToken) return false;
    if (isAccessTokenExpired()) return refreshAuthToken(true);
    if (!session.value.user) {
      try {
        await fetchCurrentUser();
      } catch {
        return refreshAuthToken(true);
      }
    }
    await fetchActiveProfileData();
    return true;
  }

  function clearSession(showToast = true) {
    session.value = {
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      activeRole: null,
      roles: [],
      permissions: [],
      user: null,
    };
    if (showToast) toast.info("Sessão terminada.");
  }

  async function register(payload: RegisterPayload) {
    try {
      await $fetch("/usuario", {
        baseURL: getApiBaseUrl(),
        method: "POST",
        body: payload,
      });
      await login({ identificador: payload.email, password: payload.password });
      toast.success("Conta criada com sucesso.");
    } catch (error) {
      toFriendlyApiErrorMessage(error, "Não foi possível criar a conta neste momento.");
      throw error;
    }
  }

  async function login(payload: LoginPayload) {
    try {
      const auth = await $fetch<AuthResponse>("/auth/login", {
        baseURL: getApiBaseUrl(),
        method: "POST",
        body: payload,
      });
      setAuthSessionFromResponse(auth);
      await fetchCurrentUser();
      toast.success(`Sessão iniciada como ${session.value.user?.nome ?? "utilizador"}.`);
    } catch (error) {
      toFriendlyApiErrorMessage(error, "Não foi possível iniciar sessão. Tente novamente.");
      throw error;
    }
  }

  async function logout() {
    try {
      if (session.value.refreshToken) {
        await $fetch("/auth/logout", {
          baseURL: getApiBaseUrl(),
          method: "POST",
          body: { refreshToken: session.value.refreshToken },
        });
      }
    } catch {
      // logout local continua mesmo se falhar no servidor
    } finally {
      clearSession(true);
    }
  }

  async function switchRole(role: UserRole) {
    if (!session.value.roles.includes(role)) {
      throw new Error("Este perfil não está ativo para a conta atual.");
    }
    const profiles =
      availableProfiles.value.length
        ? availableProfiles.value
        : fallbackProfilesFromToken.value;
    const profile = profiles.find((p) => p.role === role);
    const newPermissions = profile?.permissions?.length
      ? profile.permissions
      : getRoleMeta(role).permissions;
    session.value = {
      ...session.value,
      activeRole: role,
      permissions: newPermissions,
    };
    await fetchActiveProfileData();
    toast.success(`Perfil ativo alterado para ${getRoleMeta(role).label}.`);
  }

  return {
    accounts,
    session,
    profileData,
    isAuthenticated,
    currentUser,
    activeRole,
    permissions,
    roles,
    activeProfile,
    availableProfiles,
    currentAccount,
    hasRole,
    hasAnyRole,
    hasPermission,
    canAccessPath,
    isAccessTokenExpired,
    shouldRefreshSoon,
    refreshAuthToken,
    hydrateFromSession,
    fetchActiveProfileData,
    apiRequest,
    register,
    login,
    logout,
    switchRole,
    clearSession,
  };
});
