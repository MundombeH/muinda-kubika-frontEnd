<script setup lang="ts">
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
} from "@headlessui/vue";
import { useToast } from "vue-toastification";

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore();
const inst = useInstitutionsStore();
const search = ref("");
const { getInstitutionTypeLabel } = usePlatformMeta();
const toast = useToast();
const { toFriendlyApiErrorMessage } = await import("~/utils/api");

const showCreateModal = ref(false);
const creating = ref(false);

const newInstitution = reactive({
    descricao: "",
    anoDeFundacao: null as number | null,
    tipoInstituicao: [] as string[],
    numeroDeTelefone: "",
    email: "",
    bairro: "",
});

const tipoInstituicaoOptions = [
    { value: "SUPERIOR", label: "Superior" },
    { value: "ICICLO", label: "I Ciclo" },
    { value: "IICICLO", label: "II Ciclo" },
    { value: "MEDIO", label: "Médio" },
];

// --- Location cascading ---
const paises = ref<any[]>([]);
const provincias = ref<any[]>([]);
const municipios = ref<any[]>([]);
const bairros = ref<any[]>([]);

const selectedPais = ref("");
const selectedProvincia = ref("");
const selectedMunicipio = ref("");
const selectedBairroId = ref("");
const bairroSearch = ref("");

const loadingPaises = ref(false);
const loadingProvincias = ref(false);
const loadingMunicipios = ref(false);
const loadingBairros = ref(false);

async function loadPaises() {
    loadingPaises.value = true;
    try {
        const data = await auth.apiRequest<any[]>("/localizacao/pais", { method: "GET" });
        paises.value = data ?? [];
    } catch { paises.value = []; } finally { loadingPaises.value = false; }
}

async function loadProvincias(paisId: string) {
    provincias.value = [];
    selectedProvincia.value = "";
    selectedMunicipio.value = "";
    selectedBairroId.value = "";
    if (!paisId) return;
    loadingProvincias.value = true;
    try {
        const data = await auth.apiRequest<any[]>(`/localizacao/provincia?paisId=${paisId}`, { method: "GET" });
        provincias.value = data ?? [];
    } catch { provincias.value = []; } finally { loadingProvincias.value = false; }
}

async function loadMunicipios(provinciaId: string) {
    municipios.value = [];
    selectedMunicipio.value = "";
    selectedBairroId.value = "";
    if (!provinciaId) return;
    loadingMunicipios.value = true;
    try {
        const data = await auth.apiRequest<any[]>(`/localizacao/municipio?provinciaId=${provinciaId}`, { method: "GET" });
        municipios.value = data ?? [];
    } catch { municipios.value = []; } finally { loadingMunicipios.value = false; }
}

async function loadBairros(municipioId: string) {
    bairros.value = [];
    selectedBairroId.value = "";
    if (!municipioId) return;
    loadingBairros.value = true;
    try {
        const data = await auth.apiRequest<any[]>(`/localizacao/bairro?municipioId=${municipioId}`, { method: "GET" });
        bairros.value = data ?? [];
    } catch { bairros.value = []; } finally { loadingBairros.value = false; }
}

watch(selectedPais, (val) => loadProvincias(val));
watch(selectedProvincia, (val) => loadMunicipios(val));
watch(selectedMunicipio, (val) => loadBairros(val));

const filteredBairros = computed(() => {
    if (!bairroSearch.value) return bairros.value;
    return bairros.value.filter((b: any) =>
        b.descricao?.toLowerCase().includes(bairroSearch.value.toLowerCase()),
    );
});

const selectedBairroLabel = computed(() => {
    return bairros.value.find((b: any) => b.id === selectedBairroId.value)?.descricao ?? "";
});

function selectBairro(id: string, nome: string) {
    selectedBairroId.value = id;
    bairroSearch.value = nome;
    newInstitution.bairro = id;
}

