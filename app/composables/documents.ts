import type { AppDocument, DocumentPayload, AISuggestion, SugestaoConfianca } from "~/types/platform";
import { useToast } from "vue-toastification";
import { getApiBaseUrl, toFriendlyApiErrorMessage } from "~/utils/api";

function mapDocument(dto: any): AppDocument {
  const aiSuggestions = dto.analiseIA ? mapAISuggestions(dto.analiseIA) : undefined;
  return {
    id: dto.id,
    title: dto.titulo ?? "",
    summary: dto.resumo ?? "",
    authors: Array.from(dto.autores ?? []),
    userId: dto.usuario?.id ?? "",
    userName: dto.usuario?.nome ?? "",
    institutionId: dto.instituicao?.id ?? "",
    type: dto.tipoDeDocumento ?? "INDEFINIDO",
    status: dto.status ?? "DRAFT",
    coverUrl: dto.capaUrl ?? "",
    urlGithub: dto.urlGithub ?? "",
    tecnologiasUsadas: Array.from(dto.tecnologiasUsadas ?? []),
    version: dto.versao,
    approvedByName: dto.aprovadoPor?.nome ?? "",
    categories: Array.from(dto.categorias ?? []).map((c: any) => c.descricao),
    tags: Array.from(dto.tags ?? []).map((t: any) => t.descricao),
    files: Array.from(dto.ficheiros ?? []).map((f: any) => ({ nome: f.nome, url: f.url, formato: f.formato })),
    updatedAt: dto.updatedAt ?? new Date().toISOString(),
    aiAutoFill: false,
    reviewHistory: [],
    aiSuggestions,
  };
}

function mapSugestaoArray(items: any): SugestaoConfianca[] {
  return Array.from(items ?? []).map((p: any) => ({
    valor: p.valor ?? "",
    confianca: p.confianca ?? 0,
  }));
}

function mapAISuggestions(dto: any): AISuggestion {
  return {
    id: dto.id ?? "",
    documentoId: dto.documentoId ?? "",
    origemAnalise: dto.origemAnalise ?? "",
    pendenteConfirmacao: dto.pendenteConfirmacao ?? false,
    versaoAnalise: dto.versaoAnalise ?? 0,
    resumoGeradoIA: dto.resumoGeradoIA ?? "",
    tituloSugerido: dto.tituloSugerido ?? "",
    tituloConfianca: dto.tituloConfianca ?? 0,
    categoriaSugerida: dto.categoriaSugerida ?? "",
    categoriaConfianca: dto.categoriaConfianca ?? 0,
    subcategoriaSugerida: dto.subcategoriaSugerida ?? "",
    subcategoriaConfianca: dto.subcategoriaConfianca ?? 0,
    palavrasChaveIA: mapSugestaoArray(dto.palavrasChaveIA),
    tagsSugeridas: mapSugestaoArray(dto.tagsSugeridas),
    tecnologiasSugeridas: mapSugestaoArray(dto.tecnologiasSugeridas),
    frameworksSugeridos: mapSugestaoArray(dto.frameworksSugeridos),
    conflitosDetectados: Array.from(dto.conflitosDetectados ?? []),
    motivoRejeicao: dto.motivoRejeicao ?? "",
    observacaoAdmin: dto.observacaoAdmin ?? "",
    dataProcessamento: dto.dataProcessamento ?? "",
    versao: dto.versao ?? 0,
    createdAt: dto.createdAt ?? "",
    updatedAt: dto.updatedAt ?? "",
    isActive: dto.isActive ?? false,
  };
}

