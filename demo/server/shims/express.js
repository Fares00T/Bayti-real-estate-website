// Minimal Express look-alike so the real route files run in the browser.
// Supports what the Bayti API uses: Router with get/post/put/patch/delete,
// use() with or without a path (middleware or nested routers), ":params",
// async handlers and next(err).

const compile = (path, prefix) => {
  const keys = [];
  const source = path
    .replace(/\/+$/, "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    });
  const regex = new RegExp(`^${source}${prefix ? "(?=/|$)" : "/?$"}`);
  return { regex, keys };
};

class Layer {
  constructor({ method = null, path = "/", handlers, prefix }) {
    this.method = method;
    this.handlers = handlers;
    this.prefix = prefix;
    this.matcher = compile(path === "/" && prefix ? "" : path, prefix);
  }

  match(path) {
    const m = this.matcher.regex.exec(path);
    if (!m) return null;
    const params = {};
    this.matcher.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    return { params, matched: m[0] };
  }
}

const flat = (list) => list.flat(Infinity).filter(Boolean);

export function Router() {
  const stack = [];

  const router = (req, res, done) => router.handle(req, res, done);
  router.isRouter = true;

  const route = (method) => (path, ...handlers) => {
    stack.push(new Layer({ method, path, handlers: flat(handlers), prefix: false }));
    return router;
  };
  router.get = route("GET");
  router.post = route("POST");
  router.put = route("PUT");
  router.patch = route("PATCH");
  router.delete = route("DELETE");
  router.all = route(null);

  router.use = (...args) => {
    const path = typeof args[0] === "string" ? args.shift() : "/";
    stack.push(new Layer({ path, handlers: flat(args), prefix: true }));
    return router;
  };

  router.handle = (req, res, done) => {
    let index = 0;
    const basePath = req.path;
    const baseParams = req.params;

    const next = (err) => {
      if (res.finished) return;
      req.path = basePath;
      req.params = baseParams;
      while (index < stack.length) {
        const layer = stack[index++];
        if (layer.method && layer.method !== req.method) continue;
        const hit = layer.match(basePath);
        if (!hit) continue;
        if (err) continue; // no error handlers in the API: bubble up
        return run(layer, hit, 0);
      }
      done(err);
    };

    const run = (layer, hit, i) => {
      if (i >= layer.handlers.length) return next();
      const handler = layer.handlers[i];
      req.params = { ...baseParams, ...hit.params };
      const step = (err) => (err ? next(err) : run(layer, hit, i + 1));
      if (layer.prefix && handler.isRouter) {
        req.path = basePath.slice(hit.matched.length) || "/";
        return handler.handle(req, res, (err) => {
          req.path = basePath;
          step(err);
        });
      }
      try {
        const out = handler(req, res, step);
        if (out && typeof out.catch === "function") out.catch((e) => next(e));
      } catch (e) {
        next(e);
      }
    };

    next();
  };

  return router;
}

function express() {
  return Router();
}
express.Router = Router;
express.json = () => (req, res, next) => next();
express.static = () => (req, res, next) => next();

export default express;
