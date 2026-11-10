import { useEffect, useState } from "react";
import { Field } from "./ui";
import { isoDate } from "../lib/format";

export const EMPTY_AGENCY = {
  entityType: "legal_entity",
  tradeName: "", legalName: "", legalForm: "", rcNumber: "", nif: "", nis: "", articleImposition: "",
  address: "", wilaya: "", commune: "", phone: "", email: "", website: "", about: "",
  repFullName: "", repPosition: "", repPhone: "", repEmail: "",
  approvalNumber: "", approvalWilaya: "", approvalIssueDate: "", approvalExpiryDate: "",
};

export const agencyToForm = (a) =>
  Object.fromEntries(
    Object.keys(EMPTY_AGENCY).map((k) => [k, k.endsWith("Date") ? isoDate(a[k]) : a[k] ?? ""])
  );

let wilayaCache = null;
export const useWilayas = () => {
  const [list, setList] = useState(wilayaCache || []);
  useEffect(() => {
    if (wilayaCache) return;
    fetch("/wilaya.json")
      .then((r) => r.json())
      .then((data) => {
        wilayaCache = data;
        setList(data);
      })
      .catch(() => {});
  }, []);
  return list;
};

const LEGAL_FORMS = ["EURL", "SARL", "SPA", "SNC", "SCS", "Other"];

// The agency's legal record, shared by account creation and the agency page
export default function AgencyFields({ value, onChange }) {
  const wilayas = useWilayas();
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const input = (k, label, props = {}) => (
    <Field label={label} htmlFor={`ag-${k}`} required={props.required} span={props.span}>
      <input id={`ag-${k}`} value={value[k]} onChange={set(k)} {...props} span={undefined} />
    </Field>
  );
  const communes = wilayas.find((w) => w.name === value.wilaya)?.dairats || [];

  return (
    <div className="formGrid">
      <Field label="Type" htmlFor="ag-entityType">
        <select id="ag-entityType" value={value.entityType} onChange={set("entityType")}>
          <option value="legal_entity">Company (personne morale)</option>
          <option value="natural_person">Natural person (personne physique)</option>
        </select>
      </Field>
      <Field label="Legal structure" htmlFor="ag-legalForm">
        <select id="ag-legalForm" value={value.legalForm} onChange={set("legalForm")}>
          <option value="">—</option>
          {LEGAL_FORMS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </Field>
      {input("tradeName", "Commercial name", { required: true })}
      {input("legalName", "Official legal name", { required: true })}
      {input("rcNumber", "RC number")}
      {input("nif", "NIF")}
      {input("nis", "NIS")}
      {input("articleImposition", "Article d'imposition")}
      {input("address", "Registered address", { span: 2 })}
      <Field label="Wilaya" htmlFor="ag-wilaya">
        <select id="ag-wilaya" value={value.wilaya} onChange={(e) => onChange({ ...value, wilaya: e.target.value, commune: "" })}>
          <option value="">—</option>
          {wilayas.map((w) => (
            <option key={w.name}>{w.name}</option>
          ))}
          {value.wilaya && !wilayas.some((w) => w.name === value.wilaya) && <option>{value.wilaya}</option>}
        </select>
      </Field>
      <Field label="Commune / daïra" htmlFor="ag-commune">
        <input id="ag-commune" list="ag-communes" value={value.commune} onChange={set("commune")} />
        <datalist id="ag-communes">
          {communes.map((c) => (
            <option key={c.code} value={c.name} />
          ))}
        </datalist>
      </Field>
      {input("phone", "Business phone", { type: "tel" })}
      {input("email", "Official email", { type: "email" })}
      {input("website", "Website", { span: 2, placeholder: "https://" })}
      {input("repFullName", "Legal representative")}
      {input("repPosition", "Position")}
      {input("repPhone", "Representative phone", { type: "tel" })}
      {input("repEmail", "Representative email", { type: "email" })}
      {input("approvalNumber", "Agrément number")}
      <Field label="Issuing wilaya" htmlFor="ag-approvalWilaya">
        <select id="ag-approvalWilaya" value={value.approvalWilaya} onChange={set("approvalWilaya")}>
          <option value="">—</option>
          {wilayas.map((w) => (
            <option key={w.name}>{w.name}</option>
          ))}
          {value.approvalWilaya && !wilayas.some((w) => w.name === value.approvalWilaya) && <option>{value.approvalWilaya}</option>}
        </select>
      </Field>
      {input("approvalIssueDate", "Agrément issued", { type: "date" })}
      {input("approvalExpiryDate", "Agrément expires", { type: "date" })}
      <Field label="About" htmlFor="ag-about" span={2}>
        <textarea id="ag-about" rows={3} value={value.about} onChange={set("about")} />
      </Field>
    </div>
  );
}
