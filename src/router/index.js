import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import { caseStudies } from "@/data/caseStudies";

// Keep NotFound lazy — it's the rare path.
const NotFound = () => import("@/components/NotFound.vue");
const CaseStudyView = () => import("@/views/CaseStudyView.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // `/index.html` was treated as home by the old manual pathname check — keep parity.
    { path: "/", alias: "/index.html", name: "home", component: HomeView },
    {
      path: "/projects/:slug",
      name: "case-study",
      component: CaseStudyView,
      // Unknown slug → 404 (keeps the URL, shows NotFound).
      beforeEnter: (to) =>
        Object.hasOwn(caseStudies, to.params.slug) ||
        { name: "not-found", params: { pathMatch: to.path.slice(1).split("/") } },
    },
    { path: "/:pathMatch(.*)*", name: "not-found", component: NotFound },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition; // browser back/forward
    if (to.hash) return false; // home hash deep-links are handled by HomeView + scrollToZone
    return { top: 0 };
  },
});