const isAdmin = computed(() =>
    ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"].includes(auth.activeRole ?? "")
);

const institutions = computed(() =>
    inst.institutions.filter((institution) =>
        `${institution.name} ${institution.type} ${institution.location}`
            .toLowerCase()
            .includes(search.value.toLowerCase()),
    ),
);

function openCreateModal() {
    showCreateModal.value = true;
    if (paises.value.length === 0) loadPaises();
}

async function handleCreate() {
    creating.value = true;
    try {
        await inst.createInstitution({
            descricao: newInstitution.descricao,
            anoDeFundacao: newInstitution.anoDeFundacao!,
            tipoInstituicao: newInstitution.tipoInstituicao,
            numeroDeTelefone: newInstitution.numeroDeTelefone,
            email: newInstitution.email,
            bairro: selectedBairroId.value,
        });
        toast.success("Instituição criada com sucesso.");
        showCreateModal.value = false;
        resetForm();
    } catch (error) {
        toast.error(toFriendlyApiErrorMessage(error, "Não foi possível criar a instituição."));
    } finally {
        creating.value = false;
    }
}

function resetForm() {
    newInstitution.descricao = "";
    newInstitution.anoDeFundacao = null;
    newInstitution.tipoInstituicao = [];
    newInstitution.numeroDeTelefone = "";
    newInstitution.email = "";
    newInstitution.bairro = "";
    selectedPais.value = "";
    selectedProvincia.value = "";
    selectedMunicipio.value = "";
    selectedBairroId.value = "";
    bairroSearch.value = "";
    provincias.value = [];
    municipios.value = [];
    bairros.value = [];
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
                    Organização
                </p>
                <h1 class="mt-2 text-3xl font-black text-slate-950">
                    Instituições
                </h1>
                <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    Lista de instituições registadas no sistema. Administração
                    disponível para perfis autorizados.
                </p>
            </div>
            <button
                v-if="isAdmin"
                class="btn-primary shrink-0"
                @click="openCreateModal"
            >
                Nova Instituição
            </button>
        </div>

        <section class="card p-5">
            <label class="label-base">Pesquisar instituição</label>
            <input
                v-model="search"
                class="input-base"
                placeholder="Nome, tipo ou localização"
            />
        </section>

        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article
                v-for="institution in institutions"
                :key="institution.id"
                class="card p-6"
            >
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h2 class="text-lg font-bold text-slate-950">
                            {{ institution.name }}
                        </h2>
                        <p class="mt-1 text-sm text-slate-500">
                            {{ getInstitutionTypeLabel(institution.type) }}
                        </p>
                        <p class="mt-3 text-sm text-slate-500">
                            {{ institution.location }}
                        </p>
                    </div>
                    <Icon
                        name="heroicons:building-office-2"
                        class="h-6 w-6 text-indigo-500"
                    />
                </div>
                <div
                    class="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600"
                >
                    Administração disponível para perfis com permissão
                    institucional.
                </div>
            </article>

            <p
                v-if="!institutions.length"
                class="card p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3"
            >
                Nenhuma instituição encontrada para a pesquisa atual.
            </p>
        </section>

        <Teleport to="body">
            <TransitionRoot appear :show="showCreateModal" as="template">
                <Dialog as="div" class="relative z-50" @close="showCreateModal = false">
                    <TransitionChild
                        as="template"
                        enter="duration-300 ease-out"
                        enter-from="opacity-0"
                        enter-to="opacity-100"
                        leave="duration-200 ease-in"
                        leave-from="opacity-100"
                        leave-to="opacity-0"
                    >
                        <div class="fixed inset-0 bg-black/40" />
                    </TransitionChild>

                    <div class="fixed inset-0 overflow-y-auto">
                        <div class="flex min-h-full items-center justify-center p-4">
                            <TransitionChild
                                as="template"
                                enter="duration-300 ease-out"
                                enter-from="opacity-0 scale-95"
                                enter-to="opacity-100 scale-100"
                                leave="duration-200 ease-in"
                                leave-from="opacity-100 scale-100"
                                leave-to="opacity-0 scale-95"
                            >
                                <DialogPanel class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                                    <DialogTitle class="text-lg font-bold text-slate-950">
                                        Nova Instituição
                                    </DialogTitle>

                                    <form class="mt-4 space-y-4" @submit.prevent="handleCreate">
                                        <div>
                                            <label class="label-base">Nome *</label>
                                            <input v-model="newInstitution.descricao" class="input-base" required placeholder="Ex: Universidade Katyavala Bwila" />
                                        </div>

                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="label-base">Ano de Fundação *</label>
                                                <input v-model.number="newInstitution.anoDeFundacao" type="number" class="input-base" required min="1900" max="2099" />
                                            </div>
                                            <div>
                                                <label class="label-base">Telefone *</label>
                                                <input v-model="newInstitution.numeroDeTelefone" class="input-base" required placeholder="9XX XXX XXX" />
                                            </div>
                                        </div>

                                        <div>
                                            <label class="label-base">Email *</label>
                                            <input v-model="newInstitution.email" type="email" class="input-base" required placeholder="info@instituicao.ao" />
                                        </div>

                                        <div>
                                            <label class="label-base">Tipo *</label>
                                            <div class="mt-1 flex flex-wrap gap-2">
                                                <label
                                                    v-for="tipo in tipoInstituicaoOptions"
                                                    :key="tipo.value"
                                                    class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:border-indigo-300"
                                                    :class="newInstitution.tipoInstituicao.includes(tipo.value) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'text-slate-600'"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        :value="tipo.value"
                                                        v-model="newInstitution.tipoInstituicao"
                                                        class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    {{ tipo.label }}
                                                </label>
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="label-base">País *</label>
                                                <select v-model="selectedPais" class="input-base" required :disabled="loadingPaises">
                                                    <option value="">Selecione...</option>
                                                    <option v-for="p in paises" :key="p.id" :value="p.id">{{ p.descricao }}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label class="label-base">Província *</label>
                                                <select v-model="selectedProvincia" class="input-base" required :disabled="!selectedPais || loadingProvincias">
                                                    <option value="">Selecione...</option>
                                                    <option v-for="pr in provincias" :key="pr.id" :value="pr.id">{{ pr.descricao }}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="label-base">Município *</label>
                                                <select v-model="selectedMunicipio" class="input-base" required :disabled="!selectedProvincia || loadingMunicipios">
                                                    <option value="">Selecione...</option>
                                                    <option v-for="m in municipios" :key="m.id" :value="m.id">{{ m.descricao }}</option>
                                                </select>
                                            </div>
                                            <div class="relative">
                                                <label class="label-base">Bairro *</label>
                                                <input
                                                    v-model="bairroSearch"
                                                    class="input-base"
                                                    required
                                                    :disabled="!selectedMunicipio || loadingBairros"
                                                    placeholder="Pesquisar bairro..."
                                                    autocomplete="off"
                                                />
                                                <div
                                                    v-if="selectedMunicipio && filteredBairros.length > 0 && !selectedBairroId"
                                                    class="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                                                >
                                                    <button
                                                        v-for="b in filteredBairros"
                                                        :key="b.id"
                                                        type="button"
                                                        class="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
                                                        @click="selectBairro(b.id, b.descricao)"
                                                    >
                                                        {{ b.descricao }}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="flex justify-end gap-3 pt-2">
                                            <button type="button" class="btn-secondary" @click="showCreateModal = false">
                                                Cancelar
                                            </button>
                                            <button type="submit" class="btn-primary" :disabled="creating">
                                                {{ creating ? "A criar..." : "Criar Instituição" }}
                                            </button>
                                        </div>
                                    </form>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </TransitionRoot>
        </Teleport>
    </div>
</template>
