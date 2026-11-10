const priceFormatter = new Intl.NumberFormat("fr-DZ", {
  maximumFractionDigits: 0,
});

// "18 500 000 DZD" — rentals get a "/ month" suffix
export const formatPrice = (price, type) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return "—";
  return `${priceFormatter.format(n)} DZD${type === "rent" ? " / month" : ""}`;
};

// Street, District, City — skipping empty or repeated parts
export const formatAddress = (item = {}) => {
  const parts = [item.address, item.district, item.city]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  return parts
    .filter(
      (p, i) =>
        !parts.some((other, j) => j !== i && other.length > p.length && other.includes(p))
    )
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .join(", ");
};

export const formatPropertyType = (value = "") =>
  value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
