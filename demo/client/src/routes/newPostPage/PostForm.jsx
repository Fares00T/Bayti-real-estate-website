import { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Building2,
  Crosshair,
  Factory,
  Home,
  Hotel,
  House,
  ImagePlus,
  KeyRound,
  Landmark,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Store,
  Tag,
  X,
} from "lucide-react";
import LocationPicker, {
  isInAlgeria,
} from "../../components/getloc/LocationPicker.jsx";
import UploadWidget from "../../components/UploadWidget/UploadWidget";
import apiRequest from "../../components/lib/apiRequest";
import { formatPropertyType } from "../../components/lib/format";
import "./postForm.scss";

const UPLOAD_CONFIG = {
  multiple: true,
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  folder: "posts",
};
const UPLOADS_ENABLED = Boolean(
  UPLOAD_CONFIG.cloudName && UPLOAD_CONFIG.uploadPreset
);

const OUTSIDE_ALGERIA = "Pick a location inside Algeria.";

// Marketplace rules set in the admin dashboard (loaded once per page view)
const rules = { maxImages: 20, enabledPropertyTypes: null };
const DRAFT_KEY = "bayti:listing-draft";
const DRAFT_STEP_KEY = "bayti:listing-draft-step";
const TITLE_MAX = 80;
const MIN_DESC = 30;

const PROPERTY_TYPES = {
  residential: [
    ["apartment", "Apartment", Building],
    ["individual_house", "House or villa", House],
    ["traditional_house", "Traditional house", Landmark],
    ["other_residential", "Other home", Home],
  ],
  commercial: [
    ["office", "Office", Building2],
    ["retail", "Shop", Store],
    ["hospitality", "Hospitality", Hotel],
    ["industrial", "Industrial", Factory],
  ],
};

export const NEARBY_PLACES = [
  ["kindergarten", "Kindergarten"],
  ["primarySchool", "Primary school"],
  ["middleSchool", "Middle school"],
  ["highSchool", "High school"],
  ["university", "University"],
  ["transportation", "Public transport"],
  ["carPark", "Car park"],
  ["mosque", "Mosque"],
  ["pharmacy", "Pharmacy"],
  ["commercialArea", "Shops"],
];

export const EMPTY_POST = {
  title: "",
  price: "",
  type: "buy",
  property: "residential",
  propertyType: "",
  city: "",
  district: "",
  address: "",
  latitude: "",
  longitude: "",
  bedroom: 1,
  bathroom: 1,
  size: "",
  utilities: "owner",
  pet: "not-allowed",
  Furnished: "no",
  desc: "",
  images: [],
  nearby: [],
};

// Nearby places used to be stored as distances ("300"); anything that isn't
// empty or "no" means the place is nearby.
const isNearby = (v) => v !== null && v !== undefined && v !== "" && v !== "no";

// Older listings stored yes/no for these fields; map them to the values the
// listing page understands.
export const postToForm = (post) => {
  const d = post.postDetail || {};
  const legacy = (value, yes, no) =>
    value === "yes" ? yes : value === "no" ? no : value || no;
  return {
    ...EMPTY_POST,
    title: post.title ?? "",
    price: post.price ?? "",
    type: post.type || "buy",
    property: post.property || "residential",
    propertyType: post.propertyType || "",
    city: post.city || "",
    district: post.district || "",
    address: post.address || "",
    latitude: post.latitude || "",
    longitude: post.longitude || "",
    bedroom: post.bedroom ?? 0,
    bathroom: post.bathroom ?? 0,
    size: d.size ?? "",
    utilities: legacy(d.utilities, "owner", "tenant"),
    pet: legacy(d.pet, "allowed", "not-allowed"),
    Furnished: d.Furnished === "yes" ? "yes" : "no",
    desc: d.desc || "",
    images: Array.isArray(post.images) ? post.images : [],
    nearby: NEARBY_PLACES.map(([key]) => key).filter((k) => isNearby(d[k])),
  };
};

