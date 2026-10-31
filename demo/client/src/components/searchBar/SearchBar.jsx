import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import "./searchBar.scss";

function SearchBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState({
    type: searchParams.get("type") || "buy",
    city: searchParams.get("city") || "",
    district: searchParams.get("district") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  });

  useEffect(() => {
    fetch("/wilaya.json")
      .then((res) => res.json())
      .then((data) => setCities(data))
      .catch((err) => console.error("Error loading cities:", err));
  }, []);

  const districts = cities.find((c) => c.name === query.city)?.dairats || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setQuery((prev) => ({
      ...prev,
      [name]: value,
      // a new city invalidates the chosen district
      ...(name === "city" ? { district: "" } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== "")
    );
    navigate(`/list?${params.toString()}`);
  };

  return (
    <form className="searchBar" onSubmit={handleSubmit} role="search">
      <label className="seg">
        <span className="label">Looking to</span>
        <select name="type" value={query.type} onChange={handleChange}>
          <option value="buy">Buy</option>
          <option value="rent">Rent</option>
        </select>
      </label>
      <label className="seg">
        <span className="label">Wilaya</span>
        <select name="city" value={query.city} onChange={handleChange}>
          <option value="">Search destinations</option>
          {cities.map((city) => (
            <option key={city.mattricule} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
      </label>
      <label className={`seg ${!query.city ? "disabled" : ""}`}>
        <span className="label">District</span>
        <select
          name="district"
          value={query.district}
          onChange={handleChange}
          disabled={!query.city}
        >
          <option value="">{query.city ? "Any district" : "Pick a wilaya first"}</option>
          {districts.map((d) => (
            <option key={d.code} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <div className="seg price">
        <span className="label">Budget (DZD)</span>
        <div className="range">
          <input
            type="number"
            name="minPrice"
            min={0}
            placeholder="Min"
            aria-label="Minimum price"
            value={query.minPrice}
            onChange={handleChange}
          />
          <span>–</span>
          <input
            type="number"
            name="maxPrice"
            min={0}
            placeholder="Max"
            aria-label="Maximum price"
            value={query.maxPrice}
            onChange={handleChange}
          />
        </div>
      </div>
      <button type="submit" className="go" aria-label="Search">
        <Search size={16} strokeWidth={3} />
        <span>Search</span>
      </button>
    </form>
  );
}

export default SearchBar;
