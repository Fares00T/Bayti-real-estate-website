// French for the marketplace shared components (client/src/components, client/src/context,
// shared/format.js). Keys are the English text exactly as it reaches the page.

// Translate a captured value through the dictionaries, falling back to the value itself
const tr = (t, s) => {
  const r = typeof t === "function" ? t(s) : s;
  return typeof r === "string" && r ? r : s;
};
const s = (n) => (Number(n) > 1 ? "s" : "");

// timeago.js units (Chat.jsx)
const AGO_UNITS = { second: "seconde", minute: "minute", hour: "heure", day: "jour", week: "semaine", month: "mois", year: "an" };
const agoUnit = (n, unit) => (unit === "month" ? "mois" : `${AGO_UNITS[unit]}${s(n)}`);

// toLocaleDateString("en-US", { weekday: "short", month: "short", ... }) in UserTourRequests.jsx
const DAYS = { Mon: "lun.", Tue: "mar.", Wed: "mer.", Thu: "jeu.", Fri: "ven.", Sat: "sam.", Sun: "dim." };
const MONTHS = { Jan: "janv.", Feb: "févr.", Mar: "mars", Apr: "avr.", May: "mai", Jun: "juin", Jul: "juil.", Aug: "août", Sep: "sept.", Oct: "oct.", Nov: "nov.", Dec: "déc." };

// "Apartment · 3 bedrooms · 2 baths" (Card.jsx): each part on its own
const PROPERTY_TYPE = "(?:Office|Retail|Hospitality|Industrial|Apartment|Individual house|Traditional house|Other residential)";
const CARD_SPEC = `(?:${PROPERTY_TYPE}|\\d+ bedrooms?|\\d+ baths?)`;
const cardSpec = (part, t) => {
  let m = part.match(/^(\d+) bedrooms?$/);
  if (m) return `${m[1]} chambre${s(m[1])}`;
  m = part.match(/^(\d+) baths?$/);
  if (m) return `${m[1]} salle${s(m[1])} de bain`;
  return tr(t, part);
};

// Wilaya names of client/public/wilaya.json whose usual French spelling differs
const WILAYA = "(?:Algiers|Bechar|Tebessa|Beni Abbes)";

