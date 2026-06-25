<script setup lang="ts">
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
} from "@headlessui/vue";
import { useToast } from "vue-toastification";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const toast = useToast();

if (auth.activeRole !== "ROLE_ADMIN") {
    await navigateTo("/dashboard");
}

const activeTab = ref<"paises" | "provincias" | "municipios" | "bairros">("paises");

const paises = ref<any[]>([]);
const provincias = ref<any[]>([]);
const municipios = ref<any[]>([]);
const bairros = ref<any[]>([]);

const loading = ref(false);
const showCreateModal = ref(false);
const editingItem = ref<any>(null);
const creating = ref(false);
const search = ref("");

const newItem = reactive({
    descricao: "",
    paisId: "",
    provinciaId: "",
    municipioId: "",
});

const parentOptions = computed(() => {
    if (activeTab.value === "provincias") return paises.value;
    if (activeTab.value === "municipios") return provincias.value;
    if (activeTab.value === "bairros") return municipios.value;
    return [];
});

const parentLabel = computed(() => {
    if (activeTab.value === "provincias") return "País";
    if (activeTab.value === "municipios") return "Província";
    if (activeTab.value === "bairros") return "Município";
    return "";
});

const parentKey = computed(() => {
    if (activeTab.value === "provincias") return "paisId";
    if (activeTab.value === "municipios") return "provinciaId";
    if (activeTab.value === "bairros") return "municipioId";
    return "";
});

const items = computed(() => {
    let list: any[] = [];
    if (activeTab.value === "paises") list = paises.value;
    else if (activeTab.value === "provincias") list = provincias.value;
    else if (activeTab.value === "municipios") list = municipios.value;
    else list = bairros.value;

    if (!search.value) return list;
    return list.filter((item: any) =>
        item.descricao?.toLowerCase().includes(search.value.toLowerCase()),
    );
});

const currentEndpoint = computed(() => {
    const map: Record<string, string> = {
        paises: "/localizacao/pais",
        provincias: "/localizacao/provincia",
        municipios: "/localizacao/municipio",
        bairros: "/localizacao/bairro",
    };
    return map[activeTab.value] ?? "";
});

const currentParentParam = computed(() => {
    const map: Record<string, string> = {
        provincias: "paisId",
        municipios: "provinciaId",
        bairros: "municipioId",
    };
    return map[activeTab.value] ?? "";
});

async function loadPaises() {
    try {
        const data = await auth.apiRequest<any[]>("/localizacao/pais", { method: "GET" });
        paises.value = data ?? [];
    } catch { paises.value = []; }
}

async function loadProvincias() {
    try {
        const data = await auth.apiRequest<any[]>("/localizacao/provincia", { method: "GET" });
        provincias.value = data ?? [];
    } catch { provincias.value = []; }
}

async function loadMunicipios() {
    try {
        const data = await auth.apiRequest<any[]>("/localizacao/municipio", { method: "GET" });
        municipios.value = data ?? [];
    } catch { municipios.value = []; }
}

async function loadBairros() {
    try {
        const data = await auth.apiRequest<any[]>("/localizacao/bairro", { method: "GET" });
        bairros.value = data ?? [];
    } catch { bairros.value = []; }
}

async function loadAll() {
    loading.value = true;
    await Promise.all([loadPaises(), loadProvincias(), loadMunicipios(), loadBairros()]);
    loading.value = false;
}

function openCreateModal() {
    editingItem.value = null;
    newItem.descricao = "";
    newItem.paisId = "";
    newItem.provinciaId = "";
    newItem.municipioId = "";
    showCreateModal.value = true;
}

function openEditModal(item: any) {
    editingItem.value = item;
    newItem.descricao = item.descricao;
    newItem.paisId = item.pais?.id ?? "";
    newItem.provinciaId = item.provincia?.id ?? "";
    newItem.municipioId = item.municipio?.id ?? "";
    showCreateModal.value = true;
}

async function handleSubmit() {
    creating.value = true;
    try {
        const body: Record<string, any> = { descricao: newItem.descricao };
        if (parentKey.value && newItem[parentKey.value as keyof typeof newItem]) {
            body[parentKey.value] = newItem[parentKey.value as keyof typeof newItem];
        }

        if (editingItem.value) {
            await auth.apiRequest(`${currentEndpoint.value}/${editingItem.value.id}`, {
                method: "PUT",
                body,
            });
            toast.success("Atualizado com sucesso.");
        } else {
            await auth.apiRequest(currentEndpoint.value, {
                method: "POST",
                body,
            });
            toast.success("Criado com sucesso.");
        }
        showCreateModal.value = false;
        await loadAll();
    } catch {
        toast.error("Não foi possível guardar.");
    } finally {
        creating.value = false;
    }
}

