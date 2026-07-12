// Tech logos + project metadata, extracted from ProjectsSection so the
// case-study pages can reuse them. i18n titles/descriptions in en.js/it.js
// `projects.items[i]` are aligned to this array's ORDER (index i), not to `id`.
const logos = {
  python:     `<img src="/python.png"     width="22" height="22" alt="Python"     style="object-fit:contain" />`,
  nestjs:     `<img src="/nestjs.png"     width="22" height="22" alt="NestJS"     style="object-fit:contain" />`,
  vue:        `<img src="/vue.png"        width="22" height="22" alt="Vue.js"     style="object-fit:contain" />`,
  javascript: `<img src="/javascript.png" width="22" height="22" alt="JavaScript" style="object-fit:contain" />`,
  react:      `<img src="/react.png"      width="22" height="22" alt="React"      style="object-fit:contain" />`,
};

// Accents come from the site palette (the same primary/cyan/purple/amber set the
// TechStack cards use) instead of each tech's brand colors, so the cards read as
// part of the galaxy theme. The bar fades out to the right like a HUD readout.
// `accent` feeds the `--card-accent` CSS var: inside a card (and on its
// case-study page) every interactive element — solid buttons, outline hovers,
// the hover glow — takes the project's color instead of the site red, so each
// card reads as one self-consistent "world".
export const projectDefs = [
  {
    id: 1,
    logoHtml: logos.python,
    tags: ["Python", "pygame", "Game Dev"],
    github: "https://github.com/1brecane/cattenheimer",
    demo: null,
    type: "gaming",
    accent: "var(--chart-4)",
    accentColor: "from-chart-4 via-chart-4/40 to-transparent",
    badgeClass: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  },
  {
    id: 4,
    logoHtml: logos.vue,
    tags: ["Vue.js", "Tailwind", "JavaScript", "Claude Code", "Cursor"],
    github: "https://github.com/1brecane/portfolio",
    demo: null,
    type: "frontend",
    accent: "var(--chart-2)",
    accentColor: "from-chart-2 via-chart-2/40 to-transparent",
    badgeClass: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  },
  {
    id: 3,
    logoHtml: logos.nestjs,
    tags: ["NestJS", "Redis", "MySQL"],
    github: "https://github.com/1brecane/paidia_be",
    demo: null,
    type: "lab",
    accent: "var(--primary)",
    accentColor: "from-primary via-primary/40 to-transparent",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  {
    id: 2,
    logoHtml: `<span class="flex items-center gap-1">${logos.javascript}${logos.react}</span>`,
    tags: ["Fastify", "React", "MySQL", "Docker"],
    github: "https://github.com/1brecane/centro-sportivo-be",
    githubFe: "https://github.com/1brecane/centro-sportivo-fe",
    demo: null,
    type: "fullstack",
    accent: "var(--chart-3)",
    accentColor: "from-chart-3 via-chart-3/40 to-transparent",
    badgeClass: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  },
];