export const useDocumentsStore = defineStore("documents", () => {
  const auth = useAuthStore();
  const toast = useToast();

  const documents = ref<AppDocument[]>([]);
  const loading = ref(false);

  const myDocuments = computed(() => {
    if (!auth.currentUser) return [];
    if (auth.activeRole === "ROLE_ADMIN" || auth.activeRole === "ROLE_ADMIN_INSTITUICAO") {
      return documents.value;
    }
    return documents.value.filter(
      (item) => item.userId === auth.currentUser?.id || item.status === "PUBLICADO",
    );
  });

  async function loadDocuments() {
    loading.value = true;
    try {
      const data = await auth.apiRequest<any[]>("/documento", { method: "GET" });
      if (data) documents.value = data.map(mapDocument);
    } catch {
      // API indisponível — lista vazia
    } finally {
      loading.value = false;
    }
  }

  async function createDocument(payload: DocumentPayload) {
    if (!auth.currentUser) throw new Error("Precisa iniciar sessão.");
    if (auth.activeRole === "ROLE_USUARIO") throw new Error("O utilizador base não pode criar documentos.");

    try {
      const body: Record<string, unknown> = {
        titulo: payload.title,
        resumo: payload.summary,
        autores: payload.authors,
        instituicao: payload.institutionId,
        tipoDeDocumento: payload.type,
        categorias: [],
        tags: [],
      };
      if (payload.coverUrl) body.capaUrl = payload.coverUrl;
      const created = await auth.apiRequest<any>("/documento", { method: "POST", body });
      const doc = mapDocument(created);
      documents.value = [doc, ...documents.value];
      toast.success("Documento criado com sucesso.");
      return doc;
    } catch (error) {
      throw new Error(toFriendlyApiErrorMessage(error, "Não foi possível criar o documento."));
    }
  }

  function getDocumentById(id: string) {
    return documents.value.find((d) => d.id === id) ?? null;
  }

  async function fetchDocumentById(id: string): Promise<AppDocument | null> {
    try {
      const data = await auth.apiRequest<any>(`/documento/${id}`, { method: "GET" });
      return data ? mapDocument(data) : null;
    } catch {
      return null;
    }
  }

  async function updateDocument(documentId: string, changes: Partial<AppDocument>) {
    const oldDoc = documents.value.find((d) => d.id === documentId);
    documents.value = documents.value.map((item) =>
      item.id === documentId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item,
    );
    try {
      const body: Record<string, unknown> = {};
      if (changes.title !== undefined) body.titulo = changes.title;
      if (changes.summary !== undefined) body.resumo = changes.summary;
      if (changes.authors !== undefined) body.autores = changes.authors;
      if (changes.type !== undefined) body.tipoDeDocumento = changes.type;
      if (changes.status !== undefined) body.status = changes.status;
      if (changes.coverUrl !== undefined) body.capaUrl = changes.coverUrl;
      if (changes.categories !== undefined) body.categorias = changes.categories;
      if (changes.tags !== undefined) body.tags = changes.tags;
      await auth.apiRequest(`/documento/${documentId}`, { method: "PATCH", body });
    } catch (error) {
      if (oldDoc) {
        documents.value = documents.value.map((item) =>
          item.id === documentId ? oldDoc : item,
        );
      }
      throw error;
    }
  }

  async function updateDocumentMetadata(
    documentId: string,
    payload: { title: string; summary: string; type: AppDocument["type"]; authors: string[]; categories: string[]; tags: string[] },
  ) {
    await updateDocument(documentId, {
      title: payload.title,
      summary: payload.summary,
      type: payload.type,
      authors: payload.authors,
      categories: payload.categories,
      tags: payload.tags,
    });
  }

  async function markAiProcessed(documentId: string) {
    const doc = documents.value.find((item) => item.id === documentId);
    if (!doc) throw new Error("Documento não encontrado.");
    await updateDocument(documentId, {
      status: "AGUARDANDO_CONFIRMACAO_USUARIO",
      summary: doc.summary || "Resumo gerado pela IA.",
      type: doc.type === "INDEFINIDO" ? "RELATORIO" : doc.type,
      authors: doc.authors.length ? doc.authors : [auth.currentUser?.nome ?? "Autor"],
      tags: doc.tags.length ? doc.tags : ["ia", "revisao"],
      categories: doc.categories.length ? doc.categories : ["Classificação IA"],
    });
  }

  async function confirmUserMetadata(documentId: string) {
    await updateDocument(documentId, { status: "PENDENTE_REVISAO_ADMIN" });
  }

  function addReviewHistory(documentId: string, action: "APROVADO" | "REJEITADO" | "PUBLICADO", reason?: string) {
    const user = auth.currentUser;
    if (!user || !auth.activeRole) return;
    const doc = documents.value.find((d) => d.id === documentId);
    if (!doc) return;
    updateDocument(documentId, {
      reviewHistory: [
        ...doc.reviewHistory,
        {
          id: `${documentId}-rev-${Date.now()}`,
          action,
          reviewerId: user.id,
          reviewerName: user.nome,
          reviewerRole: auth.activeRole,
          reason,
          decidedAt: new Date().toISOString(),
        },
      ],
    });
  }

  async function approveDocument(documentId: string, reason?: string) {
    try {
      await auth.apiRequest(`/documento/${documentId}/aprovar`, { method: "PATCH" });
      updateDocument(documentId, { status: "APROVADO" });
      addReviewHistory(documentId, "APROVADO", reason);
      toast.success("Documento aprovado com sucesso.");
    } catch {
      updateDocument(documentId, { status: "APROVADO" });
      addReviewHistory(documentId, "APROVADO", reason);
    }
  }

  async function rejectDocument(documentId: string, reason?: string) {
    try {
      await auth.apiRequest(`/documento/${documentId}/rejeitar`, {
        method: "PATCH",
        body: { motivoRejeicao: reason },
      });
      updateDocument(documentId, { status: "REJEITADO" });
      addReviewHistory(documentId, "REJEITADO", reason);
      toast.success("Documento rejeitado.");
    } catch {
      updateDocument(documentId, { status: "REJEITADO" });
      addReviewHistory(documentId, "REJEITADO", reason);
    }
  }

  async function publishDocument(documentId: string, reason?: string) {
    try {
      await auth.apiRequest(`/documento/${documentId}/publicar`, { method: "PATCH" });
      updateDocument(documentId, { status: "PUBLICADO" });
      addReviewHistory(documentId, "PUBLICADO", reason);
      toast.success("Documento publicado com sucesso.");
    } catch {
      updateDocument(documentId, { status: "PUBLICADO" });
      addReviewHistory(documentId, "PUBLICADO", reason);
    }
  }

  async function uploadCoverImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await auth.apiRequest<any>("/upload/capa", {
      method: "POST",
      body: formData,
    });
    return res.url;
  }

  async function uploadDocumentFile(
    file: File,
    documentoId: string,
  ): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documento", documentoId);
    await auth.apiRequest<void>("/upload", {
      method: "POST",
      body: formData,
    });
  }

  async function fetchAISuggestions(documentId: string): Promise<AISuggestion | null> {
    try {
      const path = `/ia/documentos/${documentId}/metadados`;
      console.log(`🔍 A buscar metadados IA em: ${path}`);
      const list = await auth.apiRequest<any[]>(path, {
        method: "GET",
      });
      console.log("📦 Resposta do backend:", list);
      if (list && list.length > 0) {
        console.log("📦 Primeiro item:", list[0]);
        return mapAISuggestions(list[0]);
      }
      console.warn("⚠️ Lista vazia ou nula");
    } catch (e) {
      console.error("❌ Erro ao buscar metadados da IA:", e);
    }
    return null;
  }

  return {
    documents,
    loading,
    myDocuments,
    loadDocuments,
    createDocument,
    uploadCoverImage,
    uploadDocumentFile,
    fetchAISuggestions,
    fetchDocumentById,
    getDocumentById,
    updateDocument,
    updateDocumentMetadata,
    markAiProcessed,
    confirmUserMetadata,
    approveDocument,
    rejectDocument,
    publishDocument,
  };
});
