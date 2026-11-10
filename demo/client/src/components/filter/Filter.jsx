import { useState, useEffect } from "react";
import "./filter.scss";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";

const propertyTypes = {
  residential: [
    ["apartment", "Apartment"],
    ["individual_house", "Individual house"],
    ["traditional_house", "Traditional house"],
    ["other_residential", "Other"],
  ],
  commercial: [
    ["office", "Office"],
    ["retail", "Retail"],
    ["hospitality", "Hospitality / Leisure"],
    ["industrial", "Industrial"],
  ],
};

const keys = [
  "city",
  "district",
  "type",
  "property",
  "propertyType",
  "minPrice",
  "maxPrice",
  "bedroom",
  // results order, read by ListPage
  "sort",
];
// Fields that live only in the "Filters" modal
const modalKeys = ["district", "property", "propertyType", "minPrice", "maxPrice", "bedroom"];

const fromParams = (params) =>
  Object.fromEntries(keys.map((k) => [k, params.get(k) || ""]));

const clean = (q) => Object.fromEntries(Object.entries(q).filter(([, v]) => v));

function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState(() => fromParams(searchParams));
  const [open, setOpen] = useState(false);

  // Keep the form in sync when the URL changes (e.g. back/forward)
  useEffect(() => {
    setQuery(fromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    fetch("/wilaya.json")
      .then((res) => res.json())
      .then((data) => setCities(data))
      .catch((err) => console.error("Error loading cities:", err));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const districts = cities.find((c) => c.name === query.city)?.dairats || [];

  const update = (name, value) => (prev) => ({
    ...prev,
    [name]: value,
    ...(name === "city" ? { district: "" } : {}),
    ...(name === "property" ? { propertyType: "" } : {}),
  });

  const handleChange = (e) => setQuery(update(e.target.name, e.target.value));

  // Pills in the bar apply immediately
  const applyNow = (name, value) => {
    const next = update(name, value)(query);
    setQuery(next);
    setSearchParams(clean(next));
  };

  const applyModal = (e) => {
    e.preventDefault();
    setSearchParams(clean(query));
    setOpen(false);
  };

  const modalCount = modalKeys.filter((k) => searchParams.get(k)).length;
  const anyActive = keys.some((k) => searchParams.get(k));
  const place = [searchParams.get("district"), searchParams.get("city")]
    .filter(Boolean)
    .join(", ");
  const kind =
    { residential: "Homes", commercial: "Commercial property" }[searchParams.get("property")] || "Properties";
  const mode = { buy: " for sale", rent: " for rent" }[searchParams.get("type")] || "";

  return (
    <div className="filter">
      <h1 className="filterTitle">
        {kind}
        {mode} {place ? `in ${place}` : "across Algeria"}
      </h1>

      <div className="pillRow">
        <div className="segmented" role="group" aria-label="Listing type">
          {[
            ["", "All"],
            ["buy", "Buy"],
            ["rent", "Rent"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              className={query.type === value ? "active" : ""}
              aria-pressed={query.type === value}
              onClick={() => applyNow("type", value)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className={`pill selectPill ${query.city ? "on" : ""}`}>
          <span className="sr-only">City</span>
          <select
            name="city"
            value={query.city}
            onChange={(e) => applyNow("city", e.target.value)}
          >
            <option value="">Any city</option>
            {cities.map((city) => (
              <option key={city.mattricule} value={city.name}>
                {city.name}
              </option>
            ))}
            {query.city && !cities.some((c) => c.name === query.city) && (
              <option value={query.city}>{query.city}</option>
            )}
          </select>
        </label>

        <button
          type="button"
          className={`pill ${modalCount ? "on" : ""}`}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={15} /> Filters
          {modalCount > 0 && <span className="count">{modalCount}</span>}
        </button>

        {anyActive && (
          <button type="button" className="clearLink" onClick={() => setSearchParams({})}>
            Clear all
          </button>
        )}
      </div>

      {open && (
        <div className="filterOverlay" onClick={() => setOpen(false)}>
          <form
            className="filterModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={applyModal}
          >
            <header>
              <button
                type="button"
                className="iconBtn"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <h2 id="filters-title">Filters</h2>
            </header>

            <div className="modalBody">
              <section>
                <h3>Location</h3>
                <div className="two">
                  <div className="field">
                    <label htmlFor="f-city">City</label>
                    <select id="f-city" name="city" value={query.city} onChange={handleChange}>
                      <option value="">Any city</option>
                      {cities.map((city) => (
                        <option key={city.mattricule} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="f-district">District</label>
                    <select
                      id="f-district"
                      name="district"
                      value={query.district}
                      onChange={handleChange}
                      disabled={!query.city}
                    >
                      <option value="">Any district</option>
                      {districts.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                      {query.district &&
                        !districts.some((d) => d.name === query.district) && (
                          <option value={query.district}>{query.district}</option>
                        )}
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h3>Price range</h3>
                <div className="two">
                  <div className="field">
                    <label htmlFor="f-min">Minimum (DZD)</label>
                    <input
                      id="f-min"
                      type="number"
                      name="minPrice"
                      min={0}
                      placeholder="No min"
                      value={query.minPrice}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="f-max">Maximum (DZD)</label>
                    <input
                      id="f-max"
                      type="number"
                      name="maxPrice"
                      min={0}
                      placeholder="No max"
                      value={query.maxPrice}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3>Property type</h3>
                <div className="chips">
                  {[
                    ["", "Any"],
                    ["residential", "Residential"],
                    ["commercial", "Commercial"],
                  ].map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      className={query.property === value ? "active" : ""}
                      onClick={() => setQuery(update("property", value))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {query.property && (
                  <div className="chips">
                    {propertyTypes[query.property].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={query.propertyType === value ? "active" : ""}
                        onClick={() =>
                          setQuery(
                            update(
                              "propertyType",
                              query.propertyType === value ? "" : value
                            )
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3>Bedrooms</h3>
                <div className="chips">
                  {["", "1", "2", "3", "4", "5"].map((n) => (
                    <button
                      key={n || "any"}
                      type="button"
                      className={query.bedroom === n ? "active" : ""}
                      onClick={() => setQuery(update("bedroom", n))}
                    >
                      {n ? `${n}+` : "Any"}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <footer>
              <button
                type="button"
                className="clearLink"
                onClick={() => setQuery(fromParams(new URLSearchParams()))}
              >
                Clear all
              </button>
              <button type="submit" className="btn applyBtn">
                Show results
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

export default Filter;
