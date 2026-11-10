import { useEffect, useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useMember } from "../lib/auth";
import { AGENCY_ROLE_LABEL } from "../lib/format";
import { Confirm, Field, PageHead, Spinner, Tabs, useToast } from "../components/ui";
import { UPLOADS_ENABLED, uploadImage } from "../components/ImageManager";
import "./listingDetail.scss";

const PUBLIC_FIELDS = [
  ["tradeName", "Agency name", { required: true }],
  ["phone", "Phone", { type: "tel" }],
  ["email", "Contact email", { type: "email" }],
  ["website", "Website"],
  ["address", "Address", { span: 2 }],
  ["wilaya", "Wilaya"],
  ["commune", "Commune"],
];
const LEGAL_FIELDS = [
  ["legalName", "Legal name"],
  ["legalForm", "Legal form"],
  ["rcNumber", "RC number"],
  ["nif", "NIF"],
  ["nis", "NIS"],
  ["approvalNumber", "Agrément number"],
  ["approvalWilaya", "Agrément wilaya"],
];

export default function Settings() {
  const { member } = useMember();
  const [tab, setTab] = useState("agency");
  return (
    <div className="workspace listingPage backoffice narrow">
      <PageHead title="Settings" subtitle={`${member.agency.tradeName} · signed in as ${AGENCY_ROLE_LABEL[member.agencyRole].toLowerCase()}`} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "agency", label: "Agency profile" },
          { value: "me", label: "My profile" },
        ]}
      />
      {tab === "agency" ? <AgencyProfile /> : <MyProfile />}
    </div>
  );
}

function AgencyProfile() {
  const { member, refresh } = useMember();
  const [agency, setAgency] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();

  useEffect(() => {
    api
      .get("/details")
      .then((res) => {
        setAgency(res.data);
        setForm(Object.fromEntries([...PUBLIC_FIELDS, ...LEGAL_FIELDS, ["about"], ["logo"]].map(([k]) => [k, res.data[k] ?? ""])));
      })
      .catch((err) => notify(errorMessage(err), true));
  }, [notify]);

  if (!agency) return <Spinner />;
  const editable = agency.canEdit && member.agency.status === "active";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = ([k, label, opts = {}]) => (
    <Field key={k} label={label} htmlFor={`a-${k}`} span={opts.span} required={opts.required && editable}>
      <input id={`a-${k}`} type={opts.type || "text"} value={form[k]} onChange={set(k)} readOnly={!editable} required={opts.required} />
    </Field>
  );

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/details", form);
      setAgency(data);
      await refresh();
      notify("Agency profile saved.");
    } catch (err) {
      notify(errorMessage(err, "Couldn't save."), true);
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    try {
      const url = await uploadImage(file, "agencies");
      setForm((f) => ({ ...f, logo: url }));
    } catch (err) {
      notify(err.message, true);
    }
  };

  return (
    <form className="stack" onSubmit={save}>
      <section className="card">
        <h2>Verification</h2>
        {agency.verified ? (
          <p className="agencyState ok">
            <BadgeCheck size={15} /> Verified by Bayti. Every listing your team publishes shows the verified agency badge.
          </p>
        ) : (
          <p className="muted">
            Not verified. Listings are published under your agency without the verified badge. Verification is granted by
            the Bayti team from your agrément and registry documents.
          </p>
        )}
      </section>

      <section className="card">
        <h2>Public profile</h2>
        <p className="muted small">Shown on your agency page and next to your listings.</p>
        <div className="logoRow">
          {form.logo ? <img src={form.logo} alt="Agency logo" /> : <span className="muted small">No logo yet.</span>}
          {editable && UPLOADS_ENABLED && (
            <label className="btn btn-outline btn-sm">
              {form.logo ? "Replace logo" : "Upload a logo"}
              <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadLogo(e.target.files[0])} />
            </label>
          )}
        </div>
        <div className="formGrid">
          {PUBLIC_FIELDS.map(input)}
          <Field label="About the agency" htmlFor="a-about" span={2}>
            <textarea id="a-about" rows={5} value={form.about} onChange={set("about")} readOnly={!editable} />
          </Field>
        </div>
      </section>

      {"legalName" in agency && (
        <section className="card">
          <h2>Legal information</h2>
          <p className="muted small">Changes here are reported to the Bayti team, who may ask for updated documents.</p>
          <div className="formGrid">{LEGAL_FIELDS.map(input)}</div>
        </section>
      )}

      {editable ? (
        <div className="formActions">
          <button className="btn btn-dark btn-sm" disabled={busy}>
            {busy && <Loader2 size={15} className="spin" />}
            Save agency profile
          </button>
        </div>
      ) : (
        <p className="muted small">Only the agency owner can change these details.</p>
      )}
      {toast}
    </form>
  );
}

