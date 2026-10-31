// Wilayas featured on the home page and in the footer. `name` must match
// public/wilaya.json, which is what listings store in `city`.
export const POPULAR_CITIES = [
  { code: 16, name: "Algiers", label: "Algiers" },
  { code: 31, name: "Oran", label: "Oran" },
  { code: 25, name: "Constantine", label: "Constantine" },
  { code: 9, name: "Blida", label: "Blida" },
  { code: 6, name: "Béjaïa", label: "Béjaïa" },
  { code: 19, name: "Sétif", label: "Sétif" },
  { code: 15, name: "Tizi Ouzou", label: "Tizi Ouzou" },
  { code: 23, name: "Annaba", label: "Annaba" },
];

// Same groups the filter and the listing form use
export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment", property: "residential" },
  { value: "individual_house", label: "House or villa", property: "residential" },
  { value: "traditional_house", label: "Traditional house", property: "residential" },
  { value: "other_residential", label: "Other residential", property: "residential" },
  { value: "office", label: "Office", property: "commercial" },
  { value: "retail", label: "Shop / retail", property: "commercial" },
  { value: "hospitality", label: "Hospitality", property: "commercial" },
  { value: "industrial", label: "Industrial / warehouse", property: "commercial" },
];

// Budget ceilings in DZD. Sale and rent live on very different scales.
export const BUDGETS = {
  buy: [5_000_000, 10_000_000, 15_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000],
  rent: [20_000, 40_000, 60_000, 80_000, 120_000, 200_000, 400_000],
};

const compact = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 1 });
// 15 000 000 → "15 M DZD", 60 000 → "60 000 DZD"
export const formatBudget = (n) =>
  n >= 1_000_000 ? `${compact.format(n / 1_000_000)} M DZD` : `${compact.format(n)} DZD`;
