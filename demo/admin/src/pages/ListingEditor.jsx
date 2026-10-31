import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { AVAILABILITY_LABEL, STATUS } from "../lib/format";
import { formatPropertyType } from "../../../shared/format.js";
import { BackLink, Field, PageHead, Spinner, useToast } from "../components/ui";
import ImageManager from "../components/ImageManager";
import UserPicker from "../components/UserPicker";
import { useWilayas } from "../components/AgencyFields";
import NotFound from "./NotFound";

const PROPERTY_TYPES = {
  residential: ["apartment", "individual_house", "traditional_house", "other_residential"],
  commercial: ["office", "retail", "hospitality", "industrial"],
};
// Same keys the marketplace form stores ("yes"/"no")
const NEARBY = [
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
const LISTING_STATUSES = ["pending", "approved", "rejected", "unpublished", "archived"];

const EMPTY = {
  title: "", price: "", type: "buy", property: "residential", propertyType: "apartment",
  city: "", district: "", address: "", latitude: "", longitude: "", bedroom: "1", bathroom: "1",
  images: [], status: "approved", availability: "available", featured: false, userId: null, agencyId: "",
  desc: "", descOriginal: null, size: "", utilities: "owner", pet: "not-allowed", Furnished: "no", nearby: [],
};

// Descriptions are stored as HTML from the marketplace editor. The team edits
// plain text; it's only turned back into (escaped) paragraphs if it changed.
const htmlToText = (html = "") =>
  html
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const textToHtml = (text) =>
  !text.trim()
    ? ""
    : text
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br>")}</p>`)
        .join("");

const legacy = (v, yes, no) => (v === "yes" ? yes : v === "no" ? no : v || no);
const isNearby = (v) => v !== null && v !== undefined && v !== "" && v !== "no";

const toForm = (p) => {
  const d = p.postDetail || {};
  return {
    ...EMPTY,
    title: p.title, price: String(p.price), type: p.type, property: p.property, propertyType: p.propertyType,
    city: p.city, district: p.district, address: p.address, latitude: p.latitude, longitude: p.longitude,
    bedroom: String(p.bedroom), bathroom: String(p.bathroom), images: Array.isArray(p.images) ? p.images : [],
    status: p.status, availability: p.availability, featured: p.featured, userId: p.userId, agencyId: p.agencyId ?? "",
    desc: htmlToText(d.desc), descOriginal: htmlToText(d.desc), size: d.size ?? "", utilities: legacy(d.utilities, "owner", "tenant"),
    pet: legacy(d.pet, "allowed", "not-allowed"), Furnished: d.Furnished === "yes" ? "yes" : "no",
    nearby: NEARBY.map(([k]) => k).filter((k) => isNearby(d[k])),
  };
};

const toPayload = (f) => ({
  postData: {
    title: f.title, price: f.price, type: f.type, property: f.property, propertyType: f.propertyType,
    city: f.city, district: f.district, address: f.address, latitude: f.latitude, longitude: f.longitude,
    bedroom: f.property === "commercial" ? 0 : f.bedroom, bathroom: f.bathroom, images: f.images,
    status: f.status, availability: f.availability, featured: f.featured, userId: f.userId,
    agencyId: f.agencyId === "" ? null : Number(f.agencyId),
  },
  postDetail: {
    ...(f.desc !== f.descOriginal ? { desc: textToHtml(f.desc) } : {}),
    size: f.size, utilities: f.utilities, pet: f.property === "commercial" ? "not-allowed" : f.pet,
    Furnished: f.Furnished,
    ...Object.fromEntries(NEARBY.map(([k]) => [k, f.nearby.includes(k) ? "yes" : "no"])),
  },
});

export default function ListingEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const creating = !id;
  const [form, setForm] = useState(creating ? { ...EMPTY, userId: Number(params.get("user")) || null } : null);
  const [missing, setMissing] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, notify] = useToast();
  const wilayas = useWilayas();

  useEffect(() => {
    api.get("/agencies").then((res) => setAgencies(res.data)).catch(() => {});
    if (creating) return;
    api
      .get(`/posts/${id}`)
      .then((res) => setForm(toForm(res.data)))
      .catch((err) => (err.response?.status === 404 ? setMissing(true) : setError(errorMessage(err))));
  }, [id, creating]);

  if (missing) return <NotFound />;
  if (!form) return error ? <p className="error-text">{error}</p> : <Spinner />;

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };
  const districts = wilayas.find((w) => w.name === form.city)?.dairats || [];

  const locate = async () => {
    const q = [form.address, form.district, form.city, "Algeria"].filter(Boolean).join(", ");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const [hit] = await res.json();
      if (!hit) return notify("Couldn't find that address. Enter the coordinates by hand.", true);
      setForm((f) => ({ ...f, latitude: Number(hit.lat).toFixed(6), longitude: Number(hit.lon).toFixed(6) }));
    } catch {
      notify("The map lookup failed. Enter the coordinates by hand.", true);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.userId) return setError("Choose the account that owns this listing.");
    setBusy(true);
    try {
      const payload = toPayload(form);
      const { data } = creating ? await api.post("/posts", payload) : await api.put(`/posts/${id}`, payload);
      notifyDataChanged();
      navigate(`/listings/${data.id}`, { state: { saved: true } });
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the listing."));
      setBusy(false);
    }
  };

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);

  return (
    <div className="admin-dashboard listingPage backoffice">
      <BackLink to={creating ? "/listings" : `/listings/${id}`}>{creating ? "All listings" : "Back to the listing"}</BackLink>
      <PageHead
        title={creating ? "New listing" : "Edit listing"}
        subtitle={creating ? "Listings created by the team can go live straight away." : "Changes by the team keep the status you choose below."}
      />

      <form onSubmit={submit} className="detailGrid">
        <div className="detailMain">
          <section className="card">
            <h2>Basics</h2>
            <div className="formGrid">
              <Field label="Title" htmlFor="title" span={2} required>
                <input id="title" value={form.title} onChange={set("title")} maxLength={120} required />
              </Field>
              <Field label="Offer" htmlFor="type">
                <select id="type" value={form.type} onChange={set("type")}>
                  <option value="buy">For sale</option>
                  <option value="rent">For rent</option>
                </select>
              </Field>
              <Field label={form.type === "rent" ? "Monthly rent (DZD)" : "Price (DZD)"} htmlFor="price" required>
                <input id="price" type="number" min={0} value={form.price} onChange={set("price")} required />
              </Field>
              <Field label="Category" htmlFor="property">
                <select
                  id="property"
                  value={form.property}
                  onChange={(e) => setForm((f) => ({ ...f, property: e.target.value, propertyType: PROPERTY_TYPES[e.target.value][0] }))}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </Field>
              <Field label="Property type" htmlFor="propertyType">
                <select id="propertyType" value={form.propertyType} onChange={set("propertyType")}>
                  {PROPERTY_TYPES[form.property].map((t) => (
                    <option key={t} value={t}>
                      {formatPropertyType(t)}
                    </option>
                  ))}
                </select>
              </Field>
              {form.property === "residential" && (
                <Field label="Bedrooms" htmlFor="bedroom">
                  <input id="bedroom" type="number" min={0} value={form.bedroom} onChange={set("bedroom")} />
                </Field>
              )}
              <Field label="Bathrooms" htmlFor="bathroom">
                <input id="bathroom" type="number" min={0} value={form.bathroom} onChange={set("bathroom")} />
              </Field>
              <Field label="Size (m²)" htmlFor="size">
                <input id="size" type="number" min={0} value={form.size} onChange={set("size")} />
              </Field>
            </div>
          </section>

          <section className="card">
            <h2>Photos</h2>
            <ImageManager images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} notify={notify} />
          </section>

          <section className="card">
            <h2>Location</h2>
            <div className="formGrid">
              <Field label="Wilaya" htmlFor="city" required>
                <select id="city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value, district: "" }))} required>
                  <option value="">Choose</option>
                  {wilayas.map((w) => (
                    <option key={w.name}>{w.name}</option>
                  ))}
                  {form.city && !wilayas.some((w) => w.name === form.city) && <option>{form.city}</option>}
                </select>
              </Field>
              <Field label="District" htmlFor="district" required>
                <select id="district" value={form.district} onChange={set("district")} required disabled={!form.city}>
                  <option value="">Choose</option>
                  {districts.map((d) => (
                    <option key={d.code}>{d.name}</option>
                  ))}
                  {form.district && !districts.some((d) => d.name === form.district) && <option>{form.district}</option>}
                </select>
              </Field>
              <Field label="Street address" htmlFor="address" span={2} required>
                <input id="address" value={form.address} onChange={set("address")} required />
              </Field>
              <Field label="Latitude" htmlFor="latitude" required>
                <input id="latitude" inputMode="decimal" value={form.latitude} onChange={set("latitude")} required />
              </Field>
              <Field label="Longitude" htmlFor="longitude" required>
                <input id="longitude" inputMode="decimal" value={form.longitude} onChange={set("longitude")} required />
              </Field>
              <div className="span2 inlineActions">
                <button type="button" className="btn btn-outline btn-sm" onClick={locate} disabled={!form.city}>
                  Find coordinates from the address
                </button>
                {Number.isFinite(lat) && Number.isFinite(lng) && form.latitude && (
                  <a className="btn-link small" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noreferrer">
                    Check the pin on the map
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Description and features</h2>
            <div className="formGrid">
              <Field label="Description" htmlFor="desc" span={2} hint="Plain text; leave a blank line between paragraphs. The owner's original formatting is kept unless you change it.">
                <textarea id="desc" rows={8} value={form.desc} onChange={set("desc")} />
              </Field>
              <Field label="Furnished" htmlFor="Furnished">
                <select id="Furnished" value={form.Furnished} onChange={set("Furnished")}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="Utilities paid by" htmlFor="utilities">
                <select id="utilities" value={form.utilities} onChange={set("utilities")}>
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </Field>
              {form.property === "residential" && (
                <Field label="Pets" htmlFor="pet">
                  <select id="pet" value={form.pet} onChange={set("pet")}>
                    <option value="not-allowed">Not allowed</option>
                    <option value="allowed">Allowed</option>
                  </select>
                </Field>
              )}
            </div>
            <fieldset className="chipGroup">
              <legend>Nearby</legend>
              {NEARBY.map(([k, label]) => (
                <label key={k} className={form.nearby.includes(k) ? "active" : ""}>
                  <input
                    type="checkbox"
                    checked={form.nearby.includes(k)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nearby: e.target.checked ? [...f.nearby, k] : f.nearby.filter((x) => x !== k) }))
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </section>
        </div>

        <aside className="detailSide">
          <section className="card">
            <h2>Publishing</h2>
            <div className="stack">
              <Field label="Status" htmlFor="status">
                <select id="status" value={form.status} onChange={set("status")}>
                  {LISTING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS[s][0]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Availability" htmlFor="availability">
                <select id="availability" value={form.availability} onChange={set("availability")}>
                  {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="checkRow">
                <input type="checkbox" checked={form.featured} onChange={set("featured")} /> Featured (shown first on the marketplace)
              </label>
            </div>
          </section>

          <section className="card">
            <h2>Owner</h2>
            <div className="stack">
              <Field label="Account" htmlFor="owner" required>
                <UserPicker
                  id="owner"
                  value={form.userId}
                  onChange={(userId, user) => setForm((f) => ({ ...f, userId, agencyId: user?.agencyId ?? "" }))}
                />
              </Field>
              <Field label="Agency" htmlFor="agencyId" hint="Set automatically from the owner's agency; change it only to correct the record.">
                <select id="agencyId" value={form.agencyId} onChange={set("agencyId")}>
                  <option value="">No agency</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tradeName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="formActions">
            <Link to={creating ? "/listings" : `/listings/${id}`} className="btn-link">
              Cancel
            </Link>
            <button className="btn btn-dark btn-sm" disabled={busy}>
              {busy && <Loader2 size={15} className="spin" />}
              {creating ? "Create listing" : "Save changes"}
            </button>
          </div>
        </aside>
      </form>
      {toast}
    </div>
  );
}
