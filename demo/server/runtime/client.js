// Browser side of the demo: every request the apps make to /api/* is answered
// by the in-browser API, and photo uploads that would go to Cloudinary are
// resized locally and kept as data URLs.
import { dispatch } from "./http.js";

const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

const apiPath = (url) => {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin && u.pathname.startsWith("/api/") ? u.pathname + u.search : null;
  } catch {
    return null;
  }
};

// ---------- images ----------

const MAX_SIDE = 1400;
export function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`${file.name || "Photo"} couldn't be read.`));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`${file.name || "Photo"} isn't an image.`));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const cloudinaryUpload = async (body) => {
  const file = body instanceof FormData ? body.get("file") : null;
  if (!file || typeof file === "string") {
    return new Response(JSON.stringify({ error: { message: "No file." } }), { status: 400 });
  }
  const secure_url = await imageToDataUrl(file);
  return new Response(JSON.stringify({ secure_url, url: secure_url }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

// window.cloudinary.createUploadWidget, as used by the marketplace forms
function installCloudinaryWidget() {
  window.cloudinary = {
    createUploadWidget(config, callback) {
      return {
        open() {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.multiple = config?.multiple !== false;
          input.onchange = async () => {
            for (const file of input.files) {
              try {
                const secure_url = await imageToDataUrl(file);
                callback(null, { event: "success", info: { secure_url, original_filename: file.name } });
              } catch (err) {
                callback({ message: err.message });
              }
            }
          };
          input.click();
        },
        close() {},
        destroy() {},
      };
    },
  };
}

// ---------- fetch ----------

export function installFetchShim() {
  if (window.__baytiDemoFetch) return;
  window.__baytiDemoFetch = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (/^https:\/\/api\.cloudinary\.com\//.test(url)) return cloudinaryUpload(init.body);
    const path = apiPath(url);
    if (!path) return realFetch(input, init);
    await latency();
    const res = await dispatch({
      method: init.method || (typeof input === "object" && input.method) || "GET",
      url: path,
      headers: init.headers instanceof Headers ? Object.fromEntries(init.headers) : init.headers,
      body: init.body,
    });
    const isBytes = res.data instanceof Uint8Array || (typeof Blob !== "undefined" && res.data instanceof Blob);
    const payload = res.isJson ? JSON.stringify(res.data) : isBytes ? res.data : res.data ?? null;
    return new Response(res.status === 204 ? null : payload, { status: res.status, headers: res.headers });
  };
  installCloudinaryWidget();
}

// ---------- axios ----------

export function createAxiosAdapter(AxiosError) {
  return async function demoAdapter(config) {
    const base = config.baseURL || "";
    let url = /^https?:\/\//.test(config.url || "") ? config.url : `${base.replace(/\/+$/, "")}/${String(config.url || "").replace(/^\/+/, "")}`;
    if (config.params) {
      const qs = new URLSearchParams();
      Object.entries(config.params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        [].concat(v).forEach((x) => qs.append(k, x instanceof Date ? x.toISOString() : x));
      });
      const s = qs.toString();
      if (s) url += (url.includes("?") ? "&" : "?") + s;
    }
    const path = apiPath(url);
    if (!path) throw new AxiosError(`Demo: no handler for ${url}`, AxiosError.ERR_NETWORK, config);

    await latency();
    const res = await dispatch({
      method: config.method || "get",
      url: path,
      headers: config.headers?.toJSON ? config.headers.toJSON() : config.headers,
      body: config.data,
    });

    let data = res.data;
    if (config.responseType === "blob") {
      data = new Blob([res.isJson ? JSON.stringify(res.data) : res.data ?? ""], { type: res.headers["content-type"] || "" });
    } else if (config.responseType === "arraybuffer") {
      data = res.data instanceof Uint8Array ? res.data.buffer : new TextEncoder().encode(JSON.stringify(res.data)).buffer;
    }
    const response = { data, status: res.status, statusText: String(res.status), headers: res.headers, config, request: {} };
    const ok = config.validateStatus ? config.validateStatus(res.status) : res.status >= 200 && res.status < 300;
    if (ok) return response;
    throw new AxiosError(
      res.data?.message || `Request failed with status code ${res.status}`,
      res.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      {},
      response
    );
  };
}
