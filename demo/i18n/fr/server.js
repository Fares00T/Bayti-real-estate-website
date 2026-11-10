// French for the text that originates in the API (demo/server): error and confirmation messages,
// notification titles and bodies, audit log summaries, application events, and the labels the
// server defines. Keys are the English text exactly as it reaches the page.

// ---------- helpers for the patterns ----------

const plural = (n) => (Number(n) > 1 ? "s" : "");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// The agency activity feed (agency/src/components/Feed.jsx) lower-cases the first letter of a
// summary so it reads after the actor's name: "Sara created …". Those get a verb form in French
// ("Sara a créé …"); everywhere else the summary stands alone and gets a noun form.
const afterName = (m) => /^[a-zà-ÿ]/.test(m[0]);
// Summaries read as verbs: "a créé « … »" after the actor's name in the agency feed,
// "A créé « … »" beside the actor in the admin audit log
const verb = (m, v) => (afterName(m) ? v : cap(v));
// "de Karim" but "d'Amel" (no elision before h or y: "de Hichem", "de Yacine")
const de = (name) => (/^[aeiouàâäéèêëîïôöùûü]/i.test(name) ? `d'${name}` : `de ${name}`);
const quoted = (title, t) => `« ${t(title)} »`;
const num = (id) => (/^#/.test(id) ? `n° ${id.slice(1)}` : id);

const ROLE = { owner: "propriétaire", manager: "responsable", agent: "agent" };
const asRole = (role) => (role === "agent" ? "en tant qu'agent" : `en tant que ${ROLE[role] || role}`);

// Raw enum values printed inside audit summaries ("submitted → under_review")
const STATUS = {
  // agency applications
  draft: "brouillon",
  submitted: "envoyée",
  under_review: "en cours d'examen",
  info_required: "informations demandées",
  resubmitted: "renvoyée",
  // listings
  pending: "en attente",
  approved: "approuvée",
  rejected: "refusée",
  unpublished: "retirée",
  archived: "archivée",
  // account roles
  client: "client",
  admin: "administrateur",
};
const STATUS_RE = Object.keys(STATUS).join("|");

const ACCOUNT_STATUS = { active: "actif", suspended: "suspendu", deactivated: "désactivé" };
const REPORT_STATUS = { open: "rouvert", resolved: "résolu", dismissed: "classé sans suite" };
const INQUIRY_STATUS = {
  open: "ouverte",
  scheduled: "planifiée",
  closed: "clôturée",
  declined: "refusée",
  cancelled: "annulée",
};
const ACCOUNT_KIND = { client: "client", agent: "agent", agency: "agence", admin: "administrateur" };
const MEMBER_CHANGE = {
  "role manager": "rôle responsable",
  "role agent": "rôle agent",
  reactivated: "accès réactivé",
  deactivated: "accès désactivé",
  "access switched off": "accès désactivé",
  "access restored": "accès réactivé",
};
const MEMBER_CHANGE_RE = Object.keys(MEMBER_CHANGE).join("|");

// Column names printed raw in "Edited …: a, b" / "Changed a, b" summaries
const FIELD = {
  // agency and application
  legalName: "raison sociale",
  tradeName: "nom commercial",
  legalForm: "forme juridique",
  entityType: "type d'entité",
  rcNumber: "numéro RC",
  nif: "NIF",
  nis: "NIS",
  articleImposition: "article d'imposition",
  address: "adresse",
  wilaya: "wilaya",
  commune: "commune",
  phone: "téléphone",
  email: "e-mail",
  website: "site web",
  logo: "logo",
  about: "présentation",
  approvalNumber: "numéro d'agrément",
  approvalWilaya: "wilaya de délivrance",
  approvalIssueDate: "date de délivrance de l'agrément",
  approvalExpiryDate: "date d'expiration de l'agrément",
  repFullName: "nom du représentant",
  repPosition: "fonction du représentant",
  repPhone: "téléphone du représentant",
  repEmail: "e-mail du représentant",
  repBirthDate: "date de naissance du représentant",
  repNationality: "nationalité du représentant",
  repIdNumber: "numéro de carte d'identité",
  qualifiedPersonName: "personne qualifiée",
  qualification: "qualification",
  message: "message",
  // accounts
  username: "nom d'utilisateur",
  avatar: "photo de profil",
  verified: "vérifié",
  // listings
  title: "titre",
  price: "prix",
  images: "photos",
  city: "wilaya",
  district: "commune",
  bedroom: "chambres",
  bathroom: "salles de bain",
  latitude: "latitude",
  longitude: "longitude",
  type: "vente ou location",
  property: "catégorie",
  propertyType: "type de bien",
  availability: "disponibilité",
  featured: "mise en avant",
  status: "statut",
  userId: "compte responsable",
  agencyId: "agence",
  desc: "description",
  utilities: "charges",
  pet: "animaux",
  size: "surface",
  Furnished: "meublé",
  primarySchool: "école primaire",
  kindergarten: "jardin d'enfants",
  middleSchool: "collège",
  highSchool: "lycée",
  university: "université",
  carPark: "parking",
  transportation: "transports",
  mosque: "mosquée",
  pharmacy: "pharmacie",
  commercialArea: "zone commerciale",
  // settings sections
  listings: "annonces",
  marketplace: "marketplace",
  agencies: "agences",
  notifications: "notifications",
};
// "a, b, c" where each item is a column name or an already translatable label
const fieldList = (list, t) =>
  list
    .split(", ")
    .map((k) => FIELD[k] || t(k))
    .join(", ");

const LEGAL_FIELD_RE =
  "legalName|legalForm|rcNumber|nif|nis|articleImposition|address|wilaya|commune|approvalNumber|approvalWilaya|approvalIssueDate|approvalExpiryDate|repFullName|repPosition";

// "; 2 listing(s) moved to X; 1 listing(s) left unassigned" at the end of team summaries
const handover = (moved, to, reassigned, unassigned) =>
  (moved ? ` ; ${moved} annonce${plural(moved)} transférée${plural(moved)} à ${to}` : "") +
  (reassigned ? ` ; ${reassigned} annonce${plural(reassigned)} réattribuée${plural(reassigned)}` : "") +
  (unassigned ? ` ; ${unassigned} annonce${plural(unassigned)} laissée${plural(unassigned)} sans agent` : "");

// Guards the loosest summary patterns ("<agency> verified"): an agency name has none of these words
const AGENCY_NAME =
  "((?:(?!\\b(?:[Ii]s|[Aa]re|[Nn]ot|[Yy]our|[Uu]ntil|[Bb]een|[Gg]et|[Mm]ark|[Ee]mail|[Aa]ccount|[Aa]ccess|[Mm]ember)\\b).)+?)";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- labels defined in server/lib/agencyRequirements.js ----------

// FIELD_LABELS ("Wilaya", "Commune", "NIF", "NIS" and "Article d'imposition" are the same in French)
const fieldLabels = {
  "Agency (commercial) name": "Nom (commercial) de l'agence",
  "Official legal name": "Raison sociale officielle",
  "Legal structure": "Forme juridique",
  "Trade Register number (RC)": "Numéro du Registre de Commerce (RC)",
  "Registered business address": "Adresse du siège",
  "Business phone": "Téléphone professionnel",
  "Official email": "E-mail officiel",
  "Website": "Site web",
  "Representative's full legal name": "Nom complet du représentant",
  "Representative's date of birth": "Date de naissance du représentant",
  "Representative's nationality": "Nationalité du représentant",
  "National ID card number": "Numéro de la carte d'identité nationale",
  "Representative's phone": "Téléphone du représentant",
  "Representative's email": "E-mail du représentant",
  "Position in the company": "Fonction dans la société",
  "Agrément number": "Numéro d'agrément",
  "Issuing wilaya": "Wilaya de délivrance",
  "Agrément issue date": "Date de délivrance de l'agrément",
  "Agrément expiry date": "Date d'expiration de l'agrément",
};

// DOCUMENT_KINDS labels ("Agrément d'agent immobilier", "Extrait du Registre de Commerce" and
// "Carte professionnelle" are already French)
const documentLabels = {
  "Representative's national ID card": "Carte d'identité nationale du représentant",
  "Company articles of association (statuts)": "Statuts de la société",
  "BOAL publication of incorporation": "Publication de la constitution au BOAL",
  "Appointment of the manager / director": "Nomination du gérant / directeur",
  "Qualification (diploma) of the responsible person": "Qualification (diplôme) du responsable",
  "Nationality and residence certificates": "Certificats de nationalité et de résidence",
  "Tax identification (NIF / NIS) certificates": "Attestations d'identification fiscale (NIF / NIS)",
  "Other supporting document": "Autre pièce justificative",
};

// Every label that can appear in a "missing" list joined with ", " (admin: "Still missing: a, b.")
const LABEL_RE = [
  ...Object.keys(fieldLabels),
  ...Object.keys(documentLabels),
  "Wilaya",
  "Commune",
  "NIF",
  "NIS",
  "Article d'imposition",
  "Agrément d'agent immobilier",
  "Extrait du Registre de Commerce",
  "Carte professionnelle",
]
  .map(escapeRe)
  .join("|");

export default {
  strings: {
    // server/lib/agencyRequirements.js: FIELD_LABELS, DOCUMENT_KINDS labels
    ...fieldLabels,
    ...documentLabels,

    // server/lib/agencyRequirements.js: DOCUMENT_KINDS hints
    "The approval certificate issued by the wali (Décret 19-242, art. 7).": "L'agrément délivré par le wali (décret 19-242, art. 7).",
    "Registration in the Commercial Register is required to practise (Décret 09-18, art. 6).": "L'inscription au Registre de Commerce est obligatoire pour exercer (décret 09-18, art. 6).",
    "Helps us confirm who manages the account. Part of a natural person's agrément dossier (art. 10).": "Nous aide à confirmer qui gère le compte. Fait partie du dossier d'agrément d'une personne physique (art. 10).",
    "Part of a legal entity's agrément dossier (Décret 19-242, art. 10).": "Fait partie du dossier d'agrément d'une personne morale (décret 19-242, art. 10).",
    "Part of a legal entity's agrément dossier (art. 10), where applicable.": "Fait partie du dossier d'agrément d'une personne morale (art. 10), le cas échéant.",
    "The deliberation naming the gérant or director, unless the statuts already name them (art. 10).": "La délibération désignant le gérant ou le directeur, sauf si les statuts le désignent déjà (art. 10).",
    "Proof that the manager, or a qualified permanent collaborator, meets the diploma condition (art. 8 and art. 10-B).": "Justificatif attestant que le gérant, ou un collaborateur permanent qualifié, remplit la condition de diplôme (art. 8 et art. 10-B).",
    "Issued by the wali on entry in the wilaya register of agents (art. 17–18), if you already have it.": "Délivrée par le wali lors de l'inscription au registre des agents de la wilaya (art. 17–18), si vous l'avez déjà.",
    "Of the applicant, or of the holders of the company's capital (art. 5 bis and art. 10).": "Du candidat, ou des détenteurs du capital de la société (art. 5 bis et art. 10).",
    "Not part of the agrément dossier.": "Ne fait pas partie du dossier d'agrément.",
    "Anything else that helps us verify the agency.": "Tout autre élément nous aidant à vérifier l'agence.",

    // server/lib/agencyRequirements.js: CHECKLIST
    "Agrément certificate matches the number, wilaya and dates entered": "L'agrément correspond au numéro, à la wilaya et aux dates saisis",
    "Agrément is still valid (5 years from issue, art. 16)": "L'agrément est toujours valide (5 ans à compter de sa délivrance, art. 16)",
    "Agrément was issued by the wali of the stated wilaya (19-242, art. 7)": "L'agrément a été délivré par le wali de la wilaya indiquée (19-242, art. 7)",
    "RC extract matches the legal name, RC number and a real-estate activity": "L'extrait du RC correspond à la raison sociale, au numéro RC et à une activité immobilière",
    "ID card matches the representative's details": "La carte d'identité correspond aux informations du représentant",
    "Legal entity: statuts / BOAL consistent with the legal name and structure": "Personne morale : statuts / BOAL cohérents avec la raison sociale et la forme juridique",
    "Manager is qualified, or a qualified permanent collaborator is named (art. 10-B)": "Le gérant est qualifié, ou un collaborateur permanent qualifié est désigné (art. 10-B)",
    "NIF (and NIS / AI if given) consistent with the RC extract": "NIF (et NIS / AI le cas échéant) cohérents avec l'extrait du RC",
    "Business phone and email reached the agency": "Le téléphone et l'e-mail professionnels ont permis de joindre l'agence",

    // server/lib/platform.js
    "Bayti staff accounts sign in on the admin dashboard.": "Les comptes de l'équipe Bayti se connectent sur le tableau de bord d'administration.",
    "Your account belongs to an agency, so it signs in on the agency workspace.": "Votre compte appartient à une agence : connectez-vous sur l'espace agence.",
    "This is the agency platform. Your account is a personal Bayti account: sign in on the Bayti marketplace.": "Vous êtes sur la plateforme agences. Votre compte est un compte Bayti personnel : connectez-vous sur la marketplace Bayti.",

    // server/lib/inquiries.js
    "This is your own listing.": "C'est votre propre annonce.",
    "This listing belongs to your agency.": "Cette annonce appartient à votre agence.",
    "Give a phone number, a date and a time for the visit.": "Indiquez un numéro de téléphone, une date et une heure pour la visite.",
    "Choose a valid date.": "Choisissez une date valide.",

    // server/lib/invitations.js
    "Bayti staff accounts can't join an agency.": "Les comptes de l'équipe Bayti ne peuvent pas rejoindre une agence.",
    "That account is suspended.": "Ce compte est suspendu.",
    "Your account is suspended.": "Votre compte est suspendu.",
    "That account already belongs to an agency.": "Ce compte appartient déjà à une agence.",
    "Your account already belongs to an agency.": "Votre compte appartient déjà à une agence.",
    "That account has its own agency application in progress.": "Ce compte a sa propre candidature d'agence en cours.",
    "Your account has its own agency application in progress.": "Votre compte a sa propre candidature d'agence en cours.",
    "This invitation is no longer valid.": "Cette invitation n'est plus valide.",
    "This agency is currently suspended.": "Cette agence est actuellement suspendue.",

    // server/lib/settings.js
    "Keep at least one property type enabled.": "Gardez au moins un type de bien activé.",
    "Allow at least one photo per listing.": "Autorisez au moins une photo par annonce.",

    // server/lib/storage.js
    "The upload failed.": "L'envoi a échoué.",
    "The file is empty.": "Le fichier est vide.",

    // server/app.js, server/runtime/http.js, server/runtime/client.js
    "Failed to load settings.": "Impossible de charger les paramètres.",
    "Something went wrong.": "Une erreur s'est produite.",
    "No file.": "Aucun fichier.",

    // server/middleware/requireAdmin.js, requireAgency.js, verifyToken.js
    "Not signed in.": "Connexion requise.",
    "Your session has expired.": "Votre session a expiré.",
    "Admin access only.": "Accès réservé aux administrateurs.",
    "Authentication failed.": "Échec de l'authentification.",
    "This account is not active.": "Ce compte n'est pas actif.",
    "Your agency application hasn't been approved yet.": "Votre candidature d'agence n'a pas encore été approuvée.",
    "This account isn't part of an agency.": "Ce compte ne fait partie d'aucune agence.",
    "Your agency has switched off your access.": "Votre agence a désactivé votre accès.",
    "Your role in the agency doesn't allow this.": "Votre rôle dans l'agence ne vous permet pas cette action.",
    "Your agency is approved: use the agency workspace.": "Votre agence est approuvée : utilisez l'espace agence.",
    "Your agency membership changed. Sign in again.": "Votre rattachement à une agence a changé. Reconnectez-vous.",
    "This agency is suspended. Contact Bayti support.": "Cette agence est suspendue. Contactez le support Bayti.",
    "Not Authenticated!": "Authentification requise !",
    "Token is not Valid!": "Session invalide !",
    "This account has been suspended.": "Ce compte a été suspendu.",

    // server/controllers/admin.controller.js
    "Too many attempts. Try again in 15 minutes.": "Trop de tentatives. Réessayez dans 15 minutes.",
    "These credentials don't have admin access.": "Ces identifiants ne donnent pas accès à l'administration.",
    "Sign-in failed. Please try again.": "Échec de la connexion. Veuillez réessayer.",

    // server/controllers/adminAgencies.controller.js
    "Failed to load agencies.": "Impossible de charger les agences.",
    "Invalid agency ID": "Identifiant d'agence invalide",
    "Agency not found.": "Agence introuvable.",
    "Failed to load the agency.": "Impossible de charger l'agence.",
    "An agency needs its commercial and legal names.": "Une agence doit avoir un nom commercial et une raison sociale.",
    "Enter a valid email.": "Saisissez une adresse e-mail valide.",
    "Choose the account that will own the agency.": "Choisissez le compte qui sera propriétaire de l'agence.",
    "That account doesn't exist.": "Ce compte n'existe pas.",
    "Staff accounts can't own an agency.": "Les comptes de l'équipe Bayti ne peuvent pas être propriétaires d'une agence.",
    "Your account is now the agency's main account.": "Votre compte est désormais le compte principal de l'agence.",
    "Couldn't create the agency.": "Impossible de créer l'agence.",
    "The agency names can't be empty.": "Les noms de l'agence ne peuvent pas être vides.",
    "Couldn't save the agency.": "Impossible d'enregistrer l'agence.",
    "Unknown status.": "Statut inconnu.",
    "Give a reason for the suspension.": "Indiquez le motif de la suspension.",
    "Give the agency an owner before reactivating it.": "Attribuez un propriétaire à l'agence avant de la réactiver.",
    "Your listings are visible again.": "Vos annonces sont de nouveau visibles.",
    "Couldn't change the agency status.": "Impossible de modifier le statut de l'agence.",
    "Unknown verification.": "Vérification inconnue.",
    "Give a reason for revoking the verification.": "Indiquez le motif de la révocation de la vérification.",
    "Your listings show the verified badge.": "Vos annonces affichent le badge de vérification.",
    "Couldn't change the verification.": "Impossible de modifier la vérification.",
    "No account found.": "Aucun compte trouvé.",
    "Staff accounts can't join an agency.": "Les comptes de l'équipe Bayti ne peuvent pas rejoindre une agence.",
    "Already a member of this agency.": "Déjà membre de cette agence.",
    "That person owns another agency.": "Cette personne est propriétaire d'une autre agence.",
    "Bayti added you as a manager.": "Bayti vous a donné le rôle de responsable.",
    "Bayti added you as an agent.": "Bayti vous a donné le rôle d'agent.",
    "Couldn't add the member.": "Impossible d'ajouter le membre.",
    "Nothing to change.": "Rien à modifier.",
    "Unknown role.": "Rôle inconnu.",
    "Member not found.": "Membre introuvable.",
    "Suspend the agency or transfer ownership instead.": "Suspendez plutôt l'agence ou transférez-en la propriété.",
    "Make another member the owner instead.": "Désignez plutôt un autre membre comme propriétaire.",
    "Couldn't change the member's role.": "Impossible de modifier le rôle du membre.",
    "Transfer ownership before removing the owner.": "Transférez la propriété avant de retirer le propriétaire.",
    "Couldn't remove the member.": "Impossible de retirer le membre.",
    "Choose a file to upload.": "Choisissez un fichier à envoyer.",

    // server/controllers/adminApplications.controller.js
    "Our team has started checking your application and documents.": "Notre équipe a commencé à vérifier votre candidature et vos documents.",
    "Our team needs more from you before deciding:": "Notre équipe a besoin d'informations complémentaires avant de se prononcer :",
    "Open your application to update it and upload documents.": "Ouvrez votre candidature pour la mettre à jour et envoyer des documents.",
    "Your application was approved. Your account is now the agency's main account.": "Votre candidature a été approuvée. Votre compte est désormais le compte principal de l'agence.",
    "You can submit a new application once the issue is resolved.": "Vous pourrez déposer une nouvelle candidature une fois le problème résolu.",
    "your agency": "votre agence",
    "Invalid status": "Statut invalide",
    "Failed to load applications.": "Impossible de charger les candidatures.",
    "Invalid application ID": "Identifiant de candidature invalide",
    "Application not found.": "Candidature introuvable.",
    "Failed to load the application.": "Impossible de charger la candidature.",
    "Unknown action.": "Action inconnue.",
    "Tell the applicant why it was rejected.": "Indiquez au candidat le motif du refus.",
    "Tell the applicant what you need.": "Indiquez au candidat ce dont vous avez besoin.",
    "This application has moved on. Refresh to see its current status.": "Cette candidature a évolué entre-temps. Actualisez la page pour voir son statut actuel.",
    "Staff accounts can't become agencies.": "Les comptes de l'équipe Bayti ne peuvent pas devenir des agences.",
    "The applicant has since joined another agency. Remove them from it first.": "Le candidat a rejoint une autre agence entre-temps. Retirez-le d'abord de celle-ci.",
    "Couldn't record the decision.": "Impossible d'enregistrer la décision.",
    "Write a note first.": "Rédigez d'abord une note.",
    "Couldn't save the note.": "Impossible d'enregistrer la note.",
    "Unknown checklist item.": "Élément de la liste de contrôle inconnu.",
    "Couldn't update the checklist.": "Impossible de mettre à jour la liste de contrôle.",
    "This application was approved. Edit the agency's record instead.": "Cette candidature a été approuvée. Modifiez plutôt la fiche de l'agence.",
    "Couldn't save the application.": "Impossible d'enregistrer la candidature.",
    "Choose which document this is.": "Indiquez de quel document il s'agit.",

    // server/controllers/adminPlatform.controller.js
    "Couldn't load notifications.": "Impossible de charger les notifications.",
    "Couldn't load counters.": "Impossible de charger les compteurs.",
    "Couldn't update notifications.": "Impossible de mettre à jour les notifications.",
    "Couldn't load the activity log.": "Impossible de charger le journal d'activité.",
    "Couldn't load reports.": "Impossible de charger les signalements.",
    "Report not found.": "Signalement introuvable.",
    "Couldn't load the report.": "Impossible de charger le signalement.",
    "Note what was done about it.": "Indiquez ce qui a été fait.",
    "Couldn't update the report.": "Impossible de mettre à jour le signalement.",
    "Couldn't load settings.": "Impossible de charger les paramètres.",
    "Couldn't save settings.": "Impossible d'enregistrer les paramètres.",
    "Document not found.": "Document introuvable.",
    "Documents submitted with an application are kept as a record.": "Les documents joints à une candidature sont conservés à titre d'archive.",
    "Same map pin": "Même emplacement sur la carte",
    "Same title and price": "Même titre et même prix",
    "Couldn't check for duplicates.": "Impossible de rechercher les doublons.",

    // server/controllers/adminPosts.controller.js
    "Failed to load statistics.": "Impossible de charger les statistiques.",
    "Failed to load listings.": "Impossible de charger les annonces.",
    "Invalid post ID": "Identifiant d'annonce invalide",
    "Listing not found.": "Annonce introuvable.",
    "Failed to load listing.": "Impossible de charger l'annonce.",
    "Invalid price.": "Prix invalide.",
    "Invalid bedroom.": "Nombre de chambres invalide.",
    "Invalid bathroom.": "Nombre de salles de bain invalide.",
    "Invalid latitude.": "Latitude invalide.",
    "Invalid longitude.": "Longitude invalide.",
    "The title can't be empty.": "Le titre ne peut pas être vide.",
    "The address is required.": "L'adresse est obligatoire.",
    "The wilaya is required.": "La wilaya est obligatoire.",
    "The district is required.": "La commune est obligatoire.",
    "Choose sale or rent.": "Choisissez vente ou location.",
    "Choose a category.": "Choisissez une catégorie.",
    "Choose a property type.": "Choisissez un type de bien.",
    "The property type doesn't match the category.": "Le type de bien ne correspond pas à la catégorie.",
    "Photos must be uploaded image links.": "Les photos doivent être des images importées.",
    "Unknown availability.": "Disponibilité inconnue.",
    "Choose the account that owns this listing.": "Choisissez le compte propriétaire de cette annonce.",
    "That agency doesn't exist.": "Cette agence n'existe pas.",
    "A personal listing needs its owner.": "Une annonce personnelle doit avoir un propriétaire.",
    "The assigned agent must be a member of the listing's agency.": "L'agent attribué doit être membre de l'agence de l'annonce.",
    "Couldn't create the listing.": "Impossible de créer l'annonce.",
    "Failed to save the listing.": "Impossible d'enregistrer l'annonce.",
    "It's now visible on the marketplace.": "Elle est désormais visible sur la marketplace.",
    "Edit the listing to send it back for review.": "Modifiez l'annonce pour la soumettre de nouveau à l'examen.",
    "Contact Bayti support for details.": "Contactez le support Bayti pour en savoir plus.",
    "It's no longer on the market.": "Elle n'est plus sur le marché.",
    "Please give the owner a reason for the rejection": "Veuillez indiquer au propriétaire le motif du refus",
    "Failed to update listing status": "Impossible de mettre à jour le statut de l'annonce",
    "Decision must be approve or reject": "La décision doit être « approuver » ou « refuser »",
    "Listing deleted.": "Annonce supprimée.",
    "Failed to delete the listing.": "Impossible de supprimer l'annonce.",

    // server/controllers/adminUsers.controller.js
    "That email is already used by another account.": "Cet e-mail est déjà utilisé par un autre compte.",
    "That username is already used by another account.": "Ce nom d'utilisateur est déjà utilisé par un autre compte.",
    "Failed to load users.": "Impossible de charger les utilisateurs.",
    "Invalid user ID": "Identifiant d'utilisateur invalide",
    "User not found.": "Utilisateur introuvable.",
    "Failed to load the user.": "Impossible de charger l'utilisateur.",
    "Choose an account type.": "Choisissez un type de compte.",
    "Username must be at least 3 characters.": "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    "Passwords set by the team need at least 8 characters.": "Les mots de passe définis par l'équipe doivent contenir au moins 8 caractères.",
    "Invalid profile picture.": "Photo de profil invalide.",
    "Choose the agency this agent works for.": "Choisissez l'agence pour laquelle cet agent travaille.",
    "Couldn't create the account.": "Impossible de créer le compte.",
    "Couldn't save the account.": "Impossible d'enregistrer le compte.",
    "You can't change your own role.": "Vous ne pouvez pas modifier votre propre rôle.",
    "Agency members can't be Bayti staff. Remove them from their agency first.": "Les membres d'une agence ne peuvent pas faire partie de l'équipe Bayti. Retirez-les d'abord de leur agence.",
    "Reactivate the account before giving it staff access.": "Réactivez le compte avant de lui donner un accès à l'administration.",
    "Failed to change the role.": "Impossible de modifier le rôle.",
    "You can't change your own account status.": "Vous ne pouvez pas modifier le statut de votre propre compte.",
    "Give a reason. It's kept in the account history.": "Indiquez un motif. Il est conservé dans l'historique du compte.",
    "Your account is active again": "Votre compte est de nouveau actif",
    "Couldn't change the account status.": "Impossible de modifier le statut du compte.",
    "Use at least 8 characters.": "Utilisez au moins 8 caractères.",
    "Couldn't change the password.": "Impossible de modifier le mot de passe.",
    "Couldn't create the reset link.": "Impossible de créer le lien de réinitialisation.",
    "You can't delete your own account from here.": "Vous ne pouvez pas supprimer votre propre compte depuis cette page.",
    "Remove their admin role before deleting the account.": "Retirez-lui le rôle d'administrateur avant de supprimer le compte.",
    "Type the username to confirm.": "Saisissez le nom d'utilisateur pour confirmer.",
    "User deleted.": "Utilisateur supprimé.",
    "Failed to delete the user.": "Impossible de supprimer l'utilisateur.",

    // server/controllers/agency.controller.js
    "Invalid email or password.": "E-mail ou mot de passe incorrect.",
    "The new password must be at least 6 characters.": "Le nouveau mot de passe doit contenir au moins 6 caractères.",
    "Your current password isn't right.": "Votre mot de passe actuel est incorrect.",
    "That username is already taken.": "Ce nom d'utilisateur est déjà pris.",
    "Couldn't save your profile.": "Impossible d'enregistrer votre profil.",
    "The agency name can't be empty.": "Le nom de l'agence ne peut pas être vide.",
    "Couldn't save the agency details.": "Impossible d'enregistrer les informations de l'agence.",
    "Updated the agency profile": "Profil de l'agence mis à jour",
    "updated the agency profile": "a mis à jour le profil de l'agence",

    // server/controllers/agencyInsights.controller.js
    "Couldn't load the overview.": "Impossible de charger la vue d'ensemble.",
    "Couldn't load analytics.": "Impossible de charger les statistiques.",
    "Inquiry not found.": "Demande introuvable.",
    "Choose an active member of your agency.": "Choisissez un membre actif de votre agence.",

    // server/controllers/agencyListings.controller.js
    "Couldn't load the listings.": "Impossible de charger les annonces.",
    "You can only create listings for yourself.": "Vous ne pouvez créer des annonces que pour vous-même.",
    "That agent isn't an active member of your agency.": "Cet agent n'est pas un membre actif de votre agence.",
    "Couldn't save the listing.": "Impossible d'enregistrer l'annonce.",
    "Restore the listing first.": "Restaurez d'abord l'annonce.",
    "Bayti took this listing down. Contact support.": "Bayti a retiré cette annonce. Contactez le support.",
    "Couldn't delete the listing.": "Impossible de supprimer l'annonce.",

    // server/controllers/agencyTeam.controller.js
    "Team member not found.": "Membre de l'équipe introuvable.",
    "A Bayti account already uses that email. Add it instead.": "Un compte Bayti utilise déjà cet e-mail. Ajoutez plutôt ce compte.",
    "The username must be at least 3 characters.": "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    "No Bayti account uses that email. Create one for them instead.": "Aucun compte Bayti n'utilise cet e-mail. Créez plutôt un compte pour cette personne.",
    "They're already on your team.": "Cette personne fait déjà partie de votre équipe.",
    "They already have an invitation waiting.": "Cette personne a déjà une invitation en attente.",
    "As a manager. Accept or decline from your profile.": "En tant que responsable. Acceptez ou refusez depuis votre profil.",
    "As an agent. Accept or decline from your profile.": "En tant qu'agent. Acceptez ou refusez depuis votre profil.",
    "You were added as a manager. Sign in to the agency platform to manage your listings.": "Vous avez désormais le rôle de responsable. Connectez-vous à la plateforme agences pour gérer vos annonces.",
    "You were added as an agent. Sign in to the agency platform to manage your listings.": "Vous avez désormais le rôle d'agent. Connectez-vous à la plateforme agences pour gérer vos annonces.",
    "Couldn't add them to the team.": "Impossible d'ajouter cette personne à l'équipe.",
    "You can't manage this team member.": "Vous ne pouvez pas gérer ce membre de l'équipe.",
    "Only the owner can change roles.": "Seul le propriétaire peut modifier les rôles.",
    "You can't use the agency platform or publish for the agency until you're reactivated.": "Vous ne pouvez plus utiliser la plateforme agences ni publier pour l'agence tant que votre accès n'est pas réactivé.",
    "Couldn't save the change.": "Impossible d'enregistrer la modification.",
    "The owner's place can only be changed by Bayti support.": "Seul le support Bayti peut modifier la place du propriétaire.",
    "You can't remove this team member.": "Vous ne pouvez pas retirer ce membre de l'équipe.",
    "Your account is now a regular member account. The agency's listings stay with the agency.": "Votre compte est désormais un compte personnel classique. Les annonces de l'agence restent à l'agence.",
    "Couldn't remove them from the team.": "Impossible de retirer cette personne de l'équipe.",
    "Invitation not found.": "Invitation introuvable.",
    "Withdrew an invitation": "Invitation retirée",
    "withdrew an invitation": "a retiré une invitation",

    // server/controllers/application.controller.js
    "Choose a natural person or a company.": "Choisissez personne physique ou société.",
    "Unknown legal structure.": "Forme juridique inconnue.",
    "The logo must be an uploaded image.": "Le logo doit être une image importée.",
    "The date of birth is in the future.": "La date de naissance est dans le futur.",
    "The agrément expiry date must be after its issue date.": "La date d'expiration de l'agrément doit être postérieure à sa date de délivrance.",
    "Failed to load your application.": "Impossible de charger votre candidature.",
    "Staff accounts can't apply as an agency.": "Les comptes de l'équipe Bayti ne peuvent pas candidater en tant qu'agence.",
    "You already have an application in progress.": "Vous avez déjà une candidature en cours.",
    "Agency applications are closed for now.": "Les candidatures d'agence sont fermées pour le moment.",
    "Couldn't start your application.": "Impossible de créer votre candidature.",
    "Your name must be at least 3 characters.": "Votre nom doit contenir au moins 3 caractères.",
    "Please enter a valid email.": "Veuillez saisir une adresse e-mail valide.",
    "Password must be at least 6 characters.": "Le mot de passe doit contenir au moins 6 caractères.",
    "This name is already taken. Try another one.": "Ce nom est déjà pris. Essayez-en un autre.",
    "An agency account already uses this email. Sign in to continue your application.": "Un compte agence utilise déjà cet e-mail. Connectez-vous pour poursuivre votre candidature.",
    "This email belongs to a personal Bayti account. Register your agency with its own email address.": "Cet e-mail appartient à un compte Bayti personnel. Inscrivez votre agence avec sa propre adresse e-mail.",
    "An account already uses this email or name. Log in to continue.": "Un compte utilise déjà cet e-mail ou ce nom. Connectez-vous pour continuer.",
    "We couldn't create your account. Please try again.": "Nous n'avons pas pu créer votre compte. Veuillez réessayer.",
    "This application is with our team and can't be edited right now.": "Cette candidature est entre les mains de notre équipe et ne peut pas être modifiée pour le moment.",
    "Couldn't save your answers.": "Impossible d'enregistrer vos réponses.",
    "Documents can't be changed while the application is being reviewed.": "Les documents ne peuvent pas être modifiés pendant l'examen de la candidature.",
    "The upload failed. Please try again.": "L'envoi a échoué. Veuillez réessayer.",
    "Documents already sent to our team can't be removed.": "Les documents déjà transmis à notre équipe ne peuvent pas être supprimés.",
    "Couldn't remove the document.": "Impossible de supprimer le document.",
    "This application has already been sent.": "Cette candidature a déjà été envoyée.",
    "Some required information is missing.": "Certaines informations obligatoires sont manquantes.",
    "Couldn't send your application.": "Impossible d'envoyer votre candidature.",
    "That password doesn't match this personal account.": "Ce mot de passe ne correspond pas à ce compte personnel.",
    "This account is suspended. Contact Bayti support.": "Ce compte est suspendu. Contactez le support Bayti.",
    "Bayti staff accounts can't become agency accounts.": "Les comptes de l'équipe Bayti ne peuvent pas devenir des comptes agence.",
    "This is already an agency account. Sign in instead.": "Ce compte est déjà un compte agence. Connectez-vous.",
    "From an existing personal account": "À partir d'un compte personnel existant",
    "We couldn't change your account. Please try again.": "Nous n'avons pas pu modifier votre compte. Veuillez réessayer.",
    "an agency application": "une candidature d'agence",

    // server/controllers/auth.controller.js
    "User created successfully": "Compte créé avec succès",
    "This email is already taken.": "Cet e-mail est déjà utilisé.",
    "This username is already taken.": "Ce nom d'utilisateur est déjà pris.",
    "Failed to create user!": "Impossible de créer le compte !",
    "This account has been suspended. Contact Bayti support.": "Ce compte a été suspendu. Contactez le support Bayti.",
    "This account has been deactivated.": "Ce compte a été désactivé.",
    "Failed to login!": "Échec de la connexion !",
    "Logout Successful": "Déconnexion réussie",
    "If an account uses that email, a reset link is on its way.": "Si un compte utilise cet e-mail, un lien de réinitialisation vient de lui être envoyé.",
    "This reset link has expired. Ask for a new one.": "Ce lien de réinitialisation a expiré. Demandez-en un nouveau.",
    "Your password has been changed. You can log in now.": "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.",
    "Couldn't reset the password.": "Impossible de réinitialiser le mot de passe.",

    // server/controllers/chat.controller.js
    "Invalid chat ID!": "Identifiant de conversation invalide !",
    "Conversation not found.": "Conversation introuvable.",
    "Failed to get chats!": "Impossible de charger les conversations !",
    "Failed to count messages!": "Impossible de compter les messages !",
    "Failed to get chat!": "Impossible de charger la conversation !",
    "Failed to get messages!": "Impossible de charger les messages !",
    "Message cannot be empty.": "Le message ne peut pas être vide.",
    "This person is no longer on Bayti.": "Cette personne n'est plus sur Bayti.",
    "This agency is currently unavailable on Bayti.": "Cette agence est actuellement indisponible sur Bayti.",
    "Failed to add message!": "Impossible d'envoyer le message !",

    // server/controllers/inquiry.controller.js
    "Write a message or choose a visit time.": "Rédigez un message ou choisissez un créneau de visite.",
    "This listing is no longer available.": "Cette annonce n'est plus disponible.",
    "Couldn't send your inquiry.": "Impossible d'envoyer votre demande.",
    "Choose the visit date and time.": "Choisissez la date et l'heure de la visite.",
    "You can only cancel your inquiry.": "Vous pouvez uniquement annuler votre demande.",
    "This inquiry is already closed.": "Cette demande est déjà clôturée.",

    // server/controllers/post.controller.js
    "This property type isn't accepted on Bayti right now.": "Ce type de bien n'est pas accepté sur Bayti pour le moment.",
    "Failed to fetch posts": "Impossible de charger les annonces",
    "Post not found!": "Annonce introuvable !",
    "Failed to get post": "Impossible de charger l'annonce",
    "You're a member of an agency: publish properties from your agency workspace.": "Vous êtes membre d'une agence : publiez vos biens depuis votre espace agence.",
    "Failed to create post": "Impossible de créer l'annonce",
    "Not Authorized!": "Action non autorisée !",
    "Failed to update post": "Impossible de mettre à jour l'annonce",
    "Bayti took this listing down. Contact support to discuss it.": "Bayti a retiré cette annonce. Contactez le support pour en discuter.",
    "Couldn't update the listing.": "Impossible de mettre à jour l'annonce.",
    "Post deleted successfully": "Annonce supprimée avec succès",
    "Failed to delete post": "Impossible de supprimer l'annonce",
    "Failed to record view": "Impossible d'enregistrer la vue",

    // server/controllers/publicAgency.controller.js
    "Couldn't load agencies.": "Impossible de charger les agences.",
    "Couldn't load this agency.": "Impossible de charger cette agence.",

    // server/controllers/user.controller.js
    "Not authorized!": "Action non autorisée !",
    "That username or email is already taken.": "Ce nom d'utilisateur ou cet e-mail est déjà utilisé.",
    "Failed to update user!": "Impossible de mettre à jour le compte !",
    "Invalid user ID!": "Identifiant d'utilisateur invalide !",
    "You own an agency. Contact Bayti support to hand it over before deleting your account.": "Vous êtes propriétaire d'une agence. Contactez le support Bayti pour la transmettre avant de supprimer votre compte.",
    "User and related data deleted successfully.": "Compte et données associées supprimés avec succès.",
    "Failed to delete user.": "Impossible de supprimer le compte.",
    "The owner's account was deleted.": "Le compte du propriétaire a été supprimé.",
    "Invalid post ID!": "Identifiant d'annonce invalide !",
    "Post removed from saved list": "Annonce retirée des annonces enregistrées",
    "Post saved": "Annonce enregistrée",
    "Failed to save post!": "Impossible d'enregistrer l'annonce !",
    "Failed to get profile posts!": "Impossible de charger vos annonces !",

    // server/controllers/test.controller.js
    "You are Authenticated": "Authentification réussie",

    // server/routes/invitation.route.js
    "Couldn't accept the invitation.": "Impossible d'accepter l'invitation.",
    "An invitation to your team was declined": "Une invitation à rejoindre votre équipe a été refusée",

    // server/routes/report.route.js
    "Please fill in all required fields.": "Veuillez remplir tous les champs obligatoires.",
    "Report submitted successfully.": "Signalement envoyé avec succès.",
    "Failed to submit report.": "Impossible d'envoyer le signalement.",
  },

  patterns: [
    // ---------- error messages ----------

    // server/lib/agency.js
    [
      /^This account has (\d+) personal listing\(s\) on Bayti\. They must be archived before joining an agency\.$/,
      (m) =>
        `Ce compte a ${m[1]} annonce${plural(m[1])} personnelle${plural(m[1])} sur Bayti. ${
          m[1] > 1 ? "Elles doivent être archivées" : "Elle doit être archivée"
        } avant de rejoindre une agence.`,
    ],

    // server/lib/inquiries.js
    [/^Messages are limited to (\d+) characters\.$/, "Les messages sont limités à $1 caractères."],

    // server/lib/listingLimits.js
    [
      /^Your agency has reached its limit of (\d+) active listings\. Archive one to publish another\.$/,
      (m) =>
        `Votre agence a atteint sa limite de ${m[1]} annonce${plural(m[1])} active${plural(m[1])}. Archivez-en une pour en publier une autre.`,
    ],
    [
      /^You've reached your limit of (\d+) active properties\. To publish more properties, register your real estate agency with Bayti\.$/,
      (m) =>
        `Vous avez atteint votre limite de ${m[1]} bien${plural(m[1])} actif${plural(m[1])}. Pour publier davantage de biens, inscrivez votre agence immobilière sur Bayti.`,
    ],

    // server/lib/settings.js
    [/^([\w.]+) must be an object\.$/, "$1 doit être un objet."],
    [/^([\w.]+) must be a list\.$/, "$1 doit être une liste."],
    [/^([\w.]+) must be a whole number\.$/, "$1 doit être un nombre entier."],
    // also "<field label> isn't a valid email." from application.controller.js
    [/^(.+) isn't a valid email\.$/, "$1 : adresse e-mail invalide."],

    // server/lib/storage.js
    [/^Each file must be ([\d.]+) MB or smaller\.$/, "Chaque fichier doit faire $1 Mo au maximum."],
    [/^You can upload up to (\d+) files at once\.$/, "Vous pouvez envoyer jusqu'à $1 fichiers à la fois."],
    [/^(.+): only PDF, JPG and PNG files are accepted\.$/, "$1 : seuls les fichiers PDF, JPG et PNG sont acceptés."],
    [/^(.+) isn't a valid PDF, JPG or PNG file\.$/, "$1 n'est pas un fichier PDF, JPG ou PNG valide."],

    // server/controllers/application.controller.js
    [
      /^This account has (\d+) property listings? on the marketplace\. Archive (?:them|it) from your profile first, or register your agency with another email\.$/,
      (m) =>
        `Ce compte a ${m[1]} annonce${plural(m[1])} sur la marketplace. ${
          m[1] > 1 ? "Archivez-les" : "Archivez-la"
        } d'abord depuis votre profil, ou inscrivez votre agence avec un autre e-mail.`,
    ],

    // server/controllers/inquiry.controller.js
    [
      /^An inquiry that is (open|scheduled|closed|declined|cancelled) can't be marked (\w+)\.$/,
      (m) => `Une demande ${INQUIRY_STATUS[m[1]]} ne peut pas être marquée comme ${INQUIRY_STATUS[m[2]] || m[2]}.`,
    ],

    // server/controllers/post.controller.js
    [/^A listing can have up to (\d+) photos\.$/, "Une annonce peut contenir jusqu'à $1 photos."],

    // server/runtime/http.js, server/runtime/client.js
    [/^Not found: ([A-Z]+) (\/\S*)$/, "Introuvable : $1 $2"],
    [/^Request failed with status code (\d+)$/, "La requête a échoué (code $1)"],
    [/^Demo: no handler for (.+)$/, "Démo : aucun gestionnaire pour $1"],
    [/^(.+) couldn't be read\.$/, "$1 : lecture impossible."],
    [/^(.+) isn't an image\.$/, "$1 n'est pas une image."],

    // ---------- labels ----------

    // server/lib/agencyRequirements.js: missingForSubmit() labels joined with ", "
    [new RegExp(`^(?:${LABEL_RE})(?:, (?:${LABEL_RE}))+$`), (m, t) => m[0].split(", ").map((label) => t(label)).join(", ")],

    // ---------- application events (ApplicationEvent.message) ----------

    // server/controllers/application.controller.js
    [/^(\d+) files?: (.+)$/, (m, t) => `${m[1]} fichier${plural(m[1])} : ${t(m[2])}`],
    // server/controllers/adminApplications.controller.js
    [/^Updated by the Bayti team: (.+)$/, (m, t) => `Mis à jour par l'équipe Bayti : ${fieldList(m[1], t)}`],
    [/^Filed by the Bayti team: (\d+) files?, (.+)$/, (m, t) => `Déposé par l'équipe Bayti : ${m[1]} fichier${plural(m[1])}, ${t(m[2])}`],

    // ---------- notifications: titles ----------

    // server/lib/inquiries.js
    [/^(.+) asked to visit “(.+)”$/, "$1 a demandé à visiter « $2 »"],
    [/^New inquiry about “(.+)”$/, "Nouvelle demande concernant « $1 »"],

    // server/controllers/inquiry.controller.js
    [/^Your visit of “(.+)” is confirmed$/, "Votre visite de « $1 » est confirmée"],
    [/^Your request about “(.+)” was declined$/, "Votre demande concernant « $1 » a été refusée"],
    [/^A client cancelled their request about “(.+)”$/, "Un client a annulé sa demande concernant « $1 »"],

    // server/controllers/adminPosts.controller.js
    [/^Your listing "(.+)" is live$/, "Votre annonce « $1 » est en ligne"],
    [/^Your listing "(.+)" needs changes$/, "Votre annonce « $1 » nécessite des modifications"],
    [/^Your listing "(.+)" was taken offline$/, "Votre annonce « $1 » a été retirée"],
    [/^Your listing "(.+)" was archived$/, "Votre annonce « $1 » a été archivée"],

    // server/controllers/post.controller.js
    [/^New listing to review: (.+)$/, "Nouvelle annonce à examiner : $1"],
    [/^Edited listing to review: (.+)$/, "Annonce modifiée à examiner : $1"],

    // server/controllers/auth.controller.js, application.controller.js
    [/^New account: (.+)$/, "Nouveau compte : $1"],
    [/^New agency application: (.+)$/, "Nouvelle candidature d'agence : $1"],
    [/^(.+) resubmitted their application$/, "$1 a renvoyé sa candidature"],
    [/^New documents for (.+)$/, "Nouveaux documents pour $1"],

    // server/routes/report.route.js
    [/^New report: (listing|user) — (.+)$/, (m, t) => `Nouveau signalement : ${m[1] === "listing" ? "annonce" : "utilisateur"} — ${t(m[2])}`],

    // server/controllers/adminApplications.controller.js
    [/^We're reviewing (.+)$/, (m, t) => `Nous examinons la candidature ${de(t(m[1]))}`],
    // the name falls back to "your agency"
    [/^(.+): more information needed$/, (m, t) => `${cap(t(m[1]))} : informations complémentaires requises`],
    [/^(.+) is now a verified agency on Bayti$/, (m, t) => `${cap(t(m[1]))} est désormais une agence vérifiée sur Bayti`],
    [/^Your agency application for (.+) was not approved$/, "Votre candidature d'agence pour $1 n'a pas été approuvée"],

    // server/controllers/adminAgencies.controller.js
    [/^(.+) is set up on Bayti$/, "$1 est désormais sur Bayti"],
    [/^(.+) is active again$/, "$1 est de nouveau active"],
    [/^(.+) has been suspended$/, "$1 a été suspendue"],
    [/^(.+) is verified on Bayti$/, "$1 est vérifiée sur Bayti"],
    [/^(.+)'s verification was revoked$/, (m) => `La vérification ${de(m[1])} a été révoquée`],
    [/^You joined (.+)$/, "Vous avez rejoint $1"],

    // server/controllers/agency.controller.js
    [/^(.+) updated its legal information$/, "$1 a mis à jour ses informations légales"],

    // server/controllers/agencyTeam.controller.js
    [/^(.+) invited you to join its team$/, "$1 vous invite à rejoindre son équipe"],
    [/^(.+) reactivated your access$/, "$1 a réactivé votre accès"],
    [/^(.+) switched off your access$/, "$1 a désactivé votre accès"],
    [/^You were removed from (.+)$/, (m) => `Vous ne faites plus partie ${de(m[1])}`],

    // ---------- notifications: bodies ----------

    // server/controllers/adminApplications.controller.js (line breaks reach the lookup as spaces)
    [
      /^Our team needs more from you before deciding: (.+) Open your application to update it and upload documents\.$/,
      (m, t) =>
        `Notre équipe a besoin d'informations complémentaires avant de se prononcer :\n\n${t(m[1])}\n\nOuvrez votre candidature pour la mettre à jour et envoyer des documents.`,
    ],
    [
      /^Your application was approved\. Your account is now the agency's main account\. (.+)$/,
      (m, t) => `Votre candidature a été approuvée. Votre compte est désormais le compte principal de l'agence.\n\n${t(m[1])}`,
    ],
    [
      /^Reason: (.+) You can submit a new application once the issue is resolved\.$/,
      (m, t) => `Motif : ${t(m[1])}\n\nVous pourrez déposer une nouvelle candidature une fois le problème résolu.`,
    ],
    // server/controllers/adminPosts.controller.js
    [
      /^Reason: (.+) Edit the listing to send it back for review\.$/,
      (m, t) => `Motif : ${t(m[1])}\n\nModifiez l'annonce pour la soumettre de nouveau à l'examen.`,
    ],
    [/^Reason: (.+)$/, "Motif : $1"],

    // server/controllers/adminAgencies.controller.js
    [/^Your listings are hidden until this is resolved\. Reason: (.+)$/, "Vos annonces sont masquées jusqu'à la résolution du problème. Motif : $1"],
    [/^Your listings stay online without the verified badge\. Reason: (.+)$/, "Vos annonces restent en ligne sans le badge de vérification. Motif : $1"],

    // server/controllers/agency.controller.js
    [new RegExp(`^Changed: ((?:${LEGAL_FIELD_RE})(?:, (?:${LEGAL_FIELD_RE}))*)$`), (m, t) => `Modifications : ${fieldList(m[1], t)}`],

    // server/controllers/application.controller.js
    [/^(\S+@\S+) · agency account, application started$/, "$1 · compte agence, candidature commencée"],
    [/^(\d+) file\(s\) uploaded: (.+)\.$/, (m, t) => `${m[1]} fichier${plural(m[1])} envoyé${plural(m[1])} : ${t(m[2])}.`],
    [/^(.+) · Agrément (.+)$/, "$1 · Agrément $2"],

    // server/lib/inquiries.js, server/controllers/inquiry.controller.js: "2026-11-12 at 11:00. — Agency"
    [
      /^(\d{4}-\d{2}-\d{2}) at (.+?)(\.)?(?: — (.+))?$/,
      (m) => `${m[1]} à ${m[2]}${m[3] || ""}${m[4] ? ` — ${m[4]}` : ""}`,
    ],
    [/^From (?!\d)(?!.* to )(.+)$/, (m) => `De la part ${de(m[1])}`],

    // server/controllers/post.controller.js: "<district>, <wilaya>"
    [/^(.+), Algiers$/, "$1, Alger"],

    // ---------- audit log summaries ----------

    // server/controllers/adminPosts.controller.js: "Title" (#10): pending → approved (reason)
    [
      new RegExp(`^"(.+)" \\(#(\\d+)\\): (${STATUS_RE}) → (${STATUS_RE})(?: \\((.+?)\\)?)?$`),
      (m, t) => `${quoted(m[1], t)} (n° ${m[2]}) : ${STATUS[m[3]]} → ${STATUS[m[4]]}${m[5] ? ` (${t(m[5])})` : ""}`,
    ],
    [/^Created listing "(.+)" \(#(\d+)\) for user #(\w+)$/, (m, t) => `A créé l'annonce ${quoted(m[1], t)} (n° ${m[2]}) pour l'utilisateur n° ${m[3]}`],
    [/^Deleted listing "(.+)" \(#(\d+)\) of user #(\w+)$/, (m, t) => `A supprimé l'annonce ${quoted(m[1], t)} (n° ${m[2]}) de l'utilisateur n° ${m[3]}`],
    [/^Edited "(.+)" \(#(\d+)\): (.+)$/, (m, t) => `A modifié ${quoted(m[1], t)} (n° ${m[2]}) : ${fieldList(m[3], t)}`],

    // server/controllers/adminApplications.controller.js, adminUsers.controller.js:
    // "Agency name: submitted → under_review", "username: client → admin"
    [new RegExp(`^(.+): (${STATUS_RE}) → (${STATUS_RE})$`), (m, t) => `${t(m[1])} : ${STATUS[m[2]]} → ${STATUS[m[3]]}`],
    [/^(Checked|Unchecked) "(.+)"$/, (m, t) => `${m[1] === "Checked" ? "A coché" : "A décoché"} ${quoted(m[2], t)}`],
    [/^Edited application (.+?): (.+)$/, (m, t) => `A modifié la candidature ${num(m[1])} : ${fieldList(m[2], t)}`],
    [
      /^Uploaded (\d+) document\(s\) \((.+)\) to application (.+)$/,
      (m, t) => `A ajouté ${m[1]} document${plural(m[1])} (${t(m[2])}) à la candidature ${num(m[3])}`,
    ],

    // server/controllers/adminPlatform.controller.js
    [
      /^Report #(\d+) (open|resolved|dismissed)(?:: (.+))?$/,
      (m, t) => `Signalement n° ${m[1]} ${REPORT_STATUS[m[2]]}${m[3] ? ` : ${t(m[3])}` : ""}`,
    ],
    [/^Changed settings: (.+)$/, (m, t) => `A modifié les paramètres : ${fieldList(m[1], t)}`],
    [/^Opened (.+\.(?:pdf|jpe?g|png))$/i, "A ouvert $1"],
    [/^[Dd]eleted document (.+)$/, (m) => verb(m, `a supprimé le document ${m[1]}`)],

    // server/controllers/adminUsers.controller.js
    [/^Created (client|agent|agency|admin) account (.+)$/, (m) => `A créé le compte ${ACCOUNT_KIND[m[1]]} ${m[2]}`],
    [
      /^(.+) is now (active|suspended|deactivated)(?:: (.+))?$/,
      (m, t) => `Le compte ${de(m[1])} est désormais ${ACCOUNT_STATUS[m[2]]}${m[3] ? ` : ${t(m[3])}` : ""}`,
    ],
    [/^Set a new password for (.+)$/, "A défini un nouveau mot de passe pour $1"],
    [
      /^Created a password reset link for (.+?)( \(emailed\))?$/,
      (m) => `A créé un lien de réinitialisation du mot de passe pour ${m[1]}${m[2] ? " (envoyé par e-mail)" : ""}`,
    ],
    [
      /^Deleted (.+) \((\S+@\S+)\) and (\d+) listing\(s\)$/,
      (m) => `A supprimé le compte ${m[1]} (${m[2]}) ainsi que ${m[3]} annonce${plural(m[3])}`,
    ],

    // server/controllers/application.controller.js
    [/^(.+) turned their personal account into an agency account$/, "$1 a transformé son compte personnel en compte agence"],

    // server/controllers/adminAgencies.controller.js
    // (summaries on an agency also appear in the agency's own feed, where the first letter is lower-cased)
    [
      /^[Cc]reated agency (.+) owned by (.+)$/,
      (m) => `${verb(m, "a créé l'agence")} ${m[1]}, propriétaire : ${m[2]}`,
    ],
    [
      /^[Aa]dded (.+) to (.+) as (manager|agent)$/,
      (m) => `${verb(m, `a ajouté ${m[1]}`)} à ${m[2]} ${asRole(m[3])}`,
    ],
    [
      /^[Bb]ayti (reactivated|deactivated) (.+)$/,
      (m) => `${afterName(m) ? "a" : "Bayti a"} ${m[1] === "reactivated" ? "réactivé" : "désactivé"} l'accès ${de(m[2])}`,
    ],
    [/^[Tt]ransferred (.+) to (.+)$/, (m) => `${verb(m, `a transféré ${m[1]}`)} à ${m[2]}`],
    [/^(.+) is now (owner|manager|agent)$/, (m) => `${m[1]} est désormais ${ROLE[m[2]]}`],
    [
      /^[Bb]ayti removed (.+?) from the agency(?:; (\d+) listing\(s\) reassigned)?(?:; (\d+) listing\(s\) left unassigned)?$/,
      (m) => `${afterName(m) ? "a" : "Bayti a"} retiré ${m[1]} de l'agence${handover(null, null, m[2], m[3])}`,
    ],
    [
      /^[Uu]ploaded (\d+) document\(s\) to (.+)$/,
      (m) =>
        verb(m, `a ajouté ${m[1]} document${plural(m[1])} au dossier ${de(m[2])}`),
    ],

    // server/controllers/agencyTeam.controller.js
    [/^[Ii]nvited (.+) as (manager|agent)$/, (m) => `${verb(m, `a invité ${m[1]}`)} ${asRole(m[2])}`],
    [
      /^[Cc]reated an account for (.+) as (manager|agent)$/,
      (m) => `${verb(m, "a créé un compte")} pour ${m[1]} ${asRole(m[2])}`,
    ],
    [
      new RegExp(`^[Uu]pdated (?!on |at |by |the |just |today|yesterday|\\d)(.+?)(?:: ((?:${MEMBER_CHANGE_RE})(?:, (?:${MEMBER_CHANGE_RE}))*))?$`),
      (m) =>
        `${verb(m, `a mis à jour ${m[1]}`)}${
          m[2]
            ? ` : ${m[2]
                .split(", ")
                .map((c) => MEMBER_CHANGE[c])
                .join(", ")}`
            : ""
        }`,
    ],
    [
      /^(.+?) left the agency(?:; (\d+) listing\(s\) moved to (.+?))?(?:; (\d+) listing\(s\) left unassigned)?$/,
      (m) => `${m[1]} a quitté l'agence${handover(m[2], m[3], null, m[4])}`,
    ],
    [
      /^[Rr]emoved (?!from |the |a |an )(.+?)(?:; (\d+) listing\(s\) moved to (.+?))?(?:; (\d+) listing\(s\) left unassigned)?$/,
      (m) => `${verb(m, `a retiré ${m[1]}`)} de l'équipe${handover(m[2], m[3], null, m[4])}`,
    ],

    // server/routes/invitation.route.js
    [
      /^(.+) accepted the invitation and joined as (owner|manager|agent)$/,
      (m) => `${m[1]} a accepté l'invitation et rejoint l'équipe ${asRole(m[2])}`,
    ],
    // "<username> joined <agency>" (not the apps' "… joined the team." / "· joined Bayti …")
    [/^(?!.* · )([^·]+) joined (?!the team\b|Bayti\b)(.*[^.])$/, "$1 a rejoint $2"],

    // server/controllers/agency.controller.js
    [
      new RegExp(`^[Cc]hanged ((?:${LEGAL_FIELD_RE})(?:, (?:${LEGAL_FIELD_RE}))*)$`),
      (m, t) => `${verb(m, "a modifié les informations légales")} : ${fieldList(m[1], t)}`,
    ],

    // server/controllers/agencyInsights.controller.js
    [
      /^[Mm]arked the inquiry about “(.+)” (open|scheduled|closed|declined|cancelled)$/,
      (m, t) =>
        `${verb(m, "a marqué la demande concernant")} ${quoted(m[1], t)} comme ${INQUIRY_STATUS[m[2]]}`,
    ],
    [
      /^[Aa]ssigned the inquiry about “(.+)” to (.+)$/,
      (m, t) => `${verb(m, "a attribué la demande")} concernant ${quoted(m[1], t)} à ${m[2]}`,
    ],
    [
      /^[Uu]nassigned the inquiry about “(.+)”$/,
      (m, t) =>
        `${verb(m, "a retiré l'agent de la demande concernant")} ${quoted(m[1], t)}`,
    ],
    [/^Bayti published “(.+)”$/, "Bayti a publié « $1 »"],
    [/^Bayti rejected “(.+)”$/, "Bayti a refusé « $1 »"],
    [/^Bayti took down “(.+)”$/, "Bayti a retiré « $1 »"],

    // server/controllers/agencyListings.controller.js
    [/^[Cc]reated “(.+)”$/, (m, t) => `${verb(m, "a créé")} ${quoted(m[1], t)}`],
    [/^[Ee]dited “(.+)”$/, (m, t) => `${verb(m, "a modifié")} ${quoted(m[1], t)}`],
    [/^[Pp]ut back online “(.+)”$/, (m, t) => `${verb(m, "a remis en ligne")} ${quoted(m[1], t)}`],
    [/^[Tt]ook offline “(.+)”$/, (m, t) => `${verb(m, "a mis hors ligne")} ${quoted(m[1], t)}`],
    [/^[Aa]rchived “(.+)”$/, (m, t) => `${verb(m, "a archivé")} ${quoted(m[1], t)}`],
    [/^[Rr]estored “(.+)”$/, (m, t) => `${verb(m, "a restauré")} ${quoted(m[1], t)}`],
    [/^[Dd]eleted “(.+)”$/, (m, t) => `${verb(m, "a supprimé")} ${quoted(m[1], t)}`],
    [/^[Aa]ssigned “(.+)” to (.+)$/, (m, t) => `${verb(m, "a attribué")} ${quoted(m[1], t)} à ${m[2]}`],
    [/^[Uu]nassigned “(.+)”$/, (m, t) => `${verb(m, "a retiré l'agent de")} ${quoted(m[1], t)}`],

    // server/controllers/adminAgencies.controller.js, adminUsers.controller.js:
    // "Edited <agency or username>: field, field"
    [
      /^[Ee]dited ([^:“"]+): ([A-Za-z]+(?:, [A-Za-z]+)*)$/,
      (m, t) => `${verb(m, `a modifié ${m[1]}`)} : ${fieldList(m[2], t)}`,
    ],

    // server/controllers/adminAgencies.controller.js: "<agency> suspended: reason", "<agency> verified"…
    // An agency name that lost its capital comes from the agency feed and follows the actor's name.
    [
      /^(.+) verification revoked: (.+)$/,
      (m, t) => `${verb(m, `a révoqué la vérification ${de(cap(m[1]))}`)} : ${t(m[2])}`,
    ],
    // The look-ahead keeps ordinary sentences out ("Not verified", "Your agency is verified").
    [
      new RegExp(`^${AGENCY_NAME} suspended: (.+)$`),
      (m, t) => `${verb(m, `a suspendu ${cap(m[1])}`)} : ${t(m[2])}`,
    ],
    [new RegExp(`^${AGENCY_NAME} reactivated$`), (m) => verb(m, `a réactivé ${cap(m[1])}`)],
    [new RegExp(`^${AGENCY_NAME} verified$`), (m) => verb(m, `a vérifié ${cap(m[1])}`)],
  ],
};
