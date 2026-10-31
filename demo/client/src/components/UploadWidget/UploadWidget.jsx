import { createContext, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import "./UploadWidget.scss";

const CloudinaryScriptContext = createContext();
const SCRIPT_SRC = "https://upload-widget.cloudinary.com/global/all.js";

// Loads the Cloudinary widget script once and appends uploaded URLs via setState.
// Problems (missing config, script/upload failures) are reported through onError.
function UploadWidget({
  uwConfig,
  setState,
  onError,
  label = "Upload photos",
  className = "",
}) {
  const configured = Boolean(uwConfig?.cloudName && uwConfig?.uploadPreset);
  const [loaded, setLoaded] = useState(Boolean(window.cloudinary));
  const widgetRef = useRef(null);
  // keep the latest callbacks without recreating the widget
  const setStateRef = useRef(setState);
  const onErrorRef = useRef(onError);
  setStateRef.current = setState;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!configured) {
      onErrorRef.current?.("Photo uploads aren't configured yet.");
    }
  }, [configured]);

  useEffect(() => {
    if (!configured || loaded) return;
    let script = document.getElementById("uw");
    if (!script) {
      script = document.createElement("script");
      script.id = "uw";
      script.async = true;
      script.src = SCRIPT_SRC;
      document.body.appendChild(script);
    }
    const onLoad = () => setLoaded(true);
    const onFail = () =>
      onErrorRef.current?.("Couldn't load the photo uploader. Check your connection.");
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onFail);
    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onFail);
    };
  }, [configured, loaded]);

  useEffect(() => {
    if (!configured || !loaded || widgetRef.current) return;
    if (!window.cloudinary?.createUploadWidget) {
      onErrorRef.current?.("Couldn't start the photo uploader.");
      return;
    }
    widgetRef.current = window.cloudinary.createUploadWidget(uwConfig, (error, result) => {
      if (error) {
        onErrorRef.current?.(
          error.statusText || error.message || "Upload failed. Please try again."
        );
      } else if (result?.event === "success") {
        setStateRef.current((prev) => [...prev, result.info.secure_url]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, loaded]);

  const text = !configured ? "Uploads unavailable" : loaded ? label : "Loading uploader…";

  return (
    <CloudinaryScriptContext.Provider value={{ loaded }}>
      <button
        type="button"
        className={`uploadButton ${className}`}
        onClick={() => widgetRef.current?.open()}
        disabled={!configured || !loaded}
      >
        <Upload size={16} />
        {text}
      </button>
    </CloudinaryScriptContext.Provider>
  );
}

export default UploadWidget;
export { CloudinaryScriptContext };
