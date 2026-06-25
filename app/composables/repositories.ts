import { useToast } from "vue-toastification";
import type { RepositoryPayload } from "~/types/platform";
import { toFriendlyApiErrorMessage } from "~/utils/api";

export const useRepositoriesStore = defineStore("repositories", () => {
  const auth = useAuthStore();
  const toast = useToast();

  async function createRepository(payload: RepositoryPayload) {
    if (!auth.currentUser) throw new Error("Precisa iniciar sessão.");
    try {
      await auth.apiRequest(`/ia/documentos/${payload.documentId}/git-url`, {
        method: "POST",
        body: {
          gitUrl: payload.urlGithub,
          tecnologiasUsadas: payload.tecnologiasUsadas,
        },
      });
      toast.success("Repositório associado com sucesso.");
    } catch (error) {
      throw new Error(toFriendlyApiErrorMessage(error, "Não foi possível associar o repositório."));
    }
  }

  return {
    createRepository,
  };
});