function MyProfile() {
  const { member, setMember, logout } = useMember();
  const [form, setForm] = useState({ username: member.username, phone: member.phone || "", avatar: member.avatar || "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toast, notify] = useToast();

  const save = async (body, ok, reset) => {
    setBusy(true);
    try {
      const { data } = await api.put("/profile", body);
      setMember(data);
      notify(ok);
      reset?.();
    } catch (err) {
      notify(errorMessage(err, "Couldn't save."), true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          save(form, "Profile saved.");
        }}
      >
        <h2>Your profile</h2>
        <p className="muted small">Buyers see your name and photo on the listings assigned to you.</p>
        <div className="logoRow">
          <img src={form.avatar || "/noavatar.jpg"} alt="Your photo" style={{ borderRadius: "50%", width: 64, height: 64, objectFit: "cover" }} />
          {UPLOADS_ENABLED && (
            <label className="btn btn-outline btn-sm">
              Change photo
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  try {
                    const url = await uploadImage(e.target.files[0], "avatars");
                    setForm((f) => ({ ...f, avatar: url }));
                  } catch (err) {
                    notify(err.message, true);
                  }
                }}
              />
            </label>
          )}
        </div>
        <div className="formGrid">
          <Field label="Name shown to buyers" htmlFor="me-name" required>
            <input id="me-name" value={form.username} minLength={3} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
          </Field>
          <Field label="Phone" htmlFor="me-phone">
            <input id="me-phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Email" htmlFor="me-email" hint="Your Bayti login. Change it on the marketplace.">
            <input id="me-email" value={member.email} readOnly />
          </Field>
        </div>
        <div className="formActions">
          <button className="btn btn-dark btn-sm" disabled={busy}>
            Save profile
          </button>
        </div>
      </form>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          save(pw, "Password changed.", () => setPw({ currentPassword: "", newPassword: "" }));
        }}
      >
        <h2>Password</h2>
        <div className="formGrid">
          <Field label="Current password" htmlFor="pw-cur" required>
            <input id="pw-cur" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} required />
          </Field>
          <Field label="New password" htmlFor="pw-new" hint="At least 6 characters." required>
            <input id="pw-new" type="password" autoComplete="new-password" minLength={6} value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required />
          </Field>
        </div>
        <div className="formActions">
          <button className="btn btn-outline btn-sm" disabled={busy}>
            Change password
          </button>
        </div>
      </form>

      {member.agencyRole !== "owner" && member.agency.status === "active" && (
        <section className="card">
          <h2>Leave the agency</h2>
          <p className="muted small">
            Your account becomes an individual account. The agency keeps the listings assigned to you, and what you publish
            afterwards won&rsquo;t carry its name.
          </p>
          <button className="btn btn-outline btn-sm dangerText" style={{ marginTop: 12 }} onClick={() => setLeaving(true)}>
            Leave {member.agency.tradeName}
          </button>
        </section>
      )}

      {leaving && (
        <Confirm
          title={`Leave ${member.agency.tradeName}?`}
          body="You'll be signed out of the agency workspace. Your assigned listings go to the agency owner."
          confirmLabel="Leave"
          danger
          onCancel={() => setLeaving(false)}
          onConfirm={async () => {
            try {
              await api.delete(`/team/${member.id}`);
              await logout();
            } catch (err) {
              notify(errorMessage(err), true);
              setLeaving(false);
            }
          }}
        />
      )}
      {toast}
    </div>
  );
}
