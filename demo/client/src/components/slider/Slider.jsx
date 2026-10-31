import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Grid3x3, X } from "lucide-react";
import "./slider.scss";

function Slider({ images = [] }) {
  const [imageIndex, setImageIndex] = useState(null);
  const count = images.length;

  const changeSlide = useCallback(
    (step) => setImageIndex((i) => (i + step + count) % count),
    [count]
  );

  // Keyboard navigation in the full-screen viewer
  useEffect(() => {
    if (imageIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setImageIndex(null);
      if (e.key === "ArrowLeft") changeSlide(-1);
      if (e.key === "ArrowRight") changeSlide(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [imageIndex, changeSlide]);

  if (count === 0) {
    return <div className="slider empty">No photos for this listing</div>;
  }

  const thumbs = images.slice(1, 5);

  return (
    <div className="slider">
      {imageIndex !== null && (
        <div className="fullSlider" role="dialog" aria-label="Photo viewer">
          <button className="close" onClick={() => setImageIndex(null)} aria-label="Close">
            <X size={20} />
          </button>
          <span className="counter">
            {imageIndex + 1} / {count}
          </span>
          {count > 1 && (
            <button className="arrow" onClick={() => changeSlide(-1)} aria-label="Previous photo">
              <ChevronLeft size={22} />
            </button>
          )}
          <div className="imgContainer">
            <img src={images[imageIndex]} alt="" />
          </div>
          {count > 1 && (
            <button className="arrow" onClick={() => changeSlide(1)} aria-label="Next photo">
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}

      <div className={`mosaic count-${Math.min(count, 5)}`}>
        <button className="tile main" onClick={() => setImageIndex(0)}>
          <img src={images[0]} alt="" />
        </button>
        {thumbs.map((image, index) => (
          <button className="tile" key={index} onClick={() => setImageIndex(index + 1)}>
            <img src={image} alt="" />
          </button>
        ))}
      </div>

      {count > 1 && (
        <button className="showAll" onClick={() => setImageIndex(0)}>
          <Grid3x3 size={15} /> Show all {count} photos
        </button>
      )}
    </div>
  );
}

export default Slider;
