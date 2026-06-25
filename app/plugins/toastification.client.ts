import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Toast, {
    timeout: 3500,
    position: 'top-right',
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true
  })
})
