<script setup lang="ts">
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
} from "@headlessui/vue";
import { ErrorMessage, Field, Form } from "vee-validate";
import { useToast } from "vue-toastification";
import { toFriendlyApiErrorMessage } from "~/utils/api";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const inst = useInstitutionsStore();
const toast = useToast();
const { getDocumentTypeLabel, getDocumentStatusMeta, getRoleMeta, documentTypeOptions } = usePlatformMeta();

const search = ref("");
const selectedStatus = ref("");
const selectedType = ref("");
const selectedInstitution = ref("");
const selectedCategory = ref<string[]>([]);
const selectedTag = ref<string[]>([]);
const showOnlyMine = ref(true);

const filteredDocuments = computed(() =>
    docs.myDocuments.filter((document) => {
        const matchesSearch =
            !search.value ||
            `${document.title} ${(document.authors ?? []).join(" ")} ${document.userName ?? ""} ${(document.categories ?? []).join(" ")} ${(document.tags ?? []).join(" ")}`
                .toLowerCase()
                .includes(search.value.toLowerCase());
        const matchesStatus =
            !selectedStatus.value || document.status === selectedStatus.value;
        const matchesType =
            !selectedType.value || document.type === selectedType.value;
        const matchesInstitution =
            !selectedInstitution.value || document.institutionId === selectedInstitution.value;
        const matchesCategory =
            !selectedCategory.value.length ||
            (document.categories ?? []).some((c) => selectedCategory.value.includes(c));
        const matchesTag =
            !selectedTag.value.length ||
            (document.tags ?? []).some((t) => selectedTag.value.includes(t));
        const matchesOwner =
            !showOnlyMine.value ||
            document.userId === auth.currentUser?.id;
        return matchesSearch && matchesStatus && matchesType && matchesInstitution && matchesCategory && matchesTag && matchesOwner;
    }),
);

const availableCategories = computed(() => {
    const cats = new Set<string>();
    docs.myDocuments.forEach((d) => (d.categories ?? []).forEach((c) => cats.add(c)));
    return Array.from(cats).sort();
});

