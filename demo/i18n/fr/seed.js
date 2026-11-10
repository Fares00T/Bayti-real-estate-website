// French for the demo data of server/seed.js. Keys are the English text exactly as
// the seed stores it. `node scripts/i18n-check.mjs --seed` lists seed text missing here.

// Seed fields that hold free text
export const FIELDS = [
  "User.statusReason",
  "Agency.about",
  "Agency.verificationNote",
  "Agency.statusReason",
  "Post.title",
  "Post.reviewNote",
  "PostDetail.desc",
  "Chat.lastMessage",
  "Message.text",
  "Inquiry.declineReason",
  "AgencyApplication.repNationality",
  "AgencyApplication.qualification",
  "AgencyApplication.message",
  "AgencyApplication.decisionNote",
  "AgencyApplication.requestMessage",
  "ApplicationEvent.message",
  "ApplicationNote.body",
  "Notification.title",
  "Notification.body",
  "AuditLog.summary",
  "Report.reason",
  "Report.resolution"
];

// Translated in the API responses, and back to English in what the apps send
export const content = {
  // User.statusReason
  "Several reports of a fake listing using stolen photos and asking for a deposit before visits. Suspended after review.":
    "Plusieurs signalements d'une fausse annonce utilisant des photos volées et réclamant un acompte avant les visites. Suspendu après examen.",
  // Agency.about
  "Immo El Djazair has helped families and businesses buy, sell and rent in Algiers since 2018. Our team of five covers Hydra, El Mouradia, Dely Ibrahim and the eastern coast, and every property we list has been visited and checked by one of our agents.\n\nWe handle the whole process: valuation, photos, visits, negotiation and the notary file.":
    "Immo El Djazair accompagne depuis 2018 les familles et les entreprises dans l'achat, la vente et la location à Alger. Notre équipe de cinq personnes couvre Hydra, El Mouradia, Dely Ibrahim et la côte est, et chaque bien que nous proposons a été visité et vérifié par l'un de nos agents.\n\nNous prenons en charge tout le processus : estimation, photos, visites, négociation et dossier chez le notaire.",
  "Oran Prestige Immobilier specialises in seafront apartments, prime offices and hospitality assets across the wilaya of Oran, from the Front de Mer to Aïn El Turck and Arzew.":
    "Oran Prestige Immobilier est spécialisée dans les appartements en front de mer, les bureaux de standing et les biens hôteliers dans toute la wilaya d'Oran, du Front de Mer à Aïn El Turck et Arzew.",
  "New-build apartments in Ali Mendjeli, family rentals in the city centre and warehouses in the El Khroub industrial zone.":
    "Appartements neufs à Ali Mendjeli, locations familiales au centre-ville et entrepôts dans la zone industrielle d'El Khroub.",
  "Holiday villas and shops along the Tipaza coast.":
    "Villas de vacances et locaux commerciaux sur la côte de Tipaza.",
  // Agency.verificationNote
  "The agrément renewal submitted by the agency could not be confirmed with the wilaya of Constantine. The badge will be restored once a valid, renewed agrément is on file.":
    "Le renouvellement d'agrément soumis par l'agence n'a pas pu être confirmé auprès de la wilaya de Constantine. Le badge sera rétabli dès qu'un agrément valide et renouvelé figurera au dossier.",
  // Agency.statusReason
  "Several clients reported deposits taken for visits of properties that were already rented. Suspended while we investigate with the agency's manager.":
    "Plusieurs clients ont signalé des acomptes encaissés pour des visites de biens déjà loués. Suspendue le temps de notre enquête avec le responsable de l'agence.",
  // Post.title
  "Bright F4 with sea view in Hydra":
    "F4 lumineux avec vue sur mer à Hydra",
  "Furnished F3 in El Mouradia":
    "F3 meublé à El Mouradia",
  "Contemporary villa with pool in Dely Ibrahim":
    "Villa contemporaine avec piscine à Dely Ibrahim",
  "Open-plan office floor in Bab Ezzouar business district":
    "Plateau de bureaux en open space dans le quartier d'affaires de Bab Ezzouar",
  "Seafront F3 in the Bou Ismail marina":
    "F3 en front de mer à la marina de Bou Ismail",
  "Street-level shop on a busy Birkhadem avenue":
    "Local commercial en rez-de-chaussée sur une avenue passante de Birkhadem",
  "Renovated F4 near Kouba metro":
    "F4 rénové près du métro de Kouba",
  "F2 in Bab El Oued near the seafront":
    "F2 à Bab El Oued près du front de mer",
  "Traditional Casbah house (dar) to restore":
    "Maison traditionnelle (dar) à restaurer à la Casbah",
  "Studio close to the beach in Aïn Benian":
    "Studio proche de la plage à Aïn Benian",
  "Family villa with garden in Bordj El Kiffan":
    "Villa familiale avec jardin à Bordj El Kiffan",
  "F3 in Mohammadia facing the Grand Mosque":
    "F3 à Mohammadia face à la Grande Mosquée",
  "Duplex penthouse with roof terrace in Aïn Taya":
    "Duplex au dernier étage avec toit-terrasse à Aïn Taya",
  "Front de Mer F4 with panoramic bay view":
    "F4 sur le Front de Mer avec vue panoramique sur la baie",
  "F3 rental in Aïn El Turck, 200 m from the beach":
    "F3 à louer à Aïn El Turck, à 200 m de la plage",
  "18-room boutique hotel in Arzew":
    "Hôtel de charme de 18 chambres à Arzew",
  "Fitted offices on Boulevard de la Soummam":
    "Bureaux aménagés sur le boulevard de la Soummam",
  "Single-storey house with courtyard in Es Senia":
    "Maison de plain-pied avec cour à Es Senia",
  "New F4 in Ali Mendjeli, Unit 8":
    "F4 neuf à Ali Mendjeli, UV 8",
  "F3 with a view of the Sidi M'Cid bridge":
    "F3 avec vue sur le pont de Sidi M'Cid",
  "Warehouse with loading docks in El Khroub":
    "Entrepôt avec quais de chargement à El Khroub",
  "Villa near the Roman ruins of Tipaza":
    "Villa près des ruines romaines de Tipaza",
  "Corner shop in Koléa town centre":
    "Local commercial d'angle au centre-ville de Koléa",
  "Quiet F3 in Blida with a view of Chréa":
    "F3 calme à Blida avec vue sur Chréa",
  "Sunny F4 overlooking the Gulf of Béjaïa":
    "F4 ensoleillé avec vue sur le golfe de Béjaïa",
  "Furnished F2 in Hussein Dey near the tramway":
    "F2 meublé à Hussein Dey près du tramway",
  "Kabyle stone house with olive grove near Tizi Ouzou":
    "Maison kabyle en pierre avec oliveraie près de Tizi Ouzou",
  "F3 for sale in Sétif centre":
    "F3 à vendre au centre de Sétif",
  "F3 in Bab Ezzouar near USTHB":
    "F3 à Bab Ezzouar près de l'USTHB",
  "Seafront F3 rental on Saint-Cloud beach, Annaba":
    "F3 à louer en front de mer, plage Saint-Cloud, Annaba",
  "Renovated F3 in El Bouni":
    "F3 rénové à El Bouni",
  "Restored dar in Tlemcen's old medina":
    "Dar restauré dans la vieille médina de Tlemcen",
  "Shop on Maghnia's main commercial street":
    "Local commercial sur la principale rue commerçante de Maghnia",
  "Villa with orchard on the road to Lalla Setti":
    "Villa avec verger sur la route de Lalla Setti",
  "F4 near Aïn El Fouara in Sétif centre":
    "F4 près d'Aïn El Fouara au centre de Sétif",
  "Seaside studio in Tichy":
    "Studio en bord de mer à Tichy",
  "Storage warehouse with yard in Meftah":
    "Entrepôt de stockage avec cour à Meftah",
  "Family F4 in Koléa with garden view":
    "F4 familial à Koléa avec vue sur jardin",
  "F5 in Bouzareah, urgent sale":
    "F5 à Bouzareah, vente urgente",
  // Post.reviewNote
  "The photos show a different building from the address given, and the rent doesn't say whether the monthly charges are included. Please upload photos of this apartment and confirm the rent.":
    "Les photos montrent un immeuble différent de celui de l'adresse indiquée, et le loyer ne précise pas si les charges mensuelles sont comprises. Merci d'ajouter des photos de cet appartement et de confirmer le loyer.",
  "The listing has a single photo taken from the street and almost no description. Add at least three photos of the inside and describe the rooms, the floor and the condition, then send it back for review.":
    "L'annonce ne comporte qu'une seule photo prise depuis la rue et presque aucune description. Ajoutez au moins trois photos de l'intérieur et décrivez les pièces, l'étage et l'état du bien, puis renvoyez-la pour examen.",
  // PostDetail.desc
  "<p>A bright <strong>four-room apartment on the 6th floor</strong> of a secure residence in the heart of Hydra, with an open view over the bay of Algiers from the living room and the master bedroom.</p><p>The apartment was fully renovated in 2024: new electrics, double glazing throughout, Italian tiles and a fitted kitchen with a separate laundry area.</p><ul><li>3 bedrooms, including a master suite with its own bathroom</li><li>Private underground parking space and storage cellar</li><li>Lift, 24/7 caretaker and backup generator</li><li>Livret foncier ready, notary file can be opened immediately</li></ul>":
    "<p>Un lumineux <strong>appartement de quatre pièces au 6e étage</strong> d'une résidence sécurisée en plein cœur d'Hydra, avec une vue dégagée sur la baie d'Alger depuis le séjour et la chambre parentale.</p><p>L'appartement a été entièrement rénové en 2024 : électricité refaite à neuf, double vitrage partout, carrelage italien et cuisine équipée avec buanderie séparée.</p><ul><li>3 chambres, dont une suite parentale avec sa propre salle de bain</li><li>Place de parking privée en sous-sol et cave</li><li>Ascenseur, gardien 24h/24 et 7j/7, groupe électrogène</li><li>Livret foncier prêt, le dossier chez le notaire peut être ouvert immédiatement</li></ul>",
  "<p>Move straight in: this <strong>furnished F3 in El Mouradia</strong> is let with everything you need, from the bedding to the washing machine. It sits on a quiet tree-lined street, a few minutes' walk from the shops of Didouche Mourad.</p><ul><li>2 bedrooms and a bright double living room</li><li>Equipped kitchen, air conditioning in every room</li><li>Internet included in the rent</li><li>Ideal for professionals and expatriate families</li></ul><p>Minimum lease of one year, three months' deposit.</p>":
    "<p>Il ne vous reste qu'à poser vos valises : ce <strong>F3 meublé à El Mouradia</strong> est loué avec tout le nécessaire, de la literie à la machine à laver. Il se trouve dans une rue calme et arborée, à quelques minutes à pied des commerces de Didouche Mourad.</p><ul><li>2 chambres et un double séjour lumineux</li><li>Cuisine équipée, climatisation dans toutes les pièces</li><li>Internet compris dans le loyer</li><li>Idéal pour les cadres et les familles d'expatriés</li></ul><p>Bail d'un an minimum, caution de trois mois.</p>",
  "<p>An architect-designed <strong>contemporary villa</strong> on a 600 m² plot in one of Dely Ibrahim's most sought-after streets. Large glass bays open the living spaces onto a landscaped garden and a <strong>10 × 4 m swimming pool</strong>.</p><ul><li>5 bedrooms, 4 bathrooms, separate guest suite on the ground floor</li><li>Double living room with fireplace, professional kitchen</li><li>Garage for three cars, staff quarters, solar water heating</li><li>Close to international schools and the Cheraga business district</li></ul><p>A rare property, shown by appointment only.</p>":
    "<p>Une <strong>villa contemporaine</strong> d'architecte sur un terrain de 600 m², dans l'une des rues les plus recherchées de Dely Ibrahim. De larges baies vitrées ouvrent les pièces de vie sur un jardin paysager et une <strong>piscine de 10 × 4 m</strong>.</p><ul><li>5 chambres, 4 salles de bain, suite d'invités indépendante au rez-de-chaussée</li><li>Double séjour avec cheminée, cuisine professionnelle</li><li>Garage pour trois voitures, logement du personnel, chauffe-eau solaire</li><li>À proximité des écoles internationales et du quartier d'affaires de Cheraga</li></ul><p>Un bien rare, visites uniquement sur rendez-vous.</p>",
  "<p>A 220 m² <strong>open-plan office floor</strong> in a modern tower of the Bab Ezzouar business district, facing the shopping centre and a short walk from the tramway.</p><ul><li>Raised floors and cable trays already in place</li><li>Two meeting rooms, kitchenette and separate toilets</li><li>Central air conditioning, fibre optic connection</li><li>Four reserved parking spaces in the basement</li></ul><p>Suits a regional head office, a start-up or a training centre. Commercial lease, three years renewable.</p>":
    "<p>Un <strong>plateau de bureaux en open space</strong> de 220 m² dans une tour moderne du quartier d'affaires de Bab Ezzouar, face au centre commercial et à quelques pas du tramway.</p><ul><li>Planchers techniques et chemins de câbles déjà en place</li><li>Deux salles de réunion, kitchenette et sanitaires séparés</li><li>Climatisation centralisée, connexion en fibre optique</li><li>Quatre places de parking réservées au sous-sol</li></ul><p>Convient à un siège régional, une start-up ou un centre de formation. Bail commercial de trois ans renouvelable.</p>",
  "<p>Wake up to the sea in this <strong>F3 inside the Bou Ismail marina residence</strong>, 40 minutes from Algiers. The apartment opens onto a 12 m² terrace looking straight over the port.</p><ul><li>2 bedrooms, bright living room, independent kitchen</li><li>Residence with a guarded gate, garden and children's play area</li><li>Beach, cafés and the fishing port within walking distance</li></ul><p>Perfect as a main home or as a holiday apartment that rents easily in summer.</p>":
    "<p>Réveillez-vous face à la mer dans ce <strong>F3 au sein de la résidence de la marina de Bou Ismail</strong>, à 40 minutes d'Alger. L'appartement s'ouvre sur une terrasse de 12 m² donnant directement sur le port.</p><ul><li>2 chambres, séjour lumineux, cuisine indépendante</li><li>Résidence avec portail gardé, jardin et aire de jeux pour enfants</li><li>Plage, cafés et port de pêche accessibles à pied</li></ul><p>Parfait comme résidence principale ou comme appartement de vacances facile à louer en été.</p>",
  "<p>A <strong>street-level shop with a 7-metre frontage</strong> on one of Birkhadem's busiest avenues, between a bakery and a pharmacy.</p><ul><li>85 m² sales area plus a 20 m² back store</li><li>Metal shutter, alarm and three-phase electricity</li><li>Heavy foot traffic all day, easy parking nearby</li></ul><p>Suitable for ready-to-wear, a phone shop, a pharmacy or a café (subject to permits).</p>":
    "<p>Un <strong>local commercial en rez-de-chaussée avec 7 mètres de façade</strong> sur l'une des avenues les plus passantes de Birkhadem, entre une boulangerie et une pharmacie.</p><ul><li>Surface de vente de 85 m² et arrière-boutique de 20 m²</li><li>Rideau métallique, alarme et électricité triphasée</li><li>Fort passage piéton toute la journée, stationnement facile à proximité</li></ul><p>Convient au prêt-à-porter, à la téléphonie, à une pharmacie ou à un café (sous réserve des autorisations).</p>",
  "<p>A <strong>renovated F4 on the 2nd floor</strong> of a well-kept building in Kouba, five minutes from the metro station and the Garidi market.</p><ul><li>3 bedrooms, living room with balcony</li><li>New kitchen and bathroom, PVC double glazing</li><li>Quiet street, close to schools and the university</li></ul>":
    "<p>Un <strong>F4 rénové au 2e étage</strong> d'un immeuble bien entretenu à Kouba, à cinq minutes de la station de métro et du marché de Garidi.</p><ul><li>3 chambres, séjour avec balcon</li><li>Cuisine et salle de bain neuves, double vitrage en PVC</li><li>Rue calme, à proximité des écoles et de l'université</li></ul>",
  "<p>A cosy F2 in Bab El Oued, a short walk from the seafront promenade and the Triolet market.</p><ul><li>One bedroom, living room, kitchen and bathroom</li><li>3rd floor without lift</li></ul>":
    "<p>Un F2 chaleureux à Bab El Oued, à quelques pas de la promenade du front de mer et du marché Triolet.</p><ul><li>Une chambre, séjour, cuisine et salle de bain</li><li>3e étage sans ascenseur</li></ul>",
  "<p>A genuine <strong>dar in the Casbah of Algiers</strong>, a UNESCO World Heritage site, built around its central patio with original columns and zellige tiles.</p><ul><li>Three levels with six rooms around the patio</li><li>Rooftop terrace with a view over the old town and the port</li><li>Structure sound, interior to restore</li></ul><p>For buyers who love heritage: restoration work in the Casbah follows the rules of the safeguarding plan.</p>":
    "<p>Un authentique <strong>dar à la Casbah d'Alger</strong>, site classé au patrimoine mondial de l'UNESCO, organisé autour de son patio central aux colonnes et zelliges d'origine.</p><ul><li>Trois niveaux et six pièces autour du patio</li><li>Terrasse sur le toit avec vue sur la vieille ville et le port</li><li>Structure saine, intérieur à restaurer</li></ul><p>Pour les amoureux du patrimoine : les travaux de restauration à la Casbah sont soumis aux règles du plan de sauvegarde.</p>",
  "<p>A practical studio close to the beach in Aïn Benian, ideal for a student or a young professional.</p><ul><li>Kitchenette, shower room, small balcony</li><li>Bus to the city centre at the foot of the building</li></ul>":
    "<p>Un studio fonctionnel proche de la plage à Aïn Benian, idéal pour un étudiant ou un jeune actif.</p><ul><li>Kitchenette, salle d'eau, petit balcon</li><li>Bus pour le centre-ville au pied de l'immeuble</li></ul>",
  "<p>A <strong>family villa with a 300 m² garden</strong> in a quiet residential area of Bordj El Kiffan, ten minutes from the beach and the airport road.</p><ul><li>4 bedrooms over two floors, two bathrooms</li><li>Large living room opening onto a covered terrace</li><li>Garage, borehole water and fruit trees</li></ul><p>An offer has been accepted; visits are still possible as a back-up.</p>":
    "<p>Une <strong>villa familiale avec un jardin de 300 m²</strong> dans un quartier résidentiel calme de Bordj El Kiffan, à dix minutes de la plage et de la route de l'aéroport.</p><ul><li>4 chambres sur deux niveaux, deux salles de bain</li><li>Grand séjour ouvrant sur une terrasse couverte</li><li>Garage, forage et arbres fruitiers</li></ul><p>Une offre a été acceptée, mais des visites restent possibles en cas de désistement.</p>",
  "<p>A well-kept F3 in Mohammadia facing the Grand Mosque of Algiers, in a recent residence with a lift and parking.</p><ul><li>2 bedrooms, living room with balcony</li><li>Close to the Ardis shopping centre and the tramway</li></ul>":
    "<p>Un F3 bien entretenu à Mohammadia, face à la Grande Mosquée d'Alger, dans une résidence récente avec ascenseur et parking.</p><ul><li>2 chambres, séjour avec balcon</li><li>À proximité du centre commercial Ardis et du tramway</li></ul>",
  "<p>A <strong>duplex penthouse</strong> on the top floors of a small residence in Aïn Taya, crowned by a 60 m² roof terrace with a view of the sea and the Bay of Algiers.</p><ul><li>Living room and kitchen on the lower level, 3 bedrooms upstairs</li><li>Two bathrooms, one with a walk-in shower</li><li>Outdoor kitchen and barbecue area on the terrace</li><li>Private parking space</li></ul>":
    "<p>Un <strong>duplex aux derniers étages</strong> d'une petite résidence à Aïn Taya, couronné d'un toit-terrasse de 60 m² avec vue sur la mer et la baie d'Alger.</p><ul><li>Séjour et cuisine au niveau inférieur, 3 chambres à l'étage</li><li>Deux salles de bain, dont une avec douche à l'italienne</li><li>Cuisine d'été et coin barbecue sur la terrasse</li><li>Place de parking privée</li></ul>",
  "<p>On the <strong>Front de Mer boulevard</strong>, this F4 offers one of the finest views in Oran: the whole bay, from the port to the Santa Cruz chapel.</p><ul><li>3 bedrooms, double living room with a wide balcony</li><li>Original high ceilings and parquet, renovated kitchen</li><li>Building with lift and caretaker, close to the Place du 1er Novembre</li></ul><p>Walk to the theatre, cafés and the business district.</p>":
    "<p>Sur le <strong>boulevard du Front de Mer</strong>, ce F4 offre l'une des plus belles vues d'Oran : toute la baie, du port à la chapelle de Santa Cruz.</p><ul><li>3 chambres, double séjour avec large balcon</li><li>Hauts plafonds et parquet d'origine, cuisine rénovée</li><li>Immeuble avec ascenseur et gardien, à proximité de la place du 1er Novembre</li></ul><p>Théâtre, cafés et quartier d'affaires accessibles à pied.</p>",
  "<p>A summer-ready <strong>F3 rental in Aïn El Turck, 200 metres from the beach</strong>. Available for a one-year lease or by the season.</p><ul><li>2 bedrooms, air-conditioned living room</li><li>Fully furnished and equipped</li><li>Private parking in the residence</li></ul>":
    "<p>Un <strong>F3 à louer à Aïn El Turck, à 200 mètres de la plage</strong>, prêt pour l'été. Disponible pour un bail d'un an ou à la saison.</p><ul><li>2 chambres, séjour climatisé</li><li>Entièrement meublé et équipé</li><li>Parking privé dans la résidence</li></ul>",
  "<p>An <strong>18-room boutique hotel</strong> in Arzew, a few minutes from the industrial zone and its steady flow of business travellers.</p><ul><li>18 en-suite rooms over four floors</li><li>Reception, breakfast room and a ground-floor restaurant</li><li>Car park for 15 vehicles</li><li>Operating licence and staff can be taken over</li></ul><p>Accounts available to serious buyers after a first meeting.</p>":
    "<p>Un <strong>hôtel de charme de 18 chambres</strong> à Arzew, à quelques minutes de la zone industrielle et de son flux régulier de voyageurs d'affaires.</p><ul><li>18 chambres avec salle de bain privative, sur quatre étages</li><li>Réception, salle de petit-déjeuner et restaurant au rez-de-chaussée</li><li>Parking de 15 véhicules</li><li>Licence d'exploitation et personnel pouvant être repris</li></ul><p>Comptes communiqués aux acquéreurs sérieux après un premier rendez-vous.</p>",
  "<p><strong>Fitted offices in Oran city centre</strong>, on the 4th floor of a business building on Boulevard de la Soummam.</p><ul><li>160 m²: six private offices and an open space</li><li>Meeting room, archive room and kitchenette</li><li>Air conditioning, fibre and access control</li></ul><p>Available immediately, ideal for a law firm, an insurer or a consultancy.</p>":
    "<p><strong>Bureaux aménagés au centre-ville d'Oran</strong>, au 4e étage d'un immeuble de bureaux sur le boulevard de la Soummam.</p><ul><li>160 m² : six bureaux fermés et un open space</li><li>Salle de réunion, salle d'archives et kitchenette</li><li>Climatisation, fibre et contrôle d'accès</li></ul><p>Disponibles immédiatement, idéals pour un cabinet d'avocats, un assureur ou un cabinet de conseil.</p>",
  "<p>A single-storey <strong>house with a traditional courtyard</strong> in Es Senia, close to the university and the airport.</p><ul><li>3 bedrooms around a shaded central courtyard</li><li>Summer kitchen, garage and roof terrace</li><li>Permit for an additional floor</li></ul>":
    "<p>Une <strong>maison avec cour traditionnelle</strong>, de plain-pied, à Es Senia, à proximité de l'université et de l'aéroport.</p><ul><li>3 chambres autour d'une cour centrale ombragée</li><li>Cuisine d'été, garage et terrasse sur le toit</li><li>Permis de construire pour un étage supplémentaire</li></ul>",
  "<p>A <strong>brand-new F4</strong> in a recently delivered residence in Ali Mendjeli (Unit 8), near the tramway and the university hospital.</p><ul><li>3 bedrooms, living room with balcony</li><li>Lift, intercom and closed parking</li><li>Shops, schools and mosque within the residence's block</li></ul><p>Eligible for bank financing, act delivered at signing.</p>":
    "<p>Un <strong>F4 flambant neuf</strong> dans une résidence récemment livrée à Ali Mendjeli (UV 8), près du tramway et du CHU.</p><ul><li>3 chambres, séjour avec balcon</li><li>Ascenseur, interphone et parking fermé</li><li>Commerces, écoles et mosquée dans l'îlot de la résidence</li></ul><p>Éligible au crédit bancaire, acte remis à la signature.</p>",
  "<p>An F3 with a <strong>view of the Sidi M'Cid bridge</strong> and the Rhumel gorges, in the city centre of Constantine.</p><ul><li>2 bedrooms, living room and dining room</li><li>Renovated bathroom, gas central heating</li><li>Walk to the old town, the souks and the Emir Abdelkader mosque</li></ul>":
    "<p>Un F3 avec <strong>vue sur le pont de Sidi M'Cid</strong> et les gorges du Rhumel, au centre-ville de Constantine.</p><ul><li>2 chambres, séjour et salle à manger</li><li>Salle de bain rénovée, chauffage central au gaz</li><li>Vieille ville, souks et mosquée Emir Abdelkader accessibles à pied</li></ul>",
  "<p>A <strong>1,200 m² warehouse</strong> on a 2,000 m² plot in the El Khroub industrial zone, with direct access to the East-West motorway.</p><ul><li>8 m clear height, two loading docks and a ground-level door</li><li>Offices and staff facilities on a mezzanine</li><li>Three-phase power, fire network, fenced and guarded yard</li></ul>":
    "<p>Un <strong>entrepôt de 1 200 m²</strong> sur un terrain de 2 000 m² dans la zone industrielle d'El Khroub, avec accès direct à l'autoroute Est-Ouest.</p><ul><li>Hauteur libre de 8 m, deux quais de chargement et une porte de plain-pied</li><li>Bureaux et locaux du personnel en mezzanine</li><li>Électricité triphasée, réseau incendie, cour clôturée et gardée</li></ul>",
  "<p>A villa a few steps from the <strong>Roman ruins and the beaches of Tipaza</strong>, on a 500 m² plot planted with olive and lemon trees.</p><ul><li>4 bedrooms, two living rooms, two bathrooms</li><li>Terrace with sea view, summer kitchen</li><li>Garage and independent studio for guests</li></ul>":
    "<p>Une villa à deux pas des <strong>ruines romaines et des plages de Tipaza</strong>, sur un terrain de 500 m² planté d'oliviers et de citronniers.</p><ul><li>4 chambres, deux salons, deux salles de bain</li><li>Terrasse avec vue sur mer, cuisine d'été</li><li>Garage et studio indépendant pour les invités</li></ul>",
  "<p>A corner shop in Koléa town centre with two glass frontages, next to the main square.</p><ul><li>60 m² on one level, toilet and storage</li><li>Suitable for any retail business</li></ul>":
    "<p>Un local commercial d'angle au centre-ville de Koléa, avec deux vitrines, à côté de la place principale.</p><ul><li>60 m² de plain-pied, sanitaires et réserve</li><li>Convient à tout commerce de détail</li></ul>",
  "<p>A quiet <strong>F3 in Blida</strong> with a view of the Chréa mountains, in a residential neighbourhood close to the city centre and the orange groves.</p><ul><li>2 bedrooms, living room with balcony</li><li>Fitted kitchen, gas heating</li><li>Close to schools, the market and the train station to Algiers</li></ul><p>I'm the owner and I answer every message myself.</p>":
    "<p>Un <strong>F3 calme à Blida</strong> avec vue sur les monts de Chréa, dans un quartier résidentiel proche du centre-ville et des orangeraies.</p><ul><li>2 chambres, séjour avec balcon</li><li>Cuisine équipée, chauffage au gaz</li><li>À proximité des écoles, du marché et de la gare vers Alger</li></ul><p>Je suis le propriétaire et je réponds moi-même à tous les messages.</p>",
  "<p>A sunny <strong>F4 overlooking the Gulf of Béjaïa</strong>, on the 5th floor of a building with a lift, between the port and the old town.</p><ul><li>3 bedrooms, double living room</li><li>Two balconies, one facing the sea</li><li>Recently renovated kitchen and bathroom</li><li>Close to the university and the beaches of the corniche</li></ul>":
    "<p>Un <strong>F4 ensoleillé avec vue sur le golfe de Béjaïa</strong>, au 5e étage d'un immeuble avec ascenseur, entre le port et la vieille ville.</p><ul><li>3 chambres, double séjour</li><li>Deux balcons, dont un côté mer</li><li>Cuisine et salle de bain récemment rénovées</li><li>À proximité de l'université et des plages de la corniche</li></ul>",
  "<p>A <strong>furnished F2 in Hussein Dey</strong>, right behind the tramway stop, ideal for a couple or a young professional working in central Algiers.</p><ul><li>One bedroom, living room, equipped kitchen</li><li>Washing machine, fridge, air conditioning</li><li>3rd floor, well-kept building</li></ul>":
    "<p>Un <strong>F2 meublé à Hussein Dey</strong>, juste derrière l'arrêt du tramway, idéal pour un couple ou un jeune actif travaillant au centre d'Alger.</p><ul><li>Une chambre, séjour, cuisine équipée</li><li>Machine à laver, réfrigérateur, climatisation</li><li>3e étage, immeuble bien entretenu</li></ul>",
  "<p>A <strong>Kabyle-style stone house</strong> surrounded by a 1,500 m² olive grove, 15 minutes from Tizi Ouzou city centre.</p><ul><li>4 bedrooms, large living room with fireplace</li><li>Spring water, outbuildings and a covered terrace</li><li>Panoramic view of the Djurdjura</li></ul>":
    "<p>Une <strong>maison en pierre de style kabyle</strong> entourée d'une oliveraie de 1 500 m², à 15 minutes du centre-ville de Tizi Ouzou.</p><ul><li>4 chambres, grand séjour avec cheminée</li><li>Eau de source, dépendances et terrasse couverte</li><li>Vue panoramique sur le Djurdjura</li></ul>",
  "<p>F3 for sale in Sétif centre.</p>":
    "<p>F3 à vendre au centre de Sétif.</p>",
  "<p>A well-kept F3 in Bab Ezzouar, close to the USTHB university and the shopping centre.</p><ul><li>2 bedrooms, living room, balcony</li><li>Lift and caretaker</li></ul>":
    "<p>Un F3 bien entretenu à Bab Ezzouar, à proximité de l'université USTHB et du centre commercial.</p><ul><li>2 chambres, séjour, balcon</li><li>Ascenseur et gardien</li></ul>",
  "<p>A <strong>seafront F3 rental in Annaba</strong>, on the Saint-Cloud beach promenade, available for a one-year lease.</p><ul><li>2 bedrooms, living room with a sea-view balcony</li><li>Furnished and air-conditioned</li><li>Cafés and restaurants at the foot of the building</li></ul>":
    "<p>Un <strong>F3 à louer en front de mer à Annaba</strong>, sur la promenade de la plage Saint-Cloud, disponible pour un bail d'un an.</p><ul><li>2 chambres, séjour avec balcon vue sur mer</li><li>Meublé et climatisé</li><li>Cafés et restaurants au pied de l'immeuble</li></ul>",
  "<p>A <strong>renovated F3 in El Bouni</strong>, in a quiet residence close to schools, the market and the main road to Annaba centre.</p><ul><li>2 bedrooms, bright living room</li><li>New kitchen, PVC windows, reinforced door</li><li>Parking in the residence</li></ul><p>Livret foncier available, sale through a notary.</p>":
    "<p>Un <strong>F3 rénové à El Bouni</strong>, dans une résidence calme à proximité des écoles, du marché et de l'axe principal menant au centre d'Annaba.</p><ul><li>2 chambres, séjour lumineux</li><li>Cuisine neuve, fenêtres en PVC, porte blindée</li><li>Parking dans la résidence</li></ul><p>Livret foncier disponible, vente devant notaire.</p>",
  "<p>A <strong>restored dar in Tlemcen's old medina</strong>, a few minutes from the Great Mosque and the Mechouar. The patio, carved plaster and cedar ceilings have been carefully restored by local craftsmen.</p><ul><li>5 rooms around the central patio, two bathrooms</li><li>Modern kitchen discreetly integrated</li><li>Roof terrace overlooking the minarets of the old town</li></ul><p>A unique home, or an exceptional guest house project.</p>":
    "<p>Un <strong>dar restauré dans la vieille médina de Tlemcen</strong>, à quelques minutes de la Grande Mosquée et du Mechouar. Le patio, les plâtres sculptés et les plafonds en cèdre ont été restaurés avec soin par des artisans locaux.</p><ul><li>5 pièces autour du patio central, deux salles de bain</li><li>Cuisine moderne discrètement intégrée</li><li>Terrasse sur le toit donnant sur les minarets de la vieille ville</li></ul><p>Une demeure unique, ou un projet de maison d'hôtes d'exception.</p>",
  "<p>A shop on <strong>Maghnia's main commercial street</strong>, with heavy foot traffic all week.</p><ul><li>50 m² with a mezzanine for storage</li><li>Metal shutter, toilet, water and electricity meters in the tenant's name</li></ul>":
    "<p>Un local commercial sur la <strong>principale rue commerçante de Maghnia</strong>, très fréquentée toute la semaine.</p><ul><li>50 m² avec mezzanine de stockage</li><li>Rideau métallique, sanitaires, compteurs d'eau et d'électricité au nom du locataire</li></ul>",
  "<p>A villa with an orchard on the road to Lalla Setti, with a clear view over Tlemcen.</p><ul><li>4 bedrooms, two bathrooms, garage</li><li>800 m² plot with cherry and fig trees</li></ul>":
    "<p>Une villa avec verger sur la route de Lalla Setti, avec une vue dégagée sur Tlemcen.</p><ul><li>4 chambres, deux salles de bain, garage</li><li>Terrain de 800 m² planté de cerisiers et de figuiers</li></ul>",
  "<p>A spacious <strong>F4 near Aïn El Fouara</strong> in the centre of Sétif, close to the shops, the park and the tramway.</p><ul><li>3 bedrooms, living room, separate dining room</li><li>Central heating, essential for Sétif winters</li><li>Second floor, quiet building</li></ul>":
    "<p>Un spacieux <strong>F4 près d'Aïn El Fouara</strong>, au centre de Sétif, à proximité des commerces, du parc et du tramway.</p><ul><li>3 chambres, séjour, salle à manger séparée</li><li>Chauffage central, indispensable pendant les hivers sétifiens</li><li>Deuxième étage, immeuble calme</li></ul>",
  "<p>A <strong>seaside studio in Tichy</strong>, 100 metres from the beach, sold furnished. A great first purchase or a holiday rental investment.</p><ul><li>Studio with sleeping alcove, kitchenette and shower room</li><li>Balcony with a side view of the sea</li><li>Residence with parking</li></ul>":
    "<p>Un <strong>studio en bord de mer à Tichy</strong>, à 100 mètres de la plage, vendu meublé. Idéal pour un premier achat ou un investissement en location saisonnière.</p><ul><li>Studio avec coin nuit, kitchenette et salle d'eau</li><li>Balcon avec vue latérale sur la mer</li><li>Résidence avec parking</li></ul>",
  "<p>A <strong>storage warehouse with a yard</strong> in Meftah, on the road between Blida and Algiers.</p><ul><li>800 m² covered space, 6 m height</li><li>1,000 m² fenced yard for trucks</li><li>Office, toilet and guard room</li></ul>":
    "<p>Un <strong>entrepôt de stockage avec cour</strong> à Meftah, sur la route reliant Blida à Alger.</p><ul><li>800 m² couverts, 6 m de hauteur</li><li>Cour clôturée de 1 000 m² pour les camions</li><li>Bureau, sanitaires et loge de gardien</li></ul>",
  "<p>A <strong>family F4 in Koléa</strong> with a view of the gardens, in a calm neighbourhood a few minutes from the town centre.</p><ul><li>3 bedrooms, living room with balcony</li><li>Kitchen with pantry, separate toilet and bathroom</li><li>Schools and the market nearby</li></ul>":
    "<p>Un <strong>F4 familial à Koléa</strong> avec vue sur les jardins, dans un quartier calme à quelques minutes du centre-ville.</p><ul><li>3 chambres, séjour avec balcon</li><li>Cuisine avec cellier, toilettes et salle de bain séparées</li><li>Écoles et marché à proximité</li></ul>",
  "<p>F5 in Bouzareah, urgent sale, price negotiable. Deposit required to book a visit.</p>":
    "<p>F5 à Bouzareah, vente urgente, prix négociable. Acompte exigé pour réserver une visite.</p>",
  // Chat.lastMessage
  "I spoke with the owner this morning: he can come down to 56.5 million for a quick sale. Shall I book you a second visit this weekend?":
    "J'ai parlé au propriétaire ce matin : il peut descendre à 56,5 millions pour une vente rapide. Je vous réserve une deuxième visite ce week-end ?",
  "Confirmed. Please bring an ID for the residence's security desk.":
    "C'est confirmé. Merci d'apporter une pièce d'identité pour le poste de sécurité de la résidence.",
  "Hello Sara, thank you for your interest. I've answered on the request itself: unfortunately the timing doesn't work for me.":
    "Bonjour Sara, merci pour votre intérêt. J'ai répondu directement sur la demande : malheureusement, les dates ne me conviennent pas.",
  "Thank you, I've decided to stay in Algiers after all. I'll close this request.":
    "Merci, j'ai finalement décidé de rester à Alger. Je clôture cette demande.",
  "Hi, I'd like to visit the F3 in El Mouradia. I'm relocating to Algiers for work and need a furnished place from next month.":
    "Bonjour, je souhaiterais visiter le F3 à El Mouradia. Je m'installe à Alger pour le travail et j'ai besoin d'un logement meublé à partir du mois prochain.",
  "Hello, is the F4 in Béjaïa still for sale? Which floor is it on, and is there a lift?":
    "Bonjour, le F4 à Béjaïa est-il toujours à vendre ? À quel étage se trouve-t-il, et y a-t-il un ascenseur ?",
  "Perfect, see you then.":
    "Parfait, à bientôt alors.",
  "Hello, a little. But I already have a buyer at the notary, I'll let you know if it falls through.":
    "Bonjour, un peu. Mais j'ai déjà un acheteur chez le notaire, je vous tiendrai au courant si la vente ne se fait pas.",
  "Hello Mrs Touati, yes, the garden and the pool are fully fenced. Your visit is confirmed; I'll show you the property myself.":
    "Bonjour Mme Touati, oui, le jardin et la piscine sont entièrement clôturés. Votre visite est confirmée, je vous ferai visiter le bien moi-même.",
  "Hello, I run an engineering consultancy of 15 people. Is the office floor available from January, and can the landlord partition two more offices?":
    "Bonjour, je dirige un bureau d'études de 15 personnes. Le plateau de bureaux est-il disponible à partir de janvier, et le bailleur peut-il cloisonner deux bureaux supplémentaires ?",
  "Bonjour, is the Hydra apartment suitable for an elderly parent? I'd like to know whether the lift reaches every floor.":
    "Bonjour, l'appartement d'Hydra convient-il à un parent âgé ? J'aimerais savoir si l'ascenseur dessert tous les étages.",
  "Thank you for the quick answer, it's a bit above my budget for now.":
    "Merci pour votre réponse rapide, c'est un peu au-dessus de mon budget pour le moment.",
  "Thank you! The owner has accepted your offer, I'm marking the listing as under offer. I'll call you about the notary.":
    "Merci ! Le propriétaire a accepté votre offre, je passe l'annonce en sous offre. Je vous appelle pour le notaire.",
  "Hello, is the marina apartment sold with its furniture? And are there yearly residence charges?":
    "Bonjour, l'appartement de la marina est-il vendu avec ses meubles ? Et y a-t-il des charges annuelles pour la résidence ?",
  "Hello Mrs Touati, I'm sorry to let you know the apartment has been sold. I'll send you similar listings in Mohammadia.":
    "Bonjour Mme Touati, j'ai le regret de vous informer que l'appartement a été vendu. Je vous enverrai des annonces similaires à Mohammadia.",
  "Hello, I'd like information about the villa on behalf of a client who lives abroad.":
    "Bonjour, je souhaiterais des informations sur la villa pour le compte d'un client qui réside à l'étranger.",
  "Hello Adel, yes, we rent it by the season in summer: 140,000 DZD a month in July and August. Would you like to book?":
    "Bonjour Adel, oui, nous le louons à la saison en été : 140 000 DZD par mois en juillet et en août. Souhaitez-vous réserver ?",
  "Good morning, I'm looking for offices for our accounting firm. Could we visit early next week?":
    "Bonjour, je cherche des bureaux pour notre cabinet comptable. Pourrions-nous les visiter en début de semaine prochaine ?",
  "Great, can you send me the floor plan?":
    "Très bien, pouvez-vous m'envoyer le plan ?",
  "Hello Bilal, around 1,500 DZD a month for cleaning and the caretaker.":
    "Bonjour Bilal, environ 1 500 DZD par mois pour le nettoyage et le gardien.",
  "Bonjour, I'm interested in the dar in the medina as a guest house project. Could I visit next week?":
    "Bonjour, le dar de la médina m'intéresse pour un projet de maison d'hôtes. Pourrais-je le visiter la semaine prochaine ?",
  "Hello Amina, I've confirmed the visit. See you there!":
    "Bonjour Amina, j'ai confirmé la visite. À bientôt sur place !",
  "Hello, is your Blida apartment still available? I'm a teacher and would like to move in at the start of next month.":
    "Bonjour, votre appartement à Blida est-il toujours disponible ? Je suis enseignante et je souhaiterais emménager au début du mois prochain.",
  "Hello, is the studio in Tichy still for sale? Is the price negotiable?":
    "Bonjour, le studio à Tichy est-il toujours à vendre ? Le prix est-il négociable ?",
  "A deposit before even seeing it? I'd rather visit first.":
    "Un acompte avant même de l'avoir vue ? Je préfère visiter d'abord.",
  // Message.text
  "Hello, is the apartment in Hydra still available? I'd also like to know whether the building charges are included in the price.":
    "Bonjour, l'appartement à Hydra est-il toujours disponible ? J'aimerais aussi savoir si les charges de l'immeuble sont comprises dans le prix.",
  "Hello Sara, yes it's still available. Building charges are about 4,500 DZD a month for the caretaker, the lift and the generator; they're paid separately from the sale price.":
    "Bonjour Sara, oui, il est toujours disponible. Les charges de l'immeuble sont d'environ 4 500 DZD par mois pour le gardien, l'ascenseur et le groupe électrogène, et elles se paient en dehors du prix de vente.",
  "Thank you. Does the apartment come with a parking space, and is the livret foncier ready?":
    "Merci. L'appartement dispose-t-il d'une place de parking, et le livret foncier est-il prêt ?",
  "A private underground space is included. The livret foncier is ready and the notary file can be opened within the week.":
    "Une place privée en sous-sol est incluse. Le livret foncier est prêt et le dossier chez le notaire peut être ouvert dans la semaine.",
  "Great. Would the owner consider 55 million? My bank pre-approval is for that amount.":
    "Très bien. Le propriétaire accepterait-il 55 millions ? Mon accord de principe de la banque porte sur ce montant.",
  "Good morning, I'll be visiting family in Oran and would love to see the Front de Mer apartment while I'm there.":
    "Bonjour, je serai de passage à Oran pour voir ma famille et j'aimerais beaucoup en profiter pour visiter l'appartement du Front de Mer.",
  "Bonjour Sara, with pleasure. 10:00 is already taken that day; can you make it at 11:00? I'll meet you in the lobby.":
    "Bonjour Sara, avec plaisir. Le créneau de 10:00 est déjà pris ce jour-là, pouvez-vous venir à 11:00 ? Je vous retrouverai dans le hall.",
  "11:00 works perfectly, thank you.":
    "11:00, c'est parfait, merci.",
  "Hello Karim, could I visit the F2 near the tramway on Thursday evening?":
    "Bonjour Karim, pourrais-je visiter le F2 près du tramway jeudi soir ?",
  "Hello, is the apartment available for a one-year lease starting next month?":
    "Bonjour, l'appartement est-il disponible pour un bail d'un an à partir du mois prochain ?",
  "Hello, yes, from the 1st. Rent is 60,000 DZD with two months' deposit.":
    "Bonjour, oui, à partir du 1er. Le loyer est de 60 000 DZD avec une caution de deux mois.",
  "Good evening, I work near the Hussein Dey tram stop and I'm looking for a furnished F2. Could I see it after work?":
    "Bonsoir, je travaille près de l'arrêt de tramway de Hussein Dey et je cherche un F2 meublé. Pourrais-je le voir après le travail ?",
  "Good evening Omar, the visit is confirmed. The building is right behind the tram stop, 3rd floor on the left. Call me when you arrive.":
    "Bonsoir Omar, la visite est confirmée. L'immeuble se trouve juste derrière l'arrêt du tramway, 3e étage à gauche. Appelez-moi à votre arrivée.",
  "Hello, is the price of the F3 in Bab Ezzouar negotiable?":
    "Bonjour, le prix du F3 à Bab Ezzouar est-il négociable ?",
  "Hello, my husband and I would like to visit the villa in Dely Ibrahim. We have two children: is the garden fully fenced?":
    "Bonjour, mon mari et moi souhaiterions visiter la villa à Dely Ibrahim. Nous avons deux enfants : le jardin est-il entièrement clôturé ?",
  "Hello, what would the monthly rent be with a three-year lease? I'm opening a phone shop.":
    "Bonjour, quel serait le loyer mensuel avec un bail de trois ans ? J'ouvre une boutique de téléphonie.",
  "Hello Adel, the owner asks 150,000 DZD and would accept 140,000 with a three-year lease and six months paid in advance.":
    "Bonjour Adel, le propriétaire demande 150 000 DZD et accepterait 140 000 avec un bail de trois ans et six mois payés d'avance.",
  "Hello, we'd like to visit the villa in Bordj El Kiffan this week.":
    "Bonjour, nous souhaiterions visiter la villa à Bordj El Kiffan cette semaine.",
  "Hello Rania, I've confirmed the visit. The house is at the end of the Cité des Pins, I'll wait for you at the gate.":
    "Bonjour Rania, j'ai confirmé la visite. La maison se trouve au fond de la Cité des Pins, je vous attendrai devant le portail.",
  "Thank you for the visit, we loved it. We've made an offer through you.":
    "Merci pour la visite, nous avons eu un vrai coup de cœur. Nous avons fait une offre par votre intermédiaire.",
  "Hello, is the Mohammadia F3 still available?":
    "Bonjour, le F3 de Mohammadia est-il toujours disponible ?",
  "Hello, yes. Would you like to visit on Saturday?":
    "Bonjour, oui. Souhaitez-vous le visiter samedi ?",
  "Saturday is fine, around 11:00.":
    "Samedi, c'est très bien, vers 11:00.",
  "Hello, is the Aïn El Turck apartment available for July and August only?":
    "Bonjour, l'appartement d'Aïn El Turck est-il disponible uniquement pour juillet et août ?",
  "Hello, is the Ali Mendjeli apartment eligible for a CNEP loan?":
    "Bonjour, l'appartement d'Ali Mendjeli est-il éligible à un crédit CNEP ?",
  "Hello, yes: the act is delivered at signing and two buyers in the same residence have financed with the CNEP.":
    "Bonjour, oui : l'acte est remis à la signature et deux acquéreurs de la même résidence ont financé leur achat avec la CNEP.",
  "Hello, how much are the residence charges for the El Bouni apartment?":
    "Bonjour, à combien s'élèvent les charges de la résidence pour l'appartement d'El Bouni ?",
  "Hello, I'd like to visit the F4 in Koléa with my husband.":
    "Bonjour, je souhaiterais visiter le F4 à Koléa avec mon mari.",
  "Hello, is the villa near the Roman ruins still available?":
    "Bonjour, la villa près des ruines romaines est-elle toujours disponible ?",
  "Yes. To book a visit please send a 20,000 DZD deposit first.":
    "Oui. Pour réserver une visite, merci d'envoyer d'abord un acompte de 20 000 DZD.",
  // Inquiry.declineReason
  "I'm only showing the apartment to tenants who can move in before the 1st of the month, and your dates don't match. Good luck with your search!":
    "Je ne fais visiter l'appartement qu'aux locataires pouvant emménager avant le 1er du mois, et vos dates ne correspondent pas. Bonne chance dans vos recherches !",
  // AgencyApplication.qualification
  "Licence in Law, Université d'Alger 1":
    "Licence en droit, Université d'Alger 1",
  "Master in Real Estate Management, Université de Tlemcen":
    "Master en gestion immobilière, Université de Tlemcen",
  // AgencyApplication.message
  "We have been operating in Algiers since 2018 and would like to publish our portfolio on Bayti.":
    "Nous exerçons à Alger depuis 2018 et souhaitons publier notre portefeuille de biens sur Bayti.",
  "We have been operating in Bab Ezzouar since 2019 and would like our listings to show the verified badge.":
    "Nous exerçons à Bab Ezzouar depuis 2019 et souhaitons que nos annonces affichent le badge d'agence vérifiée.",
  "Independent agent in Tlemcen for five years, specialised in traditional houses of the medina and family homes on the plateau of Lalla Setti.":
    "Agent indépendant à Tlemcen depuis cinq ans, spécialisé dans les maisons traditionnelles de la médina et les maisons familiales du plateau de Lalla Setti.",
  "Coastal properties from Béjaïa to Tichy and Aokas, for local families and the diaspora.":
    "Biens sur le littoral, de Béjaïa à Tichy et Aokas, pour les familles de la région et la diaspora.",
  // AgencyApplication.decisionNote
  "Welcome to Bayti! All documents were checked against the Algiers register.":
    "Bienvenue sur Bayti ! Tous les documents ont été vérifiés auprès du registre d'Alger.",
  "The agrément number entered belongs to a different agent according to the Algiers wilaya register, and the document uploaded is a carte professionnelle that expired years ago. You can apply again with your own valid agrément.":
    "Le numéro d'agrément saisi appartient à un autre agent selon le registre de la wilaya d'Alger, et le document téléversé est une carte professionnelle expirée depuis des années. Vous pouvez déposer une nouvelle candidature avec votre propre agrément en cours de validité.",
  // AgencyApplication.requestMessage
  "Thank you for your application. Before we can verify Dar Essalam Immobilier we need:\n\n1. A clearer scan of your agrément: the issue date and the wali's stamp are cut off on the copy you uploaded.\n2. The company's articles of association (statuts), since you are applying as a SARL.\n\nUpload both from your application page, then resubmit it.":
    "Merci pour votre candidature. Avant de pouvoir vérifier Dar Essalam Immobilier, il nous faut :\n\n1. Un scan plus lisible de votre agrément : la date de délivrance et le cachet du wali sont coupés sur la copie que vous avez téléversée.\n2. Les statuts de la société, puisque votre candidature est déposée au nom d'une SARL.\n\nTéléversez ces deux documents depuis la page de votre candidature, puis soumettez-la de nouveau.",
  // ApplicationEvent.message
  "1 file: Agrément d'agent immobilier":
    "1 fichier : Agrément d'agent immobilier",
  "1 file: Extrait du Registre de Commerce":
    "1 fichier : Extrait du Registre de Commerce",
  "1 file: Company articles of association (statuts)":
    "1 fichier : Statuts de la société",
  "1 file: Representative's national ID card":
    "1 fichier : Carte nationale d'identité du représentant",
  "1 file: Tax identification (NIF / NIS) certificates":
    "1 fichier : Attestations d'identification fiscale (NIF / NIS)",
  "1 file: Qualification (diploma) of the responsible person":
    "1 fichier : Diplôme ou titre de qualification du responsable",
  "1 file: Carte professionnelle":
    "1 fichier : Carte professionnelle",
  "Independent agent in Tlemcen for five years.":
    "Agent indépendant à Tlemcen depuis cinq ans.",
  "1 file: BOAL publication of incorporation":
    "1 fichier : Publication de constitution au BOAL",
  "1 file: Appointment of the manager / director":
    "1 fichier : Nomination du gérant / directeur",
  // ApplicationNote.body
  "Called the business phone: Mr Djebbar confirmed the application. The agrément number format matches the Algiers register, but I can't read the issue date on the scan. Waiting for a clearer copy before ticking it.":
    "Appel sur le téléphone professionnel : M. Djebbar a confirmé la candidature. Le format du numéro d'agrément correspond au registre d'Alger, mais la date de délivrance est illisible sur le scan. J'attends une copie plus lisible avant de cocher ce point.",
  "Statuts received today and they match the RC extract. Still missing the clearer agrément scan before they can resubmit.":
    "Statuts reçus aujourd'hui, ils concordent avec l'extrait du RC. Il manque toujours le scan plus lisible de l'agrément avant qu'ils puissent soumettre de nouveau la candidature.",
  "Agrément and RC extract match. The BOAL publication dates from 2021 and shows an older address; check that the move to Boulevard Amirouche was registered.":
    "L'agrément et l'extrait du RC concordent. La publication au BOAL date de 2021 et indique une ancienne adresse : vérifier que le transfert au boulevard Amirouche a bien été enregistré.",
  "Checked with the wilaya: AGR/16/2014/0398 belongs to another agent in Hussein Dey. Rejecting.":
    "Vérifié auprès de la wilaya : AGR/16/2014/0398 appartient à un autre agent à Hussein Dey. Je refuse la candidature.",
  "Everything in order. Owner reachable, office visited by Lina last week.":
    "Tout est en ordre. Propriétaire joignable, bureau visité par Lina la semaine dernière.",
  // Notification.title
  "New account: Nadia Ouali":
    "Nouveau compte : Nadia Ouali",
  "New agency application: Immo El Djazair":
    "Nouvelle candidature d'agence : Immo El Djazair",
  "New agency application: Djamel Immo Services":
    "Nouvelle candidature d'agence : Djamel Immo Services",
  "New report: listing — Scam / fake listing":
    "Nouveau signalement : annonce — Arnaque / fausse annonce",
  "New agency application: Dar Essalam Immobilier":
    "Nouvelle candidature d'agence : Dar Essalam Immobilier",
  "New report: listing — Duplicate listing":
    "Nouveau signalement : annonce — Annonce en double",
  "New account: Leila Hamdani":
    "Nouveau compte : Leila Hamdani",
  "New listing to review: F3 for sale in Sétif centre":
    "Nouvelle annonce à examiner : F3 à vendre au centre de Sétif",
  "New agency application: Béjaïa Littoral Immobilier":
    "Nouvelle candidature d'agence : Béjaïa Littoral Immobilier",
  "Immo El Djazair updated its legal information":
    "Immo El Djazair a mis à jour ses informations légales",
  "New listing to review: F2 in Bab El Oued near the seafront":
    "Nouvelle annonce à examiner : F2 à Bab El Oued près du front de mer",
  "New account: Rania Bouzid":
    "Nouveau compte : Rania Bouzid",
  "New account: Adel Khelifi":
    "Nouveau compte : Adel Khelifi",
  "New account: Bilal Ghezali":
    "Nouveau compte : Bilal Ghezali",
  "New documents for Dar Essalam Immobilier":
    "Nouveaux documents pour Dar Essalam Immobilier",
  "New account: Kamel Aouadi":
    "Nouveau compte : Kamel Aouadi",
  "New listing to review: Kabyle stone house with olive grove near Tizi Ouzou":
    "Nouvelle annonce à examiner : Maison kabyle en pierre avec oliveraie près de Tizi Ouzou",
  "New account: Meriem Ait Ali":
    "Nouveau compte : Meriem Ait Ali",
  "New report: listing — Photos don't match the property":
    "Nouveau signalement : annonce — Les photos ne correspondent pas au bien",
  "New listing to review: Villa with orchard on the road to Lalla Setti":
    "Nouvelle annonce à examiner : Villa avec verger sur la route de Lalla Setti",
  "New agency application: Tlemcen Immobilier Conseil":
    "Nouvelle candidature d'agence : Tlemcen Immobilier Conseil",
  "New listing to review: Renovated F4 near Kouba metro":
    "Nouvelle annonce à examiner : F4 rénové près du métro de Kouba",
  "New listing to review: Seafront F3 rental on Saint-Cloud beach, Annaba":
    "Nouvelle annonce à examiner : F3 à louer en front de mer, plage Saint-Cloud, Annaba",
  "New account: Hocine Mebarki":
    "Nouveau compte : Hocine Mebarki",
  "New report: user — Asked for payment before a visit":
    "Nouveau signalement : utilisateur — Paiement demandé avant une visite",
  "Your listing \"Quiet F3 in Blida with a view of Chréa\" is live":
    "Votre annonce \"F3 calme à Blida avec vue sur Chréa\" est en ligne",
  "Your request about “Furnished F2 in Hussein Dey near the tramway” was declined":
    "Votre demande concernant “F2 meublé à Hussein Dey près du tramway” a été déclinée",
  "Your visit of “Front de Mer F4 with panoramic bay view” is confirmed":
    "Votre visite de “F4 sur le Front de Mer avec vue panoramique sur la baie” est confirmée",
  "New inquiry about “Quiet F3 in Blida with a view of Chréa”":
    "Nouvelle demande concernant “F3 calme à Blida avec vue sur Chréa”",
  "Your listing \"Sunny F4 overlooking the Gulf of Béjaïa\" is live":
    "Votre annonce \"F4 ensoleillé avec vue sur le golfe de Béjaïa\" est en ligne",
  "Your listing \"Furnished F2 in Hussein Dey near the tramway\" is live":
    "Votre annonce \"F2 meublé à Hussein Dey près du tramway\" est en ligne",
  "New inquiry about “F3 in Bab Ezzouar near USTHB”":
    "Nouvelle demande concernant “F3 à Bab Ezzouar près de l'USTHB”",
  "Sara Benali asked to visit “Furnished F2 in Hussein Dey near the tramway”":
    "Sara Benali a envoyé une demande de visite pour “F2 meublé à Hussein Dey près du tramway”",
  "Your listing \"F3 for sale in Sétif centre\" needs changes":
    "Votre annonce \"F3 à vendre au centre de Sétif\" nécessite des modifications",
  "Omar Benyoucef asked to visit “Furnished F2 in Hussein Dey near the tramway”":
    "Omar Benyoucef a envoyé une demande de visite pour “F2 meublé à Hussein Dey près du tramway”",
  "New inquiry about “Sunny F4 overlooking the Gulf of Béjaïa”":
    "Nouvelle demande concernant “F4 ensoleillé avec vue sur le golfe de Béjaïa”",
  "Immo El Djazair invited you to join its team":
    "Immo El Djazair vous invite à rejoindre son équipe",
  "Your visit of “Furnished F2 in Hussein Dey near the tramway” is confirmed":
    "Votre visite de “F2 meublé à Hussein Dey près du tramway” est confirmée",
  "Your visit of “Contemporary villa with pool in Dely Ibrahim” is confirmed":
    "Votre visite de “Villa contemporaine avec piscine à Dely Ibrahim” est confirmée",
  "Your listing \"F4 near Aïn El Fouara in Sétif centre\" is live":
    "Votre annonce \"F4 près d'Aïn El Fouara au centre de Sétif\" est en ligne",
  "Your visit of “Family villa with garden in Bordj El Kiffan” is confirmed":
    "Votre visite de “Villa familiale avec jardin à Bordj El Kiffan” est confirmée",
  "Your visit of “Family F4 in Koléa with garden view” is confirmed":
    "Votre visite de “F4 familial à Koléa avec vue sur jardin” est confirmée",
  "Amina Brahimi asked to visit “Family F4 in Koléa with garden view”":
    "Amina Brahimi a envoyé une demande de visite pour “F4 familial à Koléa avec vue sur jardin”",
  "New inquiry about “Renovated F3 in El Bouni”":
    "Nouvelle demande concernant “F3 rénové à El Bouni”",
  "Meriem Ait Ali asked to visit “Restored dar in Tlemcen's old medina”":
    "Meriem Ait Ali a envoyé une demande de visite pour “Dar restauré dans la vieille médina de Tlemcen”",
  "New inquiry about “Seaside studio in Tichy”":
    "Nouvelle demande concernant “Studio en bord de mer à Tichy”",
  "Immo El Djazair is now a verified agency on Bayti":
    "Immo El Djazair est désormais une agence vérifiée sur Bayti",
  "New inquiry about “Contemporary villa with pool in Dely Ibrahim”":
    "Nouvelle demande concernant “Villa contemporaine avec piscine à Dely Ibrahim”",
  "A client cancelled their request about “Contemporary villa with pool in Dely Ibrahim”":
    "Un client a annulé sa demande concernant “Villa contemporaine avec piscine à Dely Ibrahim”",
  "Imane Touati asked to visit “Contemporary villa with pool in Dely Ibrahim”":
    "Imane Touati a envoyé une demande de visite pour “Villa contemporaine avec piscine à Dely Ibrahim”",
  "Bilal Ghezali asked to visit “Duplex penthouse with roof terrace in Aïn Taya”":
    "Bilal Ghezali a envoyé une demande de visite pour “Duplex au dernier étage avec toit-terrasse à Aïn Taya”",
  "New inquiry about “Open-plan office floor in Bab Ezzouar business district”":
    "Nouvelle demande concernant “Plateau de bureaux en open space dans le quartier d'affaires de Bab Ezzouar”",
  "New inquiry about “Street-level shop on a busy Birkhadem avenue”":
    "Nouvelle demande concernant “Local commercial en rez-de-chaussée sur une avenue passante de Birkhadem”",
  "Your listing \"Bright F4 with sea view in Hydra\" is live":
    "Votre annonce \"F4 lumineux avec vue sur mer à Hydra\" est en ligne",
  "Your listing \"Seafront F3 in the Bou Ismail marina\" is live":
    "Votre annonce \"F3 en front de mer à la marina de Bou Ismail\" est en ligne",
  "New inquiry about “Bright F4 with sea view in Hydra”":
    "Nouvelle demande concernant “F4 lumineux avec vue sur mer à Hydra”",
  "New inquiry about “Seafront F3 in the Bou Ismail marina”":
    "Nouvelle demande concernant “F3 en front de mer à la marina de Bou Ismail”",
  "Rania Bouzid asked to visit “Family villa with garden in Bordj El Kiffan”":
    "Rania Bouzid a envoyé une demande de visite pour “Villa familiale avec jardin à Bordj El Kiffan”",
  "Your listing \"F2 in Bab El Oued near the seafront\" needs changes":
    "Votre annonce \"F2 à Bab El Oued près du front de mer\" nécessite des modifications",
  "Sara Benali asked to visit “Furnished F3 in El Mouradia”":
    "Sara Benali a envoyé une demande de visite pour “F3 meublé à El Mouradia”",
  "Immo El Djazair switched off your access":
    "Immo El Djazair a désactivé votre accès",
  "Sara Benali asked to visit “Front de Mer F4 with panoramic bay view”":
    "Sara Benali a envoyé une demande de visite pour “F4 sur le Front de Mer avec vue panoramique sur la baie”",
  "Imane Touati asked to visit “Fitted offices on Boulevard de la Soummam”":
    "Imane Touati a envoyé une demande de visite pour “Bureaux aménagés sur le boulevard de la Soummam”",
  "New inquiry about “F3 rental in Aïn El Turck, 200 m from the beach”":
    "Nouvelle demande concernant “F3 à louer à Aïn El Turck, à 200 m de la plage”",
  "Constantine Habitat's verification was revoked":
    "La vérification de Constantine Habitat a été révoquée",
  "New inquiry about “New F4 in Ali Mendjeli, Unit 8”":
    "Nouvelle demande concernant “F4 neuf à Ali Mendjeli, UV 8”",
  "Sahel Immobilier has been suspended":
    "Sahel Immobilier a été suspendue",
  "We're reviewing Dar Essalam Immobilier":
    "Dar Essalam Immobilier : candidature en cours d'examen",
  "Dar Essalam Immobilier: more information needed":
    "Dar Essalam Immobilier : informations complémentaires requises",
  "We're reviewing Béjaïa Littoral Immobilier":
    "Béjaïa Littoral Immobilier : candidature en cours d'examen",
  "We're reviewing Djamel Immo Services":
    "Djamel Immo Services : candidature en cours d'examen",
  "Your agency application for Djamel Immo Services was not approved":
    "Votre candidature d'agence pour Djamel Immo Services n'a pas été approuvée",
  // Notification.body
  "agency@bayti.dz · agency account, application started":
    "agency@bayti.dz · compte agence, candidature commencée",
  "Algiers · Agrément AGR/16/2023/0457":
    "Alger · Agrément AGR/16/2023/0457",
  "Algiers · Agrément AGR/16/2014/0398":
    "Alger · Agrément AGR/16/2014/0398",
  "An F5 in Bouzareah for 9 million is impossible. The seller asked me for a deposit before showing it and stopped answering.":
    "Un F5 à Bouzareah pour 9 millions, c'est impossible. Le vendeur m'a demandé un acompte avant de me le faire visiter, puis il a cessé de répondre.",
  "Algiers · Agrément AGR/16/2019/0213":
    "Alger · Agrément AGR/16/2019/0213",
  "The same apartment seems to be posted twice by the agency.":
    "Le même appartement semble avoir été publié deux fois par l'agence.",
  "contact@bejaia-littoral.dz · agency account, application started":
    "contact@bejaia-littoral.dz · compte agence, candidature commencée",
  "SETIF, Sétif":
    "SETIF, Sétif",
  "Béjaïa · Agrément AGR/06/2021/0019":
    "Béjaïa · Agrément AGR/06/2021/0019",
  "Changed: address":
    "Modification : adresse",
  "BAB EL OUED, Algiers":
    "BAB EL OUED, Alger",
  "rania.bouzid@mail.dz":
    "rania.bouzid@mail.dz",
  "adel.khelifi@mail.dz":
    "adel.khelifi@mail.dz",
  "bilal.ghezali@mail.dz":
    "bilal.ghezali@mail.dz",
  "1 file(s) uploaded: Company articles of association (statuts).":
    "1 fichier(s) téléversé(s) : Statuts de la société.",
  "k.aouadi@tlemcen-conseil.dz · agency account, application started":
    "k.aouadi@tlemcen-conseil.dz · compte agence, candidature commencée",
  "TIZI OUZOU, Tizi Ouzou":
    "TIZI OUZOU, Tizi Ouzou",
  "meriem.aitali@mail.dz":
    "meriem.aitali@mail.dz",
  "The photos look like a new-build in Algiers, not a flat in Koléa. I've seen the same pictures on another website.":
    "Les photos ressemblent à celles d'un immeuble neuf à Alger, pas à un appartement à Koléa. J'ai vu les mêmes images sur un autre site.",
  "TLEMCEN, Tlemcen":
    "TLEMCEN, Tlemcen",
  "Tlemcen · Agrément AGR/13/2024/0042":
    "Tlemcen · Agrément AGR/13/2024/0042",
  "KOUBA, Algiers":
    "KOUBA, Alger",
  "ANNABA, Annaba":
    "ANNABA, Annaba",
  "hocine.mebarki@mail.dz":
    "hocine.mebarki@mail.dz",
  "He asked me to send 10,000 DZD by BaridiMob to 'reserve' a visit of his warehouse in Meftah.":
    "Il m'a demandé d'envoyer 10 000 DZD par BaridiMob pour 'réserver' une visite de son entrepôt à Meftah.",
  "It's now visible on the marketplace.":
    "Elle est désormais visible sur la plateforme.",
  "2026-11-12 at 11:00. — Oran Prestige Immobilier":
    "2026-11-12 à 11:00. — Oran Prestige Immobilier",
  "From Rania Bouzid":
    "De la part de Rania Bouzid",
  "From Imane Touati":
    "De la part d'Imane Touati",
  "2026-11-01 at 18:00":
    "2026-11-01 à 18:00",
  "Reason: The listing has a single photo taken from the street and almost no description. Add at least three photos of the inside and describe the rooms, the floor and the condition, then send it back for review.\n\nEdit the listing to send it back for review.":
    "Motif : L'annonce ne comporte qu'une seule photo prise depuis la rue et presque aucune description. Ajoutez au moins trois photos de l'intérieur et décrivez les pièces, l'étage et l'état du bien, puis renvoyez-la pour examen.\n\nModifiez l'annonce pour la renvoyer en examen.",
  "2026-11-11 at 18:30":
    "2026-11-11 à 18:30",
  "As an agent. Accept or decline from your profile.":
    "En tant qu'agent. Acceptez ou refusez depuis votre profil.",
  "2026-11-11 at 18:30.":
    "2026-11-11 à 18:30.",
  "2026-11-11 at 15:00. — Immo El Djazair":
    "2026-11-11 à 15:00. — Immo El Djazair",
  "2026-11-08 at 10:30. — Immo El Djazair":
    "2026-11-08 à 10:30. — Immo El Djazair",
  "2026-11-12 at 16:00.":
    "2026-11-12 à 16:00.",
  "2026-11-12 at 16:00":
    "2026-11-12 à 16:00",
  "From Bilal Ghezali":
    "De la part de Bilal Ghezali",
  "2026-11-16 at 11:00":
    "2026-11-16 à 11:00",
  "From Hocine Mebarki":
    "De la part de Hocine Mebarki",
  "Your application was approved. Your account is now the agency's main account.\n\nWelcome to Bayti! All documents were checked against the Algiers register.":
    "Votre candidature a été approuvée. Votre compte est désormais le compte principal de l'agence.\n\nBienvenue sur Bayti ! Tous les documents ont été vérifiés auprès du registre d'Alger.",
  "From Yacine Mansouri":
    "De la part de Yacine Mansouri",
  "2026-11-11 at 15:00":
    "2026-11-11 à 15:00",
  "2026-11-14 at 14:00":
    "2026-11-14 à 14:00",
  "From Omar Benyoucef":
    "De la part d'Omar Benyoucef",
  "From Adel Khelifi":
    "De la part d'Adel Khelifi",
  "From Sara Benali":
    "De la part de Sara Benali",
  "From Nour El Houda Saidi":
    "De la part de Nour El Houda Saidi",
  "From Meriem Ait Ali":
    "De la part de Meriem Ait Ali",
  "2026-11-08 at 10:30":
    "2026-11-08 à 10:30",
  "Reason: The photos show a different building from the address given, and the rent doesn't say whether the monthly charges are included. Please upload photos of this apartment and confirm the rent.\n\nEdit the listing to send it back for review.":
    "Motif : Les photos montrent un immeuble différent de celui de l'adresse indiquée, et le loyer ne précise pas si les charges mensuelles sont comprises. Merci d'ajouter des photos de cet appartement et de confirmer le loyer.\n\nModifiez l'annonce pour la renvoyer en examen.",
  "2026-11-13 at 17:30":
    "2026-11-13 à 17:30",
  "You can't use the agency platform or publish for the agency until you're reactivated.":
    "Vous ne pouvez plus utiliser l'espace agence ni publier pour l'agence tant que votre accès n'est pas réactivé.",
  "2026-11-12 at 10:00":
    "2026-11-12 à 10:00",
  "2026-11-15 at 09:30":
    "2026-11-15 à 09:30",
  "Your listings stay online without the verified badge. Reason: The agrément renewal submitted by the agency could not be confirmed with the wilaya of Constantine. The badge will be restored once a valid, renewed agrément is on file.":
    "Vos annonces restent en ligne, sans le badge d'agence vérifiée. Motif : Le renouvellement d'agrément soumis par l'agence n'a pas pu être confirmé auprès de la wilaya de Constantine. Le badge sera rétabli dès qu'un agrément valide et renouvelé figurera au dossier.",
  "Your listings are hidden until this is resolved. Reason: Several clients reported deposits taken for visits of properties that were already rented. Suspended while we investigate with the agency's manager.":
    "Vos annonces sont masquées jusqu'à la résolution du problème. Motif : Plusieurs clients ont signalé des acomptes encaissés pour des visites de biens déjà loués. Suspendue le temps de notre enquête avec le responsable de l'agence.",
  "Our team has started checking your application and documents.":
    "Notre équipe a commencé à vérifier votre candidature et vos documents.",
  "Our team needs more from you before deciding:\n\nThank you for your application. Before we can verify Dar Essalam Immobilier we need:\n\n1. A clearer scan of your agrément: the issue date and the wali's stamp are cut off on the copy you uploaded.\n2. The company's articles of association (statuts), since you are applying as a SARL.\n\nUpload both from your application page, then resubmit it.\n\nOpen your application to update it and upload documents.":
    "Notre équipe a besoin d'éléments complémentaires avant de se prononcer :\n\nMerci pour votre candidature. Avant de pouvoir vérifier Dar Essalam Immobilier, il nous faut :\n\n1. Un scan plus lisible de votre agrément : la date de délivrance et le cachet du wali sont coupés sur la copie que vous avez téléversée.\n2. Les statuts de la société, puisque votre candidature est déposée au nom d'une SARL.\n\nTéléversez ces deux documents depuis la page de votre candidature, puis soumettez-la de nouveau.\n\nOuvrez votre candidature pour la mettre à jour et téléverser des documents.",
  "Reason: The agrément number entered belongs to a different agent according to the Algiers wilaya register, and the document uploaded is a carte professionnelle that expired years ago. You can apply again with your own valid agrément.\n\nYou can submit a new application once the issue is resolved.":
    "Motif : Le numéro d'agrément saisi appartient à un autre agent selon le registre de la wilaya d'Alger, et le document téléversé est une carte professionnelle expirée depuis des années. Vous pouvez déposer une nouvelle candidature avec votre propre agrément en cours de validité.\n\nVous pourrez soumettre une nouvelle candidature une fois le problème résolu.",
  // AuditLog.summary
  "Immo El Djazair: submitted → under_review":
    "Immo El Djazair : soumise → en cours d'examen",
  "Created agency Oran Prestige Immobilier owned by Hichem Bensalah":
    "A créé l'agence Oran Prestige Immobilier, propriétaire : Hichem Bensalah",
  "Created agency Constantine Habitat owned by Farid Zerrouki":
    "A créé l'agence Constantine Habitat, propriétaire : Farid Zerrouki",
  "Immo El Djazair: under_review → approved":
    "Immo El Djazair : en cours d'examen → approuvée",
  "Created agency Sahel Immobilier owned by Rachid Hamidi":
    "A créé l'agence Sahel Immobilier, propriétaire : Rachid Hamidi",
  "Created “Studio close to the beach in Aïn Benian”":
    "A créé « Studio proche de la plage à Aïn Benian »",
  "\"Studio close to the beach in Aïn Benian\" (#10): pending → approved":
    "« Studio proche de la plage à Aïn Benian » (n° 10) : en attente → approuvée",
  "Created “Contemporary villa with pool in Dely Ibrahim”":
    "A créé « Villa contemporaine avec piscine à Dely Ibrahim »",
  "Created an account for Mehdi Saadi as manager":
    "A créé un compte pour Mehdi Saadi en tant que responsable",
  "\"Contemporary villa with pool in Dely Ibrahim\" (#3): pending → approved":
    "« Villa contemporaine avec piscine à Dely Ibrahim » (n° 3) : en attente → approuvée",
  "Created an account for Riad Belkacem as agent":
    "A créé un compte pour Riad Belkacem en tant qu'agent",
  "Created an account for Sofiane Larbi as agent":
    "A créé un compte pour Sofiane Larbi en tant qu'agent",
  "Created “F3 in Mohammadia facing the Grand Mosque”":
    "A créé « F3 à Mohammadia face à la Grande Mosquée »",
  "\"F3 in Mohammadia facing the Grand Mosque\" (#12): pending → approved":
    "« F3 à Mohammadia face à la Grande Mosquée » (n° 12) : en attente → approuvée",
  "\"Villa near the Roman ruins of Tipaza\" (#22): pending → approved":
    "« Villa près des ruines romaines de Tipaza » (n° 22) : en attente → approuvée",
  "Created “Traditional Casbah house (dar) to restore”":
    "A créé « Maison traditionnelle (dar) à restaurer à la Casbah »",
  "\"Traditional Casbah house (dar) to restore\" (#9): pending → approved":
    "« Maison traditionnelle (dar) à restaurer à la Casbah » (n° 9) : en attente → approuvée",
  "\"F3 in Bab Ezzouar near USTHB\" (#29): pending → approved":
    "« F3 à Bab Ezzouar près de l'USTHB » (n° 29) : en attente → approuvée",
  "Created “Front de Mer F4 with panoramic bay view”":
    "A créé « F4 sur le Front de Mer avec vue panoramique sur la baie »",
  "Invited Wassila Boukhari as agent":
    "A invité Wassila Boukhari en tant qu'agent",
  "\"Front de Mer F4 with panoramic bay view\" (#14): pending → approved":
    "« F4 sur le Front de Mer avec vue panoramique sur la baie » (n° 14) : en attente → approuvée",
  "\"Corner shop in Koléa town centre\" (#23): pending → approved":
    "« Local commercial d'angle au centre-ville de Koléa » (n° 23) : en attente → approuvée",
  "Created “Bright F4 with sea view in Hydra”":
    "A créé « F4 lumineux avec vue sur mer à Hydra »",
  "\"Bright F4 with sea view in Hydra\" (#1): pending → approved":
    "« F4 lumineux avec vue sur mer à Hydra » (n° 1) : en attente → approuvée",
  "Invited Amel Kaci as agent":
    "A invité Amel Kaci en tant qu'agent",
  "\"New F4 in Ali Mendjeli, Unit 8\" (#19): pending → approved":
    "« F4 neuf à Ali Mendjeli, UV 8 » (n° 19) : en attente → approuvée",
  "\"Restored dar in Tlemcen's old medina\" (#32): pending → approved":
    "« Dar restauré dans la vieille médina de Tlemcen » (n° 32) : en attente → approuvée",
  "Created “Open-plan office floor in Bab Ezzouar business district”":
    "A créé « Plateau de bureaux en open space dans le quartier d'affaires de Bab Ezzouar »",
  "\"Open-plan office floor in Bab Ezzouar business district\" (#4): pending → approved":
    "« Plateau de bureaux en open space dans le quartier d'affaires de Bab Ezzouar » (n° 4) : en attente → approuvée",
  "\"Sunny F4 overlooking the Gulf of Béjaïa\" (#25): pending → approved":
    "« F4 ensoleillé avec vue sur le golfe de Béjaïa » (n° 25) : en attente → approuvée",
  "Created “Family villa with garden in Bordj El Kiffan”":
    "A créé « Villa familiale avec jardin à Bordj El Kiffan »",
  "\"Family villa with garden in Bordj El Kiffan\" (#11): pending → approved":
    "« Villa familiale avec jardin à Bordj El Kiffan » (n° 11) : en attente → approuvée",
  "Created “18-room boutique hotel in Arzew”":
    "A créé « Hôtel de charme de 18 chambres à Arzew »",
  "\"18-room boutique hotel in Arzew\" (#16): pending → approved":
    "« Hôtel de charme de 18 chambres à Arzew » (n° 16) : en attente → approuvée",
  "\"F5 in Bouzareah, urgent sale\" (#39): pending → approved":
    "« F5 à Bouzareah, vente urgente » (n° 39) : en attente → approuvée",
  "\"F3 with a view of the Sidi M'Cid bridge\" (#20): pending → approved":
    "« F3 avec vue sur le pont de Sidi M'Cid » (n° 20) : en attente → approuvée",
  "\"Seaside studio in Tichy\" (#36): pending → approved":
    "« Studio en bord de mer à Tichy » (n° 36) : en attente → approuvée",
  "Djamel Immo Services: submitted → under_review":
    "Djamel Immo Services : soumise → en cours d'examen",
  "Created “Furnished F3 in El Mouradia”":
    "A créé « F3 meublé à El Mouradia »",
  "\"Furnished F3 in El Mouradia\" (#2): pending → approved":
    "« F3 meublé à El Mouradia » (n° 2) : en attente → approuvée",
  "Archived “Studio close to the beach in Aïn Benian”":
    "A archivé « Studio proche de la plage à Aïn Benian »",
  "Djamel Immo Services: under_review → rejected":
    "Djamel Immo Services : en cours d'examen → refusée",
  "\"Furnished F2 in Hussein Dey near the tramway\" (#26): pending → approved":
    "« F2 meublé à Hussein Dey près du tramway » (n° 26) : en attente → approuvée",
  "Created “Street-level shop on a busy Birkhadem avenue”":
    "A créé « Local commercial en rez-de-chaussée sur une avenue passante de Birkhadem »",
  "\"Street-level shop on a busy Birkhadem avenue\" (#6): pending → approved":
    "« Local commercial en rez-de-chaussée sur une avenue passante de Birkhadem » (n° 6) : en attente → approuvée",
  "\"Shop on Maghnia's main commercial street\" (#33): pending → approved":
    "« Local commercial sur la principale rue commerçante de Maghnia » (n° 33) : en attente → approuvée",
  "Created “F3 rental in Aïn El Turck, 200 m from the beach”":
    "A créé « F3 à louer à Aïn El Turck, à 200 m de la plage »",
  "Changed settings: listings, notifications":
    "A modifié les paramètres : annonces, notifications",
  "\"F3 rental in Aïn El Turck, 200 m from the beach\" (#15): pending → approved":
    "« F3 à louer à Aïn El Turck, à 200 m de la plage » (n° 15) : en attente → approuvée",
  "Invited Nour El Houda Saidi as agent":
    "A invité Nour El Houda Saidi en tant qu'agent",
  "Marked the inquiry about “F3 in Mohammadia facing the Grand Mosque” closed":
    "A marqué la demande concernant « F3 à Mohammadia face à la Grande Mosquée » comme clôturée",
  "Created “Seafront F3 in the Bou Ismail marina”":
    "A créé « F3 en front de mer à la marina de Bou Ismail »",
  "\"Seafront F3 in the Bou Ismail marina\" (#5): pending → approved":
    "« F3 en front de mer à la marina de Bou Ismail » (n° 5) : en attente → approuvée",
  "\"Storage warehouse with yard in Meftah\" (#37): pending → approved":
    "« Entrepôt de stockage avec cour à Meftah » (n° 37) : en attente → approuvée",
  "\"Quiet F3 in Blida with a view of Chréa\" (#24): pending → approved":
    "« F3 calme à Blida avec vue sur Chréa » (n° 24) : en attente → approuvée",
  "\"Warehouse with loading docks in El Khroub\" (#21): pending → approved":
    "« Entrepôt avec quais de chargement à El Khroub » (n° 21) : en attente → approuvée",
  "Updated the agency profile":
    "A mis à jour le profil de l'agence",
  "Edited \"Bright F4 with sea view in Hydra\" (#1): featured":
    "A modifié « F4 lumineux avec vue sur mer à Hydra » (n° 1) : mise en avant",
  "Edited \"Restored dar in Tlemcen's old medina\" (#32): featured":
    "A modifié « Dar restauré dans la vieille médina de Tlemcen » (n° 32) : mise en avant",
  "Created “Duplex penthouse with roof terrace in Aïn Taya”":
    "A créé « Duplex au dernier étage avec toit-terrasse à Aïn Taya »",
  "\"Duplex penthouse with roof terrace in Aïn Taya\" (#13): pending → approved":
    "« Duplex au dernier étage avec toit-terrasse à Aïn Taya » (n° 13) : en attente → approuvée",
  "Walid Meziane is now suspended: Several reports of a fake listing using stolen photos and asking for a deposit before visits. Suspended after review.":
    "Walid Meziane est désormais suspendu : Plusieurs signalements d'une fausse annonce utilisant des photos volées et réclamant un acompte avant les visites. Suspendu après examen.",
  "Report #3 resolved: Confirmed with two other complaints: the photos were taken from another website and the seller asked for an advance. Account suspended, so the listing is no longer public":
    "Signalement n° 3 résolu : Confirmé par deux autres plaintes : les photos provenaient d'un autre site et le vendeur a demandé une avance. Compte suspendu, l'annonce n'est donc plus publique",
  "\"Renovated F3 in El Bouni\" (#31): pending → approved":
    "« F3 rénové à El Bouni » (n° 31) : en attente → approuvée",
  "Sahel Immobilier suspended: Several clients reported deposits taken for visits of properties that were already rented. Suspended while we investigate with the agency's manager.":
    "A suspendu Sahel Immobilier : Plusieurs clients ont signalé des acomptes encaissés pour des visites de biens déjà loués. Suspendue le temps de notre enquête avec le responsable de l'agence.",
  "\"Family F4 in Koléa with garden view\" (#38): pending → approved":
    "« F4 familial à Koléa avec vue sur jardin » (n° 38) : en attente → approuvée",
  "Created “Fitted offices on Boulevard de la Soummam”":
    "A créé « Bureaux aménagés sur le boulevard de la Soummam »",
  "\"Fitted offices on Boulevard de la Soummam\" (#17): pending → approved":
    "« Bureaux aménagés sur le boulevard de la Soummam » (n° 17) : en attente → approuvée",
  "Dar Essalam Immobilier: submitted → under_review":
    "Dar Essalam Immobilier : soumise → en cours d'examen",
  "Checked \"RC extract matches the legal name, RC number and a real-estate activity\"":
    "A coché « L'extrait du RC correspond à la raison sociale, au numéro de RC et à une activité immobilière »",
  "Checked \"Business phone and email reached the agency\"":
    "A coché « Le téléphone et l'e-mail professionnels ont permis de joindre l'agence »",
  "Dar Essalam Immobilier: under_review → info_required":
    "Dar Essalam Immobilier : en cours d'examen → informations requises",
  "Took offline “Traditional Casbah house (dar) to restore”":
    "A mis hors ligne « Maison traditionnelle (dar) à restaurer à la Casbah »",
  "\"F4 near Aïn El Fouara in Sétif centre\" (#35): pending → approved":
    "« F4 près d'Aïn El Fouara au centre de Sétif » (n° 35) : en attente → approuvée",
  "Constantine Habitat verification revoked: The agrément renewal submitted by the agency could not be confirmed with the wilaya of Constantine. The badge will be restored once a valid, renewed":
    "A révoqué la vérification de Constantine Habitat : Le renouvellement d'agrément soumis par l'agence n'a pas pu être confirmé auprès de la wilaya de Constantine. Le badge sera rétabli dès qu'un agrément valide et renouvelé",
  "Updated Sofiane Larbi: access switched off":
    "A mis à jour Sofiane Larbi : accès désactivé",
  "Assigned “Family villa with garden in Bordj El Kiffan” to Amel Kaci":
    "A attribué « Villa familiale avec jardin à Bordj El Kiffan » à Amel Kaci",
  "Created “Single-storey house with courtyard in Es Senia”":
    "A créé « Maison de plain-pied avec cour à Es Senia »",
  "Report #4 dismissed: Not a duplicate: Immo El Djazair lists two different apartments in the same Hydra residence (3rd and 6th floors).":
    "Signalement n° 4 classé sans suite : Il ne s'agit pas d'un doublon : Immo El Djazair propose deux appartements différents dans la même résidence à Hydra (3e et 6e étages).",
  "\"Single-storey house with courtyard in Es Senia\" (#18): pending → approved":
    "« Maison de plain-pied avec cour à Es Senia » (n° 18) : en attente → approuvée",
  "\"F3 for sale in Sétif centre\" (#28): pending → rejected (The listing has a single photo taken from the street and almost no description. Add at least three photos of the inside and describe ":
    "« F3 à vendre au centre de Sétif » (n° 28) : en attente → refusée (L'annonce ne comporte qu'une seule photo prise depuis la rue et presque aucune description. Ajoutez au moins trois photos de l'intérieur et décrivez ",
  "Changed address":
    "A modifié l'adresse",
  "Created “F2 in Bab El Oued near the seafront”":
    "A créé « F2 à Bab El Oued près du front de mer »",
  "Béjaïa Littoral Immobilier: submitted → under_review":
    "Béjaïa Littoral Immobilier : soumise → en cours d'examen",
  "Opened agrement-bejaia-littoral.pdf":
    "A ouvert agrement-bejaia-littoral.pdf",
  "Checked \"Agrément certificate matches the number, wilaya and dates entered\"":
    "A coché « Le certificat d'agrément correspond au numéro, à la wilaya et aux dates saisis »",
  "Checked \"Agrément is still valid (5 years from issue, art. 16)\"":
    "A coché « L'agrément est toujours valide (5 ans à compter de la délivrance, art. 16) »",
  "Edited “Bright F4 with sea view in Hydra”":
    "A modifié « F4 lumineux avec vue sur mer à Hydra »",
  "\"F2 in Bab El Oued near the seafront\" (#8): pending → rejected (The photos show a different building from the address given, and the rent doesn't say whether the monthly charges are included":
    "« F2 à Bab El Oued près du front de mer » (n° 8) : en attente → refusée (Les photos montrent un immeuble différent de celui de l'adresse indiquée, et le loyer ne précise pas si les charges mensuelles sont comprises",
  "Marked the inquiry about “Front de Mer F4 with panoramic bay view” scheduled":
    "A marqué la demande concernant « F4 sur le Front de Mer avec vue panoramique sur la baie » comme planifiée",
  "Marked the inquiry about “Contemporary villa with pool in Dely Ibrahim” scheduled":
    "A marqué la demande concernant « Villa contemporaine avec piscine à Dely Ibrahim » comme planifiée",
  "Marked the inquiry about “Family villa with garden in Bordj El Kiffan” scheduled":
    "A marqué la demande concernant « Villa familiale avec jardin à Bordj El Kiffan » comme planifiée",
  "Invited Bilal Ghezali as agent":
    "A invité Bilal Ghezali en tant qu'agent",
  "Invited Yacine Mansouri as agent":
    "A invité Yacine Mansouri en tant qu'agent",
  "Marked the inquiry about “Street-level shop on a busy Birkhadem avenue” closed":
    "A marqué la demande concernant « Local commercial en rez-de-chaussée sur une avenue passante de Birkhadem » comme clôturée",
  "Marked the inquiry about “Family villa with garden in Bordj El Kiffan” closed":
    "A marqué la demande concernant « Villa familiale avec jardin à Bordj El Kiffan » comme clôturée",
  "Edited “Family villa with garden in Bordj El Kiffan”":
    "A modifié « Villa familiale avec jardin à Bordj El Kiffan »",
  "Withdrew an invitation":
    "A retiré une invitation",
  "Created “Renovated F4 near Kouba metro”":
    "A créé « F4 rénové près du métro de Kouba »",
  // Report.resolution
  "Confirmed with two other complaints: the photos were taken from another website and the seller asked for an advance. Account suspended, so the listing is no longer public.":
    "Confirmé par deux autres plaintes : les photos provenaient d'un autre site et le vendeur a demandé une avance. Compte suspendu, l'annonce n'est donc plus publique.",
  "Not a duplicate: Immo El Djazair lists two different apartments in the same Hydra residence (3rd and 6th floors).":
    "Il ne s'agit pas d'un doublon : Immo El Djazair propose deux appartements différents dans la même résidence à Hydra (3e et 6e étages).",
};

// Kept in English in the data because forms and filters use the value: translated on the page only
export const display = {
  // AgencyApplication.repNationality
  "Algerian":
    "Algérienne",
  // Report.reason
  "Photos don't match the property":
    "Les photos ne correspondent pas au bien",
  "Asked for payment before a visit":
    "Paiement demandé avant une visite",
  "Scam / fake listing":
    "Arnaque / fausse annonce",
  "Duplicate listing":
    "Annonce en double",
};
