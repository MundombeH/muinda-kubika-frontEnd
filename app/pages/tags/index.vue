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

const tags = ref<any[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const editingItem = ref<any>(null);
const creating = ref(false);
const search = ref("");
const newName = ref("");

const items = computed(() => {
    if (!search.value) return tags.value;
    return tags.value.filter((t: any) =>
        t.descricao?.toLowerCase().includes(search.value.toLowerCase()),
    );
});

async function loadTags() {
    loading.value = true;
    try {
        const data = await auth.apiRequest<any[]>("/tag", { method: "GET" });
        tags.value = data ?? [];
    } catch { tags.value = []; } finally { loading.value = false; }
}

function openCreateModal() {
    editingItem.value = null;
    newName.value = "";
    showCreateModal.value = true;
}

function openEditModal(item: any) {
    editingItem.value = item;
    newName.value = item.descricao;
    showCreateModal.value = true;
}

async function handleSubmit() {
    creating.value = true;
    try {
        if (editingItem.value) {
            await auth.apiRequest(`/tag/${editingItem.value.id}`, {
                method: "PUT",
                body: { descricao: newName.value },
            });
            toast.success("Tag atualizada com sucesso.");
        } else {
            await auth.apiRequest("/tag", {
                method: "POST",
                body: { descricao: newName.value },
            });
            toast.success("Tag criada com sucesso.");
        }
        showCreateModal.value = false;
        await loadTags();
    } catch {
        toast.error("Não foi possível guardar a tag.");
    } finally { creating.value = false; }
}

async function handleDelete(item: any) {
    if (!confirm(`Tem certeza que deseja eliminar a tag "${item.descricao}"?`)) return;
    try {
        await auth.apiRequest(`/tag/${item.id}`, { method: "DELETE" });
        toast.success("Tag eliminada com sucesso.");
        await loadTags();
    } catch {
        toast.error("Não foi possível eliminar a tag.");
    }
}

onMounted(loadTags);
</script>

<template>
    <div class="space-y-6">
        <div>
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">
                Administração
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                Tags
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Gerir tags de documentos do sistema.
            </p>
        </div>

        <section class="card p-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex-1">
                    <label class="label-base">Pesquisar tag</label>
                    <input v-model="search" class="input-base" placeholder="Nome da tag" />
                </div>
                <button class="btn-primary shrink-0 mt-6" @click="openCreateModal">
                    Nova Tag
                </button>
            </div>
        </section>

        <section v-if="loading" class="card p-10 text-center text-sm text-slate-500">
            A carregar tags...
        </section>

        <section v-else class="card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="border-b border-slate-200 bg-slate-50">
                        <tr>
                            <th class="px-5 py-3 font-semibold text-slate-600">Nome</th>
                            <th class="px-5 py-3 font-semibold text-slate-600">Estado</th>
                            <th class="px-5 py-3 text-right font-semibold text-slate-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50 transition">
                            <td class="px-5 py-3 font-medium text-slate-900">{{ item.descricao }}</td>
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
                Nenhuma tag encontrada.
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
                                        {{ editingItem ? "Editar" : "Nova" }} Tag
                                    </DialogTitle>

                                    <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
                                        <div>
                                            <label class="label-base">Nome *</label>
                                            <input
                                                v-model="newName"
                                                class="input-base"
                                                required
                                                placeholder="Ex: java, spring, react..."
                                            />
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