const availableTags = computed(() => {
    const tags = new Set<string>();
    docs.myDocuments.forEach((d) => (d.tags ?? []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
});

// Detail modal
const detailOpen = ref(false);
const selectedDocId = ref<string | null>(null);
const aiSuggestionsDetail = ref<import("~/types/platform").AISuggestion | null>(null);
const showAiSuggestionsDetail = computed(() =>
    aiSuggestionsDetail.value?.pendenteConfirmacao ? aiSuggestionsDetail.value : null,
);

const detailLatestTech = computed(() => {
    if (showAiSuggestionsDetail.value?.tecnologiasSugeridas?.length) {
        return showAiSuggestionsDetail.value.tecnologiasSugeridas;
    }
    return (selectedDoc.value?.tecnologiasSugeridas ?? []).map(t => ({ valor: t, confianca: 0 }));
});

const detailLatestFrameworks = computed(() => {
    if (showAiSuggestionsDetail.value?.frameworksSugeridos?.length) {
        return showAiSuggestionsDetail.value.frameworksSugeridos;
    }
    return (selectedDoc.value?.frameworksSugeridos ?? []).map(f => ({ valor: f, confianca: 0 }));
});

const detailLatestKeywords = computed(() => {
    if (showAiSuggestionsDetail.value?.palavrasChaveIA?.length) {
        return showAiSuggestionsDetail.value.palavrasChaveIA;
    }
    return (selectedDoc.value?.palavrasChaveIA ?? []).map(k => ({ valor: k, confianca: 0 }));
});

const detailHasAnyAiData = computed(() =>
    detailLatestTech.value.length > 0 || detailLatestFrameworks.value.length > 0 || detailLatestKeywords.value.length > 0
);
const loadingAiDetail = ref(false);

const selectedDoc = computed(() => {
    if (!selectedDocId.value) return null;
    return docs.myDocuments.find((d) => d.id === selectedDocId.value) ?? null;
});

const isOwner = computed(() => selectedDoc.value?.userId === auth.currentUser?.id);

const canEditMetadata = computed(
    () =>
        Boolean(selectedDoc.value) &&
        ["AGUARDANDO_CONFIRMACAO_USUARIO", "DRAFT"].includes(
            selectedDoc.value?.status ?? "",
        ) &&
        (isOwner.value ||
            ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"].includes(
                auth.activeRole ?? "",
            )),
);

const editTypeOptions = computed(() => {
    const base = [...documentTypeOptions];
    if (
        selectedDoc.value?.type === "INDEFINIDO" &&
        !base.some((item) => item.value === "INDEFINIDO")
    ) {
        base.push({ value: "INDEFINIDO", label: "Indefinido" });
    }
    return base;
});

const editable = reactive({
    title: "",
    summary: "",
    type: "RELATORIO" as string,
    authors: "",
    categories: "",
    tags: "",
});

const savingMetadata = ref(false);
const confirmingMetadata = ref(false);
const processingAction = ref<string | null>(null);

const selectedTechDetail = ref<Set<string>>(new Set());
const selectedFrameworksDetail = ref<Set<string>>(new Set());
const selectedKeywordsDetail = ref<Set<string>>(new Set());

const manualTechInput = ref('');
const manualTech = ref<string[]>([]);
const manualFrameworksInput = ref('');
const manualFrameworks = ref<string[]>([]);
const manualKeywordsInput = ref('');
const manualKeywords = ref<string[]>([]);

watchEffect(() => {
    if (showAiSuggestionsDetail.value) {
        selectedTechDetail.value = new Set(showAiSuggestionsDetail.value.tecnologiasSugeridas?.map(t => t.valor) ?? []);
        selectedFrameworksDetail.value = new Set(showAiSuggestionsDetail.value.frameworksSugeridos?.map(f => f.valor) ?? []);
        selectedKeywordsDetail.value = new Set(showAiSuggestionsDetail.value.palavrasChaveIA?.map(k => k.valor) ?? []);
    }
});

function toggleTechDetail(valor: string) {
    const s = new Set(selectedTechDetail.value);
    s.has(valor) ? s.delete(valor) : s.add(valor);
    selectedTechDetail.value = s;
}
function toggleFrameworkDetail(valor: string) {
    const s = new Set(selectedFrameworksDetail.value);
    s.has(valor) ? s.delete(valor) : s.add(valor);
    selectedFrameworksDetail.value = s;
}
function toggleKeywordDetail(valor: string) {
    const s = new Set(selectedKeywordsDetail.value);
    s.has(valor) ? s.delete(valor) : s.add(valor);
    selectedKeywordsDetail.value = s;
}

function addManualTech() {
    const v = manualTechInput.value.trim();
    if (v && !manualTech.value.includes(v)) manualTech.value.push(v);
    manualTechInput.value = '';
}
function removeManualTech(valor: string) {
    manualTech.value = manualTech.value.filter(t => t !== valor);
}
function addManualFramework() {
    const v = manualFrameworksInput.value.trim();
    if (v && !manualFrameworks.value.includes(v)) manualFrameworks.value.push(v);
    manualFrameworksInput.value = '';
}
function removeManualFramework(valor: string) {
    manualFrameworks.value = manualFrameworks.value.filter(f => f !== valor);
}
function addManualKeyword() {
    const v = manualKeywordsInput.value.trim();
    if (v && !manualKeywords.value.includes(v)) manualKeywords.value.push(v);
    manualKeywordsInput.value = '';
}
function removeManualKeyword(valor: string) {
    manualKeywords.value = manualKeywords.value.filter(k => k !== valor);
}

watchEffect(() => {
    if (!selectedDoc.value) return;
    editable.title = selectedDoc.value.title;
    editable.summary = selectedDoc.value.summary;
    editable.type = selectedDoc.value.type;
    editable.authors = selectedDoc.value.authors.join(", ");
    editable.categories = selectedDoc.value.categories.join(", ");
    editable.tags = selectedDoc.value.tags.join(", ");
});

function openDetail(id: string) {
    selectedDocId.value = id;
    detailOpen.value = true;
    carregarSugestoesIADetail(id);
}

async function carregarSugestoesIADetail(documentId: string) {
    loadingAiDetail.value = true;
    try {
        const data = await docs.fetchAISuggestions(documentId);
        aiSuggestionsDetail.value = data;
        if (data) {
            if (!editable.title) editable.title = `${data.tituloSugerido} (${data.tituloConfianca}%)`;
            if (!editable.summary) editable.summary = data.resumoGeradoIA;
            if (!editable.categories) editable.categories = `${data.categoriaSugerida} (${data.categoriaConfianca}%)`;
            if (!editable.tags) editable.tags = data.tagsSugeridas.map(t => t.valor).join(", ");
        }
    } catch {
        aiSuggestionsDetail.value = null;
    } finally {
        loadingAiDetail.value = false;
    }
}

function closeDetail() {
    detailOpen.value = false;
    aiSuggestionsDetail.value = null;
}

async function handleConfirmClick() {
    if (!selectedDoc.value) return;
    confirmingMetadata.value = true;
    try {
        if (aiSuggestionsDetail.value) {
            editable.title = stripConfidence(aiSuggestionsDetail.value.tituloSugerido || editable.title);
            editable.summary = aiSuggestionsDetail.value.resumoGeradoIA || editable.summary;
            editable.categories = stripConfidence(aiSuggestionsDetail.value.categoriaSugerida || editable.categories);
            editable.tags = aiSuggestionsDetail.value.tagsSugeridas.map(t => t.valor).join(", ") || editable.tags;
        }
        await docs.updateDocumentMetadata(selectedDoc.value.id, {
            title: stripConfidence(editable.title),
            summary: editable.summary,
            type: editable.type as never,
            authors: editable.authors.split(",").map((a) => a.trim()).filter(Boolean),
            categories: editable.categories.split(",").map((c) => stripConfidence(c.trim())).filter(Boolean),
            tags: editable.tags.split(",").map((t) => t.trim()).filter(Boolean),
        });
        await docs.confirmUserMetadata(selectedDoc.value.id, {
            tecnologiasSugeridas: [...selectedTechDetail.value, ...manualTech.value],
            frameworksSugeridos: [...selectedFrameworksDetail.value, ...manualFrameworks.value],
            palavrasChaveIA: [...selectedKeywordsDetail.value, ...manualKeywords.value],
        });
        toast.success("Metadados confirmados.");
        closeDetail();
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível confirmar os metadados."));
    } finally {
        confirmingMetadata.value = false;
    }
}

function stripConfidence(val: string): string {
    return val.replace(/\s*\(\d+%\)$/, "");
}

function focusField(field: "title" | "categories") {
    editable[field] = stripConfidence(editable[field]);
}

async function handleAction(fn: () => Promise<void>) {
    try {
        await fn();
        closeDetail();
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível executar a ação."));
    }
}

async function saveMetadata() {
    if (!selectedDoc.value) return;
    savingMetadata.value = true;
    try {
        await docs.updateDocumentMetadata(selectedDoc.value.id, {
            title: stripConfidence(editable.title),
            summary: editable.summary,
            type: editable.type as never,
            authors: editable.authors
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            categories: editable.categories
                .split(",")
                .map((item) => stripConfidence(item.trim()))
                .filter(Boolean),
            tags: editable.tags
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
        });
        toast.success("Metadados guardados.");
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível guardar os metadados."));
    } finally {
        savingMetadata.value = false;
    }
}

// Create modal
const createOpen = ref(false);
const aiAutoFill = ref(false);
const uploadedFiles = ref<File[]>([]);
const coverFile = ref<File | null>(null);
const coverPreview = ref("");
const uploadingCover = ref(false);

const createSchema = {
    title: (value: string) =>
        aiAutoFill.value || Boolean(value) || "Informe o título.",
    summary: (value: string) =>
        aiAutoFill.value || Boolean(value) || "Informe o resumo.",
    institutionId: (value: string) =>
        Boolean(value) || "Selecione a instituição.",
    type: (value: string) =>
        aiAutoFill.value || Boolean(value) || "Selecione o tipo de documento.",
};

function handleCoverFile(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    coverFile.value = file;
    coverPreview.value = URL.createObjectURL(file);
}

const isDragging = ref(false);

function handleFilesChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        uploadedFiles.value = [...uploadedFiles.value, ...Array.from(target.files)];
    }
}

