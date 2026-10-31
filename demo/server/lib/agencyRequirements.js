// What Bayti asks of an agency applicant, and why. This is the single source of
// truth: the public form, the submit validation and the admin checklist all read it.
//
// Legal basis (Journal Officiel texts):
//  - Décret exécutif 09-18 of 20 Jan 2009 (JO 2009 n°6), amended by 10-154 (2010),
//    11-296 (2011, JO 2011 n°48) and 19-242 of 8 Sep 2019 (JO 2019 n°55).
//  - Art. 6: practising requires the agrément AND registration in the Registre de Commerce.
//  - Art. 7 (19-242): the agrément is issued by the wali. Art. 16: valid 5 years.
//  - Art. 10 (19-242): the agrément dossier. Natural person: ID, diploma, nationality and
//    residence certificates. Legal entity: statuts, BOAL publication, deliberation
//    appointing the officers, nationality/residence of the capital holders, and proof
//    that the manager is qualified or of a qualified "collaboration permanente et effective".
//  - Art. 17–18, 29: the wali issues the carte professionnelle on entry in the register.
//
// `basis: "legal"` means the document or fact is required by those texts.
// `basis: "platform"` means it's Bayti's own verification and is not set by them.
// Bayti verifies an authorization granted by the wilaya; it never grants one.

export const ENTITY_TYPES = ["natural_person", "legal_entity"];

export const LEGAL_FORMS = ["EURL", "SARL", "SPA", "SNC", "SCS", "Other"];

// Fields required on submit, kept to the minimum needed to identify the agency
// and its agrément. Everything else is optional; the team can ask for more
// with "Request information" instead of every applicant filling it in up front.
export const REQUIRED_FIELDS = {
  common: [
    "tradeName", "legalName", "rcNumber", "wilaya", "phone", "email",
    "repFullName", "approvalNumber", "approvalWilaya", "approvalIssueDate",
  ],
  legal_entity: [],
  natural_person: [],
};

export const FIELD_LABELS = {
  tradeName: "Agency (commercial) name",
  legalName: "Official legal name",
  legalForm: "Legal structure",
  rcNumber: "Trade Register number (RC)",
  nif: "NIF",
  nis: "NIS",
  articleImposition: "Article d'imposition",
  address: "Registered business address",
  wilaya: "Wilaya",
  commune: "Commune",
  phone: "Business phone",
  email: "Official email",
  website: "Website",
  repFullName: "Representative's full legal name",
  repBirthDate: "Representative's date of birth",
  repNationality: "Representative's nationality",
  repIdNumber: "National ID card number",
  repPhone: "Representative's phone",
  repEmail: "Representative's email",
  repPosition: "Position in the company",
  approvalNumber: "Agrément number",
  approvalWilaya: "Issuing wilaya",
  approvalIssueDate: "Agrément issue date",
  approvalExpiryDate: "Agrément expiry date",
};

