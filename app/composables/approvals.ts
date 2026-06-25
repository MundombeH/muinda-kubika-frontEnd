import { useToast } from "vue-toastification";
import type { ProfileApproval, ProfileRequestPayload, UserRole } from "~/types/platform";
import { usePlatformMeta } from "~/composables/usePlatformMeta";
import { toFriendlyApiErrorMessage } from "~/utils/api";

const ROLE_TO_PROFILE_TYPE: Record<string, string> = {
  ROLE_ADMIN: "ADMIN",
  ROLE_ADMIN_INSTITUICAO: "ADMIN_INSTITUICAO",
  ROLE_DOCENTE: "DOCENTE",
  ROLE_ESTUDANTE: "ESTUDANTE",
};

const PROFILE_TYPE_TO_ROLE: Record<string, UserRole> = {
  ADMIN: "ROLE_ADMIN",
  ADMIN_INSTITUICAO: "ROLE_ADMIN_INSTITUICAO",
  DOCENTE: "ROLE_DOCENTE",
  ESTUDANTE: "ROLE_ESTUDANTE",
};

function mapApproval(dto: any): ProfileApproval {
  const role = PROFILE_TYPE_TO_ROLE[dto.profileType] ?? "ROLE_USUARIO";
  return {
    id: dto.id,
    userId: dto.usuario?.id ?? "",
    userName: dto.usuario?.nome ?? "",
    userEmail: dto.usuario?.email ?? "",
    profileRole: role,
    profileLabel: role,
    institutionIds: [],
    requestedAt: dto.createdAt ?? new Date().toISOString(),
    status: dto.status ?? "PENDING",
    rejectionReason: dto.motivoRejeicao ?? undefined,
  };
}

export const useApprovalsStore = defineStore("approvals", () => {
  const auth = useAuthStore();
  const toast = useToast();
  const { getRoleMeta } = usePlatformMeta();

  const approvals = ref<ProfileApproval[]>([]);
  const loading = ref(false);

  const visibleApprovals = computed(() => {
    if (auth.activeRole === "ROLE_ADMIN") return approvals.value;
    if (auth.activeRole === "ROLE_ADMIN_INSTITUICAO") {
      const institutionIds = auth.activeProfile?.institutionIds ?? [];
      return approvals.value.filter((approval) =>
        approval.institutionIds?.some((id) => institutionIds.includes(id)),
      );
    }
    return [];
  });

  async function loadApprovals() {
    loading.value = true;
    try {
      const data = await auth.apiRequest<any[]>("/usuario/aprovacoes", { method: "GET" });
      if (data) approvals.value = data.map(mapApproval);
    } catch {
      // API indisponível — lista vazia
    } finally {
      loading.value = false;
    }
  }

  async function requestProfile(payload: ProfileRequestPayload) {
    if (!auth.currentUser) throw new Error("Precisa iniciar sessão para solicitar um perfil.");
    const profileType = ROLE_TO_PROFILE_TYPE[payload.role];
    if (!profileType) throw new Error("Tipo de perfil inválido.");

    try {
      let body: Record<string, unknown> | undefined;
      if (payload.role === "ROLE_ESTUDANTE") {
        body = {
          curso: payload.metadata.curso,
          ano: Number(payload.metadata.ano) || 1,
          genero: payload.metadata.genero,
          identificacao: payload.metadata.identificacao,
          instituicaoId: payload.institutionIds[0],
        };
      } else if (payload.role === "ROLE_DOCENTE") {
        body = {
          identificacao: payload.metadata.identificacao,
          departamento: payload.metadata.departamento,
          genero: payload.metadata.genero,
          instituicoes: payload.institutionIds,
        };
      } else if (payload.role === "ROLE_ADMIN_INSTITUICAO") {
        body = { instituicoes: payload.institutionIds };
      }

      const endpoint = `/usuario/${profileType.toLowerCase()}`;
      await auth.apiRequest(endpoint, {
        method: "POST",
        ...(body ? { body } : {}),
      });
      toast.success("Solicitação enviada para aprovação.");
      await loadApprovals();
    } catch (error) {
      throw new Error(toFriendlyApiErrorMessage(error, "Não foi possível solicitar o perfil."));
    }
  }

  async function approveProfile(approvalId: string) {
    try {
      await auth.apiRequest(`/usuario/aprovacoes/${approvalId}/aprovar`, { method: "PATCH" });
      approvals.value = approvals.value.map((item) =>
        item.id === approvalId ? { ...item, status: "ACTIVE" as const, rejectionReason: undefined } : item,
      );
      toast.success("Perfil aprovado com sucesso.");
    } catch (error) {
      throw new Error(toFriendlyApiErrorMessage(error, "Não foi possível aprovar a solicitação."));
    }
  }

  async function rejectProfile(approvalId: string, reason: string) {
    try {
      await auth.apiRequest(`/usuario/aprovacoes/${approvalId}/rejeitar`, {
        method: "PATCH",
        body: { motivoRejeicao: reason },
      });
      approvals.value = approvals.value.map((item) =>
        item.id === approvalId ? { ...item, status: "REJECTED" as const, rejectionReason: reason } : item,
      );
      toast.error("Solicitação rejeitada.");
    } catch (error) {
      throw new Error(toFriendlyApiErrorMessage(error, "Não foi possível rejeitar a solicitação."));
    }
  }

  return {
    approvals,
    loading,
    visibleApprovals,
    loadApprovals,
    requestProfile,
    approveProfile,
    rejectProfile,
  };
});
