// bcrypt and jsonwebtoken stand-ins. Demo data only: passwords are stored
// as "demo$<password>" and tokens are signed with a simple SHA-256 MAC.
import { sha256 } from "./crypto.js";

export const bcrypt = {
  hash: async (password) => `demo$${password}`,
  compare: async (password, hash) => typeof hash === "string" && hash === `demo$${password}`,
  genSalt: async () => "demo",
};

const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

const seconds = (value) => {
  if (typeof value === "number") return value;
  const m = /^(\d+)\s*([smhd])?$/.exec(String(value));
  if (!m) return 0;
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2] || "s"];
};

class JsonWebTokenError extends Error {}

export const jwt = {
  sign(payload, secret, options = {}) {
    const iat = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat };
    if (options.expiresIn) body.exp = iat + seconds(options.expiresIn);
    if (options.audience) body.aud = options.audience;
    const data = b64(JSON.stringify(body));
    return `${data}.${sha256(`${secret}.${data}`)}`;
  },

  verify(token, secret, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    let result;
    let error = null;
    try {
      const [data, sig] = String(token).split(".");
      if (!data || sig !== sha256(`${secret}.${data}`)) throw new JsonWebTokenError("invalid signature");
      result = JSON.parse(unb64(data));
      if (result.exp && result.exp * 1000 < Date.now()) throw new JsonWebTokenError("jwt expired");
      if (options?.audience && result.aud !== options.audience) throw new JsonWebTokenError("jwt audience invalid");
    } catch (err) {
      error = err;
    }
    if (callback) return callback(error, error ? undefined : result);
    if (error) throw error;
    return result;
  },

  decode(token) {
    try {
      return JSON.parse(unb64(String(token).split(".")[0]));
    } catch {
      return null;
    }
  },
};

export default jwt;
