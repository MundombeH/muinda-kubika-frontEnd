<script setup lang="ts">
import { useToast } from "vue-toastification";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const inst = useInstitutionsStore();
const toast = useToast();
const route = useRoute();
const { getDocumentTypeLabel, getDocumentStatusMeta, getRoleMeta, documentTypeOptions } = usePlatformMeta();
const { toFriendlyApiErrorMessage } = await import("~/utils/api");

const documentId = computed(() => String(route.params.id));
const visibleDocuments = computed(() => {
    if (auth.activeRole === "ROLE_ADMIN" || auth.activeRole === "ROLE_ADMIN_INSTITUICAO") {
        return docs.documents;
    }
    return docs.myDocuments;
});

const documentItem = computed(() =>
    visibleDocuments.value.find((item) => item.id === documentId.value),
);

const isOwner = computed(
    () => documentItem.value?.userId === auth.currentUser?.id,
);
const canEditMetadata = computed(
    () =>
        Boolean(documentItem.value) &&
        ["AGUARDANDO_CONFIRMACAO_USUARIO", "DRAFT"].includes(
            documentItem.value?.status ?? "",
        ) &&
        (isOwner.value ||
            ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"].includes(
                auth.activeRole ?? "",
            )),
);

const repository = computed(() => {
    if (!documentItem.value || documentItem.value.type !== "REPOSITORIO") return null;
    if (!documentItem.value.urlGithub) return null;
    return {
        urlGithub: documentItem.value.urlGithub,
        tecnologiasUsadas: documentItem.value.tecnologiasUsadas,
    };
});

const editTypeOptions = computed(() => {
    const base = [...documentTypeOptions];
    if (
        documentItem.value?.type === "INDEFINIDO" &&
        !base.some((item) => item.value === "INDEFINIDO")
    ) {
        base.push({ value: "INDEFINIDO", label: "Indefinido" } as never);
    }
    return base;
});

const editable = reactive({
    title: "",
    summary: "",
    type: "RELATORIO",
    authors: "",
    categories: "",
    tags: "",
});

const aiSuggestions = ref<import("~/types/platform").AISuggestion | null>(null);
const showAiSuggestions = computed(() =>
    aiSuggestions.value?.pendenteConfirmacao ? aiSuggestions.value : null,
);

const latestTech = computed(() => {
    if (showAiSuggestions.value?.tecnologiasSugeridas?.length) {
        return showAiSuggestions.value.tecnologiasSugeridas;
    }
    return (documentItem.value?.tecnologiasSugeridas ?? []).map(t => ({ valor: t, confianca: 0 }));
});

const latestFrameworks = computed(() => {
    if (showAiSuggestions.value?.frameworksSugeridos?.length) {
        return showAiSuggestions.value.frameworksSugeridos;
    }
    return (documentItem.value?.frameworksSugeridos ?? []).map(f => ({ valor: f, confianca: 0 }));
});

const latestKeywords = computed(() => {
    if (showAiSuggestions.value?.palavrasChaveIA?.length) {
        return showAiSuggestions.value.palavrasChaveIA;
    }
    return (documentItem.value?.palavrasChaveIA ?? []).map(k => ({ valor: k, confianca: 0 }));
});

const hasAnyAiData = computed(() =>
    latestTech.value.length > 0 || latestFrameworks.value.length > 0 || latestKeywords.value.length > 0
);
const loadingAi = ref(false);
const saving = ref(false);
const confirming = ref(false);
const processingAction = ref<string | null>(null);

const selectedTech = ref<Set<string>>(new Set());
const selectedFrameworks = ref<Set<string>>(new Set());
const selectedKeywords = ref<Set<string>>(new Set());

const manualTechInput = ref('');
const manualTech = ref<string[]>([]);
const manualFrameworksInput = ref('');
const manualFrameworks = ref<string[]>([]);
const manualKeywordsInput = ref('');
const manualKeywords = ref<string[]>([]);

watchEffect(() => {
    if (showAiSuggestions.value) {
        selectedTech.value = new Set(showAiSuggestions.value.tecnologiasSugeridas?.map(t => t.valor) ?? []);
        selectedFrameworks.value = new Set(showAiSuggestions.value.frameworksSugeridos?.map(f => f.valor) ?? []);
        selectedKeywords.value = new Set(showAiSuggestions.value.palavrasChaveIA?.map(k => k.valor) ?? []);
    }
});

