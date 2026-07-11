import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";

// Case-study route is added in the case-study task; keep NotFound lazy — it's
// the rare path.
const NotFound = () => import("@/components/NotFound.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // `/index.html` was treated as home by the old manual pathname check — keep parity.
    { path: "/", alias: "/index.html", name: "home", component: HomeView },
    { path: "/:pathMatch(.*)*", name: "not-found", component: NotFound },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition; // browser back/forward
    if (to.hash) return false; // home hash deep-links are handled by HomeView + scrollToZone
    return { top: 0 };
  },
});
