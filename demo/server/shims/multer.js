// multer stand-in. The browser adapter has already turned the FormData into
// req.body (text fields) and req._uploads (files with a Uint8Array buffer);
// these middlewares only place the files where multer would.

function multer({ limits = {} } = {}) {
  const check = (req, files, max) => {
    const tooBig = limits.fileSize && files.find((f) => f.size > limits.fileSize);
    if (tooBig) return Object.assign(new Error("File too large"), { code: "LIMIT_FILE_SIZE" });
    const count = max ?? limits.files;
    if (count && files.length > count) return Object.assign(new Error("Too many files"), { code: "LIMIT_FILE_COUNT" });
    return null;
  };
  const uploads = (req) => req._uploads || [];

  return {
    single: (name) => (req, res, next) => {
      const files = uploads(req).filter((f) => f.fieldname === name);
      const err = check(req, files, 1);
      if (!err) req.file = files[0];
      next(err);
    },
    array: (name, max) => (req, res, next) => {
      const files = uploads(req).filter((f) => f.fieldname === name);
      const err = check(req, files, max);
      if (!err) req.files = files;
      next(err);
    },
    fields: (spec) => (req, res, next) => {
      const names = spec.map((s) => s.name);
      const files = uploads(req).filter((f) => names.includes(f.fieldname));
      const err = check(req, files);
      if (!err) {
        req.files = {};
        files.forEach((f) => (req.files[f.fieldname] ||= []).push(f));
      }
      next(err);
    },
    any: () => (req, res, next) => {
      req.files = uploads(req);
      next(check(req, req.files));
    },
    none: () => (req, res, next) => next(),
  };
}
multer.memoryStorage = () => ({});

export default multer;
