// "Live demo" panel shown in all three apps. Plain DOM (no React) so the same
// file works in the marketplace, the agency platform and the admin dashboard.
// One click signs in as a demo account on the right platform and opens it.
import { dispatch } from "./http.js";
import { resetDemo } from "./database.js";
import { clearCookie } from "./cookies.js";

const PASSWORD = "demo1234";

const ROLES = [
  {
    group: "Marketplace",
    items: [
      { key: "visitor", label: "Visitor", hint: "Browse & search, no account", go: "/" },
      { key: "client", label: "Home seeker", hint: "Sara · saves, inquiries, visits", email: "client@bayti.dz", platform: "marketplace", go: "/profile" },
      { key: "seller", label: "Private seller", hint: "Karim · own listings, limit of 3", email: "seller@bayti.dz", platform: "marketplace", go: "/profile?tab=listings" },
    ],
  },
  {
    group: "Agency platform",
    items: [
      { key: "owner", label: "Agency owner", hint: "Immo El Djazair · full workspace", email: "agency@bayti.dz", platform: "agency", go: "/agency/overview" },
      { key: "agent", label: "Agent", hint: "Riad · only assigned work", email: "agent@bayti.dz", platform: "agency", go: "/agency/overview" },
      { key: "applicant", label: "New agency", hint: "Application under review", email: "applicant@bayti.dz", platform: "agency", go: "/agency/application" },
    ],
  },
  {
    group: "Bayti team",
    items: [{ key: "admin", label: "Admin", hint: "Moderation, agencies, analytics", email: "admin@bayti.dz", platform: "admin", go: "/admin/" }],
  },
];

const LOGIN = { marketplace: "/api/auth/login", agency: "/api/agency/auth/login", admin: "/api/admin/auth/login" };
// Each app keeps its own session, so the chosen role is remembered per app
const appOf = (path) => (path.startsWith("/agency") ? "agency" : path.startsWith("/admin") ? "admin" : "marketplace");
const stateKey = (app) => `bayti_demo_role_${app}`;
const OPEN_KEY = "bayti_demo_panel";

const read = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

const CSS = `
.bdemo{position:fixed;left:16px;bottom:16px;z-index:2147483000;font-family:"Figtree",system-ui,sans-serif;color:#222;-webkit-font-smoothing:antialiased}
.bdemo *{box-sizing:border-box}
.bdemo button{font:inherit;cursor:pointer}
.bdemo-pill{display:flex;align-items:center;gap:8px;padding:10px 14px;border:0;border-radius:999px;background:#222;color:#fff;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.bdemo-pill .r{color:#ff8fab;font-weight:600}
.bdemo-pill .s{margin-left:2px;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.16);font-weight:500;font-size:12px}
.bdemo-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25);flex:none}
.bdemo-card{width:300px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border:1px solid #ebebeb;border-radius:16px;box-shadow:0 12px 36px rgba(0,0,0,.18);padding:14px}
.bdemo-head{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700}
.bdemo-x{margin-left:auto;border:0;background:none;font-size:22px;line-height:1;color:#6a6a6a;padding:0 2px}
.bdemo-intro{margin:6px 0 10px;font-size:12px;color:#6a6a6a;line-height:1.4}
.bdemo-group{margin:10px 0 6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#929292}
.bdemo-item{display:flex;flex-direction:column;align-items:flex-start;width:100%;margin-bottom:6px;padding:9px 12px;border:1px solid #ebebeb;border-radius:12px;background:#fff;text-align:left;transition:border-color .15s,background .15s}
.bdemo-item:hover{border-color:#222}
.bdemo-item.on{border-color:#e51d53;background:#fff0f3}
.bdemo-item b{font-size:13px}
.bdemo-item span{font-size:12px;color:#6a6a6a}
.bdemo-item[disabled]{opacity:.6;cursor:wait}
.bdemo-foot{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#6a6a6a}
.bdemo-reset{border:0;background:none;color:#6a6a6a;text-decoration:underline;padding:0}
.bdemo-reset:hover{color:#c13515}
.bdemo-err{margin-top:6px;font-size:12px;color:#c13515}
@media (max-width:480px){.bdemo{left:12px;right:12px;bottom:12px}.bdemo-card{width:auto}}
`;

