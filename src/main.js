import { createApp } from "vue";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-mono/latin-400.css";
import App from "./App.vue";
import { router } from "./router";
import "./assets/globals.css";

createApp(App).use(router).mount("#app");
