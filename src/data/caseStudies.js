// Case-study registry: single source of truth for which projects have a case
// study. A project card shows the "Case study" button only if its id appears
// here; /projects/:slug 404s for slugs not in this map.
// planet = the fixed "emblem" world drawn by AsciiPlanets in ambient mode on
// the case-study page (style/palette from AsciiPlanets; pos in viewport
// fractions, kept near an edge so long text stays readable). TUNABLE.
export const caseStudies = {
  // planet palette follows the project's main tech: Vue green for the
  // portfolio, Python blue-and-gold for cattenheimer.
  portfolio: {
    projectId: 4,
    planet: { style: "sphere", palette: "green", pos: { x: 0.78, y: 0.28 }, scale: 0.9 },
  },
  cattenheimer: {
    projectId: 1,
    planet: { style: "bands", palette: "python", pos: { x: 0.78, y: 0.3 }, scale: 0.95 },
  },
  // sphere/warm = Rust's amber/orange identity; first use of this asset pair
  // (sphere-green and bands-python were already claimed above).
  "uptime-kuma-rs": {
    projectId: 5,
    planet: { style: "sphere", palette: "warm", pos: { x: 0.78, y: 0.3 }, scale: 0.9 },
  },
};

export function caseStudySlugForProject(projectId) {
  const entry = Object.entries(caseStudies).find(([, cs]) => cs.projectId === projectId);
  return entry ? entry[0] : null;
}