async function signIn(role) {
  if (role.key === "visitor") {
    await dispatch({ method: "POST", url: "/api/auth/logout" });
    clearCookie("token");
    write("user", null);
    return;
  }
  const res = await dispatch({ method: "POST", url: LOGIN[role.platform], body: { email: role.email, password: PASSWORD } });
  if (res.status !== 200) throw new Error(res.data?.message || "Sign-in failed.");
  // the marketplace keeps a copy of the signed-in user
  if (role.platform === "marketplace") write("user", JSON.stringify(res.data));
}

export function mountDemoBar() {
  if (typeof document === "undefined" || document.querySelector(".bdemo")) return;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "bdemo";
  document.body.appendChild(root);

  let open = read(OPEN_KEY) !== "closed";
  let busy = false;
  let error = "";

  const all = ROLES.flatMap((g) => g.items);
  const here = appOf(window.location.pathname);
  const current = () => all.find((r) => r.key === read(stateKey(here))) || (here === "marketplace" ? all[0] : null);

  const render = () => {
    root.innerHTML = "";
    if (!open) {
      const pill = document.createElement("button");
      pill.className = "bdemo-pill";
      pill.setAttribute("aria-label", "Open the demo panel");
      pill.innerHTML = `<span class="bdemo-dot"></span>Live demo · <span class="r"></span><span class="s">Switch role</span>`;
      pill.querySelector(".r").textContent = current()?.label || "Pick a role";
      pill.onclick = () => setOpen(true);
      root.appendChild(pill);
      return;
    }
    const card = document.createElement("div");
    card.className = "bdemo-card";
    card.innerHTML = `
      <div class="bdemo-head"><span class="bdemo-dot"></span>Live demo<button class="bdemo-x" aria-label="Hide the demo panel">×</button></div>
      <p class="bdemo-intro">Every feature works. Pick who you want to be — data stays in your browser.</p>`;
    card.querySelector(".bdemo-x").onclick = () => setOpen(false);
    for (const g of ROLES) {
      const h = document.createElement("div");
      h.className = "bdemo-group";
      h.textContent = g.group;
      card.appendChild(h);
      for (const role of g.items) {
        const b = document.createElement("button");
        b.className = `bdemo-item${current()?.key === role.key ? " on" : ""}`;
        b.disabled = busy;
        b.innerHTML = "<b></b><span></span>";
        b.querySelector("b").textContent = role.label;
        b.querySelector("span").textContent = role.hint;
        b.onclick = () => choose(role);
        card.appendChild(b);
      }
    }
    const foot = document.createElement("div");
    foot.className = "bdemo-foot";
    foot.innerHTML = `<span>Password for all: <b>${PASSWORD}</b></span><button class="bdemo-reset">Reset demo</button>`;
    foot.querySelector(".bdemo-reset").onclick = reset;
    card.appendChild(foot);
    if (error) {
      const e = document.createElement("div");
      e.className = "bdemo-err";
      e.textContent = error;
      card.appendChild(e);
    }
    root.appendChild(card);
  };

  const setOpen = (v) => {
    open = v;
    write(OPEN_KEY, v ? "open" : "closed");
    render();
  };

  const choose = async (role) => {
    busy = true;
    error = "";
    render();
    try {
      await signIn(role);
      write(stateKey(appOf(role.go)), role.key);
      write(OPEN_KEY, "closed");
      window.location.assign(role.go);
    } catch (err) {
      error = err.message;
      busy = false;
      render();
    }
  };

  async function reset() {
    if (!window.confirm("Reset the demo? Everything you changed will be erased.")) return;
    await resetDemo();
    write("user", null);
    ["marketplace", "agency", "admin"].forEach((a) => write(stateKey(a), null));
    window.location.assign("/");
  }

  render();
}
