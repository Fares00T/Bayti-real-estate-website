import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, RefreshCw, Star, Trash2 } from "lucide-react";

// Listing photos are public, so they go to the same Cloudinary account the
// marketplace uses (unsigned preset). Private documents never come here.
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
export const UPLOADS_ENABLED = Boolean(CLOUD && PRESET);
const MAX_BYTES = 10 * 1024 * 1024;

export const uploadImage = async (file, folder = "posts") => {
  if (!UPLOADS_ENABLED) throw new Error("Photo uploads aren't configured (VITE_CLOUDINARY_* in agency/.env).");
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`${file.name}: use JPG, PNG or WebP.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", PRESET);
  form.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Upload failed.");
  return data.secure_url;
};

// Controlled list of image URLs: upload, replace, reorder, remove.
// The first photo is the cover shown on listing cards.
export default function ImageManager({ images, onChange, max = 20, notify }) {
  const [busy, setBusy] = useState(null); // "add" | index being replaced
  const addInput = useRef(null);
  const replaceInput = useRef(null);
  const replacing = useRef(null);

  const move = (i, dir) => {
    const next = [...images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  const add = async (files) => {
    const list = [...(files || [])].slice(0, Math.max(0, max - images.length));
    if (!list.length) return;
    setBusy("add");
    const urls = [];
    for (const f of list) {
      try {
        urls.push(await uploadImage(f));
      } catch (err) {
        notify?.(err.message, true);
      }
    }
    onChange([...images, ...urls]);
    setBusy(null);
    addInput.current.value = "";
  };

  const replace = async (file) => {
    const i = replacing.current;
    if (!file || i === null) return;
    setBusy(i);
    try {
      const url = await uploadImage(file);
      onChange(images.map((u, j) => (j === i ? url : u)));
    } catch (err) {
      notify?.(err.message, true);
    }
    setBusy(null);
    replaceInput.current.value = "";
  };

  return (
    <div className="imageManager">
      <ul>
        {images.map((src, i) => (
          <li key={src + i} className={i === 0 ? "cover" : ""}>
            <img src={src} alt={`Photo ${i + 1}`} />
            {i === 0 && (
              <span className="coverTag">
                <Star size={12} /> Cover
              </span>
            )}
            {busy === i && (
              <span className="imgBusy">
                <Loader2 size={20} className="spin" />
              </span>
            )}
            <div className="imgTools">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move photo ${i + 1} earlier`} title="Move earlier">
                <ArrowLeft size={14} />
              </button>
              <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Move photo ${i + 1} later`} title="Move later">
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                disabled={!UPLOADS_ENABLED || busy !== null}
                onClick={() => {
                  replacing.current = i;
                  replaceInput.current.click();
                }}
                aria-label={`Replace photo ${i + 1}`}
                title="Replace"
              >
                <RefreshCw size={14} />
              </button>
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} title="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {images.length < max && (
          <li className="addTile">
            <button type="button" disabled={!UPLOADS_ENABLED || busy !== null} onClick={() => addInput.current.click()}>
              {busy === "add" ? <Loader2 size={22} className="spin" /> : <ImagePlus size={22} />}
              <span>{!UPLOADS_ENABLED ? "Uploads not configured" : busy === "add" ? "Uploading…" : "Add photos"}</span>
            </button>
          </li>
        )}
      </ul>
      <p className="muted small">
        {images.length}/{max} photos. The first one is the cover.
      </p>
      <input ref={addInput} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => add(e.target.files)} />
      <input ref={replaceInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => replace(e.target.files[0])} />
    </div>
  );
}