const formToPayload = (f) => {
  const commercial = f.property === "commercial";
  return {
    postData: {
      title: f.title.trim(),
      price: parseInt(f.price, 10),
      address: f.address.trim(),
      city: f.city,
      district: f.district,
      bedroom: commercial ? 0 : parseInt(f.bedroom, 10) || 0,
      bathroom: parseInt(f.bathroom, 10) || 0,
      type: f.type,
      property: f.property,
      propertyType: f.propertyType,
      latitude: String(f.latitude),
      longitude: String(f.longitude),
      images: f.images,
    },
    postDetail: {
      desc: f.desc,
      utilities: f.utilities,
      pet: commercial ? "not-allowed" : f.pet,
      Furnished: f.Furnished,
      size: parseInt(f.size, 10) || null,
      ...Object.fromEntries(
        NEARBY_PLACES.map(([key]) => [key, f.nearby.includes(key) ? "yes" : "no"])
      ),
    },
  };
};

const plainText = (html = "") =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;
const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 11);
const groupDigits = (v) =>
  digitsOnly(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const compactPrice = (n) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
    : n >= 1e3
    ? `${Math.round(n / 1e3)}k`
    : String(n);

// ---------- steps ----------
const STEPS = [
  {
    id: "type",
    label: "Type",
    title: "Which of these best describes your place?",
    check: (f) => (!f.propertyType ? "Choose what kind of place it is." : ""),
  },
  {
    id: "location",
    label: "Location",
    title: "Where is it located?",
    hint: "Visitors see the exact pin, so place it on the building.",
    check: (f) => {
      if (!f.city) return "Choose the wilaya.";
      if (!f.district) return "Choose the district.";
      if (f.address.trim().length < 3) return "Add the street address.";
      if (!f.latitude || !f.longitude) return "Drop a pin on the map.";
      if (!isInAlgeria({ lat: +f.latitude, lng: +f.longitude }))
        return OUTSIDE_ALGERIA;
      return "";
    },
  },
  {
    id: "basics",
    label: "Basics",
    title: "Share some basics about your place",
    hint: "You'll add more details later, like nearby places.",
    check: (f) => {
      const size = parseInt(f.size, 10);
      if (!size) return "Enter the size in square metres.";
      if (size > 100000) return "That size looks too large. Check the number.";
      return "";
    },
  },
  {
    id: "nearby",
    label: "Nearby",
    title: "What's within walking distance?",
    hint: "Pick everything a few minutes away on foot. Skip this if none apply.",
    check: () => "",
  },
  {
    id: "photos",
    label: "Photos",
    title: "Add some photos of your place",
    hint: "You need at least one to continue. Five or more get the most visits.",
    check: (f) =>
      f.images.length === 0
        ? "Add at least one photo."
        : f.images.length > rules.maxImages
        ? `Keep it to ${rules.maxImages} photos. Remove ${f.images.length - rules.maxImages}.`
        : "",
  },
  {
    id: "describe",
    label: "Description",
    title: "Now, give your place a title and description",
    hint: "Short titles work best. Keep phone numbers out — buyers contact you through Bayti messages.",
    check: (f) => {
      if (f.title.trim().length < 10) return "Write a title of at least 10 characters.";
      if (plainText(f.desc).length < MIN_DESC)
        return `Write a description of at least ${MIN_DESC} characters.`;
      return "";
    },
  },
  {
    id: "price",
    label: "Price",
    title: "Now, set your price",
    check: (f) => {
      const n = parseInt(f.price, 10);
      if (!n) return "Enter a price.";
      return "";
    },
  },
  {
    id: "review",
    label: "Review",
    title: "Review your listing",
    check: () => "",
  },
];

// ---------- small controls ----------
function Tiles({ name, value, options, onChange, size = "md" }) {
  return (
    <div className={`tiles tiles--${size}`} role="radiogroup" aria-label={name}>
      {options.map(([val, label, Icon, sub]) => (
        <button
          key={val}
          type="button"
          role="radio"
          aria-checked={value === val}
          className={`tile ${value === val ? "selected" : ""}`}
          onClick={() => onChange(name, val)}
        >
          {Icon && <Icon size={28} strokeWidth={1.5} />}
          <span className="tileLabel">{label}</span>
          {sub && <span className="tileSub">{sub}</span>}
        </button>
      ))}
    </div>
  );
}

function Counter({ label, name, value, onChange, min = 0, max = 20 }) {
  const n = parseInt(value, 10) || 0;
  return (
    <div className="row">
      <span id={`${name}-label`}>{label}</span>
      <div className="counter" role="group" aria-labelledby={`${name}-label`}>
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={n <= min}
          onClick={() => onChange(name, Math.max(min, n - 1))}
        >
          <Minus size={14} />
        </button>
        <output aria-live="polite">{n}</output>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={n >= max}
          onClick={() => onChange(name, Math.min(max, n + 1))}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function ChoiceRow({ label, name, value, options, onChange }) {
  return (
    <div className="row">
      <span>{label}</span>
      <div className="pills" role="radiogroup" aria-label={label}>
        {options.map(([val, text]) => (
          <button
            key={val}
            type="button"
            role="radio"
            aria-checked={value === val}
            className={value === val ? "selected" : ""}
            onClick={() => onChange(name, val)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }) {
  return (
    <section className="reviewBlock">
      <div className="reviewBlockHead">
        <h3>{title}</h3>
        <button type="button" className="btn-link" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="reviewBlockBody">{children}</div>
    </section>
  );
}

// ---------- form ----------
export default function PostForm({
  initial,
  submitLabel,
  reviewNote,
  onSubmit,
  onCancel,
}) {
  const editing = Boolean(initial);
  // An existing listing keeps its type even if that type was disabled since
  const initialType = useRef(initial?.propertyType);
  const [form, setForm] = useState(() => {
    if (initial) return initial;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved && typeof saved === "object") return { ...EMPTY_POST, ...saved };
    } catch {
      // storage unavailable or corrupt: start fresh
    }
    return EMPTY_POST;
  });
  const [restored] = useState(
    () => !initial && JSON.stringify(form) !== JSON.stringify(EMPTY_POST)
  );
  // Editing opens on the summary so owners can jump straight to what changed;
  // a restored draft resumes at its first unfinished step
  const [startStep] = useState(() => {
    if (editing) return STEPS.length - 1;
    if (!restored) return 0;
    let saved = 0;
    try {
      saved = parseInt(localStorage.getItem(DRAFT_STEP_KEY), 10) || 0;
    } catch {
      // ignore
    }
    // Where they left off, unless an earlier step is still incomplete
    const open = STEPS.findIndex((st) => st.check(form));
    return Math.min(saved, open === -1 ? STEPS.length - 1 : open);
  });
  const [step, setStep] = useState(startStep);
  const [returnToReview, setReturnToReview] = useState(false);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [locating, setLocating] = useState(false);
  const [mapFocus, setMapFocus] = useState(null);
  const [comparables, setComparables] = useState(null);
  const headingRef = useRef(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const commercial = form.property === "commercial";

  const [, setRulesLoaded] = useState(false);
  useEffect(() => {
    apiRequest
      .get("/settings/public")
      .then((res) => {
        Object.assign(rules, res.data.listings);
        setRulesLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/wilaya.json")
      .then((res) => res.json())
      .then(setCities)
      .catch((err) => console.error("Error loading cities:", err));
  }, []);

  // Keep an unsent new listing across reloads
  useEffect(() => {
    if (editing) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // private mode / storage full: the draft just isn't kept
    }
  }, [form, editing]);

  // New step: scroll up and move focus to its question for screen readers
  useEffect(() => {
    if (!editing) {
      try {
        localStorage.setItem(DRAFT_STEP_KEY, String(step));
      } catch {
        // ignore
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Centre the map on the chosen wilaya / district (OpenStreetMap geocoder).
  // A restored draft or an edited listing that already has a pin opens on the
  // pin; only picking a different wilaya / district moves the map.
  const focusedArea = useRef(
    form.latitude && form.longitude ? `${form.city}|${form.district}` : null
  );
  useEffect(() => {
    if (!form.city) return;
    const area = `${form.city}|${form.district}`;
    if (area === focusedArea.current) return;
    const q = [form.district, form.city, "Algeria"].filter(Boolean).join(", ");
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=dz&q=${encodeURIComponent(q)}`,
        { signal: ctrl.signal, headers: { "Accept-Language": "en" } }
      )
        .then((r) => r.json())
        .then(([hit]) => {
          if (!hit?.boundingbox) return;
          focusedArea.current = area;
          const [s, n, w, e] = hit.boundingbox.map(Number);
          setMapFocus({
            bounds: [
              [s, w],
              [n, e],
            ],
            maxZoom: form.district ? 14 : 10,
          });
        })
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [form.city, form.district]);

  // Price guidance from similar published listings
  useEffect(() => {
    if (current.id !== "price" || !form.city) return;
    apiRequest
      .get("/posts", {
        params: { city: form.city, type: form.type, property: form.property },
      })
      .then((res) => {
        const prices = res.data
          .map((p) => p.price)
          .filter((p) => p > 0)
          .sort((a, b) => a - b);
        setComparables(
          prices.length >= 2
            ? { count: prices.length, low: prices[0], high: prices[prices.length - 1] }
            : null
        );
      })
      .catch(() => setComparables(null));
  }, [current.id, form.city, form.type, form.property]);

  const districts = cities.find((c) => c.name === form.city)?.dairats || [];
  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "city" ? { district: "" } : {}),
    }));
    setError("");
  };

  const setCategory = (_, value) =>
    setForm((prev) =>
      prev.property === value ? prev : { ...prev, property: value, propertyType: "" }
    );

  const toggleNearby = (key) =>
    setForm((prev) => ({
      ...prev,
      nearby: prev.nearby.includes(key)
        ? prev.nearby.filter((k) => k !== key)
        : [...prev.nearby, key],
    }));

  // UploadWidget calls setState(prev => [...prev, url])
  const setImages = (updater) => {
    setForm((prev) => ({
      ...prev,
      images: typeof updater === "function" ? updater(prev.images) : updater,
    }));
    setError("");
  };

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setError("Paste a full image link starting with http:// or https://");
      return;
    }
    if (form.images.includes(url)) {
      setError("That photo is already added.");
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageUrl("");
  };

  const removeImage = (index) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  const moveImage = (index, delta) =>
    setImages((prev) => {
      const to = index + delta;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const setCoords = ({ lat, lng }) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    setError("");
    // Suggest the street when the owner hasn't typed one yet
    if (!form.address.trim()) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "fr" } }
      )
        .then((r) => r.json())
        .then((res) => {
          const a = res?.address || {};
          const street = [a.house_number, a.road].filter(Boolean).join(" ");
          if (street)
            setForm((prev) => (prev.address.trim() ? prev : { ...prev, address: street }));
        })
        .catch(() => {});
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser can't share its location. Tap the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (isInAlgeria(here)) setCoords(here);
        else setError(OUTSIDE_ALGERIA);
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. Allow location access or tap the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const goTo = (index) => {
    setError("");
    setStep(index);
  };

  const next = () => {
    const problem = current.check(form);
    if (problem) {
      setError(problem);
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      goTo(STEPS.length - 1);
      return;
    }
    goTo(step + 1);
  };

  const back = () => {
    if (step === 0) return onCancel?.();
    setReturnToReview(false);
    goTo(step - 1);
  };

  const editStep = (id) => {
    setReturnToReview(true);
    goTo(STEPS.findIndex((s) => s.id === id));
  };

  const startOver = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_STEP_KEY);
    } catch {
      // ignore
    }
    setForm(EMPTY_POST);
    goTo(0);
  };

  const submit = async () => {
    // Re-check every step: a draft or an older listing may be incomplete
    const bad = STEPS.findIndex((s) => s.check(form));
    if (bad !== -1 && bad !== STEPS.length - 1) {
      setReturnToReview(true);
      goTo(bad);
      setError(STEPS[bad].check(form));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(formToPayload(form));
      if (!editing) {
        try {
          localStorage.removeItem(DRAFT_KEY);
          localStorage.removeItem(DRAFT_STEP_KEY);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLast) submit();
    else next();
  };

  const position =
    form.latitude && form.longitude
      ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }
      : null;

  const priceNumber = parseInt(form.price, 10) || 0;
  const typeLabel = useMemo(
    () =>
      PROPERTY_TYPES[form.property]?.find(([v]) => v === form.propertyType)?.[1] ||
      formatPropertyType(form.propertyType),
    [form.property, form.propertyType]
  );

  return (
    <div className="postFormPage">
      <form className="postForm" onSubmit={handleSubmit} noValidate>
        {step === startStep && restored && (
          <p className="restored">
            We kept the listing you started earlier.{" "}
            <button type="button" className="btn-link" onClick={startOver}>
              Start over
            </button>
          </p>
        )}

        <div className="stepHead">
          <h1 tabIndex={-1} ref={headingRef}>
            {current.id === "review" && editing ? "Your listing" : current.title}
          </h1>
          {current.hint && <p className="hint">{current.hint}</p>}
        </div>

        {/* ---------- 1. type ---------- */}
        {current.id === "type" && (
          <div className="stepBody">
            <Tiles
              name="property"
              value={form.property}
              onChange={setCategory}
              size="sm"
              options={[
                ["residential", "A home"],
                ["commercial", "A business space"],
              ]}
            />
            <Tiles
              name="propertyType"
              value={form.propertyType}
              onChange={set}
              options={PROPERTY_TYPES[form.property].filter(
                ([v]) => !rules.enabledPropertyTypes || rules.enabledPropertyTypes.includes(v) || v === initialType.current
              )}
            />
            <h2 className="subQuestion">Are you selling or renting it out?</h2>
            <Tiles
              name="type"
              value={form.type}
              onChange={set}
              size="wide"
              options={[
                ["buy", "Sell it", Tag, "Buyers pay a one-time price"],
                ["rent", "Rent it out", KeyRound, "Tenants pay every month"],
              ]}
            />
          </div>
        )}

        {/* ---------- 2. location ---------- */}
        {current.id === "location" && (
          <div className="stepBody">
            <div className="grid2">
              <div className="field">
                <label htmlFor="city">Wilaya</label>
                <select id="city" name="city" value={form.city} onChange={handleInput}>
                  <option value="">Select a wilaya</option>
                  {cities.map((c) => (
                    <option key={c.mattricule} value={c.name}>
                      {String(c.mattricule).padStart(2, "0")} · {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="district">District (daïra)</label>
                <select
                  id="district"
                  name="district"
                  value={form.district}
                  onChange={handleInput}
                  disabled={!form.city}
                >
                  <option value="">
                    {form.city ? "Select a district" : "Choose a wilaya first"}
                  </option>
                  {/* keep a stored value selectable even if it's not in the list */}
                  {form.district &&
                    !districts.some((d) => d.name === form.district) && (
                      <option value={form.district}>{form.district}</option>
                    )}
                  {districts.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Street address</label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleInput}
                placeholder="e.g. 12 Rue Didouche Mourad"
                autoComplete="street-address"
              />
            </div>
            <div className="mapBlock">
              <LocationPicker
                value={position}
                focus={mapFocus}
                onLocationChange={setCoords}
                onOutside={() => setError(OUTSIDE_ALGERIA)}
                height={380}
              />
              <div className="mapBar">
                <span className={`coords ${position ? "set" : ""}`}>
                  <MapPin size={15} />
                  {position
                    ? "Pin placed. Drag it to fine-tune."
                    : form.city
                    ? "Tap the map where the building is."
                    : "Choose a wilaya to zoom in, then tap the map."}
                </span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={useMyLocation}
                  disabled={locating}
                >
                  {locating ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <Crosshair size={15} />
                  )}
                  Use my location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 3. basics ---------- */}
        {current.id === "basics" && (
          <div className="stepBody">
            <div className="rows">
              {!commercial && (
                <Counter
                  label="Bedrooms"
                  name="bedroom"
                  value={form.bedroom}
                  onChange={set}
                />
              )}
              <Counter
                label="Bathrooms"
                name="bathroom"
                value={form.bathroom}
                onChange={set}
              />
              <div className="row">
                <label htmlFor="size">Size</label>
                <div className="sizeInput">
                  <input
                    id="size"
                    name="size"
                    inputMode="numeric"
                    value={form.size}
                    onChange={(e) => set("size", digitsOnly(e.target.value).slice(0, 6))}
                    placeholder="—"
                  />
                  <span>m²</span>
                </div>
              </div>
              <ChoiceRow
                label="Furnished"
                name="Furnished"
                value={form.Furnished}
                onChange={set}
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                ]}
              />
              {!commercial && (
                <ChoiceRow
                  label="Pets"
                  name="pet"
                  value={form.pet}
                  onChange={set}
                  options={[
                    ["allowed", "Allowed"],
                    ["not-allowed", "Not allowed"],
                  ]}
                />
              )}
              <ChoiceRow
                label="Utilities paid by"
                name="utilities"
                value={form.utilities}
                onChange={set}
                options={[
                  ["owner", "Owner"],
                  ["tenant", "Tenant"],
                ]}
              />
            </div>
          </div>
        )}

        {/* ---------- 4. nearby ---------- */}
        {current.id === "nearby" && (
          <div className="stepBody">
            <div className="chips">
              {NEARBY_PLACES.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`chip ${form.nearby.includes(key) ? "selected" : ""}`}
                  aria-pressed={form.nearby.includes(key)}
                  onClick={() => toggleNearby(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- 5. photos ---------- */}
        {current.id === "photos" && (
          <div className="stepBody">
            {form.images.length > 0 && (
              <ul className="photoGrid">
                {form.images.map((src, i) => (
                  <li className={i === 0 ? "cover" : ""} key={src + i}>
                    <img src={src} alt={`Photo ${i + 1}`} />
                    {i === 0 && <span className="coverTag">Cover photo</span>}
                    <div className="photoActions">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImage(i, -1)}
                          aria-label={`Move photo ${i + 1} earlier`}
                          title="Move earlier"
                        >
                          <ArrowLeft size={14} />
                        </button>
                      )}
                      {i < form.images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveImage(i, 1)}
                          aria-label={`Move photo ${i + 1} later`}
                          title="Move later"
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="dropArea">
              <ImagePlus size={36} strokeWidth={1.3} />
              <strong>
                {form.images.length
                  ? `${form.images.length} ${form.images.length === 1 ? "photo" : "photos"} added`
                  : "Show buyers what it looks like"}
              </strong>
              {UPLOADS_ENABLED ? (
                <>
                  <span>Bright, landscape photos of every room work best.</span>
                  <div className="uploadBtn">
                    <UploadWidget
                      uwConfig={UPLOAD_CONFIG}
                      setState={setImages}
                      onError={(msg) => setError(msg)}
                    />
                  </div>
                </>
              ) : (
                <span>
                  Photo uploads aren&rsquo;t set up yet. Paste image links instead.
                </span>
              )}
              <div className="urlRow">
                <input
                  className="input"
                  placeholder="or paste an image link"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImageUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addImageUrl}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 6. title & description ---------- */}
        {current.id === "describe" && (
          <div className="stepBody">
            <div className="field">
              <label htmlFor="title">Title</label>
              <textarea
                id="title"
                className="titleInput"
                rows={2}
                value={form.title}
                maxLength={TITLE_MAX}
                onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                placeholder={`e.g. Bright ${typeLabel.toLowerCase() || "apartment"} in ${form.district || form.city || "the city centre"}`}
              />
              <span className="counterText">
                {form.title.length}/{TITLE_MAX}
              </span>
            </div>
            <div className="field">
              <label>Description</label>
              <div className="quillWrap">
                <ReactQuill
                  theme="snow"
                  value={form.desc}
                  onChange={(v) => set("desc", v)}
                  modules={{
                    toolbar: [["bold", "italic"], [{ list: "bullet" }], ["clean"]],
                  }}
                  placeholder="What makes it special? Mention the condition, the light, the view, recent renovations and what's included."
                />
              </div>
              <span className="counterText">
                {plainText(form.desc).length < MIN_DESC
                  ? `${MIN_DESC - plainText(form.desc).length} more characters needed`
                  : `${plainText(form.desc).length} characters`}
              </span>
            </div>
          </div>
        )}

        {/* ---------- 7. price ---------- */}
        {current.id === "price" && (
          <div className="stepBody">
            <div className="priceHero">
              <label htmlFor="price" className="visually-hidden">
                {form.type === "rent" ? "Monthly rent in dinars" : "Price in dinars"}
              </label>
              <div className="priceLine">
                <input
                  id="price"
                  inputMode="numeric"
                  autoComplete="off"
                  value={groupDigits(form.price)}
                  onChange={(e) => set("price", digitsOnly(e.target.value))}
                  placeholder="0"
                  style={{ width: `${Math.max(2, groupDigits(form.price).length || 1) + 0.5}ch` }}
                />
                <span className="currency">DZD</span>
              </div>
              <p className="per">
                {form.type === "rent" ? "per month" : "asking price"}
                {priceNumber >= 1e6 && ` · ${compactPrice(priceNumber)} DZD`}
              </p>
            </div>
            {comparables ? (
              <p className="comparables">
                {comparables.count} similar {form.type === "rent" ? "rentals" : "listings"} in{" "}
                {form.city} are priced between{" "}
                <strong>{compactPrice(comparables.low)}</strong> and{" "}
                <strong>{compactPrice(comparables.high)}</strong> DZD.
              </p>
            ) : (
              <p className="comparables">
                Not sure? Look at similar {form.type === "rent" ? "rentals" : "homes"} in{" "}
                {form.city || "your area"} and price it a little below them to get
                more visits.
              </p>
            )}
          </div>
        )}

        {/* ---------- 8. review ---------- */}
        {current.id === "review" && (
          <div className="stepBody reviewStep">
            {reviewNote}
            <div className="previewCard">
              {form.images[0] ? (
                <img src={form.images[0]} alt="" />
              ) : (
                <div className="noPhoto">No photo yet</div>
              )}
              <div>
                <strong>{form.title || "Untitled listing"}</strong>
                <span>{[form.district, form.city].filter(Boolean).join(", ")}</span>
                <span className="price">
                  {groupDigits(form.price) || "—"} DZD
                  {form.type === "rent" && " / month"}
                </span>
              </div>
            </div>

            <ReviewBlock title="Type" onEdit={() => editStep("type")}>
              {typeLabel || "Not set"} · {form.type === "rent" ? "For rent" : "For sale"}
            </ReviewBlock>
            <ReviewBlock title="Location" onEdit={() => editStep("location")}>
              {[form.address, form.district, form.city].filter(Boolean).join(", ") ||
                "Not set"}
              {!position && <span className="missing"> · no pin on the map</span>}
            </ReviewBlock>
            <ReviewBlock title="Basics" onEdit={() => editStep("basics")}>
              {[
                !commercial && plural(form.bedroom, "bedroom"),
                plural(form.bathroom, "bathroom"),
                form.size ? `${form.size} m²` : null,
                form.Furnished === "yes" ? "Furnished" : "Unfurnished",
                !commercial && (form.pet === "allowed" ? "Pets allowed" : "No pets"),
                `utilities paid by the ${form.utilities}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </ReviewBlock>
            <ReviewBlock title="Nearby" onEdit={() => editStep("nearby")}>
              {form.nearby.length
                ? NEARBY_PLACES.filter(([k]) => form.nearby.includes(k))
                    .map(([, l]) => l)
                    .join(", ")
                : "Nothing selected"}
            </ReviewBlock>
            <ReviewBlock title="Photos" onEdit={() => editStep("photos")}>
              {form.images.length ? (
                <div className="miniStrip">
                  {form.images.slice(0, 6).map((src, i) => (
                    <img key={src + i} src={src} alt="" />
                  ))}
                  {form.images.length > 6 && <span>+{form.images.length - 6}</span>}
                </div>
              ) : (
                <span className="missing">No photos</span>
              )}
            </ReviewBlock>
            <ReviewBlock title="Description" onEdit={() => editStep("describe")}>
              <p className="descPreview">
                {plainText(form.desc) || <span className="missing">No description</span>}
              </p>
            </ReviewBlock>
            <ReviewBlock title="Price" onEdit={() => editStep("price")}>
              {groupDigits(form.price) || "—"} DZD
              {form.type === "rent" ? " per month" : ""}
            </ReviewBlock>
          </div>
        )}

        {/* ---------- bottom bar ---------- */}
        <div className="actionBar">
          <div className="progress" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.id} className={i <= step ? "done" : ""} />
            ))}
          </div>
          <div className="actionInner">
            <button type="button" className="btn-link backBtn" onClick={back}>
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <span className="stepCount">
              Step {step + 1} of {STEPS.length}
              <span className="stepName"> · {current.label}</span>
            </span>
            {error && (
              <p className="formError" role="alert">
                {error}
              </p>
            )}
            {isLast ? (
              <button
                type="submit"
                className="btn btn-primary submitBtn"
                disabled={submitting}
              >
                {submitting && <Loader2 size={16} className="spin" />}
                {submitLabel}
              </button>
            ) : (
              <button type="submit" className="btn btn-dark">
                {returnToReview ? "Back to review" : "Next"}
              </button>
            )}
          </div>
        </div>
        {/* screen-reader progress */}
        <p className="visually-hidden" aria-live="polite">
          Step {step + 1} of {STEPS.length}: {current.label}
        </p>
      </form>
    </div>
  );
}
