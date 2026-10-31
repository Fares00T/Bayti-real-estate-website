import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { BUDGETS, PROPERTY_TYPES, formatBudget } from "../lib/cities";
import "./heroSearch.scss";

// The home page search. Every field maps onto a /list query param the API
// already understands (type, city, property, propertyType, maxPrice).
function HeroSearch() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [type, setType] = useState("buy");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    fetch("/wilaya.json")
      .then((res) => res.json())
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  const switchType = (next) => {
    setType(next);
    // a sale budget makes no sense as a monthly rent
    setMaxPrice("");
  };

  const submit = (e) => {
    e.preventDefault();
    const pt = PROPERTY_TYPES.find((p) => p.value === propertyType);
    const params = new URLSearchParams(
      Object.entries({
        type,
        city,
        property: pt?.property || "",
        propertyType,
        maxPrice,
      }).filter(([, v]) => v)
    );
    navigate(`/list?${params}`);
  };

  return (
    <form className="heroSearch" onSubmit={submit} role="search" aria-label="Search properties">
      <div className="modeTabs" role="radiogroup" aria-label="I want to">
        {[
          ["buy", "Buy"],
          ["rent", "Rent"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            className={type === value ? "on" : ""}
            onClick={() => switchType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="fields">
        <label className="fieldCell">
          <span>Wilaya</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All of Algeria</option>
            {cities.map((c) => (
              <option key={c.mattricule} value={c.name}>
                {String(c.mattricule).padStart(2, "0")} {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="fieldCell">
          <span>Property type</span>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="">Any type</option>
            <optgroup label="Residential">
              {PROPERTY_TYPES.filter((p) => p.property === "residential").map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Commercial">
              {PROPERTY_TYPES.filter((p) => p.property === "commercial").map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="fieldCell">
          <span>{type === "rent" ? "Monthly budget" : "Budget"}</span>
          <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">No limit</option>
            {BUDGETS[type].map((n) => (
              <option key={n} value={n}>
                Up to {formatBudget(n)}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn btn-primary go">
          <Search size={18} strokeWidth={2.5} />
          <span>Search</span>
        </button>
      </div>
    </form>
  );
}

export default HeroSearch;
