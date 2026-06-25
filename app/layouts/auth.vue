<template>
    <div
        class="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white"
    >
        <div
            class="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10"
        >
            <section class="hidden lg:block">
                <AppLogo />
                <div class="mt-10 max-w-2xl">
                    <p
                        class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-indigo-100"
                    >
                        <Icon
                            name="heroicons:cloud-arrow-up"
                            class="mr-2 h-5 w-5"
                        />
                        Documentos, ficheiros e repositórios académicos num só
                        lugar
                    </p>
                    <h1 class="mt-6 text-5xl font-black leading-tight">
                        Centralize produção institucional com uma experiência
                        moderna e segura.
                    </h1>
                    <p class="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                        Fluxos por perfil, aprovação de utilizadores e gestão de
                        documentos para equipas que trabalham com múltiplas
                        contas.
                    </p>
                    <div class="mt-10 grid grid-cols-2 gap-4">
                        <div
                            class="rounded-3xl border border-white/10 bg-white/5 p-5"
                        >
                            <p class="text-3xl font-bold">5</p>
                            <p class="mt-2 text-sm text-slate-300">
                                Perfis suportados
                            </p>
                        </div>
                        <div
                            class="rounded-3xl border border-white/10 bg-white/5 p-5"
                        >
                            <p class="text-3xl font-bold">100%</p>
                            <p class="mt-2 text-sm text-slate-300">
                                Segurança por perfil
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <main>
                <slot />
            </main>
        </div>
    </div>
</template>
