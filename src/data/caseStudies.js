// Case-study registry: single source of truth for which projects have a case
// study. A project card shows the "Case study" button only if its id appears
// here; /projects/:slug 404s for slugs not in this map.
// planet = the fixed "emblem" world drawn by AsciiPlanets in ambient mode on
// the case-study page (style/palette from AsciiPlanets; pos in viewport
// fractions, kept near an edge so long text stays readable). TUNABLE.
export const caseStudies = {
  portfolio: {
    projectId: 4,
    planet: { style: "sphere", palette: "warm", pos: { x: 0.78, y: 0.28 }, scale: 0.9 },
  },
  cattenheimer: {
    projectId: 1,
    planet: { style: "rings", palette: "green", pos: { x: 0.78, y: 0.3 }, scale: 0.95 },
  },
};

export function caseStudySlugForProject(projectId) {
  const entry = Object.entries(caseStudies).find(([, cs]) => cs.projectId === projectId);
  return entry ? entry[0] : null;
}