async function handleDelete(item: any) {
    if (!confirm(`Tem certeza que deseja eliminar "${item.descricao}"?`)) return;
    try {
        await auth.apiRequest(`${currentEndpoint.value}/${item.id}`, { method: "DELETE" });
        toast.success("Eliminado com sucesso.");
        await loadAll();
    } catch {
        toast.error("Não foi possível eliminar.");
    }
}

function getParentName(item: any): string {
    if (activeTab.value === "provincias") return item.pais?.descricao ?? "";
    if (activeTab.value === "municipios") return item.provincia?.descricao ?? "";
    if (activeTab.value === "bairros") return item.municipio?.descricao ?? "";
    return "";
}

watch(activeTab, () => {
    search.value = "";
});

onMounted(loadAll);
</script>

<template>
    <div class="space-y-6">
        <div>
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">
                Administração
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                Localização
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Gerir países, províncias, municípios e bairros do sistema.
            </p>
        </div>

        <div class="flex flex-wrap gap-2">
            <button
                v-for="tab in [
                    { key: 'paises', label: 'Países' },
                    { key: 'provincias', label: 'Províncias' },
                    { key: 'municipios', label: 'Municípios' },
                    { key: 'bairros', label: 'Bairros' },
                ] as const"
                :key="tab.key"
                class="rounded-xl px-4 py-2 text-sm font-semibold transition"
                :class="activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                @click="activeTab = tab.key"
            >
                {{ tab.label }}
            </button>
        </div>

        <section class="card p-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex-1">
                    <label class="label-base">Pesquisar</label>
                    <input v-model="search" class="input-base" :placeholder="`Pesquisar ${activeTab}...`" />
                </div>
                <button class="btn-primary shrink-0 mt-6" @click="openCreateModal">
                    Adicionar
                </button>
            </div>
        </section>

        <section v-if="loading" class="card p-10 text-center text-sm text-slate-500">
            A carregar dados...
        </section>

        <section v-else class="card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="border-b border-slate-200 bg-slate-50">
                        <tr>
                            <th class="px-5 py-3 font-semibold text-slate-600">Nome</th>
                            <th v-if="activeTab !== 'paises'" class="px-5 py-3 font-semibold text-slate-600">
                                {{ parentLabel }}
                            </th>
                            <th class="px-5 py-3 font-semibold text-slate-600">Estado</th>
                            <th class="px-5 py-3 text-right font-semibold text-slate-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50 transition">
                            <td class="px-5 py-3 font-medium text-slate-900">{{ item.descricao }}</td>
                            <td v-if="activeTab !== 'paises'" class="px-5 py-3 text-slate-500">
                                {{ getParentName(item) }}
                            </td>
                            <td class="px-5 py-3">
                                <span
                                    class="badge"
                                    :class="item.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                                >
                                    {{ item.isActive !== false ? 'Ativo' : 'Inativo' }}
                                </span>
                            </td>
                            <td class="px-5 py-3 text-right">
                                <div class="flex justify-end gap-2">
                                    <button
                                        class="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
                                        @click="openEditModal(item)"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        class="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                                        @click="handleDelete(item)"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-if="!items.length" class="p-10 text-center text-sm text-slate-500">
                Nenhum registo encontrado.
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
                                <DialogPanel class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                                    <DialogTitle class="text-lg font-bold text-slate-950">
                                        {{ editingItem ? "Editar" : "Adicionar" }}
                                        {{ activeTab === "paises" ? "País" : activeTab === "provincias" ? "Província" : activeTab === "municipios" ? "Município" : "Bairro" }}
                                    </DialogTitle>

                                    <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
                                        <div>
                                            <label class="label-base">Nome *</label>
                                            <input
                                                v-model="newItem.descricao"
                                                class="input-base"
                                                required
                                                placeholder="Ex: Luanda"
                                            />
                                        </div>

                                        <div v-if="parentOptions.length > 0">
                                            <label class="label-base">{{ parentLabel }} *</label>
                                            <select
                                                v-if="parentKey"
                                                v-model="(newItem as any)[parentKey]"
                                                class="input-base"
                                                required
                                            >
                                                <option value="">Selecione...</option>
                                                <option v-for="p in parentOptions" :key="p.id" :value="p.id">
                                                    {{ p.descricao }}
                                                </option>
                                            </select>
                                        </div>

                                        <div class="flex justify-end gap-3 pt-2">
                                            <button type="button" class="btn-secondary" @click="showCreateModal = false">
                                                Cancelar
                                            </button>
                                            <button type="submit" class="btn-primary" :disabled="creating">
                                                {{ creating ? "A guardar..." : editingItem ? "Guardar" : "Criar" }}
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
