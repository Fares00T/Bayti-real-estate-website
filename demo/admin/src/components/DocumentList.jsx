import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { DOCUMENT_LABEL, dateTime, fileSize } from "../lib/format";
import { Modal } from "./ui";

// Private documents are fetched with the admin session and shown from a blob
// URL: they never have a public address.
const fetchBlob = async (doc) => {
  const res = await api.get(`/documents/${doc.id}`, { responseType: "blob" });
  return URL.createObjectURL(res.data);
};

export function DocumentPreview({ doc, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let objectUrl;
    fetchBlob(doc)
      .then((u) => setUrl((objectUrl = u)))
      .catch((err) => setError(errorMessage(err, "Couldn't open the file.")));
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [doc]);

  return (
    <Modal title={doc.originalName} onClose={onClose} wide>
      <div className="docPreview">
        {error ? (
          <p className="error-text">{error}</p>
        ) : !url ? (
          <p className="muted">
            <Loader2 size={16} className="spin" /> Loading…
          </p>
        ) : doc.mimeType === "application/pdf" ? (
          <iframe src={url} title={doc.originalName} />
        ) : (
          <img src={url} alt={doc.originalName} />
        )}
      </div>
      <div className="modal-actions">
        {url && (
          <a className="btn btn-outline btn-sm" href={url} download={doc.originalName}>
            <Download size={15} /> Download
          </a>
        )}
        <button className="btn btn-dark btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

export const downloadDoc = async (doc, notify) => {
  try {
    const url = await fetchBlob(doc);
    const a = Object.assign(document.createElement("a"), { href: url, download: doc.originalName });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    notify?.(errorMessage(err, "Couldn't download the file."), true);
  }
};

// `uploadUrl` enables uploads (POST multipart kind + files); `onDelete` enables removal
export default function DocumentList({ documents, labels = DOCUMENT_LABEL, uploadUrl, kinds, onChange, onDelete, notify, empty = "No documents." }) {
  const [preview, setPreview] = useState(null);
  const [kind, setKind] = useState(kinds?.[0]?.key || "other");
  const [uploading, setUploading] = useState(false);
  const input = useRef(null);

  const upload = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    form.append("kind", kind);
    [...files].forEach((f) => form.append("files", f));
    setUploading(true);
    try {
      await api.post(uploadUrl, form);
      notify?.("Uploaded.");
      onChange?.();
    } catch (err) {
      notify?.(errorMessage(err, "The upload failed."), true);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="docList">
      {documents.length === 0 ? (
        <p className="muted small">{empty}</p>
      ) : (
        <ul>
          {documents.map((d) => (
            <li key={d.id}>
              <span className="docIcon">{d.mimeType === "application/pdf" ? <FileText size={18} /> : <ImageIcon size={18} />}</span>
              <div className="docMeta">
                <strong>{labels[d.kind] || d.kind}</strong>
                <span>
                  {d.originalName} · {fileSize(d.size)} · {dateTime(d.createdAt)}
                </span>
              </div>
              <button className="iconBtn" title="Preview" aria-label={`Preview ${d.originalName}`} onClick={() => setPreview(d)}>
                <Eye size={16} />
              </button>
              <button className="iconBtn" title="Download" aria-label={`Download ${d.originalName}`} onClick={() => downloadDoc(d, notify)}>
                <Download size={16} />
              </button>
              {onDelete && (
                <button className="iconBtn" title="Delete" aria-label={`Delete ${d.originalName}`} onClick={() => onDelete(d)}>
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {uploadUrl && (
        <div className="docUpload">
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Document type">
            {(kinds || Object.entries(labels).map(([key, label]) => ({ key, label }))).map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
          <label className={`btn btn-outline btn-sm ${uploading ? "disabled" : ""}`}>
            {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
            {uploading ? "Uploading…" : "Upload"}
            <input
              ref={input}
              type="file"
              hidden
              multiple
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              disabled={uploading}
              onChange={(e) => upload(e.target.files)}
            />
          </label>
          <small className="muted">PDF, JPG or PNG, up to 10 MB each.</small>
        </div>
      )}

      {preview && <DocumentPreview doc={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