function toggleTech(valor: string) {
    const s = new Set(selectedTech.value);
    s.has(valor) ? s.delete(valor) : s.add(valor);
    selectedTech.value = s;
}
function toggleFramework(valor: string) {
    const s = new Set(selectedFrameworks.value);
    s.has(valor) ? s.delete(valor) : s.add(valor);
    selectedFrameworks.value = s;
}
function toggleKeyword(valor: string) {
    const s = new Set(selectedKeywords.value);
    s.has(valor) ? s.delete(valor) : s.add(valor);
    selectedKeywords.value = s;
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
    if (!documentItem.value) return;
    editable.title = documentItem.value.title;
    editable.summary = documentItem.value.summary;
    editable.type = documentItem.value.type;
    editable.authors = documentItem.value.authors.join(", ");
    editable.categories = documentItem.value.categories.join(", ");
    editable.tags = documentItem.value.tags.join(", ");
    carregarSugestoesIA();
});

function stripConfidence(val: string): string {
    return val.replace(/\s*\(\d+%\)$/, "");
}

function focusField(field: "title" | "categories") {
    editable[field] = stripConfidence(editable[field]);
}

function preencherComSugestoesIA(sug: import("~/types/platform").AISuggestion) {
    if (!sug) return;
    if (!editable.title) editable.title = `${sug.tituloSugerido} (${sug.tituloConfianca}%)`;
    if (!editable.summary) editable.summary = sug.resumoGeradoIA;
    if (!editable.categories) editable.categories = `${sug.categoriaSugerida} (${sug.categoriaConfianca}%)`;
    if (!editable.tags) editable.tags = sug.tagsSugeridas.map(t => t.valor).join(", ");
}

async function carregarSugestoesIA() {
    if (!documentItem.value) return;
    loadingAi.value = true;
    try {
        const data = await docs.fetchAISuggestions(documentItem.value.id);
        aiSuggestions.value = data;
        if (data) preencherComSugestoesIA(data);
    } catch {
        aiSuggestions.value = null;
    } finally {
        loadingAi.value = false;
    }
}

async function handleConfirmMetadata() {
    if (!documentItem.value) return;
    confirming.value = true;
    try {
        if (aiSuggestions.value) {
            editable.title = stripConfidence(aiSuggestions.value.tituloSugerido || editable.title);
            editable.summary = aiSuggestions.value.resumoGeradoIA || editable.summary;
            editable.categories = stripConfidence(aiSuggestions.value.categoriaSugerida || editable.categories);
            editable.tags = aiSuggestions.value.tagsSugeridas.map(t => t.valor).join(", ") || editable.tags;
        }
        await docs.updateDocumentMetadata(documentItem.value.id, {
            title: stripConfidence(editable.title),
            summary: editable.summary,
            type: editable.type as never,
            authors: editable.authors.split(",").map((a) => a.trim()).filter(Boolean),
            categories: editable.categories.split(",").map((c) => stripConfidence(c.trim())).filter(Boolean),
            tags: editable.tags.split(",").map((t) => t.trim()).filter(Boolean),
        });
        await docs.confirmUserMetadata(documentItem.value.id, {
            tecnologiasSugeridas: [...selectedTech.value, ...manualTech.value],
            frameworksSugeridos: [...selectedFrameworks.value, ...manualFrameworks.value],
            palavrasChaveIA: [...selectedKeywords.value, ...manualKeywords.value],
        });
        toast.success("Metadados confirmados.");
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível confirmar os metadados."));
    } finally {
        confirming.value = false;
    }
}

async function handleApproveDocument() {
    if (!documentItem.value) return;
    processingAction.value = "approve";
    try {
        await docs.approveDocument(documentItem.value.id);
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível aprovar o documento."));
    } finally {
        processingAction.value = null;
    }
}

async function handleRejectDocument() {
    if (!documentItem.value) return;
    processingAction.value = "reject";
    try {
        await docs.rejectDocument(documentItem.value.id);
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível rejeitar o documento."));
    } finally {
        processingAction.value = null;
    }
}

async function handlePublishDocument() {
    if (!documentItem.value) return;
    processingAction.value = "publish";
    try {
        await docs.publishDocument(documentItem.value.id);
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível publicar o documento."));
    } finally {
        processingAction.value = null;
    }
}

