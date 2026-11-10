// Simple in-memory brake on password guessing for the private dashboards:
// 8 failures per IP+email within 15 minutes locks that pair out until the
// window passes.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export const attemptKey = (req, email) => `${req.ip}|${email}`;

export const isLocked = (key) => {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
};

export const recordFailure = (key) => {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failures.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
};

export const clearFailures = (key) => failures.delete(key);