// required: blocks submission. Only the two documents that prove the conditions
// of art. 6 (agrément + Registre de Commerce) are required up front; the team can
// request any of the others during review.
export const DOCUMENT_KINDS = [
  {
    key: "agrement",
    label: "Agrément d'agent immobilier",
    hint: "The approval certificate issued by the wali (Décret 19-242, art. 7).",
    basis: "legal",
    required: true,
    appliesTo: ENTITY_TYPES,
  },
  {
    key: "rc_extract",
    label: "Extrait du Registre de Commerce",
    hint: "Registration in the Commercial Register is required to practise (Décret 09-18, art. 6).",
    basis: "legal",
    required: true,
    appliesTo: ENTITY_TYPES,
  },
  {
    key: "representative_id",
    label: "Representative's national ID card",
    hint: "Helps us confirm who manages the account. Part of a natural person's agrément dossier (art. 10).",
    basis: "legal",
    required: false,
    appliesTo: ENTITY_TYPES,
  },
  {
    key: "statuts",
    label: "Company articles of association (statuts)",
    hint: "Part of a legal entity's agrément dossier (Décret 19-242, art. 10).",
    basis: "legal",
    required: false,
    appliesTo: ["legal_entity"],
  },
  {
    key: "boal",
    label: "BOAL publication of incorporation",
    hint: "Part of a legal entity's agrément dossier (art. 10), where applicable.",
    basis: "legal",
    required: false,
    appliesTo: ["legal_entity"],
  },
  {
    key: "appointment",
    label: "Appointment of the manager / director",
    hint: "The deliberation naming the gérant or director, unless the statuts already name them (art. 10).",
    basis: "legal",
    required: false,
    appliesTo: ["legal_entity"],
  },
  {
    key: "qualification",
    label: "Qualification (diploma) of the responsible person",
    hint: "Proof that the manager, or a qualified permanent collaborator, meets the diploma condition (art. 8 and art. 10-B).",
    basis: "legal",
    required: false,
    appliesTo: ENTITY_TYPES,
  },
  {
    key: "carte_professionnelle",
    label: "Carte professionnelle",
    hint: "Issued by the wali on entry in the wilaya register of agents (art. 17–18), if you already have it.",
    basis: "legal",
    required: false,
    appliesTo: ENTITY_TYPES,
  },
  {
    key: "nationality_residence",
    label: "Nationality and residence certificates",
    hint: "Of the applicant, or of the holders of the company's capital (art. 5 bis and art. 10).",
    basis: "legal",
    required: false,
    appliesTo: ENTITY_TYPES,
  },
  {
    key: "tax_documents",
    label: "Tax identification (NIF / NIS) certificates",
    hint: "Not part of the agrément dossier.",
    basis: "platform",
    required: false,
    appliesTo: ENTITY_TYPES,
  },
  {
    key: "other",
    label: "Other supporting document",
    hint: "Anything else that helps us verify the agency.",
    basis: "platform",
    required: false,
    appliesTo: ENTITY_TYPES,
  },
];

export const DOCUMENT_KEYS = DOCUMENT_KINDS.map((d) => d.key);

// Admin-only manual checks. `flag` items are uncertain in law or depend on
// judgement: they never block anything automatically.
export const CHECKLIST = [
  { key: "agrement_matches", label: "Agrément certificate matches the number, wilaya and dates entered" },
  { key: "agrement_valid", label: "Agrément is still valid (5 years from issue, art. 16)" },
  { key: "agrement_issuer", label: "Agrément was issued by the wali of the stated wilaya (19-242, art. 7)" },
  { key: "rc_matches", label: "RC extract matches the legal name, RC number and a real-estate activity" },
  { key: "identity_matches", label: "ID card matches the representative's details" },
  { key: "entity_docs", label: "Legal entity: statuts / BOAL consistent with the legal name and structure", appliesTo: ["legal_entity"] },
  { key: "qualification", label: "Manager is qualified, or a qualified permanent collaborator is named (art. 10-B)", flag: true },
  { key: "tax_ids", label: "NIF (and NIS / AI if given) consistent with the RC extract", flag: true },
  { key: "contact_verified", label: "Business phone and email reached the agency" },
];

export const requirementsFor = (entityType) => ({
  fields: [...REQUIRED_FIELDS.common, ...(REQUIRED_FIELDS[entityType] || [])],
  documents: DOCUMENT_KINDS.filter((d) => d.appliesTo.includes(entityType)),
});

// Everything still missing before an application can be submitted
export const missingForSubmit = (app, documents) => {
  const { fields, documents: kinds } = requirementsFor(app.entityType);
  const missing = fields
    .filter((f) => app[f] === null || app[f] === undefined || String(app[f]).trim() === "")
    .map((f) => FIELD_LABELS[f] || f);
  const have = new Set(documents.map((d) => d.kind));
  kinds
    .filter((k) => k.required && !have.has(k.key))
    .forEach((k) => missing.push(k.label));
  return missing;
};