async function saveMetadata() {
    if (!documentItem.value) return;
    saving.value = true;
    try {
        await docs.updateDocumentMetadata(documentItem.value.id, {
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
        saving.value = false;
    }
}

if (!documentItem.value) {
    await navigateTo("/documentos");
}
</script>

<template>
    <div v-if="documentItem" class="space-y-6">
        <NuxtLink
            :to="documentItem.type === 'REPOSITORIO' ? '/repositorios' : documentItem.type === 'ZIP' ? '/zip' : '/documentos'"
            class="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
            <Icon name="heroicons:arrow-left" class="h-4 w-4" />
            {{ documentItem.type === 'REPOSITORIO' ? 'Voltar aos repositórios' : documentItem.type === 'ZIP' ? 'Voltar aos ZIP' : 'Voltar aos documentos' }}
        </NuxtLink>

        <div
            class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
            <div class="min-w-0">
                <p
                    class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500"
                >
                    Documento
                </p>
                <h1 class="mt-2 text-3xl font-black text-slate-950 truncate">
                    {{ documentItem.title || "Sem título" }}
                </h1>
                <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500 line-clamp-3">
                    {{ documentItem.summary || "Nenhum resumo disponível." }}
                </p>
            </div>
            <DocumentStatusBadge :status="documentItem.status" :userId="documentItem.userId" />
        </div>

        <div class="flex flex-wrap gap-3">
            <button
                v-if="documentItem.status === 'AGUARDANDO_CONFIRMACAO_USUARIO'"
                class="btn-primary"
                :disabled="confirming"
                @click="handleConfirmMetadata"
            >
                <template v-if="confirming">A confirmar...</template>
                <template v-else>Confirmar metadados</template>
            </button>
            <button
                v-if="
                    documentItem.status === 'PENDENTE_REVISAO_ADMIN' &&
                    ['ROLE_ADMIN', 'ROLE_ADMIN_INSTITUICAO'].includes(
                        auth.activeRole ?? '',
                    )
                "
                class="btn-primary"
                :disabled="processingAction === 'approve'"
                @click="handleApproveDocument"
            >
                <template v-if="processingAction === 'approve'">A aprovar...</template>
                <template v-else>Aprovar documento</template>
            </button>
            <button
                v-if="
                    documentItem.status === 'PENDENTE_REVISAO_ADMIN' &&
                    ['ROLE_ADMIN', 'ROLE_ADMIN_INSTITUICAO'].includes(
                        auth.activeRole ?? '',
                    )
                "
                class="btn-secondary"
                :disabled="processingAction === 'reject'"
                @click="handleRejectDocument"
            >
                <template v-if="processingAction === 'reject'">A rejeitar...</template>
                <template v-else>Rejeitar documento</template>
            </button>
            <button
                v-if="
                    documentItem.status === 'APROVADO' &&
                    auth.activeRole === 'ROLE_ADMIN'
                "
                class="btn-primary"
                :disabled="processingAction === 'publish'"
                @click="handlePublishDocument"
            >
                <template v-if="processingAction === 'publish'">A publicar...</template>
                <template v-else>Publicar documento</template>
            </button>
        </div>

        <section v-if="showAiSuggestions?.conflitosDetectados?.length" class="rounded-xl border border-red-200 bg-red-50 p-4">
            <div class="flex items-start gap-3">
                <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                    <h3 class="text-sm font-bold text-red-800">Conflitos detectados pela IA</h3>
                    <ul class="mt-1 list-inside list-disc text-sm text-red-700">
                        <li v-for="conflito in showAiSuggestions.conflitosDetectados" :key="conflito">
                            {{ conflito }}
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <section v-if="canEditMetadata" class="card p-6">
            <div class="flex items-start gap-3">
                <Icon name="heroicons:sparkles" class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                    <h2 class="text-lg font-bold text-slate-950">Editar metadados</h2>
                    <p class="mt-1 text-sm text-slate-500">
                        Ajuste os dados gerados pela IA antes de enviar para revisão.
                    </p>
                </div>
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-2">
                <div class="md:col-span-2">
                    <label class="label-base">Título</label>
                    <input v-model="editable.title" class="input-base" @focus="focusField('title')" />
                    <div v-if="showAiSuggestions?.tituloSugerido" class="mt-1 flex flex-wrap gap-1">
                        <span class="badge bg-amber-50 text-amber-700 text-xs cursor-pointer hover:bg-amber-100"
                            @click="editable.title = `${showAiSuggestions.tituloSugerido} (${showAiSuggestions.tituloConfianca}%)`">
                            {{ showAiSuggestions.tituloSugerido }} ({{ showAiSuggestions.tituloConfianca }}%)
                        </span>
                    </div>
                </div>
                <div class="md:col-span-2">
                    <label class="label-base">Resumo</label>
                    <textarea
                        v-model="editable.summary"
                        class="input-base min-h-28"
                    />
                    <div v-if="showAiSuggestions?.resumoGeradoIA" class="mt-1 flex flex-wrap gap-1">
                        <span class="badge bg-amber-50 text-amber-700 text-xs cursor-pointer hover:bg-amber-100"
                            @click="editable.summary = showAiSuggestions.resumoGeradoIA">
                            Usar resumo da IA
                        </span>
                    </div>
                </div>
                <div>
                    <label class="label-base">Tipo</label>
                    <select v-model="editable.type" class="input-base">
                        <option
                            v-for="item in editTypeOptions"
                            :key="item.value"
                            :value="item.value"
                        >
                            {{ item.label }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="label-base">Autores</label>
                    <input
                        v-model="editable.authors"
                        class="input-base"
                        placeholder="Autor 1, Autor 2"
                    />
                </div>
                <div>
                    <label class="label-base">Categorias</label>
                    <input
                        v-model="editable.categories"
                        class="input-base"
                        placeholder="Web, IA"
                        @focus="focusField('categories')"
                    />
                    <div v-if="showAiSuggestions?.categoriaSugerida" class="mt-1 flex flex-wrap gap-1">
                        <span class="badge bg-amber-50 text-amber-700 text-xs cursor-pointer hover:bg-amber-100"
                            @click="editable.categories = showAiSuggestions.categoriaSugerida">
                            {{ showAiSuggestions.categoriaSugerida }} ({{ showAiSuggestions.categoriaConfianca }}%)
                        </span>
                    </div>
                </div>
                <div>
                    <label class="label-base">Tags</label>
                    <input
                        v-model="editable.tags"
                        class="input-base"
                        placeholder="nuxt, spring"
                    />
                    <div v-if="showAiSuggestions?.tagsSugeridas.length" class="mt-1 flex flex-wrap gap-1">
                        <span
                            v-for="tag in showAiSuggestions.tagsSugeridas"
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
                        <template v-if="showAiSuggestions?.palavrasChaveIA?.length">
                            <span
                                v-for="kw in showAiSuggestions.palavrasChaveIA"
                                :key="kw.valor"
                                class="text-xs cursor-pointer select-none"
                                :class="selectedKeywords.has(kw.valor) ? 'badge bg-amber-500 text-white' : 'badge bg-amber-50 text-amber-700 hover:bg-amber-100'"
                                @click="toggleKeyword(kw.valor)"
                            >
                                {{ kw.valor }} ({{ kw.confianca }}%)
                            </span>
                        </template>
                        <span v-else class="text-xs text-slate-400">Nenhuma sugestão.</span>
                    </div>
                    <div v-if="manualKeywords.length" class="mt-1 flex flex-wrap gap-1">
                        <span
                            v-for="kw in manualKeywords"
                            :key="kw"
                            class="badge bg-amber-200 text-amber-800 text-xs flex items-center gap-1"
                        >
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
                        <template v-if="showAiSuggestions?.tecnologiasSugeridas?.length">
                            <span
                                v-for="tec in showAiSuggestions.tecnologiasSugeridas"
                                :key="tec.valor"
                                class="text-xs cursor-pointer select-none"
                                :class="selectedTech.has(tec.valor) ? 'badge bg-emerald-500 text-white' : 'badge bg-emerald-50 text-emerald-700 hover:bg-emerald-100'"
                                @click="toggleTech(tec.valor)"
                            >
                                {{ tec.valor }} ({{ tec.confianca }}%)
                            </span>
                        </template>
                        <span v-else class="text-xs text-slate-400">Nenhuma sugestão.</span>
                    </div>
                    <div v-if="manualTech.length" class="mt-1 flex flex-wrap gap-1">
                        <span
                            v-for="t in manualTech"
                            :key="t"
                            class="badge bg-emerald-200 text-emerald-800 text-xs flex items-center gap-1"
                        >
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
                        <template v-if="showAiSuggestions?.frameworksSugeridos?.length">
                            <span
                                v-for="fw in showAiSuggestions.frameworksSugeridos"
                                :key="fw.valor"
                                class="text-xs cursor-pointer select-none"
                                :class="selectedFrameworks.has(fw.valor) ? 'badge bg-purple-500 text-white' : 'badge bg-purple-50 text-purple-700 hover:bg-purple-100'"
                                @click="toggleFramework(fw.valor)"
                            >
                                {{ fw.valor }} ({{ fw.confianca }}%)
                            </span>
                        </template>
                        <span v-else class="text-xs text-slate-400">Nenhuma sugestão.</span>
                    </div>
                    <div v-if="manualFrameworks.length" class="mt-1 flex flex-wrap gap-1">
                        <span
                            v-for="fw in manualFrameworks"
                            :key="fw"
                            class="badge bg-purple-200 text-purple-800 text-xs flex items-center gap-1"
                        >
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
            <div class="mt-5 flex justify-end">
                <button class="btn-primary" :disabled="saving" @click="saveMetadata">
                    {{ saving ? "A guardar..." : "Guardar metadados" }}
                </button>
            </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div class="card p-6">
                <h2 class="text-lg font-bold text-slate-950">
                    Detalhes principais
                </h2>
                <dl class="mt-4 space-y-4 text-sm text-slate-600">
                    <div>
                        <dt class="font-semibold text-slate-900">Resumo</dt>
                        <dd class="mt-1 text-slate-500">
                            {{ documentItem.summary || "Nenhum resumo disponível." }}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-semibold text-slate-900">Tipo</dt>
                        <dd class="mt-1">
                            {{ getDocumentTypeLabel(documentItem.type) }}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-semibold text-slate-900">Versão</dt>
                        <dd class="mt-1">
                            {{ documentItem.version ?? "—" }}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-semibold text-slate-900">
                            Instituição
                        </dt>
                        <dd class="mt-1">
                            {{
                                inst.getInstitutionName(
                                    documentItem.institutionId,
                                )
                            }}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-semibold text-slate-900">Autores</dt>
                        <dd class="mt-1">
                            {{ documentItem.authors.join(", ") || "—" }}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-semibold text-slate-900">Criado por</dt>
                        <dd class="mt-1">
                            {{ documentItem.userName || "—" }}
                        </dd>
                    </div>
                    <div v-if="documentItem.approvedByName">
                        <dt class="font-semibold text-slate-900">Aprovado por</dt>
                        <dd class="mt-1">
                            {{ documentItem.approvedByName }}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-semibold text-slate-900">
                            Última atualização
                        </dt>
                        <dd class="mt-1">
                            {{
                                new Date(
                                    documentItem.updatedAt,
                                ).toLocaleString()
                            }}
                        </dd>
                    </div>
                    <div v-if="repository">
                        <dt class="font-semibold text-slate-900">Repositório</dt>
                        <dd class="mt-1">
                            <a
                                :href="repository.urlGithub"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                {{ repository.urlGithub }}
                                <Icon name="heroicons:arrow-top-right-on-square" class="h-3.5 w-3.5" />
                            </a>
                        </dd>
                    </div>
                </dl>
                <div v-if="repository?.tecnologiasUsadas?.length" class="mt-5 border-t border-slate-100 pt-5">
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tecnologias</p>
                    <div class="flex flex-wrap gap-2">
                        <span
                            v-for="tech in repository.tecnologiasUsadas"
                            :key="tech"
                            class="badge bg-emerald-50 text-emerald-700"
                        >
                            {{ tech }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="card p-6">
                <h2 class="text-lg font-bold text-slate-950">Classificação</h2>
                <div class="mt-4">
                    <p
                        class="text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                        Categorias
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <span
                            v-for="category in documentItem.categories"
                            :key="category"
                            class="badge bg-slate-100 text-slate-700"
                        >
                            {{ category }}
                        </span>
                        <span
                            v-if="!documentItem.categories.length"
                            class="text-sm text-slate-500"
                            >Sem categorias.</span
                        >
                    </div>
                </div>
                <div class="mt-5">
                    <p
                        class="text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                        Tags
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <span
                            v-for="tag in documentItem.tags"
                            :key="tag"
                            class="badge bg-indigo-50 text-indigo-700"
                            >#{{ tag }}</span
                        >
                        <span
                            v-if="!documentItem.tags.length"
                            class="text-sm text-slate-500"
                            >Sem tags.</span
                        >
                    </div>
                </div>
                <div v-if="documentItem.tecnologiasSugeridas?.length" class="mt-5">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Tecnologias</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <span
                            v-for="t in documentItem.tecnologiasSugeridas"
                            :key="t"
                            class="badge bg-emerald-50 text-emerald-700"
                        >{{ t }}</span>
                    </div>
                </div>
                <div v-if="documentItem.frameworksSugeridos?.length" class="mt-5">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Frameworks</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <span
                            v-for="f in documentItem.frameworksSugeridos"
                            :key="f"
                            class="badge bg-purple-50 text-purple-700"
                        >{{ f }}</span>
                    </div>
                </div>
                <div v-if="documentItem.palavrasChaveIA?.length" class="mt-5">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Palavras-chave</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <span
                            v-for="k in documentItem.palavrasChaveIA"
                            :key="k"
                            class="badge bg-amber-50 text-amber-700"
                        >{{ k }}</span>
                    </div>
                </div>

                <div v-if="hasAnyAiData" class="mt-6 border-t border-slate-100 pt-6">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                        {{ showAiSuggestions ? 'Sugestões da IA' : 'Análise da IA' }}
                    </p>
                    <div v-if="showAiSuggestions?.subcategoriaSugerida" class="mb-3">
                        <span class="text-xs text-slate-500">Subcategoria:</span>
                        <span class="ml-1 text-sm font-medium text-slate-700">{{ showAiSuggestions.subcategoriaSugerida }} ({{ showAiSuggestions.subcategoriaConfianca }}%)</span>
                    </div>
                    <div v-if="latestKeywords.length" class="mb-3">
                        <span class="text-xs text-slate-500">Palavras-chave:</span>
                        <div class="mt-1 flex flex-wrap gap-1">
                            <span v-for="kw in latestKeywords" :key="kw.valor" class="badge bg-amber-50 text-amber-700 text-xs">
                                {{ kw.valor }}<template v-if="kw.confianca"> ({{ kw.confianca }}%)</template>
                            </span>
                        </div>
                    </div>
                    <div v-if="latestTech.length" class="mb-3">
                        <span class="text-xs text-slate-500">Tecnologias:</span>
                        <div class="mt-1 flex flex-wrap gap-1">
                            <span v-for="tec in latestTech" :key="tec.valor" class="badge bg-emerald-50 text-emerald-700 text-xs">
                                {{ tec.valor }}<template v-if="tec.confianca"> ({{ tec.confianca }}%)</template>
                            </span>
                        </div>
                    </div>
                    <div v-if="latestFrameworks.length">
                        <span class="text-xs text-slate-500">Frameworks:</span>
                        <div class="mt-1 flex flex-wrap gap-1">
                            <span v-for="fw in latestFrameworks" :key="fw.valor" class="badge bg-purple-50 text-purple-700 text-xs">
                                {{ fw.valor }}<template v-if="fw.confianca"> ({{ fw.confianca }}%)</template>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="card p-6">
            <h2 class="text-lg font-bold text-slate-950">
                Ficheiros associados
            </h2>
            <div class="mt-4 flex flex-wrap gap-3">
                <a
                    v-for="file in documentItem.files"
                    :key="file.nome"
                    :href="file.url"
                    target="_blank"
                    class="badge bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:underline"
                >
                    {{ file.nome }}
                </a>
                <span
                    v-if="!documentItem.files.length"
                    class="text-sm text-slate-500"
                    >Sem ficheiros associados.</span
                >
            </div>
        </section>

        <section v-if="documentItem.reviewHistory.length" class="card p-6">
            <h2 class="text-lg font-bold text-slate-950">
                Histórico de decisões
            </h2>
            <ul class="mt-4 space-y-3 text-sm text-slate-600">
                <li
                    v-for="entry in documentItem.reviewHistory"
                    :key="entry.id"
                    class="rounded-xl border border-slate-200 px-4 py-3"
                >
                    <p class="font-semibold text-slate-900">
                        {{ getDocumentStatusMeta(entry.action).label }}
                    </p>
                    <p>
                        {{ entry.reviewerName }} · {{ getRoleMeta(entry.reviewerRole).label }} ·
                        {{ new Date(entry.decidedAt).toLocaleString() }}
                    </p>
                    <p v-if="entry.reason" class="text-slate-500">
                        Motivo: {{ entry.reason }}
                    </p>
                </li>
            </ul>
        </section>
    </div>
</template>