function handleDrop(event: DragEvent) {
    isDragging.value = false;
    if (event.dataTransfer?.files.length) {
        uploadedFiles.value = [...uploadedFiles.value, ...Array.from(event.dataTransfer.files)];
    }
}

function removeFile(index: number) {
    uploadedFiles.value = uploadedFiles.value.filter((_, i) => i !== index);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function onCreateSubmit(values: Record<string, string | boolean>) {
    try {
        const isRepo = values.type === "REPOSITORIO";

        let coverUrl = "";
        if (coverFile.value && !isRepo) {
            uploadingCover.value = true;
            try {
                coverUrl = await docs.uploadCoverImage(coverFile.value);
            } finally {
                uploadingCover.value = false;
            }
        }

        const document = await docs.createDocument({
            title: String(values.title || ""),
            summary: String(values.summary || ""),
            authors: String(values.authors || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            institutionId: String(values.institutionId),
            type: values.type ? values.type as never : "INDEFINIDO" as never,
            categories: String(values.categories || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            tags: String(values.tags || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            files: [],
            coverUrl: coverUrl,
            submitForReview: aiAutoFill.value
                ? false
                : Boolean(values.submitForReview),
            aiAutoFill: aiAutoFill.value,
        });

        if (uploadedFiles.value.length) {
            try {
                await Promise.all(
                    uploadedFiles.value.map((file) =>
                        docs.uploadDocumentFile(file, document.id),
                    ),
                );
                toast.success("Ficheiros enviados com sucesso.");
            } catch (e: any) {
                console.error("📂 Upload error:", e, e?.message, e?.stack);
                toast.warning("Documento criado mas alguns ficheiros não foram enviados.");
            }
        }

        if (isRepo && values.gitUrl) {
            try {
                await auth.apiRequest(`/ia/documentos/${document.id}/git-url`, {
                    method: "POST",
                    body: {
                        gitUrl: String(values.gitUrl),
                        tecnologiasUsadas: String(values.tecnologias || "")
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean),
                    },
                });
                toast.success("Repositório GitHub associado com sucesso.");
            } catch {
                toast.warning("Documento criado mas não foi possível associar o repositório.");
            }
        }

        createOpen.value = false;
        aiAutoFill.value = false;
        uploadedFiles.value = [];
        coverFile.value = null;
        coverPreview.value = "";
        if (isRepo) navigateTo("/repositorios");
        else if (values.type === "ZIP") navigateTo("/zip");
        else navigateTo("/documentos");
    } catch (error) {
        toast.error(
            toFriendlyApiErrorMessage(
                error,
                "Não foi possível criar o documento.",
            ),
        );
    }
}
</script>

<template>
    <div class="space-y-6">
        <div
            class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
        >
            <div>
                <p
                    class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500"
                >
                    Conteúdo
                </p>
                <h1 class="mt-2 text-3xl font-black text-slate-950">
                    Documentos
                </h1>
            </div>
            <button
                v-if="auth.activeRole !== 'ROLE_USUARIO'"
                class="btn-primary"
                @click="createOpen = true"
            >
                Novo documento
            </button>
        </div>

        <section class="card grid gap-4 p-5 md:grid-cols-4">
            <div>
                <label class="label-base">Pesquisar</label>
                <input
                    v-model="search"
                    class="input-base"
                    placeholder="Título, autor, instituição..."
                />
            </div>
            <div>
                <label class="label-base">Estado</label>
                <select v-model="selectedStatus" class="input-base">
                    <option value="">Todos</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="PENDENTE_REVISAO_ADMIN">
                        Pendente revisão
                    </option>
                    <option value="PUBLICADO">Publicado</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="REJEITADO">Rejeitado</option>
                </select>
            </div>
            <div>
                <label class="label-base">Tipo</label>
                <select v-model="selectedType" class="input-base">
                    <option value="">Todos</option>
                    <option value="MONOGRAFIA">Monografia</option>
                    <option value="RELATORIO">Relatório</option>
                    <option value="ARTIGO">Artigo</option>
                    <option value="REPOSITORIO">Repositório</option>
                    <option value="ZIP">Ficheiro ZIP</option>
                    <option value="LIVRO">Livro</option>
                    <option value="SEMINARIO">Seminário</option>
                    <option value="INDEFINIDO">Indefinido (IA)</option>
                </select>
            </div>
            <div>
                <SearchSelect
                    :model-value="selectedInstitution"
                    :options="inst.institutions.map(i => ({ value: i.id, label: i.name }))"
                    placeholder="Todas"
                    label="Instituição"
                    @update:model-value="(v: any) => selectedInstitution = v"
                />
            </div>
            <div>
                <SearchSelect
                    :model-value="selectedCategory"
                    :options="availableCategories.map(c => ({ value: c, label: c }))"
                    placeholder="Todas"
                    label="Categoria"
                    multiple
                    @update:model-value="(v: any) => selectedCategory = v"
                />
            </div>
            <div>
                <SearchSelect
                    :model-value="selectedTag"
                    :options="availableTags.map(t => ({ value: t, label: t }))"
                    placeholder="Todas"
                    label="Tag"
                    multiple
                    @update:model-value="(v: any) => selectedTag = v"
                />
            </div>
            <div class="flex items-end">
                <label class="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 cursor-pointer hover:border-indigo-200 w-full">
                    <input v-model="showOnlyMine" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Os meus documentos
                </label>
            </div>
        </section>

        <section
            class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
            <article
                v-for="document in filteredDocuments"
                :key="document.id"
                class="card cursor-pointer overflow-hidden transition hover:border-indigo-200 hover:shadow-md"
                @click="openDetail(document.id)"
            >
                <div class="relative h-48 bg-gradient-to-br from-indigo-100 to-slate-200">
                    <img
                        v-if="document.coverUrl"
                        :src="document.coverUrl"
                        alt=""
                        class="h-full w-full object-cover"
                    />
                    <div
                        v-else
                        class="flex flex-col items-center justify-center gap-2"
                    >
                        <Icon
                            name="heroicons:document-text"
                            class="h-12 w-12 text-slate-400"
                        />
                        <span class="text-xs font-medium text-slate-500">
                            {{ getDocumentTypeLabel(document.type) }}
                        </span>
                    </div>
                    <div class="absolute right-2 top-2">
                        <DocumentStatusBadge :status="document.status" :userId="document.userId" />
                    </div>
                </div>
                <div class="p-4">
                    <h2 class="line-clamp-2 text-sm font-bold text-slate-950 leading-snug min-h-[2.5rem]">
                        {{ document.title }}
                    </h2>
                    <p v-if="document.authors.length" class="mt-1.5 text-xs text-slate-500">
                        {{ document.authors.slice(0, 2).join(", ") }}
                        <template v-if="document.authors.length > 2"> et al.</template>
                    </p>
                    <p class="mt-1 line-clamp-1 text-xs text-slate-400">
                        {{ inst.getInstitutionName(document.institutionId) || "—" }}
                    </p>
                    <p class="mt-1.5 line-clamp-2 text-xs text-slate-400">
                        {{ document.summary || "Sem resumo." }}
                    </p>
                </div>
            </article>

            <p
                v-if="!filteredDocuments.length"
                class="card col-span-full p-10 text-center text-sm text-slate-500"
            >
                Nenhum documento encontrado para os filtros atuais.
            </p>
        </section>

        <!-- Detail modal -->
        <TransitionRoot :show="detailOpen" as="template">
            <Dialog as="div" class="relative z-50" @close="closeDetail">
                <TransitionChild
                    as="template"
                    enter="ease-out duration-200"
                    enter-from="opacity-0"
                    enter-to="opacity-100"
                    leave="ease-in duration-150"
                    leave-from="opacity-100"
                    leave-to="opacity-0"
                >
                    <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]" />
                </TransitionChild>

                <div class="fixed inset-0 overflow-y-auto">
                    <div class="flex min-h-full items-start justify-center p-4 pt-12">
                        <TransitionChild
                            as="template"
                            enter="ease-out duration-200"
                            enter-from="opacity-0 translate-y-8"
                            enter-to="opacity-100 translate-y-0"
                            leave="ease-in duration-150"
                            leave-from="opacity-100 translate-y-0"
                            leave-to="opacity-0 translate-y-8"
                        >
                            <DialogPanel
                                v-if="selectedDoc"
                                class="w-full max-w-5xl rounded-3xl bg-white p-8 shadow-2xl"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-3">
                                            <DialogTitle class="text-2xl font-bold text-slate-950 truncate">
                                                {{ selectedDoc.title || "Sem título" }}
                                            </DialogTitle>
                                            <DocumentStatusBadge :status="selectedDoc.status" :userId="selectedDoc.userId" />
                                        </div>
                                    </div>
                                    <button
                                        class="btn-ghost shrink-0"
                                        @click="closeDetail"
                                    >
                                        <Icon name="heroicons:x-mark" class="h-5 w-5" />
                                    </button>
                                </div>

                                <div class="mt-4 flex flex-wrap items-center gap-3">
                                    <span class="badge bg-slate-100 text-slate-700">
                                        {{ getDocumentTypeLabel(selectedDoc.type) }}
                                    </span>
                                    <span class="text-sm text-slate-500">{{ selectedDoc.summary }}</span>
                                </div>

                                <div class="mt-5 flex flex-wrap gap-3">
                                    <button
                                        v-if="selectedDoc.status === 'AGUARDANDO_CONFIRMACAO_USUARIO'"
                                        class="btn-primary"
                                        :disabled="confirmingMetadata"
                                        @click="handleConfirmClick"
                                    >
                                        {{ confirmingMetadata ? 'A confirmar...' : 'Confirmar metadados' }}
                                    </button>
                                    <button
                                        v-if="
                                            selectedDoc.status === 'PENDENTE_REVISAO_ADMIN' &&
                                            ['ROLE_ADMIN', 'ROLE_ADMIN_INSTITUICAO'].includes(
                                                auth.activeRole ?? '',
                                            )
                                        "
                                        class="btn-primary"
                                        :disabled="processingAction === 'approve'"
                                        @click="handleAction(async () => { processingAction = 'approve'; await docs.approveDocument(selectedDoc!.id); processingAction = null; })"
                                    >
                                        {{ processingAction === 'approve' ? 'A aprovar...' : 'Aprovar' }}
                                    </button>
                                    <button
                                        v-if="
                                            selectedDoc.status === 'PENDENTE_REVISAO_ADMIN' &&
                                            ['ROLE_ADMIN', 'ROLE_ADMIN_INSTITUICAO'].includes(
                                                auth.activeRole ?? '',
                                            )
                                        "
                                        class="btn-secondary"
                                        :disabled="processingAction === 'reject'"
                                        @click="handleAction(async () => { processingAction = 'reject'; await docs.rejectDocument(selectedDoc!.id); processingAction = null; })"
                                    >
                                        {{ processingAction === 'reject' ? 'A rejeitar...' : 'Rejeitar' }}
                                    </button>
                                    <button
                                        v-if="
                                            selectedDoc.status === 'APROVADO' &&
                                            auth.activeRole === 'ROLE_ADMIN'
                                        "
                                        class="btn-primary"
                                        :disabled="processingAction === 'publish'"
                                        @click="handleAction(async () => { processingAction = 'publish'; await docs.publishDocument(selectedDoc!.id); processingAction = null; })"
                                    >
                                        {{ processingAction === 'publish' ? 'A publicar...' : 'Publicar' }}
                                    </button>
                                </div>

                                <div v-if="showAiSuggestionsDetail?.conflitosDetectados?.length" class="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                                    <div class="flex items-start gap-3">
                                        <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                                        <div>
                                            <h3 class="text-sm font-bold text-red-800">Conflitos detectados pela IA</h3>
                                            <ul class="mt-1 list-inside list-disc text-sm text-red-700">
                                                <li v-for="conflito in showAiSuggestionsDetail.conflitosDetectados" :key="conflito">
                                                    {{ conflito }}
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div v-if="canEditMetadata" class="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                                    <div class="flex items-start gap-3">
                                        <Icon name="heroicons:sparkles" class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                        <div>
                                            <h3 class="text-sm font-bold text-amber-900">Metadados gerados pela IA</h3>
                                            <p class="mt-1 text-sm text-amber-700">
                                                Os campos abaixo foram preenchidos automaticamente. Reveja e ajuste antes de confirmar.
                                            </p>
                                        </div>
                                    </div>

                                    <div class="mt-4 grid gap-4 md:grid-cols-2">
                                        <div class="md:col-span-2">
                                            <label class="label-base">Título</label>
                                            <input v-model="editable.title" class="input-base" @focus="focusField('title')" />
                                            <div v-if="showAiSuggestionsDetail?.tituloSugerido" class="mt-1 flex flex-wrap gap-1">
                                                <span class="badge bg-amber-50 text-amber-700 text-xs cursor-pointer hover:bg-amber-100"
                                                    @click="editable.title = `${showAiSuggestionsDetail.tituloSugerido} (${showAiSuggestionsDetail.tituloConfianca}%)`">
                                                    {{ showAiSuggestionsDetail.tituloSugerido }} ({{ showAiSuggestionsDetail.tituloConfianca }}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="label-base">Resumo</label>
                                            <textarea v-model="editable.summary" class="input-base min-h-24" />
                                            <div v-if="showAiSuggestionsDetail?.resumoGeradoIA" class="mt-1 flex flex-wrap gap-1">
                                                <span class="badge bg-amber-50 text-amber-700 text-xs cursor-pointer hover:bg-amber-100"
                                                    @click="editable.summary = showAiSuggestionsDetail.resumoGeradoIA">
                                                    Usar resumo da IA
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="label-base">Tipo</label>
                                            <select v-model="editable.type" class="input-base">
                                                <option v-for="item in editTypeOptions" :key="item.value" :value="item.value">
                                                    {{ item.label }}
                                                </option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="label-base">Autores</label>
                                            <input v-model="editable.authors" class="input-base" placeholder="Autor 1, Autor 2" />
                                        </div>
                                        <div>
                                            <label class="label-base">Categorias</label>
                                            <input v-model="editable.categories" class="input-base" placeholder="Web, IA" @focus="focusField('categories')" />
                                            <div v-if="showAiSuggestionsDetail?.categoriaSugerida" class="mt-1 flex flex-wrap gap-1">
                                                <span class="badge bg-amber-50 text-amber-700 text-xs cursor-pointer hover:bg-amber-100"
                                                    @click="editable.categories = showAiSuggestionsDetail.categoriaSugerida">
                                                    {{ showAiSuggestionsDetail.categoriaSugerida }} ({{ showAiSuggestionsDetail.categoriaConfianca }}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="label-base">Tags</label>
                                            <input v-model="editable.tags" class="input-base" placeholder="nuxt, spring" />
                                            <div v-if="showAiSuggestionsDetail?.tagsSugeridas.length" class="mt-1 flex flex-wrap gap-1">
                                                <span
                                                    v-for="tag in showAiSuggestionsDetail.tagsSugeridas"
                                                    :key="tag.valor"
                                                    class="badge bg-indigo-50 text-indigo-700 text-xs cursor-pointer hover:bg-indigo-100"
                                                    @click="editable.tags = tag.valor"
                                                >
                                                    {{ tag.valor }} ({{ tag.confianca }}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="label-base">Palavras-chave</label>
                                            <div class="mt-1 flex flex-wrap gap-1">
                                                <template v-if="showAiSuggestionsDetail?.palavrasChaveIA?.length">
                                                    <span
                                                        v-for="kw in showAiSuggestionsDetail.palavrasChaveIA"
                                                        :key="kw.valor"
                                                        class="text-xs cursor-pointer select-none"
                                                        :class="selectedKeywordsDetail.has(kw.valor) ? 'badge bg-amber-500 text-white' : 'badge bg-amber-50 text-amber-700 hover:bg-amber-100'"
                                                        @click="toggleKeywordDetail(kw.valor)"
                                                    >
                                                        {{ kw.valor }} ({{ kw.confianca }}%)
                                                    </span>
                                                </template>
                                                <span v-else class="text-xs text-slate-400">Nenhuma sugestão.</span>
                                            </div>
                                            <div v-if="manualKeywords.length" class="mt-1 flex flex-wrap gap-1">
                                                <span v-for="kw in manualKeywords" :key="kw" class="badge bg-amber-200 text-amber-800 text-xs flex items-center gap-1">
                                                    {{ kw }}
                                                    <button class="text-amber-600 hover:text-amber-800 font-bold" @click="removeManualKeyword(kw)">&times;</button>
                                                </span>
                                            </div>
                                            <div class="mt-2 flex gap-1">
                                                <input v-model="manualKeywordsInput" class="input-base flex-1 text-xs" placeholder="Adicionar manualmente..." @keydown.enter="addManualKeyword" />
                                                <button class="btn-secondary text-xs" @click="addManualKeyword">+</button>
                                            </div>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="label-base">Tecnologias</label>
                                            <div class="mt-1 flex flex-wrap gap-1">
                                                <template v-if="showAiSuggestionsDetail?.tecnologiasSugeridas?.length">
                                                    <span
                                                        v-for="tec in showAiSuggestionsDetail.tecnologiasSugeridas"
                                                        :key="tec.valor"
                                                        class="text-xs cursor-pointer select-none"
                                                        :class="selectedTechDetail.has(tec.valor) ? 'badge bg-emerald-500 text-white' : 'badge bg-emerald-50 text-emerald-700 hover:bg-emerald-100'"
                                                        @click="toggleTechDetail(tec.valor)"
                                                    >
                                                        {{ tec.valor }} ({{ tec.confianca }}%)
                                                    </span>
                                                </template>
                                                <span v-else class="text-xs text-slate-400">Nenhuma sugestão.</span>
                                            </div>
                                            <div v-if="manualTech.length" class="mt-1 flex flex-wrap gap-1">
                                                <span v-for="t in manualTech" :key="t" class="badge bg-emerald-200 text-emerald-800 text-xs flex items-center gap-1">
                                                    {{ t }}
                                                    <button class="text-emerald-600 hover:text-emerald-800 font-bold" @click="removeManualTech(t)">&times;</button>
                                                </span>
                                            </div>
                                            <div class="mt-2 flex gap-1">
                                                <input v-model="manualTechInput" class="input-base flex-1 text-xs" placeholder="Adicionar manualmente..." @keydown.enter="addManualTech" />
                                                <button class="btn-secondary text-xs" @click="addManualTech">+</button>
                                            </div>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="label-base">Frameworks</label>
                                            <div class="mt-1 flex flex-wrap gap-1">
                                                <template v-if="showAiSuggestionsDetail?.frameworksSugeridos?.length">
                                                    <span
                                                        v-for="fw in showAiSuggestionsDetail.frameworksSugeridos"
                                                        :key="fw.valor"
                                                        class="text-xs cursor-pointer select-none"
                                                        :class="selectedFrameworksDetail.has(fw.valor) ? 'badge bg-purple-500 text-white' : 'badge bg-purple-50 text-purple-700 hover:bg-purple-100'"
                                                        @click="toggleFrameworkDetail(fw.valor)"
                                                    >
                                                        {{ fw.valor }} ({{ fw.confianca }}%)
                                                    </span>
                                                </template>
                                                <span v-else class="text-xs text-slate-400">Nenhuma sugestão.</span>
                                            </div>
                                            <div v-if="manualFrameworks.length" class="mt-1 flex flex-wrap gap-1">
                                                <span v-for="fw in manualFrameworks" :key="fw" class="badge bg-purple-200 text-purple-800 text-xs flex items-center gap-1">
                                                    {{ fw }}
                                                    <button class="text-purple-600 hover:text-purple-800 font-bold" @click="removeManualFramework(fw)">&times;</button>
                                                </span>
                                            </div>
                                            <div class="mt-2 flex gap-1">
                                                <input v-model="manualFrameworksInput" class="input-base flex-1 text-xs" placeholder="Adicionar manualmente..." @keydown.enter="addManualFramework" />
                                                <button class="btn-secondary text-xs" @click="addManualFramework">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-4 flex justify-end">
                                        <button class="btn-primary" :disabled="savingMetadata" @click="saveMetadata">
                                            {{ savingMetadata ? "A guardar..." : "Guardar alterações" }}
                                        </button>
                                    </div>
                                </div>

                                <div class="mt-6 grid gap-6 md:grid-cols-2">
                                    <div>
                                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Detalhes
                                        </p>
                                        <dl class="mt-3 space-y-3 text-sm text-slate-600">
                                            <div>
                                                <dt class="font-semibold text-slate-900">Estado</dt>
                                                <dd class="mt-1"><DocumentStatusBadge :status="selectedDoc.status" :userId="selectedDoc.userId" /></dd>
                                            </div>
                                            <div>
                                                <dt class="font-semibold text-slate-900">Instituição</dt>
                                                <dd>{{ inst.getInstitutionName(selectedDoc.institutionId) }}</dd>
                                            </div>
                                            <div>
                                                <dt class="font-semibold text-slate-900">Autores</dt>
                                                <dd>{{ selectedDoc.authors.join(", ") || "—" }}</dd>
                                            </div>
                                            <div>
                                                <dt class="font-semibold text-slate-900">Atualizado</dt>
                                                <dd>{{ new Date(selectedDoc.updatedAt).toLocaleString() }}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <div>
                                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Classificação
                                        </p>
                                        <div class="mt-3">
                                            <p class="text-xs font-semibold text-slate-500">Categorias</p>
                                            <div class="mt-1 flex flex-wrap gap-2">
                                                <span v-for="cat in selectedDoc.categories" :key="cat" class="badge bg-slate-100 text-slate-700">{{ cat }}</span>
                                                <span v-if="!selectedDoc.categories.length" class="text-sm text-slate-400">—</span>
                                            </div>
                                        </div>
                                        <div class="mt-3">
                                            <p class="text-xs font-semibold text-slate-500">Tags</p>
                                            <div class="mt-1 flex flex-wrap gap-2">
                                                <span v-for="tag in selectedDoc.tags" :key="tag" class="badge bg-indigo-50 text-indigo-700">#{{ tag }}</span>
                                                <span v-if="!selectedDoc.tags.length" class="text-sm text-slate-400">—</span>
                                            </div>
                                        </div>
                                        <div v-if="selectedDoc.tecnologiasSugeridas?.length" class="mt-3">
                                            <p class="text-xs font-semibold text-slate-500">Tecnologias</p>
                                            <div class="mt-1 flex flex-wrap gap-2">
                                                <span v-for="t in selectedDoc.tecnologiasSugeridas" :key="t" class="badge bg-emerald-50 text-emerald-700">{{ t }}</span>
                                            </div>
                                        </div>
                                        <div v-if="selectedDoc.frameworksSugeridos?.length" class="mt-3">
                                            <p class="text-xs font-semibold text-slate-500">Frameworks</p>
                                            <div class="mt-1 flex flex-wrap gap-2">
                                                <span v-for="f in selectedDoc.frameworksSugeridos" :key="f" class="badge bg-purple-50 text-purple-700">{{ f }}</span>
                                            </div>
                                        </div>
                                        <div v-if="selectedDoc.palavrasChaveIA?.length" class="mt-3">
                                            <p class="text-xs font-semibold text-slate-500">Palavras-chave</p>
                                            <div class="mt-1 flex flex-wrap gap-2">
                                                <span v-for="k in selectedDoc.palavrasChaveIA" :key="k" class="badge bg-amber-50 text-amber-700">{{ k }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div v-if="detailHasAnyAiData" class="mt-6 border-t border-slate-100 pt-6">
                                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                                        {{ showAiSuggestionsDetail ? 'Sugestões da IA' : 'Análise da IA' }}
                                    </p>
                                    <div v-if="detailLatestKeywords.length" class="mb-3">
                                        <span class="text-xs text-slate-500">Palavras-chave:</span>
                                        <div class="mt-1 flex flex-wrap gap-1">
                                            <span v-for="kw in detailLatestKeywords" :key="kw.valor" class="badge bg-amber-50 text-amber-700 text-xs">
                                                {{ kw.valor }}<template v-if="kw.confianca"> ({{ kw.confianca }}%)</template>
                                            </span>
                                        </div>
                                    </div>
                                    <div v-if="detailLatestTech.length" class="mb-3">
                                        <span class="text-xs text-slate-500">Tecnologias:</span>
                                        <div class="mt-1 flex flex-wrap gap-1">
                                            <span v-for="tec in detailLatestTech" :key="tec.valor" class="badge bg-emerald-50 text-emerald-700 text-xs">
                                                {{ tec.valor }}<template v-if="tec.confianca"> ({{ tec.confianca }}%)</template>
                                            </span>
                                        </div>
                                    </div>
                                    <div v-if="detailLatestFrameworks.length">
                                        <span class="text-xs text-slate-500">Frameworks:</span>
                                        <div class="mt-1 flex flex-wrap gap-1">
                                            <span v-for="fw in detailLatestFrameworks" :key="fw.valor" class="badge bg-purple-50 text-purple-700 text-xs">
                                                {{ fw.valor }}<template v-if="fw.confianca"> ({{ fw.confianca }}%)</template>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div v-if="selectedDoc.files.length" class="mt-6">
                                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Ficheiros
                                    </p>
                                    <div class="mt-2 flex flex-wrap gap-2">
                                        <a
                                            v-for="file in selectedDoc.files"
                                            :key="file.nome"
                                            :href="file.url"
                                            target="_blank"
                                            class="badge bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:underline"
                                        >
                                            {{ file.nome }}
                                        </a>
                                    </div>
                                </div>

                                <div v-if="selectedDoc.reviewHistory.length" class="mt-6">
                                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Histórico de decisões
                                    </p>
                                    <ul class="mt-2 space-y-2">
                                        <li v-for="entry in selectedDoc.reviewHistory" :key="entry.id" class="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                                            <p class="font-semibold text-slate-900">
                                                {{ getDocumentStatusMeta(entry.action).label }}
                                            </p>
                                            <p>{{ entry.reviewerName }} · {{ getRoleMeta(entry.reviewerRole).label }} · {{ new Date(entry.decidedAt).toLocaleString() }}</p>
                                            <p v-if="entry.reason" class="text-slate-500">Motivo: {{ entry.reason }}</p>
                                        </li>
                                    </ul>
                                </div>

                                <div class="mt-6 flex justify-between border-t border-slate-200 pt-6">
                                    <button class="btn-secondary" @click="closeDetail">Fechar</button>
                                    <NuxtLink
                                        :to="`/documentos/${selectedDoc.id}`"
                                        class="btn-primary"
                                        @click="closeDetail"
                                    >
                                        Abrir página completa
                                    </NuxtLink>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>

        <!-- Create modal -->
        <TransitionRoot :show="createOpen" as="template">
            <Dialog as="div" class="relative z-50" @close="createOpen = false">
                <TransitionChild
                    as="template"
                    enter="ease-out duration-200"
                    enter-from="opacity-0"
                    enter-to="opacity-100"
                    leave="ease-in duration-150"
                    leave-from="opacity-100"
                    leave-to="opacity-0"
                >
                    <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]" />
                </TransitionChild>

                <div class="fixed inset-0 overflow-y-auto">
                    <div class="flex min-h-full items-start justify-center p-4 pt-12">
                        <TransitionChild
                            as="template"
                            enter="ease-out duration-200"
                            enter-from="opacity-0 translate-y-8"
                            enter-to="opacity-100 translate-y-0"
                            leave="ease-in duration-150"
                            leave-from="opacity-100 translate-y-0"
                            leave-to="opacity-0 translate-y-8"
                        >
                            <DialogPanel class="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
                                <div class="flex items-start justify-between gap-4">
                                    <div>
                                        <DialogTitle class="text-2xl font-bold text-slate-950">
                                            Novo documento
                                        </DialogTitle>
                                        <p class="mt-2 text-sm text-slate-500">
                                            Preencha os dados do documento.
                                        </p>
                                    </div>
                                    <button
                                        class="btn-ghost shrink-0"
                                        @click="createOpen = false"
                                    >
                                        <Icon name="heroicons:x-mark" class="h-5 w-5" />
                                    </button>
                                </div>

                                <Form
                                    :validation-schema="createSchema"
                                    class="mt-6 grid gap-5 md:grid-cols-2"
                                    @submit="onCreateSubmit"
                                    v-slot="{ setFieldValue, values }"
                                >
                                    <div class="md:col-span-2">
                                        <label class="label-base">Título</label>
                                        <Field
                                            name="title"
                                            class="input-base"
                                            placeholder="Título do documento"
                                            :disabled="aiAutoFill"
                                        />
                                        <ErrorMessage name="title" class="mt-2 block text-sm text-rose-600" />
                                    </div>

                                    <div class="md:col-span-2">
                                        <label class="label-base">Resumo</label>
                                        <Field
                                            as="textarea"
                                            name="summary"
                                            class="input-base min-h-28"
                                            placeholder="Resumo do conteúdo"
                                            :disabled="aiAutoFill"
                                        />
                                        <ErrorMessage name="summary" class="mt-2 block text-sm text-rose-600" />
                                    </div>

                                    <div>
                                        <label class="label-base">Tipo de documento</label>
                                        <Field as="select" name="type" class="input-base" :disabled="aiAutoFill">
                                            <option value="">Selecionar...</option>
                                            <option v-for="item in documentTypeOptions" :key="item.value" :value="item.value">
                                                {{ item.label }}
                                            </option>
                                        </Field>
                                        <ErrorMessage name="type" class="mt-2 block text-sm text-rose-600" />
                                    </div>

                                    <div>
                                        <Field v-slot="{ setValue }" name="institutionId">
                                            <SearchSelect
                                                :model-value="values.institutionId || ''"
                                                :options="inst.institutions.map(i => ({ value: i.id, label: i.name }))"
                                                placeholder="Selecionar..."
                                                label="Instituição"
                                                @update:model-value="(v: any) => setValue(v)"
                                            />
                                        </Field>
                                        <ErrorMessage name="institutionId" class="mt-2 block text-sm text-rose-600" />
                                    </div>

                                    <div>
                                        <label class="label-base">Autores</label>
                                        <Field name="authors" class="input-base" placeholder="Autor 1, Autor 2" :disabled="aiAutoFill" />
                                    </div>

                                    <div>
                                        <label class="label-base">Categorias</label>
                                        <Field name="categories" class="input-base" placeholder="Web, DevOps, IA" :disabled="aiAutoFill" />
                                    </div>

                                    <div>
                                        <label class="label-base">Tags</label>
                                        <Field name="tags" class="input-base" placeholder="nuxt, spring, github" :disabled="aiAutoFill" />
                                    </div>

                                    <template v-if="values?.type === 'REPOSITORIO'">
                                        <div class="md:col-span-2">
                                            <label class="label-base">URL do GitHub</label>
                                            <Field
                                                name="gitUrl"
                                                class="input-base"
                                                placeholder="https://github.com/organizacao/projecto"
                                            />
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="label-base">Tecnologias</label>
                                            <Field
                                                name="tecnologias"
                                                class="input-base"
                                                placeholder="Nuxt, TailwindCSS, Spring Boot"
                                                :disabled="aiAutoFill"
                                            />
                                        </div>
                                    </template>

                                    <template v-if="values?.type !== 'REPOSITORIO'">
                                        <div class="md:col-span-2">
                                            <label class="label-base">Ficheiros</label>
                                            <div
                                                class="relative mt-1"
                                                @dragenter.prevent="isDragging = true"
                                                @dragover.prevent="isDragging = true"
                                                @dragleave.prevent="isDragging = false"
                                                @drop.prevent="handleDrop"
                                            >
                                                <div
                                                    class="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 transition"
                                                    :class="
                                                        isDragging
                                                            ? 'border-indigo-400 bg-indigo-50'
                                                            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                                                    "
                                                >
                                                    <Icon name="heroicons:cloud-arrow-up" class="h-10 w-10 text-slate-400" />
                                                    <div class="text-center">
                                                        <p class="text-sm font-medium text-slate-700">
                                                            Arraste ficheiros ou
                                                            <label class="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-700">
                                                                clique para selecionar
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    class="hidden"
                                                                    @change="handleFilesChange"
                                                                />
                                                            </label>
                                                        </p>
                                                        <p class="mt-1 text-xs text-slate-500">
                                                            PDF, DOC, ZIP, imagens e outros formatos
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div v-if="uploadedFiles.length" class="mt-4 space-y-2">
                                                <p class="text-xs font-semibold text-slate-500">
                                                    {{ uploadedFiles.length }} ficheiro(s) selecionado(s)
                                                </p>
                                                <div
                                                    v-for="(file, index) in uploadedFiles"
                                                    :key="file.name + index"
                                                    class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                                                >
                                                    <Icon name="heroicons:document" class="h-5 w-5 shrink-0 text-slate-400" />
                                                    <div class="min-w-0 flex-1">
                                                        <p class="truncate text-sm font-medium text-slate-900">
                                                            {{ file.name }}
                                                        </p>
                                                        <p class="text-xs text-slate-500">
                                                            {{ formatFileSize(file.size) }}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        class="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                        @click="removeFile(index)"
                                                    >
                                                        <Icon name="heroicons:trash" class="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="md:col-span-2">
                                            <label class="label-base">Capa do documento</label>
                                            <div
                                                class="mt-1 flex items-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 px-6 py-6 transition hover:border-slate-400"
                                            >
                                                <div v-if="coverPreview" class="flex items-center gap-4">
                                                    <img
                                                        :src="coverPreview"
                                                        alt=""
                                                        class="h-20 w-14 rounded-xl border border-slate-200 object-cover shadow-sm"
                                                    />
                                                    <div>
                                                        <p class="text-sm font-medium text-slate-700">Capa selecionada</p>
                                                        <button
                                                            type="button"
                                                            class="mt-1 text-sm text-rose-600 hover:text-rose-700"
                                                            @click="coverFile = null; coverPreview = ''"
                                                        >
                                                            Remover
                                                        </button>
                                                    </div>
                                                </div>
                                                <label
                                                    v-else
                                                    class="flex w-full cursor-pointer items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                                                >
                                                    <Icon name="heroicons:photo" class="h-5 w-5" />
                                                    <span>Clique para selecionar uma imagem de capa</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        class="hidden"
                                                        @change="handleCoverFile"
                                                    />
                                                </label>
                                            </div>
                                            <p v-if="uploadingCover" class="mt-2 text-xs text-indigo-600">
                                                A enviar capa para Cloudinary…
                                            </p>
                                        </div>
                                    </template>

                                    <label class="md:col-span-2 inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
                                        <input
                                            v-model="aiAutoFill"
                                            type="checkbox"
                                            class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Upload rápido sem metadados (IA preenche resumo, tipo, autores, tags e categorias)
                                    </label>

                                    <div v-if="aiAutoFill" class="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                        A IA irá analisar o ficheiro e colocar o documento em
                                        <strong>Em processamento</strong>. Depois o estado ficará
                                        <strong>Aguarda confirmação</strong> para validação dos metadados.
                                    </div>

                                    <label class="md:col-span-2 inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
                                        <Field
                                            name="submitForReview"
                                            type="checkbox"
                                            class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            :value="true"
                                            :unchecked-value="false"
                                            :disabled="aiAutoFill"
                                        />
                                        Submeter imediatamente para revisão administrativa
                                    </label>

                                    <div class="md:col-span-2 flex justify-end gap-3">
                                        <button type="button" class="btn-secondary" @click="createOpen = false">
                                            Cancelar
                                        </button>
                                        <button class="btn-primary" type="submit">
                                            Guardar documento
                                        </button>
                                    </div>
                                </Form>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>
    </div>
</template>
