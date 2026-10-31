import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { formatPropertyType } from "../../../shared/format.js";
import { Field, PageHead, Spinner, useToast } from "../components/ui";

const ALL_TYPES = [
  ["residential", ["apartment", "individual_house", "traditional_house", "other_residential"]],
  ["commercial", ["office", "retail", "hospitality", "industrial"]],
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, notify] = useToast();

  useEffect(() => {
    api
      .get("/settings")
      .then((res) => {
        setSettings(res.data.settings);
        setSaved(res.data.settings);
      })
      .catch((err) => setError(errorMessage(err, "Couldn't load settings.")));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!settings) return <Spinner />;

  const set = (section, key, value) => setSettings((s) => ({ ...s, [section]: { ...s[section], [key]: value } }));
  const banner = settings.marketplace.homeBanner;
  const setBanner = (key, value) => set("marketplace", "homeBanner", { ...banner, [key]: value });
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/settings", settings);
      setSettings(data.settings);
      setSaved(data.settings);
      notify("Settings saved. The marketplace picks them up within a minute.");
    } catch (err) {
      notify(errorMessage(err, "Couldn't save settings."), true);
    } finally {
      setBusy(false);
    }
  };

  const types = settings.listings.enabledPropertyTypes;

  return (
    <div className="admin-dashboard listingPage backoffice narrow">
      <PageHead title="Settings" subtitle="Rules and content for the whole marketplace. Changes are logged." />
      <form onSubmit={save} className="stack">
        <section className="card">
          <h2>Listings</h2>
          <div className="formGrid">
            <Field label="Photos per listing" htmlFor="maxImages" hint="Enforced when owners create or edit a listing.">
              <input
                id="maxImages"
                type="number"
                min={1}
                max={50}
                value={settings.listings.maxImages}
                onChange={(e) => set("listings", "maxImages", Number(e.target.value))}
              />
            </Field>
            <Field label="Active listings per individual" htmlFor="maxActive" hint="Published and in-review listings count; archived and rejected don't. 0 means no limit. Listings created by the team aren't limited.">
              <input
                id="maxActive"
                type="number"
                min={0}
                value={settings.listings.individualActiveLimit}
                onChange={(e) => set("listings", "individualActiveLimit", Number(e.target.value))}
              />
            </Field>
            <label className="checkRow span2">
              <input
                type="checkbox"
                checked={settings.listings.reviewOwnerEdits}
                onChange={(e) => set("listings", "reviewOwnerEdits", e.target.checked)}
              />
              Send published listings back to review when their owner edits them
            </label>
          </div>
          <h3>Property types accepted for new listings</h3>
          <p className="muted small">Existing listings keep their type. The categories themselves are fixed by the marketplace's search and filters.</p>
          {ALL_TYPES.map(([group, list]) => (
            <fieldset className="chipGroup" key={group}>
              <legend>{group === "residential" ? "Residential" : "Commercial"}</legend>
              {list.map((t) => (
                <label key={t} className={types.includes(t) ? "active" : ""}>
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={(e) =>
                      set("listings", "enabledPropertyTypes", e.target.checked ? [...types, t] : types.filter((x) => x !== t))
                    }
                  />
                  {formatPropertyType(t)}
                </label>
              ))}
            </fieldset>
          ))}
        </section>

        <section className="card">
          <h2>Home page banner</h2>
          <div className="formGrid">
            <label className="checkRow span2">
              <input type="checkbox" checked={banner.enabled} onChange={(e) => setBanner("enabled", e.target.checked)} />
              Show a banner at the top of the marketplace home page
            </label>
            <Field label="Title" htmlFor="bTitle" span={2}>
              <input id="bTitle" value={banner.title} onChange={(e) => setBanner("title", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Text" htmlFor="bText" span={2}>
              <textarea id="bText" rows={2} value={banner.text} onChange={(e) => setBanner("text", e.target.value)} maxLength={300} />
            </Field>
            <Field label="Link (optional)" htmlFor="bLink" hint="A marketplace path like /list?type=rent, or a full https:// address.">
              <input id="bLink" value={banner.linkUrl} onChange={(e) => setBanner("linkUrl", e.target.value)} />
            </Field>
            <Field label="Link text" htmlFor="bLinkLabel">
              <input id="bLinkLabel" value={banner.linkLabel} onChange={(e) => setBanner("linkLabel", e.target.value)} maxLength={40} />
            </Field>
            <Field label="Support email" htmlFor="supportEmail" span={2} hint="Shown to people on the marketplace who need help.">
              <input id="supportEmail" type="email" value={settings.marketplace.supportEmail} onChange={(e) => set("marketplace", "supportEmail", e.target.value)} />
            </Field>
          </div>
          <p className="muted small">Featured listings are chosen from each listing's page.</p>
        </section>

        <section className="card">
          <h2>Agencies</h2>
          <div className="stack">
            <label className="checkRow">
              <input type="checkbox" checked={settings.agencies.acceptApplications} onChange={(e) => set("agencies", "acceptApplications", e.target.checked)} />
              Accept new agency applications (applications already sent can still be completed)
            </label>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={settings.agencies.managersCanManageAgents}
                onChange={(e) => set("agencies", "managersCanManageAgents", e.target.checked)}
              />
              Agency managers can add and remove agents (owners always can)
            </label>
            <Field label="Active listings per agency" htmlFor="agencyLimit" hint="Shared by the whole agency. 0 means no limit.">
              <input
                id="agencyLimit"
                type="number"
                min={0}
                value={settings.agencies.activeListingLimit}
                onChange={(e) => set("agencies", "activeListingLimit", Number(e.target.value))}
              />
            </Field>
          </div>
        </section>

        <section className="card">
          <h2>Notifications</h2>
          <div className="stack">
            <label className="checkRow">
              <input type="checkbox" checked={settings.notifications.newUser} onChange={(e) => set("notifications", "newUser", e.target.checked)} />
              Notify the team when someone signs up
            </label>
            <label className="checkRow">
              <input type="checkbox" checked={settings.notifications.newListing} onChange={(e) => set("notifications", "newListing", e.target.checked)} />
              Notify the team when a listing needs review
            </label>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={settings.notifications.emailApplicants}
                onChange={(e) => set("notifications", "emailApplicants", e.target.checked)}
              />
              Also email applicants about decisions on their application
            </label>
            <Field
              label="Team emails for new applications and reports"
              htmlFor="adminEmails"
              hint="One per line. Optional: the dashboard is always notified."
            >
              <textarea
                id="adminEmails"
                rows={3}
                value={settings.notifications.adminEmails.join("\n")}
                onChange={(e) => set("notifications", "adminEmails", e.target.value.split(/[\n,]/).map((x) => x.trim()).filter(Boolean))}
              />
            </Field>
          </div>
        </section>

        <div className="formActions sticky">
          {dirty && <span className="muted small">Unsaved changes</span>}
          <button type="button" className="btn-link" disabled={!dirty} onClick={() => setSettings(saved)}>
            Discard
          </button>
          <button className="btn btn-dark btn-sm" disabled={busy || !dirty}>
            {busy && <Loader2 size={15} className="spin" />}
            Save settings
          </button>
        </div>
      </form>
      {toast}
    </div>
  );
}
