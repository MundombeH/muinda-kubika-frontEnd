import type { Institution } from "~/types/platform";

function mapInstitution(dto: any): Institution {
  const tipos = Array.isArray(dto.tipoInstituicao) ? dto.tipoInstituicao.join(", ") : "";
  const localizacao = dto.bairro?.descricao ?? "";
  return {
    id: dto.id,
    name: dto.descricao ?? "",
    type: tipos,
    location: localizacao,
  };
}

export const useInstitutionsStore = defineStore("institutions", () => {
  const auth = useAuthStore();

  const institutions = ref<Institution[]>([]);
  const loading = ref(false);

  async function loadInstitutions() {
    loading.value = true;
    try {
      const data = await auth.apiRequest<any[]>("/instituicao", { method: "GET" });
      if (data && data.length > 0) {
        institutions.value = data.map(mapInstitution);
      }
    } catch {
      // API indisponível — lista vazia
    } finally {
      loading.value = false;
    }
  }

  async function createInstitution(payload: {
    descricao: string;
    anoDeFundacao: number;
    tipoInstituicao: string[];
    numeroDeTelefone: string;
    email: string;
    bairro: string;
  }) {
    const created = await auth.apiRequest<any>("/instituicao", {
      method: "POST",
      body: payload,
    });
    institutions.value = [mapInstitution(created), ...institutions.value];
    return created;
  }

  function getInstitutionName(institutionId: string) {
    return institutions.value.find((item) => item.id === institutionId)?.name ?? "Instituição não definida";
  }

  return {
    institutions,
    loading,
    loadInstitutions,
    createInstitution,
    getInstitutionName,
  };
});