export default {
  strings: {
    // client/public/wilaya.json + components/lib/cities.js (POPULAR_CITIES)
    "Algiers": "Alger",
    "Bechar": "Béchar",
    "Tebessa": "Tébessa",
    "Beni Abbes": "Béni Abbès",

    // components/lib/cities.js (PROPERTY_TYPES)
    "Apartment": "Appartement",
    "House or villa": "Maison ou villa",
    "Traditional house": "Maison traditionnelle",
    "Other residential": "Autre bien résidentiel",
    "Office": "Bureau",
    "Shop / retail": "Local commercial",
    "Hospitality": "Hôtellerie",
    "Industrial / warehouse": "Industriel / entrepôt",

    // shared/format.js (formatPropertyType prints the PropertyType enum)
    "Individual house": "Maison individuelle",
    "Retail": "Local commercial",
    "Industrial": "Industriel",

    // components/lib/loaders.js
    "Failed to load data": "Échec du chargement des données",

    // components/lib/mapKit.jsx + Leaflet controls
    "Zoom in": "Zoom avant",
    "Zoom out": "Zoom arrière",
    "contributors": "et ses contributeurs",
    "A JavaScript library for interactive maps": "Une bibliothèque JavaScript pour cartes interactives",
    "Close popup": "Fermer la fenêtre",
    "Marker": "Marqueur",

    // components/getloc/LocationPicker.jsx
    "Drag to adjust": "Faites glisser pour ajuster",

    // components/UploadWidget/UploadWidget.jsx
    "Upload photos": "Importer des photos",
    "Photo uploads aren't configured yet.": "L'envoi de photos n'est pas encore configuré.",
    "Couldn't load the photo uploader. Check your connection.": "Impossible de charger l'outil d'envoi de photos. Vérifiez votre connexion.",
    "Couldn't start the photo uploader.": "Impossible de lancer l'outil d'envoi de photos.",
    "Upload failed. Please try again.": "L'envoi a échoué. Veuillez réessayer.",
    "Uploads unavailable": "Envoi de photos indisponible",
    "Loading uploader…": "Chargement de l'outil d'envoi…",

    // components/agencyInvitations/AgencyInvitations.jsx
    "Couldn't answer the invitation.": "Impossible de répondre à l'invitation.",
    "Agency invitations": "Invitations d'agence",
    "You joined": "Vous avez rejoint",
    ". Your account now works on the agency platform only, so you’re being signed out here.": ". Votre compte fonctionne désormais uniquement sur la plateforme agence, vous allez donc être déconnecté ici.",
    "Continue to the agency sign-in": "Continuer vers la connexion agence",
    "invited you to join its team": "vous invite à rejoindre son équipe",
    "As": "En tant",
    "a manager": "que responsable",
    "an agent": "qu'agent",
    ". Once you accept, this account signs in on the agency platform only, and no longer on the marketplace.": ". Une fois l'invitation acceptée, ce compte se connecte uniquement sur la plateforme agence, et plus sur la marketplace.",
    "Accept": "Accepter",
    "Decline": "Refuser",

    // components/agencyTeam/AgencyTeam.jsx
    "Owner": "Propriétaire",
    "Manager": "Responsable",
    "In review": "En cours d'examen",
    "Live": "En ligne",
    "Needs changes": "À modifier",
    "Offline": "Hors ligne",
    "Archived": "Archivée",
    "We couldn't load your agency.": "Impossible de charger votre agence.",
    "Added to your team. They've been notified.": "Ajouté à votre équipe. La personne a été notifiée.",
    "Couldn't add them.": "Impossible d'ajouter cette personne.",
    "Couldn't change the role.": "Impossible de modifier le rôle.",
    "Couldn't remove them.": "Impossible de retirer cette personne.",
    "Verified agency": "Agence vérifiée",
    "This agency is suspended, so its listings are hidden. Contact Bayti support.": "Cette agence est suspendue, ses annonces sont donc masquées. Contactez le support Bayti.",
    "Team": "Équipe",
    "you": "vous",
    "Leave the agency": "Quitter l'agence",
    "Leave": "Quitter",
    "Remove": "Retirer",
    "Add an agent": "Ajouter un agent",
    "They need a Bayti account first. Their existing listings move under the agency.": "La personne doit d'abord avoir un compte Bayti. Ses annonces existantes sont rattachées à l'agence.",
    "Their account email": "E-mail de son compte",
    "Role": "Rôle",
    "Add": "Ajouter",
    "Team listings": "Annonces de l'équipe",
    "No listings yet.": "Aucune annonce pour le moment.",
    "by": "par",

    // components/card/Card.jsx
    "Pending review": "En attente d'examen",
    "Rejected": "Refusée",
    "Sold": "Vendu",
    "Rented": "Loué",
    "Under offer": "Sous offre",
    "No photo yet": "Pas encore de photo",
    "Remove from saved": "Retirer des annonces enregistrées",
    "Save listing": "Enregistrer l'annonce",
    "For rent": "À louer",
    "For sale": "À vendre",
    "month": "/ mois",
    "Delete": "Supprimer",

    // components/chat/Chat.jsx (relative times come from timeago.js, see patterns)
    "just now": "à l'instant",
    "right now": "à l'instant",
    "Deleted user": "Utilisateur supprimé",
    "Agency": "Agence",
    "Couldn't open this conversation.": "Impossible d'ouvrir cette conversation.",
    "Couldn't open the conversation.": "Impossible d'ouvrir la conversation.",
    "Message not sent. Try again.": "Message non envoyé. Réessayez.",
    "Back": "Retour",
    "Close conversation": "Fermer la conversation",
    "Say hello to": "Dites bonjour à",
    ". Ask about the listing, a visit, or the price.": ". Posez vos questions sur l'annonce, une visite ou le prix.",
    "Write a message": "Écrivez un message",
    "Send message": "Envoyer le message",
    "This user is no longer on Bayti.": "Cet utilisateur n'est plus sur Bayti.",
    "Loading conversation…": "Chargement de la conversation…",
    "No messages yet": "Aucun message pour le moment",
    "When you contact an owner or agency, your conversation will appear here.": "Lorsque vous contactez un propriétaire ou une agence, votre conversation apparaît ici.",
    "You": "Vous",
    "Select a conversation to read it.": "Sélectionnez une conversation pour la lire.",

    // components/filter/Filter.jsx
    "Other": "Autre",
    "Hospitality / Leisure": "Hôtellerie / Loisirs",
    "Homes": "Logements",
    "Commercial property": "Biens commerciaux",
    "Properties": "Biens",
    "for sale": "à vendre",
    "for rent": "à louer",
    "across Algeria": "partout en Algérie",
    "Listing type": "Type d'annonce",
    "All": "Tout",
    "Buy": "Acheter",
    "Rent": "Louer",
    "City": "Wilaya",
    "Any city": "Toutes les wilayas",
    "Filters": "Filtres",
    "Clear all": "Tout effacer",
    "Close": "Fermer",
    "Location": "Localisation",
    "District": "Commune",
    "Any district": "Toutes les communes",
    "Price range": "Fourchette de prix",
    "No min": "Pas de min.",
    "No max": "Pas de max.",
    "Property type": "Type de bien",
    "Any": "Indifférent",
    "Residential": "Résidentiel",
    "Bedrooms": "Chambres",
    "Show results": "Afficher les résultats",

    // components/footer/Footer.jsx
    "Find a property": "Trouver un bien",
    "Homes for sale": "Logements à vendre",
    "Homes for rent": "Logements à louer",
    "Find an agency": "Trouver une agence",
    "List a property": "Publier un bien",
    "Sell or rent out": "Vendre ou mettre en location",
    "Register your agency": "Inscrire votre agence",
    "Bayti for agencies": "Bayti pour les agences",
    "Agency sign-in": "Connexion agence",
    "About us": "À propos",
    "Help center": "Centre d'aide",
    "Report a problem": "Signaler un problème",
    "Bayti home": "Accueil Bayti",
    "Homes and commercial property to buy and rent across Algeria, from owners and agencies.": "Logements et biens commerciaux à acheter et à louer partout en Algérie, proposés par des propriétaires et des agences.",
    "Popular wilayas": "Wilayas populaires",
    "Terms of use": "Conditions d'utilisation",
    "Privacy": "Confidentialité",
    "Prices in DZD": "Prix en DZD",

    // components/heroSearch/HeroSearch.jsx
    "Search properties": "Rechercher des biens",
    "I want to": "Je souhaite",
    "All of Algeria": "Toute l'Algérie",
    "Any type": "Tous les types",
    "Monthly budget": "Budget mensuel",
    "No limit": "Sans limite",
    "Up to": "Jusqu'à",
    "Search": "Rechercher",

    // components/listingLimit/ListingLimit.jsx
    "of": "sur",
    "active listings": "annonces actives",
    "you can publish": "vous pouvez en publier",
    "more": "de plus",
    "Active listings": "Annonces actives",
    "You’ve reached your limit of": "Vous avez atteint votre limite de",
    "active properties.": "biens actifs.",
    "To publish more properties, register your real estate agency with Bayti. You can also archive one of your listings to free a place.": "Pour publier davantage de biens, inscrivez votre agence immobilière sur Bayti. Vous pouvez aussi archiver l'une de vos annonces pour libérer une place.",
    "Become an agency": "Devenir une agence",
    "Manage my properties": "Gérer mes biens",

    // components/listingsMap/ListingsMap.jsx
    "Wilayas with listings on Bayti": "Wilayas avec des annonces sur Bayti",
    "listing": "annonce",
    "listings": "annonces",
    ", tap to see them": ", touchez pour les voir",
    "live": "en ligne",
    "in": "dans",
    ". Pick one on the map.": ". Choisissez-en une sur la carte.",
    "Listings appear here as soon as they're published.": "Les annonces apparaissent ici dès leur publication.",

    // components/navbar/Navbar.jsx
    "Sell / Rent out": "Vendre / Mettre en location",
    "Agencies": "Agences",
    "My properties": "Mes biens",
    "Main": "Navigation principale",
    "Favorites": "Favoris",
    "Publish property": "Publier un bien",
    "Account menu": "Menu du compte",
    "active": "actifs",
    "Profile": "Profil",
    "Register an agency": "Inscrire une agence",
    "Help": "Aide",
    "Log out": "Se déconnecter",
    "dashboard": "– tableau de bord",
    "List your agency": "Inscrire votre agence",
    "Log in": "Se connecter",
    "Register": "S'inscrire",
    "Open menu": "Ouvrir le menu",
    "Close menu": "Fermer le menu",
    "Home": "Accueil",
    "Open": "Ouvrir",
    "Real estate agency? Register here": "Agence immobilière ? Inscrivez-vous ici",

    // components/pin/Pin.jsx
    "bath": "sdb",

    // components/searchBar/SearchBar.jsx
    "Looking to": "Je souhaite",
    "Search destinations": "Rechercher une destination",
    "Pick a wilaya first": "Choisissez d'abord une wilaya",
    "Minimum price": "Prix minimum",
    "Maximum price": "Prix maximum",

    // components/slider/Slider.jsx
    "No photos for this listing": "Aucune photo pour cette annonce",
    "Photo viewer": "Visionneuse de photos",
    "Previous photo": "Photo précédente",
    "Next photo": "Photo suivante",
    "Show all": "Afficher les",

    // components/tourRequestModal/TourRequestModal.jsx
    "Please fill in all required fields.": "Veuillez remplir tous les champs obligatoires.",
    "Please enter a valid phone number.": "Veuillez saisir un numéro de téléphone valide.",
    "Failed to send tour request. Please try again.": "Échec de l'envoi de la demande de visite. Veuillez réessayer.",
    "Request a tour": "Demander une visite",
    "Time": "Heure",
    "Select a time": "Choisir une heure",
    "Phone number": "Numéro de téléphone",
    "optional": "facultatif",
    "Anything the agency should know before your visit?": "Une précision à donner à l'agence avant votre visite ?",
    "The agency will confirm or suggest another time.": "L'agence confirmera ou proposera un autre horaire.",
    "Cancel": "Annuler",
    "Sending…": "Envoi…",
    "Send request": "Envoyer la demande",

    // components/userTourRequests/UserTourRequests.jsx
    "Awaiting reply": "En attente de réponse",
    "Visit confirmed": "Visite confirmée",
    "Declined": "Refusée",
    "Closed": "Clôturée",
    "Cancelled": "Annulée",
    "Requested time": "Horaire demandé",
    "We couldn't load your inquiries.": "Impossible de charger vos demandes.",
    "Couldn't update the inquiry.": "Impossible de mettre à jour la demande.",
    "Loading inquiries": "Chargement des demandes",
    "No photo": "Pas de photo",
    "Visit": "Visite",
    "with": "avec",
    "the owner": "le propriétaire",
    "This listing has been removed.": "Cette annonce a été supprimée.",
    "Reason": "Motif",
    "Add to calendar": "Ajouter au calendrier",
    "Tell them why (optional)": "Indiquez la raison (facultatif)",
    "Visit request": "Demande de visite",
    "from": "de",
    "a former member": "la part d'un ancien membre",
    "Phone": "Téléphone",
    "Confirm visit": "Confirmer la visite",
    "Mark done": "Marquer comme traitée",
    "Reply": "Répondre",
    "Inquiries": "Demandes",
    "About your properties": "Concernant vos biens",
    "No inquiries yet": "Aucune demande pour le moment",
    "Message an owner or request a visit from any listing page, and follow it here.": "Écrivez à un propriétaire ou demandez une visite depuis la page d'une annonce, puis suivez votre demande ici.",
    "Start searching": "Commencer la recherche",
    "In progress": "En cours",
    "Closed and cancelled": "Clôturées et annulées",
    "Earlier, about your properties": "Plus anciennes, concernant vos biens",

    // components/wrongPlatform/WrongPlatform.jsx
    "This isn't the agency platform": "Vous n'êtes pas sur la plateforme agence",
    "This isn't the staff platform": "Vous n'êtes pas sur la plateforme de l'équipe Bayti",
    "Go to the": "Continuer vers",
    "agency sign-in": "la page de connexion des agences",
    "admin dashboard": "le tableau de bord d'administration",
    "Taking you there in": "Redirection dans",
    "Use a different account": "Utiliser un autre compte",
  },

  patterns: [
    // timeago.js en_US (components/chat/Chat.jsx): "5 minutes ago", "1 hour ago", "in 3 days"
    [/^(\d+) (second|minute|hour|day|week|month|year)s? ago$/, (m) => `il y a ${m[1]} ${agoUnit(m[1], m[2])}`],
    [/^in (\d+) (second|minute|hour|day|week|month|year)s?$/, (m) => `dans ${m[1]} ${agoUnit(m[1], m[2])}`],

    // shared/format.js (formatPrice): "18 500 000 DZD / month"
    [/^([\d\s.,]+) DZD \/ month$/, "$1 DZD / mois"],

    // components/userTourRequests/UserTourRequests.jsx (formatDate): "Tue, Nov 10, 2026"
    [
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2}), (\d{4})$/,
      (m) => `${DAYS[m[1]]} ${m[3]} ${MONTHS[m[2]]} ${m[4]}`,
    ],
    // formatTime in UserTourRequests.jsx and the time slots of TourRequestModal.jsx: "2:00 PM" -> "14:00"
    [
      /^(\d{1,2}):(\d{2}) (AM|PM)$/,
      (m) => `${String((Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0)).padStart(2, "0")}:${m[2]}`,
    ],

    // components/card/Card.jsx: "Apartment · 3 bedrooms · 2 baths", then each spec alone
    [new RegExp(`^${CARD_SPEC}(?: · ${CARD_SPEC})+$`), (m, t) => m[0].split(" · ").map((part) => cardSpec(part, t)).join(" · ")],
    [/^(\d+) bedrooms?$/, (m) => `${m[1]} chambre${s(m[1])}`],
    [/^(\d+) baths?$/, (m) => `${m[1]} salle${s(m[1])} de bain`],

    // components/pin/Pin.jsx: "3 bed · " (followed by "2", " bath")
    [/^(\d+) bed( ·)?$/, (m) => `${m[1]} ch.${m[2] || ""}`],

    // components/navbar/Navbar.jsx: "2 of 3 active properties"
    [/^(\d+) of (\d+) active properties$/, (m) => `${m[1]} bien${s(m[1])} actif${s(m[1])} sur ${m[2]}`],
    // components/navbar/Navbar.jsx + components/chat/Chat.jsx: "4 unread"
    [/^(\d+) unread$/, (m) => `${m[1]} non lu${s(m[1])}`],

    // components/chat/Chat.jsx: About “listing title”
    [/^About “(.+)”$/, "À propos de « $1 »"],

    // components/agencyInvitations/AgencyInvitations.jsx: ", invited by karim"
    [/^(, )?invited by (.+)$/, (m) => `${m[1] || ""}sur invitation de ${m[2]}`],

    // components/agencyTeam/AgencyTeam.jsx
    [/^Remove (.+) from the team\? They keep their account and listings\.$/, "Retirer $1 de l'équipe ? Cette personne conserve son compte et ses annonces."],
    [/^Leave (.+)\?$/, "Quitter $1 ?"],
    [/^(.+) was removed\.$/, "$1 a été retiré de l'équipe."],
    [/^Role of (.+)$/, "Rôle de $1"],
    [/^Remove (?!photo \d+$)(.+)$/, "Retirer $1"],

    // components/listingsMap/ListingsMap.jsx: "Algiers: 12 listings"
    [/^(.+): (\d+) listings?$/, (m, t) => `${tr(t, m[1])} : ${m[2]} annonce${s(m[2])}`],
    // components/agencyTeam/AgencyTeam.jsx: " · 3 listings"
    [/^(\d+) listings?$/, (m) => `${m[1]} annonce${s(m[1])}`],

    // components/filter/Filter.jsx: "in Algiers", "in HUSSEIN DEY, Algiers"
    [/^in (\p{Lu}.*)$/u, (m, t) => `à ${m[1].split(", ").map((part) => tr(t, part)).join(", ")}`],

    // components/heroSearch/HeroSearch.jsx, if an <option> is rendered as one text node
    [/^Up to (.+)$/, "Jusqu'à $1"],
    [new RegExp(`^(\\d{2}) (${WILAYA})$`), (m, t) => `${m[1]} ${tr(t, m[2])}`],

    // "district, wilaya" and "street, district, wilaya" (Card.jsx, shared/format.js formatAddress)
    [new RegExp(`^(.+), (${WILAYA})$`), (m, t) => `${tr(t, m[1])}, ${tr(t, m[2])}`],
  ],
};
