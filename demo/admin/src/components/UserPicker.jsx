import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { ROLE_LABEL, accountType } from "../lib/format";

let cache = null;

// Searchable account picker backed by /admin/users (cached for the session)
export default function UserPicker({ id, value, onChange, filter = () => true, placeholder = "Search by name or email" }) {
  const [users, setUsers] = useState(cache || []);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cache) return;
    api.get("/users").then((res) => {
      cache = res.data;
      setUsers(res.data);
    }).catch(() => {});
  }, []);

  const selected = users.find((u) => u.id === value);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter(filter)
      .filter((u) => !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.agency?.tradeName?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [users, query, filter]);

  return (
    <div className="userPicker">
      <input
        id={id}
        value={open ? query : selected ? `${selected.username} · ${selected.email}` : ""}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        <ul role="listbox">
          {matches.length === 0 && <li className="muted">No matching accounts.</li>}
          {matches.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                role="option"
                aria-selected={u.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(u.id, u);
                  setOpen(false);
                }}
              >
                <img src={u.avatar || "/noavatar.jpg"} alt="" />
                <span>
                  <strong>{u.username}</strong> {u.email}
                </span>
                <small>{u.agency?.tradeName || ROLE_LABEL[accountType(u)]}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Call after creating or editing accounts so pickers see them
export const invalidateUsers = () => {
  cache = null;
};
