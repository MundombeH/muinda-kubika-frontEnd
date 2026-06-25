<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { useToast } from "vue-toastification";
import type { UserRole } from "~/types/platform";

const auth = useAuthStore();
const toast = useToast();
const { getRoleMeta, getProfileStatusMeta } = usePlatformMeta();

async function onSwitch(role: string) {
    try {
        await auth.switchRole(role as UserRole);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        console.error("Falha ao mudar de perfil:", role, message);
        toast.error("Não foi possível alterar o perfil ativo.");
    }
}
</script>

<template>
    <Menu as="div" class="relative">
        <MenuButton
            class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300"
        >
            <div>
                <p
                    class="text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                    Perfil ativo
                </p>
                <p class="text-sm font-semibold text-slate-900">
                    {{
                        auth.activeRole
                            ? getRoleMeta(auth.activeRole).label
                            : "Sem perfil"
                    }}
                </p>
            </div>
            <Icon
                name="heroicons:chevron-up-down"
                class="h-5 w-5 text-slate-400"
            />
        </MenuButton>

        <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
        >
            <MenuItems
                class="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl focus:outline-none"
            >
                <MenuItem
                    v-for="profile in auth.availableProfiles"
                    :key="profile.role"
                    v-slot="{ active }"
                >
                    <button
                        class="flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition"
                        :class="active ? 'bg-slate-100' : ''"
                        :disabled="profile.status !== 'ACTIVE'"
                        @click="onSwitch(profile.role)"
                    >
                        <div>
                            <p class="text-sm font-semibold text-slate-900">
                                {{ profile.label }}
                            </p>
                            <p class="mt-1 text-xs text-slate-500">
                                {{ profile.description }}
                            </p>
                        </div>
                        <span
                            class="badge"
                            :class="
                                getProfileStatusMeta(profile.status).classes
                            "
                        >
                            {{ getProfileStatusMeta(profile.status).label }}
                        </span>
                    </button>
                </MenuItem>
            </MenuItems>
        </transition>
    </Menu>
</template>
