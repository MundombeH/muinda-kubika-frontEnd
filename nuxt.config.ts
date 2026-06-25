// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@nuxtjs/tailwindcss", "@nuxt/icon", "@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "Muinda Kubika",
      meta: [
        {
          name: "description",
          content:
            "Plataforma institucional para gestão de documentos, ficheiros e repositórios de programação.",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      appName: "Muinda Kubika",
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
    },
  },
});
