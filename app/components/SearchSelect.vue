<script setup lang="ts">
const props = defineProps<{
    modelValue: string | string[];
    options: { value: string; label: string }[];
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    multiple?: boolean;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string | string[]];
}>();

const search = ref("");
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const filteredOptions = computed(() => {
    if (!search.value) return props.options;
    return props.options.filter((opt) =>
        opt.label.toLowerCase().includes(search.value.toLowerCase()),
    );
});

const selectedLabels = computed(() => {
    if (props.multiple && Array.isArray(props.modelValue)) {
        return props.modelValue
            .map((v) => props.options.find((o) => o.value === v)?.label ?? v)
            .join(", ");
    }
    return props.options.find((o) => o.value === props.modelValue)?.label ?? "";
});

function selectOption(value: string) {
    if (props.multiple && Array.isArray(props.modelValue)) {
        const current = [...props.modelValue];
        const idx = current.indexOf(value);
        if (idx >= 0) {
            current.splice(idx, 1);
        } else {
            current.push(value);
        }
        emit("update:modelValue", current);
    } else {
        emit("update:modelValue", value === props.modelValue ? "" : value);
        isOpen.value = false;
    }
    search.value = "";
}

function isSelected(value: string) {
    if (props.multiple && Array.isArray(props.modelValue)) {
        return props.modelValue.includes(value);
    }
    return props.modelValue === value;
}

function toggleOpen() {
    if (props.disabled) return;
    isOpen.value = !isOpen.value;
    if (!isOpen.value) search.value = "";
}

function handleClickOutside(e: MouseEvent) {
    if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
        isOpen.value = false;
        search.value = "";
    }
}

onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => document.removeEventListener("click", handleClickOutside));
</script>

<template>
    <div ref="containerRef" class="relative">
        <label v-if="label" class="label-base">{{ label }}</label>
        <button
            type="button"
            class="input-base flex items-center justify-between gap-2 text-left"
            :class="{ 'opacity-50 cursor-not-allowed': disabled }"
            :disabled="disabled"
            @click="toggleOpen"
        >
            <span class="truncate" :class="selectedLabels ? 'text-slate-900' : 'text-slate-400'">
                {{ selectedLabels || placeholder || "Selecionar..." }}
            </span>
            <Icon name="heroicons:chevron-down" class="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        <div
            v-if="isOpen"
            class="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg"
        >
            <div class="p-2">
                <input
                    v-model="search"
                    class="input-base"
                    placeholder="Pesquisar..."
                    autofocus
                    @click.stop
                />
            </div>
            <ul class="max-h-48 overflow-y-auto px-2 pb-2">
                <li
                    v-for="opt in filteredOptions"
                    :key="opt.value"
                    class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-indigo-50"
                    :class="isSelected(opt.value) ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'"
                    @click.stop="selectOption(opt.value)"
                >
                    <span
                        v-if="multiple"
                        class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                        :class="isSelected(opt.value) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'"
                    >
                        <Icon v-if="isSelected(opt.value)" name="heroicons:check" class="h-3 w-3 text-white" />
                    </span>
                    <span
                        v-else
                        class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                        :class="isSelected(opt.value) ? 'border-indigo-600' : 'border-slate-300'"
                    >
                        <span v-if="isSelected(opt.value)" class="h-2 w-2 rounded-full bg-indigo-600" />
                    </span>
                    <span class="truncate">{{ opt.label }}</span>
                </li>
                <li v-if="filteredOptions.length === 0" class="px-3 py-2 text-center text-sm text-slate-400">
                    Nenhum resultado encontrado
                </li>
            </ul>
        </div>
    </div>
</template>
