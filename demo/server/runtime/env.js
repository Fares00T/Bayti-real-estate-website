// Environment the API code reads through process.env. Imported first by
// app.js so it exists before any route module is evaluated.
const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";

globalThis.process ||= { env: {} };
globalThis.process.env ||= {};
Object.assign(globalThis.process.env, {
  NODE_ENV: "production",
  JWT_SECRET_KEY: "bayti-investor-demo",
  CLIENT_URL: origin,
  AGENCY_URL: `${origin}/agency`,
  ADMIN_URL: `${origin}/admin`,
});
