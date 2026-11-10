// Turns a browser request into an Express-style req/res, runs it through the
// real API routes and returns the response. Used by the axios adapter and the
// fetch shim in each app.
import app from "../app.js";
import { cookiesFor, setCookie, clearCookie } from "./cookies.js";

const parseQuery = (params) => {
  const query = {};
  for (const [k, v] of params) {
    if (k in query) query[k] = [].concat(query[k], v);
    else query[k] = v;
  }
  return query;
};

async function readBody(body) {
  if (body == null || body === "") return { body: {}, uploads: [] };
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const fields = {};
    const uploads = [];
    for (const [name, value] of body.entries()) {
      if (typeof value === "string") {
        if (name in fields) fields[name] = [].concat(fields[name], value);
        else fields[name] = value;
      } else {
        const buffer = new Uint8Array(await value.arrayBuffer());
        uploads.push({
          fieldname: name,
          originalname: value.name || "file",
          mimetype: value.type || "application/octet-stream",
          size: buffer.length,
          buffer,
        });
      }
    }
    return { body: fields, uploads };
  }
  if (typeof body === "string") {
    try {
      return { body: JSON.parse(body), uploads: [] };
    } catch {
      return { body: {}, uploads: [] };
    }
  }
  return { body: JSON.parse(JSON.stringify(body)), uploads: [] };
}

export async function dispatch({ method = "GET", url, headers = {}, body }) {
  const parsed = new URL(url, "http://demo.local");
  const { body: reqBody, uploads } = await readBody(body);
  const lowerHeaders = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (typeof navigator !== "undefined") lowerHeaders["user-agent"] ||= navigator.userAgent;

  const req = {
    method: method.toUpperCase(),
    url: parsed.pathname + parsed.search,
    originalUrl: parsed.pathname + parsed.search,
    path: parsed.pathname,
    query: parseQuery(parsed.searchParams),
    params: {},
    body: reqBody,
    _uploads: uploads,
    headers: lowerHeaders,
    cookies: cookiesFor(parsed.pathname),
    ip: "127.0.0.1",
    get: (name) => lowerHeaders[String(name).toLowerCase()],
    header: (name) => lowerHeaders[String(name).toLowerCase()],
  };

  return new Promise((resolve) => {
    const resHeaders = {};
    const finish = (data, isJson) => {
      if (res.finished) return;
      res.finished = true;
      resolve({ status: res.statusCode, headers: resHeaders, data, isJson });
    };
    const res = {
      statusCode: 200,
      finished: false,
      status(code) {
        res.statusCode = code;
        return res;
      },
      sendStatus(code) {
        res.statusCode = code;
        finish(null, false);
        return res;
      },
      json(value) {
        resHeaders["content-type"] = "application/json";
        // Same as the network: dates become strings, undefined disappears
        finish(value === undefined ? null : JSON.parse(JSON.stringify(value)), true);
        return res;
      },
      send(value) {
        if (value instanceof Uint8Array || (typeof Blob !== "undefined" && value instanceof Blob)) finish(value, false);
        else if (value && typeof value === "object") return res.json(value);
        else finish(value ?? null, false);
        return res;
      },
      end(value) {
        finish(value ?? null, false);
        return res;
      },
      setHeader(name, value) {
        resHeaders[String(name).toLowerCase()] = String(value);
        return res;
      },
      set(name, value) {
        if (typeof name === "object") Object.entries(name).forEach(([k, v]) => res.setHeader(k, v));
        else res.setHeader(name, value);
        return res;
      },
      header(name, value) {
        return res.set(name, value);
      },
      type(value) {
        return res.setHeader("content-type", value);
      },
      cookie(name, value, options) {
        setCookie(name, value, options);
        return res;
      },
      clearCookie(name) {
        clearCookie(name);
        return res;
      },
      redirect(location) {
        res.statusCode = 302;
        resHeaders.location = location;
        finish(null, false);
      },
    };

    app.handle(req, res, (err) => {
      if (res.finished) return;
      if (err) {
        console.error("[demo api]", req.method, req.path, err);
        res.status(500).json({ message: "Something went wrong." });
      } else {
        res.status(404).json({ message: `Not found: ${req.method} ${req.path}` });
      }
    });
  });
}
