import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import "./faq.scss";

// Native <details>, so it works without JS and with the keyboard for free
function Faq({ items }) {
  return (
    <div className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>
            <span>{item.q}</span>
            <Plus size={20} aria-hidden="true" />
          </summary>
          <div className="answer">
            <p>{item.a}</p>
            {item.link && <Link to={item.link.to}>{item.link.label}</Link>}
          </div>
        </details>
      ))}
    </div>
  );
}

export default Faq;
