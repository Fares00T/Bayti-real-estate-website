// Seed data for the investor demo. The real backend runs in the browser on an
// in-memory database; buildSeed() returns its initial rows, one array per
// Prisma model. Every date is computed from the moment it is called, so the
// dashboards, charts and "2 hours ago" labels always look fresh.
//
// Story in short:
//  - Immo El Djazair (Algiers): the showcase agency, verified, 5 members.
//  - Oran Prestige Immobilier: a second verified agency.
//  - Constantine Habitat: active, but its verification was revoked (no badge).
//  - Sahel Immobilier: suspended (its listings are off the marketplace).
//  - Sara (client), Karim (individual seller at his limit), Yacine (invited
//    to join Immo El Djazair) and a dozen other marketplace accounts.
//  - Agency applications at every stage, moderation queue, reports,
//    notifications and an audit trail matching what the code writes.

export const DEMO_PASSWORD = "demo1234";

// The in-browser bcrypt shim hashes as "demo$" + plain
const PASSWORD_HASH = "demo$" + DEMO_PASSWORD;

const photo = (id, w = 1260) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
const avatar = (id) => photo(id, 200);

// Deterministic pseudo-random numbers so the dataset is the same on every load
const prng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hex64 = (n) => {
  const r = prng(n * 7919 + 13);
  let s = "";
  while (s.length < 64) s += Math.floor(r() * 16).toString(16);
  return s;
};

const NEARBY_KEYS = [
  "primarySchool", "kindergarten", "university", "carPark", "transportation",
  "highSchool", "middleSchool", "mosque", "pharmacy", "commercialArea",
];

// Approximate centres of the districts used below
const COORDS = {
  "Algiers/BIR MOURAD RAIS": [36.744, 3.04],
  "Algiers/EL MOURADIA": [36.749, 3.05],
  "Algiers/DELY IBRAHIM": [36.756, 2.985],
  "Algiers/BAB EZZOUAR": [36.721, 3.183],
  "Algiers/BIRKHADEM": [36.715, 3.05],
  "Algiers/KOUBA": [36.727, 3.085],
  "Algiers/BAB EL OUED": [36.79, 3.051],
  "Algiers/CASBAH": [36.785, 3.06],
  "Algiers/AIN BENIAN": [36.803, 2.922],
  "Algiers/BORDJ EL KIFFAN": [36.748, 3.193],
  "Algiers/MOHAMMADIA": [36.733, 3.145],
  "Algiers/AIN TAYA": [36.793, 3.287],
  "Algiers/HUSSEIN DEY": [36.74, 3.095],
  "Algiers/BOUZAREAH": [36.79, 3.017],
  "Oran/ORAN": [35.697, -0.631],
  "Oran/AIN TURK": [35.743, -0.759],
  "Oran/ARZEW": [35.854, -0.319],
  "Oran/ES SENIA": [35.648, -0.623],
  "Constantine/CONSTANTINE": [36.365, 6.615],
  "Constantine/ALI MENDJELI": [36.248, 6.57],
  "Constantine/EL KHROUB": [36.263, 6.693],
  "Tipaza/TIPAZA": [36.589, 2.447],
  "Tipaza/BOU ISMAIL": [36.643, 2.69],
  "Tipaza/KOLEA": [36.639, 2.768],
  "Blida/BLIDA": [36.47, 2.828],
  "Blida/MEFTAH": [36.62, 3.223],
  "Béjaïa/BEJAIA": [36.751, 5.056],
  "Béjaïa/TICHY": [36.667, 5.133],
  "Annaba/ANNABA": [36.9, 7.766],
  "Annaba/EL BOUNI": [36.861, 7.718],
  "Tlemcen/TLEMCEN": [34.878, -1.315],
  "Tlemcen/MAGHNIA": [34.846, -1.73],
  "Sétif/SETIF": [36.19, 5.41],
  "Tizi Ouzou/TIZI OUZOU": [36.717, 4.05],
};

// ---------------------------------------------------------------------------
// Listing descriptions (simple HTML, as the editors produce)
// ---------------------------------------------------------------------------
const DESC = {
  1: `<p>A bright <strong>four-room apartment on the 6th floor</strong> of a secure residence in the heart of Hydra, with an open view over the bay of Algiers from the living room and the master bedroom.</p><p>The apartment was fully renovated in 2024: new electrics, double glazing throughout, Italian tiles and a fitted kitchen with a separate laundry area.</p><ul><li>3 bedrooms, including a master suite with its own bathroom</li><li>Private underground parking space and storage cellar</li><li>Lift, 24/7 caretaker and backup generator</li><li>Livret foncier ready, notary file can be opened immediately</li></ul>`,
  2: `<p>Move straight in: this <strong>furnished F3 in El Mouradia</strong> is let with everything you need, from the bedding to the washing machine. It sits on a quiet tree-lined street, a few minutes' walk from the shops of Didouche Mourad.</p><ul><li>2 bedrooms and a bright double living room</li><li>Equipped kitchen, air conditioning in every room</li><li>Internet included in the rent</li><li>Ideal for professionals and expatriate families</li></ul><p>Minimum lease of one year, three months' deposit.</p>`,
  3: `<p>An architect-designed <strong>contemporary villa</strong> on a 600 m² plot in one of Dely Ibrahim's most sought-after streets. Large glass bays open the living spaces onto a landscaped garden and a <strong>10 × 4 m swimming pool</strong>.</p><ul><li>5 bedrooms, 4 bathrooms, separate guest suite on the ground floor</li><li>Double living room with fireplace, professional kitchen</li><li>Garage for three cars, staff quarters, solar water heating</li><li>Close to international schools and the Cheraga business district</li></ul><p>A rare property, shown by appointment only.</p>`,
  4: `<p>A 220 m² <strong>open-plan office floor</strong> in a modern tower of the Bab Ezzouar business district, facing the shopping centre and a short walk from the tramway.</p><ul><li>Raised floors and cable trays already in place</li><li>Two meeting rooms, kitchenette and separate toilets</li><li>Central air conditioning, fibre optic connection</li><li>Four reserved parking spaces in the basement</li></ul><p>Suits a regional head office, a start-up or a training centre. Commercial lease, three years renewable.</p>`,
  5: `<p>Wake up to the sea in this <strong>F3 inside the Bou Ismail marina residence</strong>, 40 minutes from Algiers. The apartment opens onto a 12 m² terrace looking straight over the port.</p><ul><li>2 bedrooms, bright living room, independent kitchen</li><li>Residence with a guarded gate, garden and children's play area</li><li>Beach, cafés and the fishing port within walking distance</li></ul><p>Perfect as a main home or as a holiday apartment that rents easily in summer.</p>`,
  6: `<p>A <strong>street-level shop with a 7-metre frontage</strong> on one of Birkhadem's busiest avenues, between a bakery and a pharmacy.</p><ul><li>85 m² sales area plus a 20 m² back store</li><li>Metal shutter, alarm and three-phase electricity</li><li>Heavy foot traffic all day, easy parking nearby</li></ul><p>Suitable for ready-to-wear, a phone shop, a pharmacy or a café (subject to permits).</p>`,
  7: `<p>A <strong>renovated F4 on the 2nd floor</strong> of a well-kept building in Kouba, five minutes from the metro station and the Garidi market.</p><ul><li>3 bedrooms, living room with balcony</li><li>New kitchen and bathroom, PVC double glazing</li><li>Quiet street, close to schools and the university</li></ul>`,
  8: `<p>A cosy F2 in Bab El Oued, a short walk from the seafront promenade and the Triolet market.</p><ul><li>One bedroom, living room, kitchen and bathroom</li><li>3rd floor without lift</li></ul>`,
  9: `<p>A genuine <strong>dar in the Casbah of Algiers</strong>, a UNESCO World Heritage site, built around its central patio with original columns and zellige tiles.</p><ul><li>Three levels with six rooms around the patio</li><li>Rooftop terrace with a view over the old town and the port</li><li>Structure sound, interior to restore</li></ul><p>For buyers who love heritage: restoration work in the Casbah follows the rules of the safeguarding plan.</p>`,
  10: `<p>A practical studio close to the beach in Aïn Benian, ideal for a student or a young professional.</p><ul><li>Kitchenette, shower room, small balcony</li><li>Bus to the city centre at the foot of the building</li></ul>`,
  11: `<p>A <strong>family villa with a 300 m² garden</strong> in a quiet residential area of Bordj El Kiffan, ten minutes from the beach and the airport road.</p><ul><li>4 bedrooms over two floors, two bathrooms</li><li>Large living room opening onto a covered terrace</li><li>Garage, borehole water and fruit trees</li></ul><p>An offer has been accepted; visits are still possible as a back-up.</p>`,
  12: `<p>A well-kept F3 in Mohammadia facing the Grand Mosque of Algiers, in a recent residence with a lift and parking.</p><ul><li>2 bedrooms, living room with balcony</li><li>Close to the Ardis shopping centre and the tramway</li></ul>`,
  13: `<p>A <strong>duplex penthouse</strong> on the top floors of a small residence in Aïn Taya, crowned by a 60 m² roof terrace with a view of the sea and the Bay of Algiers.</p><ul><li>Living room and kitchen on the lower level, 3 bedrooms upstairs</li><li>Two bathrooms, one with a walk-in shower</li><li>Outdoor kitchen and barbecue area on the terrace</li><li>Private parking space</li></ul>`,
  14: `<p>On the <strong>Front de Mer boulevard</strong>, this F4 offers one of the finest views in Oran: the whole bay, from the port to the Santa Cruz chapel.</p><ul><li>3 bedrooms, double living room with a wide balcony</li><li>Original high ceilings and parquet, renovated kitchen</li><li>Building with lift and caretaker, close to the Place du 1er Novembre</li></ul><p>Walk to the theatre, cafés and the business district.</p>`,
  15: `<p>A summer-ready <strong>F3 rental in Aïn El Turck, 200 metres from the beach</strong>. Available for a one-year lease or by the season.</p><ul><li>2 bedrooms, air-conditioned living room</li><li>Fully furnished and equipped</li><li>Private parking in the residence</li></ul>`,
  16: `<p>An <strong>18-room boutique hotel</strong> in Arzew, a few minutes from the industrial zone and its steady flow of business travellers.</p><ul><li>18 en-suite rooms over four floors</li><li>Reception, breakfast room and a ground-floor restaurant</li><li>Car park for 15 vehicles</li><li>Operating licence and staff can be taken over</li></ul><p>Accounts available to serious buyers after a first meeting.</p>`,
  17: `<p><strong>Fitted offices in Oran city centre</strong>, on the 4th floor of a business building on Boulevard de la Soummam.</p><ul><li>160 m²: six private offices and an open space</li><li>Meeting room, archive room and kitchenette</li><li>Air conditioning, fibre and access control</li></ul><p>Available immediately, ideal for a law firm, an insurer or a consultancy.</p>`,
  18: `<p>A single-storey <strong>house with a traditional courtyard</strong> in Es Senia, close to the university and the airport.</p><ul><li>3 bedrooms around a shaded central courtyard</li><li>Summer kitchen, garage and roof terrace</li><li>Permit for an additional floor</li></ul>`,
  19: `<p>A <strong>brand-new F4</strong> in a recently delivered residence in Ali Mendjeli (Unit 8), near the tramway and the university hospital.</p><ul><li>3 bedrooms, living room with balcony</li><li>Lift, intercom and closed parking</li><li>Shops, schools and mosque within the residence's block</li></ul><p>Eligible for bank financing, act delivered at signing.</p>`,
  20: `<p>An F3 with a <strong>view of the Sidi M'Cid bridge</strong> and the Rhumel gorges, in the city centre of Constantine.</p><ul><li>2 bedrooms, living room and dining room</li><li>Renovated bathroom, gas central heating</li><li>Walk to the old town, the souks and the Emir Abdelkader mosque</li></ul>`,
  21: `<p>A <strong>1,200 m² warehouse</strong> on a 2,000 m² plot in the El Khroub industrial zone, with direct access to the East-West motorway.</p><ul><li>8 m clear height, two loading docks and a ground-level door</li><li>Offices and staff facilities on a mezzanine</li><li>Three-phase power, fire network, fenced and guarded yard</li></ul>`,
  22: `<p>A villa a few steps from the <strong>Roman ruins and the beaches of Tipaza</strong>, on a 500 m² plot planted with olive and lemon trees.</p><ul><li>4 bedrooms, two living rooms, two bathrooms</li><li>Terrace with sea view, summer kitchen</li><li>Garage and independent studio for guests</li></ul>`,
  23: `<p>A corner shop in Koléa town centre with two glass frontages, next to the main square.</p><ul><li>60 m² on one level, toilet and storage</li><li>Suitable for any retail business</li></ul>`,
  24: `<p>A quiet <strong>F3 in Blida</strong> with a view of the Chréa mountains, in a residential neighbourhood close to the city centre and the orange groves.</p><ul><li>2 bedrooms, living room with balcony</li><li>Fitted kitchen, gas heating</li><li>Close to schools, the market and the train station to Algiers</li></ul><p>I'm the owner and I answer every message myself.</p>`,
  25: `<p>A sunny <strong>F4 overlooking the Gulf of Béjaïa</strong>, on the 5th floor of a building with a lift, between the port and the old town.</p><ul><li>3 bedrooms, double living room</li><li>Two balconies, one facing the sea</li><li>Recently renovated kitchen and bathroom</li><li>Close to the university and the beaches of the corniche</li></ul>`,
  26: `<p>A <strong>furnished F2 in Hussein Dey</strong>, right behind the tramway stop, ideal for a couple or a young professional working in central Algiers.</p><ul><li>One bedroom, living room, equipped kitchen</li><li>Washing machine, fridge, air conditioning</li><li>3rd floor, well-kept building</li></ul>`,
  27: `<p>A <strong>Kabyle-style stone house</strong> surrounded by a 1,500 m² olive grove, 15 minutes from Tizi Ouzou city centre.</p><ul><li>4 bedrooms, large living room with fireplace</li><li>Spring water, outbuildings and a covered terrace</li><li>Panoramic view of the Djurdjura</li></ul>`,
  28: `<p>F3 for sale in Sétif centre.</p>`,
  29: `<p>A well-kept F3 in Bab Ezzouar, close to the USTHB university and the shopping centre.</p><ul><li>2 bedrooms, living room, balcony</li><li>Lift and caretaker</li></ul>`,
  30: `<p>A <strong>seafront F3 rental in Annaba</strong>, on the Saint-Cloud beach promenade, available for a one-year lease.</p><ul><li>2 bedrooms, living room with a sea-view balcony</li><li>Furnished and air-conditioned</li><li>Cafés and restaurants at the foot of the building</li></ul>`,
  31: `<p>A <strong>renovated F3 in El Bouni</strong>, in a quiet residence close to schools, the market and the main road to Annaba centre.</p><ul><li>2 bedrooms, bright living room</li><li>New kitchen, PVC windows, reinforced door</li><li>Parking in the residence</li></ul><p>Livret foncier available, sale through a notary.</p>`,
  32: `<p>A <strong>restored dar in Tlemcen's old medina</strong>, a few minutes from the Great Mosque and the Mechouar. The patio, carved plaster and cedar ceilings have been carefully restored by local craftsmen.</p><ul><li>5 rooms around the central patio, two bathrooms</li><li>Modern kitchen discreetly integrated</li><li>Roof terrace overlooking the minarets of the old town</li></ul><p>A unique home, or an exceptional guest house project.</p>`,
  33: `<p>A shop on <strong>Maghnia's main commercial street</strong>, with heavy foot traffic all week.</p><ul><li>50 m² with a mezzanine for storage</li><li>Metal shutter, toilet, water and electricity meters in the tenant's name</li></ul>`,
  34: `<p>A villa with an orchard on the road to Lalla Setti, with a clear view over Tlemcen.</p><ul><li>4 bedrooms, two bathrooms, garage</li><li>800 m² plot with cherry and fig trees</li></ul>`,
  35: `<p>A spacious <strong>F4 near Aïn El Fouara</strong> in the centre of Sétif, close to the shops, the park and the tramway.</p><ul><li>3 bedrooms, living room, separate dining room</li><li>Central heating, essential for Sétif winters</li><li>Second floor, quiet building</li></ul>`,
  36: `<p>A <strong>seaside studio in Tichy</strong>, 100 metres from the beach, sold furnished. A great first purchase or a holiday rental investment.</p><ul><li>Studio with sleeping alcove, kitchenette and shower room</li><li>Balcony with a side view of the sea</li><li>Residence with parking</li></ul>`,
  37: `<p>A <strong>storage warehouse with a yard</strong> in Meftah, on the road between Blida and Algiers.</p><ul><li>800 m² covered space, 6 m height</li><li>1,000 m² fenced yard for trucks</li><li>Office, toilet and guard room</li></ul>`,
  38: `<p>A <strong>family F4 in Koléa</strong> with a view of the gardens, in a calm neighbourhood a few minutes from the town centre.</p><ul><li>3 bedrooms, living room with balcony</li><li>Kitchen with pantry, separate toilet and bathroom</li><li>Schools and the market nearby</li></ul>`,
  39: `<p>F5 in Bouzareah, urgent sale, price negotiable. Deposit required to book a visit.</p>`,
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------
export function buildSeed() {
  const NOW = Date.now();
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;
  const at = (hoursAgo) => new Date(NOW - hoursAgo * HOUR);
  const iso = (hoursAgo) => at(hoursAgo).toISOString();
  const d = (days, extraHours = 0) => days * 24 + extraHours; // days ago → hours ago
  const dateStr = (daysFromNow) => new Date(NOW + daysFromNow * DAY).toISOString().slice(0, 10);
  const yearsFromNow = (y) => new Date(NOW + y * 365.25 * DAY).toISOString();
  const rnd = prng(20261031);

  // ---------------- Users ----------------
  const U = {
    admin: 1, ops: 2, sara: 3, karim: 4, yacine: 5, nadia: 6, mehdi: 7, riad: 8, amel: 9, sofiane: 10,
    hichem: 11, wassila: 12, farid: 13, rachid: 14, samir: 15, kamel: 16, leila: 17, djamel: 18,
    imane: 19, omar: 20, nour: 21, walid: 22, rania: 23, adel: 24, meriem: 25, bilal: 26,
    yasmina: 27, nassim: 28, hocine: 29, amina: 30,
  };

  const user = (id, email, username, created, extra = {}) => ({
    id,
    email,
    username,
    password: PASSWORD_HASH,
    avatar: null,
    role: "client",
    accountType: "individual",
    createdAt: iso(created),
    updatedAt: iso(Math.max(0.5, created - 24)),
    phone: null,
    status: "active",
    statusReason: null,
    verified: false,
    lastLoginAt: iso(Math.max(0.2, Math.min(created, 2 + (id % 7) * 5))),
    passwordChangedAt: null,
    agencyId: null,
    agencyRole: null,
    agencyActive: true,
    ...extra,
  });
  const member = (agencyId, agencyRole, extra = {}) => ({ accountType: "agency", agencyId, agencyRole, ...extra });

  const User = [
    user(U.admin, "admin@bayti.dz", "Amine Boudiaf", d(120), { role: "admin", avatar: avatar(2379004), phone: "+213 550 10 20 30", lastLoginAt: iso(0.3) }),
    user(U.ops, "ops@bayti.dz", "Lina Cherif", d(110), { role: "admin", avatar: avatar(1239291), phone: "+213 550 10 20 31", lastLoginAt: iso(5) }),
    user(U.sara, "client@bayti.dz", "Sara Benali", d(75), { avatar: avatar(774909), phone: "0550 12 34 56", lastLoginAt: iso(1) }),
    user(U.karim, "seller@bayti.dz", "Karim Haddad", d(70), { avatar: avatar(220453), phone: "0661 45 78 12", lastLoginAt: iso(3) }),
    user(U.yacine, "invited@bayti.dz", "Yacine Mansouri", d(40), { avatar: avatar(1222271), phone: "0770 33 21 09", lastLoginAt: iso(30) }),
    user(U.nadia, "agency@bayti.dz", "Nadia Ouali", d(92), member(1, "owner", { avatar: avatar(733872), phone: "0560 11 22 33", lastLoginAt: iso(0.8) })),
    user(U.mehdi, "manager@bayti.dz", "Mehdi Saadi", d(80), member(1, "manager", { avatar: avatar(2379004), phone: "0560 44 55 66", lastLoginAt: iso(4) })),
    user(U.riad, "agent@bayti.dz", "Riad Belkacem", d(78), member(1, "agent", { avatar: avatar(220453), phone: "0560 77 88 99", lastLoginAt: iso(2) })),
    user(U.amel, "amel.kaci@immoeldjazair.dz", "Amel Kaci", d(64), member(1, "agent", { avatar: avatar(1239291), phone: "0560 21 43 65", lastLoginAt: iso(6) })),
    user(U.sofiane, "sofiane.larbi@immoeldjazair.dz", "Sofiane Larbi", d(76), member(1, "agent", { agencyActive: false, phone: "0560 98 76 54", lastLoginAt: iso(d(13)) })),
    user(U.hichem, "oran@bayti.dz", "Hichem Bensalah", d(89), member(2, "owner", { avatar: avatar(1222271), phone: "0541 23 45 67", lastLoginAt: iso(7) })),
    user(U.wassila, "w.boukhari@oranprestige.dz", "Wassila Boukhari", d(68), member(2, "agent", { avatar: avatar(774909), phone: "0541 76 54 32", lastLoginAt: iso(20) })),
    user(U.farid, "habitat@bayti.dz", "Farid Zerrouki", d(87), member(3, "owner", { avatar: avatar(2379004), phone: "0661 90 80 70", lastLoginAt: iso(26) })),
    user(U.rachid, "sahel@bayti.dz", "Rachid Hamidi", d(85), member(4, "owner", { phone: "0699 12 12 12", lastLoginAt: iso(d(3)) })),
    user(U.samir, "applicant@bayti.dz", "Samir Djebbar", d(20), { accountType: "agency", avatar: avatar(1222271), phone: "0661 55 44 33", lastLoginAt: iso(d(2)) }),
    user(U.kamel, "k.aouadi@tlemcen-conseil.dz", "Kamel Aouadi", 46, { accountType: "agency", phone: "0555 61 72 83", lastLoginAt: iso(20) }),
    user(U.leila, "contact@bejaia-littoral.dz", "Leila Hamdani", d(10), { accountType: "agency", avatar: avatar(733872), phone: "0770 61 62 63", lastLoginAt: iso(d(1)) }),
    user(U.djamel, "djamel.ferhat@mail.dz", "Djamel Ferhat", d(45), { accountType: "agency", phone: "0662 14 25 36", lastLoginAt: iso(d(37)) }),
    user(U.imane, "imane.touati@mail.dz", "Imane Touati", d(55), { avatar: avatar(733872), phone: "0551 87 65 43", lastLoginAt: iso(9) }),
    user(U.omar, "omar.benyoucef@mail.dz", "Omar Benyoucef", d(50), { phone: "0662 30 40 50", lastLoginAt: iso(28) }),
    user(U.nour, "nour.saidi@mail.dz", "Nour El Houda Saidi", d(35), { avatar: avatar(1239291), phone: "0771 18 29 30", lastLoginAt: iso(30) }),
    user(U.walid, "walid.meziane@mail.dz", "Walid Meziane", d(48), {
      status: "suspended",
      statusReason: "Several reports of a fake listing using stolen photos and asking for a deposit before visits. Suspended after review.",
      lastLoginAt: iso(d(23)),
    }),
    user(U.rania, "rania.bouzid@mail.dz", "Rania Bouzid", d(6), { avatar: avatar(774909), lastLoginAt: iso(d(2)) }),
    user(U.adel, "adel.khelifi@mail.dz", "Adel Khelifi", d(4), { lastLoginAt: iso(19) }),
    user(U.meriem, "meriem.aitali@mail.dz", "Meriem Ait Ali", d(1, 2), { avatar: avatar(1239291), lastLoginAt: iso(5) }),
    user(U.bilal, "bilal.ghezali@mail.dz", "Bilal Ghezali", d(3, 12), { lastLoginAt: iso(d(1)) }),
    user(U.yasmina, "yasmina.rahmani@mail.dz", "Yasmina Rahmani", d(30), { avatar: avatar(733872), phone: "0552 63 74 85", lastLoginAt: iso(10) }),
    user(U.nassim, "nassim.belaid@mail.dz", "Nassim Belaid", d(58), { avatar: avatar(220453), phone: "0663 52 41 30", lastLoginAt: iso(d(1, 4)) }),
    user(U.hocine, "hocine.mebarki@mail.dz", "Hocine Mebarki", 6, { lastLoginAt: iso(2.5) }),
    user(U.amina, "amina.brahimi@mail.dz", "Amina Brahimi", d(12), { avatar: avatar(774909), lastLoginAt: iso(d(1, 6)) }),
  ];
  const userById = new Map(User.map((u) => [u.id, u]));

  // ---------------- Agencies ----------------
  const Agency = [
    {
      id: 1,
      ownerId: U.nadia,
      entityType: "legal_entity",
      legalName: "SARL Immo El Djazair",
      tradeName: "Immo El Djazair",
      legalForm: "SARL",
      rcNumber: "16/00-0987654 B 18",
      nif: "001816098765432",
      nis: "001816010987654",
      articleImposition: "16017234561",
      address: "12 Rue Ahmed Ouaked, Hydra",
      wilaya: "Algiers",
      commune: "Hydra",
      phone: "+213 23 48 12 90",
      email: "contact@immoeldjazair.dz",
      website: "https://immoeldjazair.dz",
      logo: avatar(1170412),
      about:
        "Immo El Djazair has helped families and businesses buy, sell and rent in Algiers since 2018. Our team of five covers Hydra, El Mouradia, Dely Ibrahim and the eastern coast, and every property we list has been visited and checked by one of our agents.\n\nWe handle the whole process: valuation, photos, visits, negotiation and the notary file.",
      repFullName: "Nadia Ouali",
      repPosition: "Gérante",
      repPhone: "0560 11 22 33",
      repEmail: "agency@bayti.dz",
      approvalNumber: "AGR/16/2023/0457",
      approvalWilaya: "Algiers",
      approvalIssueDate: yearsFromNow(-2.6),
      approvalExpiryDate: yearsFromNow(2.4),
      status: "active",
      statusReason: null,
      verification: "verified",
      verificationNote: null,
      verifiedAt: iso(d(86)),
      createdAt: iso(d(86)),
      updatedAt: iso(d(7)),
    },
    {
      id: 2,
      ownerId: U.hichem,
      entityType: "legal_entity",
      legalName: "EURL Oran Prestige Immobilier",
      tradeName: "Oran Prestige Immobilier",
      legalForm: "EURL",
      rcNumber: "31/00-0456123 B 15",
      nif: "001531045612398",
      nis: "001531020456789",
      articleImposition: "31012345678",
      address: "4 Boulevard de la Soummam",
      wilaya: "Oran",
      commune: "Oran",
      phone: "+213 41 33 22 11",
      email: "contact@oranprestige.dz",
      website: "https://oranprestige.dz",
      logo: avatar(380768),
      about:
        "Oran Prestige Immobilier specialises in seafront apartments, prime offices and hospitality assets across the wilaya of Oran, from the Front de Mer to Aïn El Turck and Arzew.",
      repFullName: "Hichem Bensalah",
      repPosition: "Gérant",
      repPhone: "0541 23 45 67",
      repEmail: "oran@bayti.dz",
      approvalNumber: "AGR/31/2022/0112",
      approvalWilaya: "Oran",
      approvalIssueDate: yearsFromNow(-3.1),
      approvalExpiryDate: yearsFromNow(1.9),
      status: "active",
      verification: "verified",
      verifiedAt: iso(d(88)),
      createdAt: iso(d(88)),
      updatedAt: iso(d(30)),
    },
    {
      id: 3,
      ownerId: U.farid,
      entityType: "legal_entity",
      legalName: "SARL Constantine Habitat",
      tradeName: "Constantine Habitat",
      legalForm: "SARL",
      rcNumber: "25/00-0334455 B 12",
      nif: "001225033445566",
      nis: "001225010334455",
      address: "Cité Daksi, Bt 14",
      wilaya: "Constantine",
      commune: "Constantine",
      phone: "+213 31 92 45 67",
      email: "contact@constantine-habitat.dz",
      website: "https://constantine-habitat.dz",
      logo: avatar(269077),
      about: "New-build apartments in Ali Mendjeli, family rentals in the city centre and warehouses in the El Khroub industrial zone.",
      repFullName: "Farid Zerrouki",
      repPosition: "Gérant",
      repPhone: "0661 90 80 70",
      repEmail: "habitat@bayti.dz",
      approvalNumber: "AGR/25/2021/0078",
      approvalWilaya: "Constantine",
      approvalIssueDate: yearsFromNow(-4.9),
      approvalExpiryDate: yearsFromNow(0.1),
      status: "active",
      verification: "revoked",
      verificationNote:
        "The agrément renewal submitted by the agency could not be confirmed with the wilaya of Constantine. The badge will be restored once a valid, renewed agrément is on file.",
      verifiedAt: iso(d(87)),
      createdAt: iso(d(87)),
      updatedAt: iso(d(14)),
    },
    {
      id: 4,
      ownerId: U.rachid,
      entityType: "natural_person",
      legalName: "Rachid Hamidi",
      tradeName: "Sahel Immobilier",
      rcNumber: "42/00-0221133 A 19",
      nif: "198742022113300",
      address: "Rue de la Gare, Tipaza",
      wilaya: "Tipaza",
      commune: "Tipaza",
      phone: "+213 24 46 10 20",
      email: "sahel.immobilier@mail.dz",
      logo: avatar(1170412),
      about: "Holiday villas and shops along the Tipaza coast.",
      repFullName: "Rachid Hamidi",
      repPosition: "Agent immobilier",
      approvalNumber: "AGR/42/2022/0031",
      approvalWilaya: "Tipaza",
      approvalIssueDate: yearsFromNow(-2.2),
      approvalExpiryDate: yearsFromNow(2.8),
      status: "suspended",
      statusReason:
        "Several clients reported deposits taken for visits of properties that were already rented. Suspended while we investigate with the agency's manager.",
      verification: "verified",
      verifiedAt: iso(d(85)),
      createdAt: iso(d(85)),
      updatedAt: iso(d(20)),
    },
  ];

  // ---------------- Listings ----------------
  const RES = [1918291, 1428348, 2062426, 2467285, 2029667, 271816, 276625, 276724, 91227, 106399, 323780, 1396122, 280222, 1571460, 1643383, 259588, 534151, 2102587, 1029599, 1080721, 2121121, 1457842, 1643384, 2635038, 1546168, 210617, 7031407];
  const HOUSE = [1396122, 106399, 259588, 323780, 280222, 2102587, 1029599, 1080721, 7031407];
  const OFFICE = [1170412, 380768, 269077];

  const L = (o) => o; // listing spec
  const specs = [
    // Immo El Djazair (agency 1)
    L({ id: 1, title: "Bright F4 with sea view in Hydra", price: 58000000, type: "buy", property: "residential", propertyType: "apartment", city: "Algiers", district: "BIR MOURAD RAIS", address: "Résidence Les Pins, Chemin Mackley, Hydra", bedroom: 3, bathroom: 2, size: 145, agencyId: 1, userId: U.riad, createdById: U.riad, created: 62, featured: true, photos: [1643383, 1571460, 1457842, 2635038, 2121121], furnished: "no", nearby: ["primarySchool", "kindergarten", "carPark", "transportation", "mosque", "pharmacy", "commercialArea"] }),
    L({ id: 2, title: "Furnished F3 in El Mouradia", price: 120000, type: "rent", property: "residential", propertyType: "apartment", city: "Algiers", district: "EL MOURADIA", address: "Rue Mohamed Boudiaf, El Mouradia", bedroom: 2, bathroom: 1, size: 95, agencyId: 1, userId: U.amel, createdById: U.amel, created: 40, photos: [1918291, 2062426, 276724, 1643384], furnished: "yes", utilities: "tenant", pet: "not-allowed", nearby: ["transportation", "pharmacy", "commercialArea", "university"] }),
    L({ id: 3, title: "Contemporary villa with pool in Dely Ibrahim", price: 145000000, type: "buy", property: "residential", propertyType: "individual_house", city: "Algiers", district: "DELY IBRAHIM", address: "Lotissement El Bina, Dely Ibrahim", bedroom: 5, bathroom: 4, size: 420, agencyId: 1, userId: U.nadia, createdById: U.nadia, created: 80, featured: true, photos: [323780, 1396122, 2102587, 1571460, 1643383], furnished: "no", pet: "allowed", nearby: ["primarySchool", "highSchool", "carPark", "mosque", "commercialArea"] }),
    L({ id: 4, title: "Open-plan office floor in Bab Ezzouar business district", price: 280000, type: "rent", property: "commercial", propertyType: "office", city: "Algiers", district: "BAB EZZOUAR", address: "Tour Mohammadia, Quartier d'affaires, Bab Ezzouar", bedroom: 0, bathroom: 2, size: 220, agencyId: 1, userId: null, createdById: U.mehdi, created: 55, photos: [1170412, 380768, 269077], utilities: "tenant", nearby: ["carPark", "transportation", "commercialArea", "university"] }),
    L({ id: 5, title: "Seafront F3 in the Bou Ismail marina", price: 24500000, type: "buy", property: "residential", propertyType: "apartment", city: "Tipaza", district: "BOU ISMAIL", address: "Résidence La Marina, Bou Ismail", bedroom: 2, bathroom: 1, size: 88, agencyId: 1, userId: U.riad, createdById: U.riad, created: 28, photos: [2467285, 1080721, 276625, 210617], nearby: ["carPark", "mosque", "pharmacy", "commercialArea"] }),
    L({ id: 6, title: "Street-level shop on a busy Birkhadem avenue", price: 150000, type: "rent", property: "commercial", propertyType: "retail", city: "Algiers", district: "BIRKHADEM", address: "Avenue du 1er Novembre, Birkhadem", bedroom: 0, bathroom: 1, size: 85, agencyId: 1, userId: U.mehdi, createdById: U.mehdi, created: 35, photos: [269077, 1170412, 2635038], utilities: "tenant", nearby: ["transportation", "pharmacy", "commercialArea", "carPark"] }),
    L({ id: 7, title: "Renovated F4 near Kouba metro", price: 32000000, type: "buy", property: "residential", propertyType: "apartment", city: "Algiers", district: "KOUBA", address: "Rue des Frères Bouadou, Kouba", bedroom: 3, bathroom: 1, size: 110, agencyId: 1, userId: U.riad, createdById: U.riad, createdHours: 20, status: "pending", photos: [91227, 1029599, 2029667, 271816], nearby: ["primarySchool", "middleSchool", "transportation", "university", "mosque"] }),
    L({ id: 8, title: "F2 in Bab El Oued near the seafront", price: 55000, type: "rent", property: "residential", propertyType: "apartment", city: "Algiers", district: "BAB EL OUED", address: "Rue Mohamed Larbi Ben M'hidi, Bab El Oued", bedroom: 1, bathroom: 1, size: 52, agencyId: 1, userId: U.amel, createdById: U.amel, created: 6, status: "rejected", reviewNote: "The photos show a different building from the address given, and the rent doesn't say whether the monthly charges are included. Please upload photos of this apartment and confirm the rent.", photos: [534151, 1546168, 7031407], nearby: ["transportation", "commercialArea"] }),
    L({ id: 9, title: "Traditional Casbah house (dar) to restore", price: 18000000, type: "buy", property: "residential", propertyType: "traditional_house", city: "Algiers", district: "CASBAH", address: "Rue Sidi Ramdane, Casbah", bedroom: 6, bathroom: 1, size: 180, agencyId: 1, userId: U.riad, createdById: U.riad, created: 70, hiddenByOwner: true, hiddenSince: 15, photos: [280222, 259588, 106399], nearby: ["mosque", "commercialArea", "transportation"] }),
    L({ id: 10, title: "Studio close to the beach in Aïn Benian", price: 45000, type: "rent", property: "residential", propertyType: "apartment", city: "Algiers", district: "AIN BENIAN", address: "Boulevard du Front de Mer, Aïn Benian", bedroom: 1, bathroom: 1, size: 34, agencyId: 1, userId: null, createdById: U.sofiane, created: 84, status: "archived", photos: [1643384, 2121121, 1457842], furnished: "yes", nearby: ["transportation", "commercialArea"] }),
    L({ id: 11, title: "Family villa with garden in Bordj El Kiffan", price: 68000000, type: "buy", property: "residential", propertyType: "individual_house", city: "Algiers", district: "BORDJ EL KIFFAN", address: "Cité des Pins, Bordj El Kiffan", bedroom: 4, bathroom: 2, size: 260, agencyId: 1, userId: U.amel, createdById: U.sofiane, created: 50, availability: "under_offer", photos: [1080721, 1029599, 2102587, 1918291], pet: "allowed", nearby: ["primarySchool", "middleSchool", "mosque", "carPark", "pharmacy"] }),
    L({ id: 12, title: "F3 in Mohammadia facing the Grand Mosque", price: 27500000, type: "buy", property: "residential", propertyType: "apartment", city: "Algiers", district: "MOHAMMADIA", address: "Résidence El Feth, Mohammadia", bedroom: 2, bathroom: 1, size: 82, agencyId: 1, userId: U.riad, createdById: U.riad, created: 75, availability: "sold", soldSince: 30, photos: [276625, 2029667, 271816], nearby: ["mosque", "transportation", "commercialArea", "carPark"] }),
    L({ id: 13, title: "Duplex penthouse with roof terrace in Aïn Taya", price: 39000000, type: "buy", property: "residential", propertyType: "other_residential", city: "Algiers", district: "AIN TAYA", address: "Route de la Plage, Aïn Taya", bedroom: 3, bathroom: 2, size: 160, agencyId: 1, userId: null, createdById: U.mehdi, created: 22, photos: [2635038, 1643383, 210617, 1546168, 91227], nearby: ["carPark", "kindergarten", "commercialArea"] }),

    // Oran Prestige Immobilier (agency 2)
    L({ id: 14, title: "Front de Mer F4 with panoramic bay view", price: 36000000, type: "buy", property: "residential", propertyType: "apartment", city: "Oran", district: "ORAN", address: "Boulevard de l'ALN (Front de Mer), Oran", bedroom: 3, bathroom: 2, size: 128, agencyId: 2, userId: U.hichem, createdById: U.hichem, created: 66, featured: true, photos: [1571460, 2467285, 1457842, 276724, 1643384], nearby: ["transportation", "pharmacy", "commercialArea", "university", "mosque"] }),
    L({ id: 15, title: "F3 rental in Aïn El Turck, 200 m from the beach", price: 85000, type: "rent", property: "residential", propertyType: "apartment", city: "Oran", district: "AIN TURK", address: "Plage Les Andalouses road, Aïn El Turck", bedroom: 2, bathroom: 1, size: 80, agencyId: 2, userId: U.wassila, createdById: U.wassila, created: 30, photos: [210617, 1918291, 2062426], furnished: "yes", utilities: "tenant", nearby: ["carPark", "commercialArea"] }),
    L({ id: 16, title: "18-room boutique hotel in Arzew", price: 135000000, type: "buy", property: "commercial", propertyType: "hospitality", city: "Oran", district: "ARZEW", address: "Boulevard Larbi Ben M'hidi, Arzew", bedroom: 0, bathroom: 18, size: 900, agencyId: 2, userId: U.hichem, createdById: U.hichem, created: 48, photos: [271816, 276724, 380768, 2029667], furnished: "yes", nearby: ["carPark", "transportation", "commercialArea"] }),
    L({ id: 17, title: "Fitted offices on Boulevard de la Soummam", price: 190000, type: "rent", property: "commercial", propertyType: "office", city: "Oran", district: "ORAN", address: "Boulevard de la Soummam, Oran", bedroom: 0, bathroom: 2, size: 160, agencyId: 2, userId: U.hichem, createdById: U.wassila, created: 18, photos: [380768, 1170412, 269077], utilities: "tenant", nearby: ["transportation", "carPark", "commercialArea"] }),
    L({ id: 18, title: "Single-storey house with courtyard in Es Senia", price: 21000000, type: "buy", property: "residential", propertyType: "individual_house", city: "Oran", district: "ES SENIA", address: "Cité Es Salam, Es Senia", bedroom: 3, bathroom: 1, size: 190, agencyId: 2, userId: U.wassila, createdById: U.wassila, created: 10, photos: [106399, 259588, 1396122, 534151], pet: "allowed", nearby: ["university", "primarySchool", "mosque"] }),

    // Constantine Habitat (agency 3, verification revoked)
    L({ id: 19, title: "New F4 in Ali Mendjeli, Unit 8", price: 16500000, type: "buy", property: "residential", propertyType: "apartment", city: "Constantine", district: "ALI MENDJELI", address: "UV 8, Ali Mendjeli", bedroom: 3, bathroom: 1, size: 98, agencyId: 3, userId: U.farid, createdById: U.farid, created: 60, photos: [2029667, 271816, 1643384, 91227], nearby: ["primarySchool", "middleSchool", "highSchool", "transportation", "mosque", "pharmacy"] }),
    L({ id: 20, title: "F3 with a view of the Sidi M'Cid bridge", price: 60000, type: "rent", property: "residential", propertyType: "apartment", city: "Constantine", district: "CONSTANTINE", address: "Rue Larbi Ben M'hidi, Constantine", bedroom: 2, bathroom: 1, size: 78, agencyId: 3, userId: U.farid, createdById: U.farid, created: 45, photos: [1546168, 276625, 2121121], utilities: "tenant", nearby: ["transportation", "commercialArea", "mosque", "university"] }),
    L({ id: 21, title: "Warehouse with loading docks in El Khroub", price: 48000000, type: "buy", property: "commercial", propertyType: "industrial", city: "Constantine", district: "EL KHROUB", address: "Zone industrielle, El Khroub", bedroom: 0, bathroom: 2, size: 1200, agencyId: 3, userId: U.farid, createdById: U.farid, created: 25, photos: [269077, 380768, 1170412], nearby: ["carPark", "transportation"] }),

    // Sahel Immobilier (agency 4, suspended)
    L({ id: 22, title: "Villa near the Roman ruins of Tipaza", price: 52000000, type: "buy", property: "residential", propertyType: "individual_house", city: "Tipaza", district: "TIPAZA", address: "Route du Chenoua, Tipaza", bedroom: 4, bathroom: 2, size: 230, agencyId: 4, userId: U.rachid, createdById: U.rachid, created: 72, photos: [2102587, 323780, 1080721], pet: "allowed", nearby: ["carPark", "commercialArea"] }),
    L({ id: 23, title: "Corner shop in Koléa town centre", price: 70000, type: "rent", property: "commercial", propertyType: "retail", city: "Tipaza", district: "KOLEA", address: "Place du 1er Mai, Koléa", bedroom: 0, bathroom: 1, size: 60, agencyId: 4, userId: U.rachid, createdById: U.rachid, created: 64, photos: [1170412, 269077, 534151], utilities: "tenant", nearby: ["transportation", "commercialArea"] }),

    // Sara (individual)
    L({ id: 24, title: "Quiet F3 in Blida with a view of Chréa", price: 48000, type: "rent", property: "residential", propertyType: "apartment", city: "Blida", district: "BLIDA", address: "Cité Ben Boulaïd, Blida", bedroom: 2, bathroom: 1, size: 75, userId: U.sara, created: 26, photos: [2062426, 1918291, 2635038, 276724], utilities: "tenant", pet: "allowed", nearby: ["primarySchool", "transportation", "commercialArea", "mosque"] }),

    // Karim (individual, at his limit of 3 active)
    L({ id: 25, title: "Sunny F4 overlooking the Gulf of Béjaïa", price: 19800000, type: "buy", property: "residential", propertyType: "apartment", city: "Béjaïa", district: "BEJAIA", address: "Rue de la Liberté, Béjaïa", bedroom: 3, bathroom: 1, size: 105, userId: U.karim, created: 52, photos: [2467285, 1457842, 1571460, 210617], nearby: ["university", "transportation", "pharmacy", "commercialArea"] }),
    L({ id: 26, title: "Furnished F2 in Hussein Dey near the tramway", price: 65000, type: "rent", property: "residential", propertyType: "apartment", city: "Algiers", district: "HUSSEIN DEY", address: "Rue Tripoli, Hussein Dey", bedroom: 1, bathroom: 1, size: 55, userId: U.karim, created: 38, photos: [1643384, 2121121, 1546168], furnished: "yes", utilities: "tenant", nearby: ["transportation", "commercialArea", "pharmacy"] }),
    L({ id: 27, title: "Kabyle stone house with olive grove near Tizi Ouzou", price: 14500000, type: "buy", property: "residential", propertyType: "individual_house", city: "Tizi Ouzou", district: "TIZI OUZOU", address: "Village Redjaouna, Tizi Ouzou", bedroom: 4, bathroom: 1, size: 170, userId: U.karim, createdHours: 40, status: "pending", photos: [259588, 106399, 1396122, 280222], pet: "allowed", nearby: ["mosque", "primarySchool"] }),
    L({ id: 28, title: "F3 for sale in Sétif centre", price: 11000000, type: "buy", property: "residential", propertyType: "apartment", city: "Sétif", district: "SETIF", address: "Cité 1014 Logements, Sétif", bedroom: 2, bathroom: 1, size: 70, userId: U.karim, created: 9, status: "rejected", reviewNote: "The listing has a single photo taken from the street and almost no description. Add at least three photos of the inside and describe the rooms, the floor and the condition, then send it back for review.", photos: [7031407, 91227, 1029599], nearby: [] }),
    L({ id: 29, title: "F3 in Bab Ezzouar near USTHB", price: 17500000, type: "buy", property: "residential", propertyType: "apartment", city: "Algiers", district: "BAB EZZOUAR", address: "Cité 5 Juillet, Bab Ezzouar", bedroom: 2, bathroom: 1, size: 72, userId: U.karim, created: 68, availability: "sold", soldSince: 25, photos: [276625, 2029667, 271816], nearby: ["university", "transportation", "commercialArea"] }),

    // Yasmina
    L({ id: 30, title: "Seafront F3 rental on Saint-Cloud beach, Annaba", price: 70000, type: "rent", property: "residential", propertyType: "apartment", city: "Annaba", district: "ANNABA", address: "Boulevard Saint-Cloud, Annaba", bedroom: 2, bathroom: 1, size: 82, userId: U.yasmina, createdHours: 7, status: "pending", photos: [2467285, 1080721, 1643384, 210617], furnished: "yes", utilities: "tenant", nearby: ["commercialArea", "transportation", "pharmacy"] }),
    L({ id: 31, title: "Renovated F3 in El Bouni", price: 13200000, type: "buy", property: "residential", propertyType: "apartment", city: "Annaba", district: "EL BOUNI", address: "Cité Sidi Salem, El Bouni", bedroom: 2, bathroom: 1, size: 76, userId: U.yasmina, created: 21, photos: [1918291, 2062426, 1457842], nearby: ["primarySchool", "middleSchool", "commercialArea", "carPark"] }),

    // Nassim (also at his limit)
    L({ id: 32, title: "Restored dar in Tlemcen's old medina", price: 23000000, type: "buy", property: "residential", propertyType: "traditional_house", city: "Tlemcen", district: "TLEMCEN", address: "Derb Sidi Hamed, Tlemcen", bedroom: 5, bathroom: 2, size: 210, userId: U.nassim, created: 57, featured: true, photos: [280222, 259588, 534151, 1546168, 7031407], nearby: ["mosque", "commercialArea", "pharmacy", "transportation"] }),
    L({ id: 33, title: "Shop on Maghnia's main commercial street", price: 45000, type: "rent", property: "commercial", propertyType: "retail", city: "Tlemcen", district: "MAGHNIA", address: "Avenue de l'ALN, Maghnia", bedroom: 0, bathroom: 1, size: 50, userId: U.nassim, created: 33, photos: [269077, 1170412, 380768], utilities: "tenant", nearby: ["commercialArea", "transportation"] }),
    L({ id: 34, title: "Villa with orchard on the road to Lalla Setti", price: 31000000, type: "buy", property: "residential", propertyType: "individual_house", city: "Tlemcen", district: "TLEMCEN", address: "Route de Lalla Setti, Tlemcen", bedroom: 4, bathroom: 2, size: 240, userId: U.nassim, createdHours: 26, status: "pending", photos: [323780, 2102587, 1029599, 1396122], pet: "allowed", nearby: ["carPark", "primarySchool"] }),

    // Other individuals
    L({ id: 35, title: "F4 near Aïn El Fouara in Sétif centre", price: 42000, type: "rent", property: "residential", propertyType: "apartment", city: "Sétif", district: "SETIF", address: "Avenue du 8 Mai 1945, Sétif", bedroom: 3, bathroom: 1, size: 100, userId: U.imane, created: 15, photos: [2121121, 276724, 91227], utilities: "tenant", nearby: ["transportation", "commercialArea", "primarySchool", "pharmacy"] }),
    L({ id: 36, title: "Seaside studio in Tichy", price: 8900000, type: "buy", property: "residential", propertyType: "other_residential", city: "Béjaïa", district: "TICHY", address: "Boulevard de la Plage, Tichy", bedroom: 1, bathroom: 1, size: 38, userId: U.omar, created: 44, photos: [210617, 1643384, 2467285], furnished: "yes", nearby: ["commercialArea", "carPark"] }),
    L({ id: 37, title: "Storage warehouse with yard in Meftah", price: 220000, type: "rent", property: "commercial", propertyType: "industrial", city: "Blida", district: "MEFTAH", address: "Route nationale 29, Meftah", bedroom: 0, bathroom: 1, size: 800, userId: U.omar, created: 27, photos: [380768, 269077, 1170412], utilities: "tenant", nearby: ["carPark", "transportation"] }),
    L({ id: 38, title: "Family F4 in Koléa with garden view", price: 55000, type: "rent", property: "residential", propertyType: "apartment", city: "Tipaza", district: "KOLEA", address: "Cité 300 Logements, Koléa", bedroom: 3, bathroom: 1, size: 96, userId: U.nour, created: 19, photos: [1029599, 2029667, 1571460, 2635038], utilities: "tenant", pet: "allowed", nearby: ["primarySchool", "middleSchool", "commercialArea", "mosque"] }),
    L({ id: 39, title: "F5 in Bouzareah, urgent sale", price: 9000000, type: "buy", property: "residential", propertyType: "apartment", city: "Algiers", district: "BOUZAREAH", address: "Bouzareah", bedroom: 4, bathroom: 2, size: 150, userId: U.walid, created: 47, photos: [1643383, 1457842, 1571460], nearby: [] }),
  ];

  const Post = [];
  const PostDetail = [];
  const postById = new Map();
  for (const s of specs) {
    const createdH = s.createdHours ?? d(s.created, (s.id * 5) % 11);
    const status = s.status || "approved";
    const reviewedH = ["approved", "rejected"].includes(status) || s.status === "archived" ? Math.max(0.5, createdH - (3 + (s.id % 9))) : null;
    const [lat, lng] = COORDS[`${s.city}/${s.district}`];
    const jitter = prng(s.id * 101);
    const row = {
      id: s.id,
      title: s.title,
      price: s.price,
      images: s.photos.map((p) => photo(p)),
      address: s.address,
      city: s.city,
      district: s.district,
      bedroom: s.bedroom,
      bathroom: s.bathroom,
      latitude: (lat + (jitter() - 0.5) * 0.012).toFixed(6),
      longitude: (lng + (jitter() - 0.5) * 0.012).toFixed(6),
      type: s.type,
      property: s.property,
      propertyType: s.propertyType,
      status,
      reviewNote: s.reviewNote || null,
      reviewedAt: reviewedH ? iso(reviewedH) : null,
      availability: s.availability || "available",
      hiddenByOwner: Boolean(s.hiddenByOwner),
      featured: Boolean(s.featured),
      createdAt: iso(createdH),
      updatedAt: iso(s.hiddenSince ? d(s.hiddenSince) : s.soldSince ? d(s.soldSince) : status === "archived" ? d(40) : reviewedH ?? createdH),
      agencyId: s.agencyId ?? null,
      userId: s.userId,
      createdById: s.createdById ?? s.userId,
    };
    Post.push(row);
    postById.set(row.id, { ...row, spec: s, createdH, reviewedH });
    PostDetail.push({
      id: s.id,
      postId: s.id,
      desc: DESC[s.id],
      utilities: s.utilities || "owner",
      pet: s.property === "commercial" ? "not-allowed" : s.pet || "not-allowed",
      size: s.size,
      Furnished: s.furnished || "no",
      views: 0, // filled from the view log below
      Matricule: `PROP-${String(s.id).padStart(6, "0")}`,
      ...Object.fromEntries(NEARBY_KEYS.map((k) => [k, (s.nearby || []).includes(k) ? "yes" : "no"])),
    });
  }
  const P = (id) => postById.get(id);

  // ---------------- Daily views ----------------
  const PostView = [];
  const today = Math.floor(NOW / DAY);
  const firstDay = today - 59;
  const dayFraction = (NOW % DAY) / DAY;
  const viewStop = { 9: 15, 12: 30, 29: 25, 22: 20, 23: 20, 39: 22 }; // hidden, sold, suspended: views fade out
  let viewId = 1;
  for (const p of Post) {
    if (p.status !== "approved") continue;
    const created = new Date(p.createdAt).getTime();
    const start = Math.max(firstDay, Math.floor(created / DAY));
    const base = p.featured ? 11 : 3 + Math.floor(rnd() * 6);
    const stopDay = viewStop[p.id] !== undefined ? today - viewStop[p.id] : null;
    for (let day = start; day <= today; day++) {
      const trend = 0.65 + 0.7 * ((day - firstDay) / 59);
      const fresh = day - Math.floor(created / DAY) < 5 ? 1.6 : 1;
      const weekday = new Date(day * DAY).getUTCDay();
      const weekend = weekday === 5 || weekday === 6 ? 1.3 : 1; // Friday–Saturday
      let factor = base * trend * fresh * weekend * (0.55 + 0.9 * rnd());
      if (stopDay !== null && day > stopDay) factor *= p.id === 12 || p.id === 29 ? 0.15 : 0;
      if (day === today) factor *= Math.max(0.15, dayFraction);
      const n = Math.round(factor);
      for (let k = 0; k < n; k++) {
        let t = day * DAY + Math.floor(rnd() * DAY);
        t = Math.min(t, NOW - 60000);
        t = Math.max(t, created + 60000);
        if (t > NOW) continue;
        PostView.push({ id: viewId++, postId: p.id, viewerKey: `seed-${p.id}-${day}-${k}`, day, createdAt: new Date(t).toISOString() });
      }
    }
  }
  const viewCount = new Map();
  for (const v of PostView) viewCount.set(v.postId, (viewCount.get(v.postId) || 0) + 1);
  for (const det of PostDetail) {
    const p = P(det.postId);
    const logged = viewCount.get(det.postId) || 0;
    det.views = p.status === "archived" ? 312 : logged + (p.createdH > d(60) ? Math.round(logged * 0.35) : 0);
  }

  // ---------------- Saved listings ----------------
  const saves = {
    [U.sara]: [1, 3, 14, 19, 32, 5, 38],
    [U.karim]: [1, 32],
    [U.yacine]: [3, 13],
    [U.imane]: [3, 14, 17, 13, 11],
    [U.omar]: [4, 6, 21],
    [U.nour]: [1, 19, 2],
    [U.adel]: [6, 15, 1],
    [U.rania]: [11, 24, 3],
    [U.bilal]: [13, 31, 1],
    [U.meriem]: [5, 32],
    [U.yasmina]: [14, 3],
    [U.nassim]: [3, 16],
    [U.hocine]: [36],
    [U.amina]: [38, 1, 14],
  };
  const SavedPost = [];
  for (const [uid, postIds] of Object.entries(saves)) {
    for (const pid of postIds) {
      const u = userById.get(Number(uid));
      const p = P(pid);
      const from = Math.min((NOW - new Date(u.createdAt)) / HOUR, p.reviewedH ?? p.createdH) - 0.5;
      const h = Math.max(0.3, from * (0.2 + 0.7 * rnd()));
      SavedPost.push({ id: SavedPost.length + 1, userId: Number(uid), postId: pid, createdAt: iso(h) });
    }
  }

  // ---------------- Inquiries & conversations ----------------
  const Chat = [];
  const ChatUser = [];
  const Message = [];
  const Inquiry = [];

  // msgs: [senderId, hoursAgo, text]; reads: { userId: hoursAgo | null } overrides
  // a participant's read position (default: has read everything)
  const inquiry = (o) => {
    const p = P(o.post);
    const route = p.agencyId
      ? { agencyId: p.agencyId, ownerId: null, assignedToId: o.assignedTo !== undefined ? o.assignedTo : p.userId }
      : { agencyId: null, ownerId: p.userId, assignedToId: null };
    const msgs = (o.msgs || []).slice().sort((a, b) => b[1] - a[1]);
    const chatId = o.id;
    const lastMsg = msgs[msgs.length - 1];
    Chat.push({ id: chatId, createdAt: iso(o.at), lastMessage: lastMsg ? lastMsg[2] : null });
    for (const [uid, h, text] of msgs) {
      Message.push({ id: Message.length + 1, text, userId: uid, chatId, createdAt: iso(h) });
    }
    const participants = new Set([o.client]);
    if (route.ownerId) participants.add(route.ownerId);
    msgs.forEach(([uid]) => participants.add(uid));
    Object.keys(o.reads || {}).forEach((k) => participants.add(Number(k)));
    for (const uid of participants) {
      const ownLast = msgs.filter((m) => m[0] === uid).map((m) => m[1]);
      const ownH = ownLast.length ? Math.min(...ownLast) : null;
      let readH;
      if (o.reads && uid in o.reads) readH = o.reads[uid];
      else readH = lastMsg ? lastMsg[1] - 0.05 : o.at - 0.05; // read everything
      if (ownH !== null && (readH === null || readH > ownH)) readH = ownH;
      ChatUser.push({ chatId, userId: uid, lastReadAt: readH === null ? null : iso(Math.max(0.01, readH)) });
    }
    const firstClient = msgs.find((m) => m[0] === o.client);
    const updatedH = Math.min(o.updated ?? Infinity, lastMsg ? lastMsg[1] : o.at, o.at);
    Inquiry.push({
      id: o.id,
      type: o.visit ? "visit" : "question",
      status: o.status || "open",
      clientId: o.client,
      postId: p.id,
      postTitle: p.title,
      ...route,
      message: firstClient ? firstClient[2] : null,
      contactPhone: o.visit ? o.visit[0] : null,
      preferredDate: o.visit ? o.visit[1] : null,
      preferredTime: o.visit ? o.visit[2] : null,
      confirmedDate: o.confirmed ? o.confirmed[0] : null,
      confirmedTime: o.confirmed ? o.confirmed[1] : null,
      declineReason: o.decline || null,
      chatId,
      createdAt: iso(o.at),
      updatedAt: iso(updatedH),
    });
  };

  // Sara ↔ Immo El Djazair (Riad): a real back-and-forth, last reply unread by Sara
  inquiry({
    id: 1, client: U.sara, post: 1, at: 96,
    msgs: [
      [U.sara, 96, "Hello, is the apartment in Hydra still available? I'd also like to know whether the building charges are included in the price."],
      [U.riad, 94, "Hello Sara, yes it's still available. Building charges are about 4,500 DZD a month for the caretaker, the lift and the generator; they're paid separately from the sale price."],
      [U.sara, 70, "Thank you. Does the apartment come with a parking space, and is the livret foncier ready?"],
      [U.riad, 68, "A private underground space is included. The livret foncier is ready and the notary file can be opened within the week."],
      [U.sara, 26, "Great. Would the owner consider 55 million? My bank pre-approval is for that amount."],
      [U.riad, 3, "I spoke with the owner this morning: he can come down to 56.5 million for a quick sale. Shall I book you a second visit this weekend?"],
    ],
    reads: { [U.sara]: 20, [U.nadia]: 30, [U.mehdi]: 60 },
  });
  // Sara asks Amel for a visit: not answered yet (unread on the agency side)
  inquiry({
    id: 5, client: U.sara, post: 2, at: 20,
    visit: ["0550 12 34 56", dateStr(3), "17:30"],
    msgs: [[U.sara, 20, "Hi, I'd like to visit the F3 in El Mouradia. I'm relocating to Algiers for work and need a furnished place from next month."]],
  });
  // Sara's visit in Oran: confirmed with a new time
  inquiry({
    id: 2, client: U.sara, post: 14, at: 144, status: "scheduled",
    visit: ["0550 12 34 56", dateStr(2), "10:00"], confirmed: [dateStr(2), "11:00"],
    msgs: [
      [U.sara, 144, "Good morning, I'll be visiting family in Oran and would love to see the Front de Mer apartment while I'm there."],
      [U.hichem, 130, "Bonjour Sara, with pleasure. 10:00 is already taken that day; can you make it at 11:00? I'll meet you in the lobby."],
      [U.sara, 128, "11:00 works perfectly, thank you."],
      [U.hichem, 127, "Confirmed. Please bring an ID for the residence's security desk."],
    ],
    updated: 127,
  });
  // Sara → Karim: declined with a reason
  inquiry({
    id: 3, client: U.sara, post: 26, at: d(12), status: "declined",
    visit: ["0550 12 34 56", dateStr(-9), "18:00"],
    decline: "I'm only showing the apartment to tenants who can move in before the 1st of the month, and your dates don't match. Good luck with your search!",
    msgs: [
      [U.sara, d(12), "Hello Karim, could I visit the F2 near the tramway on Thursday evening?"],
      [U.karim, d(11, 6), "Hello Sara, thank you for your interest. I've answered on the request itself: unfortunately the timing doesn't work for me."],
    ],
  });
  // Sara → Constantine Habitat: closed
  inquiry({
    id: 4, client: U.sara, post: 20, at: d(40), status: "closed",
    msgs: [
      [U.sara, d(40), "Hello, is the apartment available for a one-year lease starting next month?"],
      [U.farid, d(39, 20), "Hello, yes, from the 1st. Rent is 60,000 DZD with two months' deposit."],
      [U.sara, d(39, 10), "Thank you, I've decided to stay in Algiers after all. I'll close this request."],
    ],
    updated: d(39, 9),
  });
  // Karim's inbox
  inquiry({
    id: 6, client: U.imane, post: 25, at: 10,
    msgs: [[U.imane, 10, "Hello, is the F4 in Béjaïa still for sale? Which floor is it on, and is there a lift?"]],
    reads: { [U.karim]: null },
  });
  inquiry({
    id: 7, client: U.omar, post: 26, at: 72, status: "scheduled",
    visit: ["0662 30 40 50", dateStr(1), "18:30"], confirmed: [dateStr(1), "18:30"],
    msgs: [
      [U.omar, 72, "Good evening, I work near the Hussein Dey tram stop and I'm looking for a furnished F2. Could I see it after work?"],
      [U.karim, 60, "Good evening Omar, the visit is confirmed. The building is right behind the tram stop, 3rd floor on the left. Call me when you arrive."],
      [U.omar, 59, "Perfect, see you then."],
    ],
  });
  inquiry({
    id: 8, client: U.imane, post: 29, at: d(35), status: "closed",
    msgs: [
      [U.imane, d(35), "Hello, is the price of the F3 in Bab Ezzouar negotiable?"],
      [U.karim, d(34, 18), "Hello, a little. But I already have a buyer at the notary, I'll let you know if it falls through."],
    ],
    updated: d(25),
  });
  // Immo El Djazair's inbox
  inquiry({
    id: 9, client: U.imane, post: 3, at: d(5), status: "scheduled",
    visit: ["0551 87 65 43", dateStr(1), "15:00"], confirmed: [dateStr(1), "15:00"],
    msgs: [
      [U.imane, d(5), "Hello, my husband and I would like to visit the villa in Dely Ibrahim. We have two children: is the garden fully fenced?"],
      [U.nadia, d(4, 20), "Hello Mrs Touati, yes, the garden and the pool are fully fenced. Your visit is confirmed; I'll show you the property myself."],
    ],
    reads: { [U.mehdi]: d(4, 10) },
    updated: d(4, 20),
  });
  inquiry({
    id: 10, client: U.omar, post: 4, at: 30,
    msgs: [[U.omar, 30, "Hello, I run an engineering consultancy of 15 people. Is the office floor available from January, and can the landlord partition two more offices?"]],
  });
  inquiry({
    id: 11, client: U.nour, post: 1, at: 48,
    msgs: [[U.nour, 48, "Bonjour, is the Hydra apartment suitable for an elderly parent? I'd like to know whether the lift reaches every floor."]],
    reads: { [U.nadia]: 40 },
  });
  inquiry({
    id: 12, client: U.adel, post: 6, at: 70, status: "closed",
    msgs: [
      [U.adel, 70, "Hello, what would the monthly rent be with a three-year lease? I'm opening a phone shop."],
      [U.mehdi, 66, "Hello Adel, the owner asks 150,000 DZD and would accept 140,000 with a three-year lease and six months paid in advance."],
      [U.adel, 50, "Thank you for the quick answer, it's a bit above my budget for now."],
    ],
    updated: 48,
  });
  inquiry({
    id: 13, client: U.rania, post: 11, at: d(5), status: "closed",
    visit: ["0770 55 66 77", dateStr(-2), "10:30"], confirmed: [dateStr(-2), "10:30"],
    msgs: [
      [U.rania, d(5), "Hello, we'd like to visit the villa in Bordj El Kiffan this week."],
      [U.amel, d(4, 18), "Hello Rania, I've confirmed the visit. The house is at the end of the Cité des Pins, I'll wait for you at the gate."],
      [U.rania, d(1, 20), "Thank you for the visit, we loved it. We've made an offer through you."],
      [U.amel, d(1, 18), "Thank you! The owner has accepted your offer, I'm marking the listing as under offer. I'll call you about the notary."],
    ],
    reads: { [U.nadia]: d(1, 10), [U.mehdi]: d(4) },
  });
  inquiry({
    id: 14, client: U.bilal, post: 13, at: 46,
    visit: ["0699 88 77 66", dateStr(4), "14:00"],
    msgs: [],
  });
  inquiry({
    id: 15, client: U.meriem, post: 5, at: 5,
    msgs: [[U.meriem, 5, "Hello, is the marina apartment sold with its furniture? And are there yearly residence charges?"]],
  });
  inquiry({
    id: 16, client: U.imane, post: 12, at: d(50), status: "closed",
    msgs: [
      [U.imane, d(50), "Hello, is the Mohammadia F3 still available?"],
      [U.riad, d(49, 20), "Hello, yes. Would you like to visit on Saturday?"],
      [U.imane, d(49, 12), "Saturday is fine, around 11:00."],
      [U.riad, d(30), "Hello Mrs Touati, I'm sorry to let you know the apartment has been sold. I'll send you similar listings in Mohammadia."],
    ],
    reads: { [U.nadia]: d(30), [U.mehdi]: d(30) },
  });
  inquiry({
    id: 17, client: U.yacine, post: 3, at: d(15), status: "cancelled",
    msgs: [[U.yacine, d(15), "Hello, I'd like information about the villa on behalf of a client who lives abroad."]],
    reads: { [U.nadia]: d(14), [U.mehdi]: d(14) },
    updated: d(14),
  });
  // Oran Prestige
  inquiry({
    id: 18, client: U.adel, post: 15, at: 26,
    msgs: [
      [U.adel, 26, "Hello, is the Aïn El Turck apartment available for July and August only?"],
      [U.wassila, 20, "Hello Adel, yes, we rent it by the season in summer: 140,000 DZD a month in July and August. Would you like to book?"],
    ],
    reads: { [U.adel]: 25 },
  });
  inquiry({
    id: 19, client: U.imane, post: 17, at: 50,
    visit: ["0551 87 65 43", dateStr(5), "09:30"],
    msgs: [[U.imane, 50, "Good morning, I'm looking for offices for our accounting firm. Could we visit early next week?"]],
  });
  // Constantine Habitat
  inquiry({
    id: 20, client: U.nour, post: 19, at: 74,
    msgs: [
      [U.nour, 74, "Hello, is the Ali Mendjeli apartment eligible for a CNEP loan?"],
      [U.farid, 70, "Hello, yes: the act is delivered at signing and two buyers in the same residence have financed with the CNEP."],
      [U.nour, 52, "Great, can you send me the floor plan?"],
    ],
  });
  // Individual sellers
  inquiry({
    id: 21, client: U.bilal, post: 31, at: 44,
    msgs: [
      [U.bilal, 44, "Hello, how much are the residence charges for the El Bouni apartment?"],
      [U.yasmina, 30, "Hello Bilal, around 1,500 DZD a month for cleaning and the caretaker."],
    ],
  });
  inquiry({
    id: 22, client: U.meriem, post: 32, at: 20,
    visit: ["0552 11 22 33", dateStr(6), "11:00"],
    msgs: [[U.meriem, 20, "Bonjour, I'm interested in the dar in the medina as a guest house project. Could I visit next week?"]],
    reads: { [U.nassim]: null },
  });
  inquiry({
    id: 23, client: U.amina, post: 38, at: d(8), status: "scheduled",
    visit: ["0771 44 55 66", dateStr(2), "16:00"], confirmed: [dateStr(2), "16:00"],
    msgs: [
      [U.amina, d(8), "Hello, I'd like to visit the F4 in Koléa with my husband."],
      [U.nour, d(7, 12), "Hello Amina, I've confirmed the visit. See you there!"],
    ],
  });
  // Someone asks about Sara's own listing: unread on her side
  inquiry({
    id: 24, client: U.rania, post: 24, at: 40,
    msgs: [[U.rania, 40, "Hello, is your Blida apartment still available? I'm a teacher and would like to move in at the start of next month."]],
    reads: { [U.sara]: null },
  });
  inquiry({
    id: 25, client: U.hocine, post: 36, at: 2,
    msgs: [[U.hocine, 2, "Hello, is the studio in Tichy still for sale? Is the price negotiable?"]],
    reads: { [U.omar]: null },
  });
  // Sahel Immobilier (suspended): the agency can read but not reply
  inquiry({
    id: 26, client: U.omar, post: 22, at: d(45),
    msgs: [
      [U.omar, d(45), "Hello, is the villa near the Roman ruins still available?"],
      [U.rachid, d(44), "Yes. To book a visit please send a 20,000 DZD deposit first."],
      [U.omar, d(43), "A deposit before even seeing it? I'd rather visit first."],
    ],
  });
  Inquiry.sort((a, b) => a.id - b.id);
  Chat.sort((a, b) => a.id - b.id);

  // ---------------- Invitations ----------------
  const AgencyInvitation = [
    { id: 1, agencyId: 1, userId: U.yacine, agencyRole: "agent", status: "pending", invitedById: U.nadia, expiresAt: iso(-d(12)), respondedAt: null, createdAt: iso(d(2)) },
    { id: 2, agencyId: 1, userId: U.bilal, agencyRole: "agent", status: "revoked", invitedById: U.mehdi, expiresAt: iso(-d(11, 8)), respondedAt: iso(d(1, 3)), createdAt: iso(d(2, 16)) },
    { id: 3, agencyId: 1, userId: U.amel, agencyRole: "agent", status: "accepted", invitedById: U.nadia, expiresAt: iso(d(48)), respondedAt: iso(d(61)), createdAt: iso(d(62)) },
    { id: 4, agencyId: 2, userId: U.wassila, agencyRole: "agent", status: "accepted", invitedById: U.hichem, expiresAt: iso(d(52)), respondedAt: iso(d(65)), createdAt: iso(d(66)) },
    { id: 5, agencyId: 1, userId: U.nour, agencyRole: "agent", status: "declined", invitedById: U.nadia, expiresAt: iso(d(16)), respondedAt: iso(d(29)), createdAt: iso(d(30)) },
  ];

  // ---------------- Agency applications ----------------
  const tick = (by, h) => ({ by, at: iso(h) });
  const AgencyApplication = [
    {
      id: 1, applicantId: U.nadia, agencyId: 1, status: "approved", entityType: "legal_entity",
      legalName: "SARL Immo El Djazair", tradeName: "Immo El Djazair", legalForm: "SARL",
      rcNumber: "16/00-0987654 B 18", nif: "001816098765432", nis: "001816010987654", articleImposition: "16017234561",
      address: "12 Rue Ahmed Ouaked, Hydra", wilaya: "Algiers", commune: "Hydra", phone: "+213 23 48 12 90",
      email: "contact@immoeldjazair.dz", website: "https://immoeldjazair.dz", logo: avatar(1170412),
      repFullName: "Nadia Ouali", repBirthDate: "1984-05-12T00:00:00.000Z", repNationality: "Algerian", repIdNumber: "109840512003451",
      repPhone: "0560 11 22 33", repEmail: "agency@bayti.dz", repPosition: "Gérante",
      approvalNumber: "AGR/16/2023/0457", approvalWilaya: "Algiers", approvalIssueDate: yearsFromNow(-2.6), approvalExpiryDate: yearsFromNow(2.4),
      qualification: "Licence in Law, Université d'Alger 1",
      message: "We have been operating in Algiers since 2018 and would like to publish our portfolio on Bayti.",
      checklist: Object.fromEntries(["agrement_matches", "agrement_valid", "agrement_issuer", "rc_matches", "identity_matches", "entity_docs", "qualification", "tax_ids", "contact_verified"].map((k, i) => [k, tick("Amine Boudiaf", d(87, 6 - i * 0.5))])),
      requestMessage: null,
      decisionNote: "Welcome to Bayti! All documents were checked against the Algiers register.",
      submittedAt: iso(d(90)), reviewedAt: iso(d(86)), reviewerId: U.admin, createdAt: iso(d(91, 20)), updatedAt: iso(d(86)),
    },
    {
      id: 2, applicantId: U.samir, agencyId: null, status: "info_required", entityType: "legal_entity",
      legalName: "SARL Dar Essalam Immobilier", tradeName: "Dar Essalam Immobilier", legalForm: "SARL",
      rcNumber: "16/00-1122334 B 19", nif: "001916112233445", nis: "001916011223344",
      address: "Cité 2068 Logements, Bt 12, Bab Ezzouar", wilaya: "Algiers", commune: "Bab Ezzouar", phone: "+213 23 92 14 15",
      email: "contact@daressalam-immo.dz", website: "https://daressalam-immo.dz",
      repFullName: "Samir Djebbar", repBirthDate: "1979-11-03T00:00:00.000Z", repNationality: "Algerian", repPhone: "0661 55 44 33",
      repEmail: "applicant@bayti.dz", repPosition: "Gérant",
      approvalNumber: "AGR/16/2019/0213", approvalWilaya: "Algiers", approvalIssueDate: yearsFromNow(-4.2), approvalExpiryDate: yearsFromNow(0.8),
      message: "We have been operating in Bab Ezzouar since 2019 and would like our listings to show the verified badge.",
      checklist: { rc_matches: tick("Lina Cherif", d(16, 3)), contact_verified: tick("Lina Cherif", d(15, 4)) },
      requestMessage:
        "Thank you for your application. Before we can verify Dar Essalam Immobilier we need:\n\n1. A clearer scan of your agrément: the issue date and the wali's stamp are cut off on the copy you uploaded.\n2. The company's articles of association (statuts), since you are applying as a SARL.\n\nUpload both from your application page, then resubmit it.",
      decisionNote: null,
      submittedAt: iso(d(18)), reviewedAt: iso(d(15)), reviewerId: U.ops, createdAt: iso(d(19, 20)), updatedAt: iso(d(2)),
    },
    {
      id: 3, applicantId: U.kamel, agencyId: null, status: "submitted", entityType: "natural_person",
      legalName: "Kamel Aouadi", tradeName: "Tlemcen Immobilier Conseil",
      rcNumber: "13/00-0456789 A 22", nif: "198813045678901", nis: "198813010456789", articleImposition: "13021457896",
      address: "18 Boulevard Colonel Lotfi, Tlemcen", wilaya: "Tlemcen", commune: "Tlemcen", phone: "+213 43 27 45 12",
      email: "k.aouadi@tlemcen-conseil.dz", website: "https://tlemcen-conseil.dz",
      repFullName: "Kamel Aouadi", repBirthDate: "1988-02-21T00:00:00.000Z", repNationality: "Algerian", repIdNumber: "109880221004512",
      repPhone: "0555 61 72 83", repEmail: "k.aouadi@tlemcen-conseil.dz", repPosition: "Agent immobilier",
      approvalNumber: "AGR/13/2024/0042", approvalWilaya: "Tlemcen", approvalIssueDate: yearsFromNow(-1.5), approvalExpiryDate: yearsFromNow(3.5),
      qualification: "Master in Real Estate Management, Université de Tlemcen",
      message: "Independent agent in Tlemcen for five years, specialised in traditional houses of the medina and family homes on the plateau of Lalla Setti.",
      submittedAt: iso(20), createdAt: iso(45), updatedAt: iso(20),
    },
    {
      id: 4, applicantId: U.leila, agencyId: null, status: "under_review", entityType: "legal_entity",
      legalName: "EURL Béjaïa Littoral Immobilier", tradeName: "Béjaïa Littoral Immobilier", legalForm: "EURL",
      rcNumber: "06/00-0789012 B 21", nif: "002106078901234", nis: "002106010789012",
      address: "Boulevard Amirouche, Béjaïa", wilaya: "Béjaïa", commune: "Béjaïa", phone: "+213 34 21 56 78",
      email: "contact@bejaia-littoral.dz",
      repFullName: "Leila Hamdani", repBirthDate: "1986-08-30T00:00:00.000Z", repNationality: "Algerian", repIdNumber: "209860830002781",
      repPhone: "0770 61 62 63", repEmail: "contact@bejaia-littoral.dz", repPosition: "Gérante",
      approvalNumber: "AGR/06/2021/0019", approvalWilaya: "Béjaïa", approvalIssueDate: yearsFromNow(-3.4), approvalExpiryDate: yearsFromNow(1.6),
      message: "Coastal properties from Béjaïa to Tichy and Aokas, for local families and the diaspora.",
      checklist: {
        agrement_matches: tick("Amine Boudiaf", d(6, 2)),
        agrement_valid: tick("Amine Boudiaf", d(6, 1.8)),
        rc_matches: tick("Lina Cherif", d(5, 4)),
        contact_verified: tick("Lina Cherif", d(5, 3)),
      },
      submittedAt: iso(d(8)), reviewedAt: iso(d(6, 3)), reviewerId: U.admin, createdAt: iso(d(9, 12)), updatedAt: iso(d(5, 3)),
    },
    {
      id: 5, applicantId: U.djamel, agencyId: null, status: "rejected", entityType: "natural_person",
      legalName: "Djamel Ferhat", tradeName: "Djamel Immo Services",
      rcNumber: "16/00-0567890 A 14", wilaya: "Algiers", commune: "Kouba", phone: "0662 14 25 36", email: "djamel.ferhat@mail.dz",
      repFullName: "Djamel Ferhat", repPhone: "0662 14 25 36", repEmail: "djamel.ferhat@mail.dz",
      approvalNumber: "AGR/16/2014/0398", approvalWilaya: "Algiers", approvalIssueDate: yearsFromNow(-12),
      decisionNote:
        "The agrément number entered belongs to a different agent according to the Algiers wilaya register, and the document uploaded is a carte professionnelle that expired years ago. You can apply again with your own valid agrément.",
      submittedAt: iso(d(42)), reviewedAt: iso(d(38)), reviewerId: U.admin, createdAt: iso(d(44)), updatedAt: iso(d(38)),
    },
  ];

  const ApplicationEvent = [];
  const ev = (applicationId, h, type, actorId, fromStatus = null, toStatus = null, message = null) =>
    ApplicationEvent.push({ id: ApplicationEvent.length + 1, applicationId, type, fromStatus, toStatus, message, actorId, createdAt: iso(h) });
  const docLabel = {
    agrement: "Agrément d'agent immobilier",
    rc_extract: "Extrait du Registre de Commerce",
    representative_id: "Representative's national ID card",
    statuts: "Company articles of association (statuts)",
    boal: "BOAL publication of incorporation",
    appointment: "Appointment of the manager / director",
    qualification: "Qualification (diploma) of the responsible person",
    carte_professionnelle: "Carte professionnelle",
    tax_documents: "Tax identification (NIF / NIS) certificates",
  };

  const Document = [];
  const doc = (applicationId, kind, name, h, uploadedById, extra = {}) => {
    const id = Document.length + 1;
    Document.push({
      id, kind, originalName: name, mimeType: "application/pdf", size: 180000 + Math.floor(rnd() * 2200000),
      storageKey: `seed-${id}.pdf`, sha256: hex64(id), applicationId, agencyId: null, reportId: null, userId: null,
      uploadedById, createdAt: iso(h), ...extra,
    });
  };
  const upload = (applicationId, h, actorId, files, extra) => {
    files.forEach(([kind, name]) => doc(applicationId, kind, name, h, actorId, extra));
    const kinds = [...new Set(files.map((f) => f[0]))];
    kinds.forEach((kind) => {
      const n = files.filter((f) => f[0] === kind).length;
      ev(applicationId, h, "documents_uploaded", actorId, null, null, `${n} file${n > 1 ? "s" : ""}: ${docLabel[kind]}`);
    });
  };

  // 1. Immo El Djazair (approved)
  ev(1, d(91, 20), "created", U.nadia, null, "draft");
  upload(1, d(91, 2), U.nadia, [["agrement", "agrement-immo-el-djazair.pdf"], ["rc_extract", "extrait-rc-2018.pdf"], ["statuts", "statuts-sarl-immo-el-djazair.pdf"], ["representative_id", "cni-nadia-ouali.pdf"], ["tax_documents", "nif-nis-immo-el-djazair.pdf"]], { agencyId: 1 });
  ev(1, d(90), "status", U.nadia, "draft", "submitted", "We have been operating in Algiers since 2018 and would like to publish our portfolio on Bayti.");
  ev(1, d(88), "status", U.admin, "submitted", "under_review", null);
  ev(1, d(86), "status", U.admin, "under_review", "approved", "Welcome to Bayti! All documents were checked against the Algiers register.");

  // 2. Dar Essalam (info required)
  ev(2, d(19, 20), "created", U.samir, null, "draft");
  upload(2, d(19), U.samir, [["agrement", "agrement-scan.pdf"], ["rc_extract", "registre-commerce-dar-essalam.pdf"]]);
  ev(2, d(18), "status", U.samir, "draft", "submitted", "We have been operating in Bab Ezzouar since 2019 and would like our listings to show the verified badge.");
  ev(2, d(17), "status", U.ops, "submitted", "under_review", null);
  ev(2, d(15), "status", U.ops, "under_review", "info_required", AgencyApplication[1].requestMessage);
  upload(2, d(2), U.samir, [["statuts", "statuts-sarl-dar-essalam.pdf"]]);

  // 3. Tlemcen Immobilier Conseil (submitted)
  ev(3, 45, "created", U.kamel, null, "draft");
  upload(3, 22, U.kamel, [["agrement", "agrement-aouadi-2024.pdf"], ["rc_extract", "extrait-rc-aouadi.pdf"], ["representative_id", "cni-kamel-aouadi.pdf"], ["qualification", "master-gestion-immobiliere.pdf"], ["carte_professionnelle", "carte-pro-tlemcen.pdf"], ["tax_documents", "attestation-nif.pdf"]]);
  ev(3, 20, "status", U.kamel, "draft", "submitted", "Independent agent in Tlemcen for five years.");

  // 4. Béjaïa Littoral (under review)
  ev(4, d(9, 12), "created", U.leila, null, "draft");
  upload(4, d(8, 6), U.leila, [["agrement", "agrement-bejaia-littoral.pdf"], ["rc_extract", "rc-bejaia-littoral.pdf"], ["representative_id", "cni-leila-hamdani.pdf"], ["statuts", "statuts-eurl.pdf"], ["boal", "boal-2021.pdf"], ["appointment", "nomination-gerante.pdf"]]);
  ev(4, d(8), "status", U.leila, "draft", "submitted", null);
  ev(4, d(6, 3), "status", U.admin, "submitted", "under_review", null);

  // 5. Djamel Immo Services (rejected)
  ev(5, d(44), "created", U.djamel, null, "draft");
  upload(5, d(43), U.djamel, [["agrement", "agrement.pdf"], ["rc_extract", "rc.pdf"]]);
  ev(5, d(42), "status", U.djamel, "draft", "submitted", null);
  ev(5, d(41), "status", U.admin, "submitted", "under_review", null);
  ev(5, d(38), "status", U.admin, "under_review", "rejected", AgencyApplication[4].decisionNote);

  const ApplicationNote = [
    { id: 1, applicationId: 2, authorId: U.ops, body: "Called the business phone: Mr Djebbar confirmed the application. The agrément number format matches the Algiers register, but I can't read the issue date on the scan. Waiting for a clearer copy before ticking it.", createdAt: iso(d(15, 2)) },
    { id: 2, applicationId: 2, authorId: U.admin, body: "Statuts received today and they match the RC extract. Still missing the clearer agrément scan before they can resubmit.", createdAt: iso(d(1, 22)) },
    { id: 3, applicationId: 4, authorId: U.admin, body: "Agrément and RC extract match. The BOAL publication dates from 2021 and shows an older address; check that the move to Boulevard Amirouche was registered.", createdAt: iso(d(6, 1)) },
    { id: 4, applicationId: 5, authorId: U.admin, body: "Checked with the wilaya: AGR/16/2014/0398 belongs to another agent in Hussein Dey. Rejecting.", createdAt: iso(d(38, 1)) },
    { id: 5, applicationId: 1, authorId: U.admin, body: "Everything in order. Owner reachable, office visited by Lina last week.", createdAt: iso(d(86, 1)) },
  ];

  // ---------------- Reports ----------------
  const Report = [
    {
      id: 1, kind: "post", reason: "Photos don't match the property",
      details: "The photos look like a new-build in Algiers, not a flat in Koléa. I've seen the same pictures on another website.",
      reporterId: U.imane, reporterName: "Imane Touati", reporterEmail: "imane.touati@mail.dz",
      postId: 38, reportedUserId: U.nour, reportedUserText: "PROP-000038", status: "open", createdAt: iso(d(1, 2)),
    },
    {
      id: 2, kind: "user", reason: "Asked for payment before a visit",
      details: "He asked me to send 10,000 DZD by BaridiMob to 'reserve' a visit of his warehouse in Meftah.",
      reporterId: null, reporterName: "Fatima Zerhouni", reporterEmail: "fatima.zerhouni@mail.dz",
      postId: null, reportedUserId: U.omar, reportedUserText: "Omar Benyoucef", status: "open", createdAt: iso(6),
    },
    {
      id: 3, kind: "post", reason: "Scam / fake listing",
      details: "An F5 in Bouzareah for 9 million is impossible. The seller asked me for a deposit before showing it and stopped answering.",
      reporterId: U.sara, reporterName: "Sara Benali", reporterEmail: "client@bayti.dz",
      postId: 39, reportedUserId: U.walid, reportedUserText: "PROP-000039", status: "resolved",
      resolution: "Confirmed with two other complaints: the photos were taken from another website and the seller asked for an advance. Account suspended, so the listing is no longer public.",
      resolvedAt: iso(d(22)), resolvedById: U.admin, createdAt: iso(d(24)),
    },
    {
      id: 4, kind: "post", reason: "Duplicate listing",
      details: "The same apartment seems to be posted twice by the agency.",
      reporterId: U.karim, reporterName: "Karim Haddad", reporterEmail: "seller@bayti.dz",
      postId: 1, reportedUserId: U.riad, reportedUserText: "PROP-000001", status: "dismissed",
      resolution: "Not a duplicate: Immo El Djazair lists two different apartments in the same Hydra residence (3rd and 6th floors).",
      resolvedAt: iso(d(10)), resolvedById: U.ops, createdAt: iso(d(12)),
    },
  ];

  // ---------------- Notifications ----------------
  const Notification = [];
  // Agency-platform links are absolute, as agencyAppLink() makes them
  const agencyAccounts = new Set(User.filter((u) => u.accountType === "agency").map((u) => u.id));
  const note = (audience, userId, h, type, title, body, link, read = true) =>
    Notification.push({
      id: Notification.length + 1, audience, userId: audience === "admin" ? null : userId, type, title, body,
      link: agencyAccounts.has(userId) && link?.startsWith("/") ? `${globalThis.process?.env?.AGENCY_URL || ""}${link}` : link,
      readAt: read ? iso(Math.max(0.05, h - 0.5)) : null, createdAt: iso(h),
    });
  const admin = (h, type, title, body, link, read) => note("admin", null, h, type, title, body, link, read);
  const to = (userId, h, type, title, body, link, read) => note("user", userId, h, type, title, body, link, read);
  const T = (id) => P(id).title;
  const chatLink = (inquiryId) => `/messages?chat=${inquiryId}`;

  // Team inbox
  admin(d(91, 20), "user_registered", "New account: Nadia Ouali", "agency@bayti.dz · agency account, application started", `/users/${U.nadia}`, true);
  admin(d(90), "application_submitted", "New agency application: Immo El Djazair", "Algiers · Agrément AGR/16/2023/0457", "/applications/1", true);
  admin(d(42), "application_submitted", "New agency application: Djamel Immo Services", "Algiers · Agrément AGR/16/2014/0398", "/applications/5", true);
  admin(d(24), "report", "New report: listing — Scam / fake listing", Report[2].details, "/reports/3", true);
  admin(d(18), "application_submitted", "New agency application: Dar Essalam Immobilier", "Algiers · Agrément AGR/16/2019/0213", "/applications/2", true);
  admin(d(12), "report", "New report: listing — Duplicate listing", Report[3].details, "/reports/4", true);
  admin(d(10), "user_registered", "New account: Leila Hamdani", "contact@bejaia-littoral.dz · agency account, application started", `/users/${U.leila}`, true);
  admin(d(9), "listing_submitted", `New listing to review: ${T(28)}`, "SETIF, Sétif", "/listings/28", true);
  admin(d(8), "application_submitted", "New agency application: Béjaïa Littoral Immobilier", "Béjaïa · Agrément AGR/06/2021/0019", "/applications/4", true);
  admin(d(7), "agency_legal_update", "Immo El Djazair updated its legal information", "Changed: address", "/agencies/1", true);
  admin(d(6), "listing_submitted", `New listing to review: ${T(8)}`, "BAB EL OUED, Algiers", "/listings/8", true);
  admin(d(6), "user_registered", "New account: Rania Bouzid", "rania.bouzid@mail.dz", `/users/${U.rania}`, true);
  admin(d(4), "user_registered", "New account: Adel Khelifi", "adel.khelifi@mail.dz", `/users/${U.adel}`, true);
  admin(d(3, 12), "user_registered", "New account: Bilal Ghezali", "bilal.ghezali@mail.dz", `/users/${U.bilal}`, true);
  admin(d(2), "application_documents", "New documents for Dar Essalam Immobilier", "1 file(s) uploaded: Company articles of association (statuts).", "/applications/2", false);
  admin(46, "user_registered", "New account: Kamel Aouadi", "k.aouadi@tlemcen-conseil.dz · agency account, application started", `/users/${U.kamel}`, true);
  admin(40, "listing_submitted", `New listing to review: ${T(27)}`, "TIZI OUZOU, Tizi Ouzou", "/listings/27", true);
  admin(d(1, 2), "user_registered", "New account: Meriem Ait Ali", "meriem.aitali@mail.dz", `/users/${U.meriem}`, false);
  admin(d(1, 2), "report", "New report: listing — Photos don't match the property", Report[0].details, "/reports/1", false);
  admin(26, "listing_submitted", `New listing to review: ${T(34)}`, "TLEMCEN, Tlemcen", "/listings/34", false);
  admin(20, "application_submitted", "New agency application: Tlemcen Immobilier Conseil", "Tlemcen · Agrément AGR/13/2024/0042", "/applications/3", false);
  admin(20, "listing_submitted", `New listing to review: ${T(7)}`, "KOUBA, Algiers", "/listings/7", false);
  admin(7, "listing_submitted", `New listing to review: ${T(30)}`, "ANNABA, Annaba", "/listings/30", false);
  admin(6, "user_registered", "New account: Hocine Mebarki", "hocine.mebarki@mail.dz", `/users/${U.hocine}`, false);
  admin(6, "report", "New report: user — Asked for payment before a visit", Report[1].details, "/reports/2", false);

  // Sara
  to(U.sara, P(24).reviewedH, "listing_approved", `Your listing "${T(24)}" is live`, "It's now visible on the marketplace.", "/24", true);
  to(U.sara, d(11, 6), "inquiry_declined", `Your request about “${T(26)}” was declined`, Inquiry[2].declineReason, "/profile?tab=inquiries", true);
  to(U.sara, 127, "inquiry_scheduled", `Your visit of “${T(14)}” is confirmed`, `${dateStr(2)} at 11:00. — Oran Prestige Immobilier`, "/profile?tab=inquiries", false);
  to(U.sara, 40, "inquiry_new", `New inquiry about “${T(24)}”`, "From Rania Bouzid", "/profile?tab=messages", false);
  // Karim
  to(U.karim, P(25).reviewedH, "listing_approved", `Your listing "${T(25)}" is live`, "It's now visible on the marketplace.", "/25", true);
  to(U.karim, P(26).reviewedH, "listing_approved", `Your listing "${T(26)}" is live`, "It's now visible on the marketplace.", "/26", true);
  to(U.karim, d(35), "inquiry_new", `New inquiry about “${T(29)}”`, "From Imane Touati", "/profile?tab=messages", true);
  to(U.karim, d(12), "inquiry_visit", `Sara Benali asked to visit “${T(26)}”`, `${dateStr(-9)} at 18:00`, "/profile?tab=messages", true);
  to(U.karim, P(28).reviewedH, "listing_rejected", `Your listing "${T(28)}" needs changes`, `Reason: ${P(28).reviewNote}\n\nEdit the listing to send it back for review.`, "/28", false);
  to(U.karim, 72, "inquiry_visit", `Omar Benyoucef asked to visit “${T(26)}”`, `${dateStr(1)} at 18:30`, "/profile?tab=messages", true);
  to(U.karim, 10, "inquiry_new", `New inquiry about “${T(25)}”`, "From Imane Touati", "/profile?tab=messages", false);
  // Yacine
  to(U.yacine, d(2), "agency_invitation", "Immo El Djazair invited you to join its team", "As an agent. Accept or decline from your profile.", "/profile?tab=invitations", false);
  // Other marketplace accounts
  to(U.omar, 60, "inquiry_scheduled", `Your visit of “${T(26)}” is confirmed`, `${dateStr(1)} at 18:30.`, "/profile?tab=inquiries", true);
  to(U.imane, d(4, 20), "inquiry_scheduled", `Your visit of “${T(3)}” is confirmed`, `${dateStr(1)} at 15:00. — Immo El Djazair`, "/profile?tab=inquiries", false);
  to(U.imane, P(35).reviewedH, "listing_approved", `Your listing "${T(35)}" is live`, "It's now visible on the marketplace.", "/35", true);
  to(U.rania, d(4, 18), "inquiry_scheduled", `Your visit of “${T(11)}” is confirmed`, `${dateStr(-2)} at 10:30. — Immo El Djazair`, "/profile?tab=inquiries", true);
  to(U.amina, d(7, 12), "inquiry_scheduled", `Your visit of “${T(38)}” is confirmed`, `${dateStr(2)} at 16:00.`, "/profile?tab=inquiries", true);
  to(U.nour, d(8), "inquiry_visit", `Amina Brahimi asked to visit “${T(38)}”`, `${dateStr(2)} at 16:00`, "/profile?tab=messages", true);
  to(U.nour, d(30), "agency_invitation", "Immo El Djazair invited you to join its team", "As an agent. Accept or decline from your profile.", "/profile?tab=invitations", true);
  to(U.yasmina, 44, "inquiry_new", `New inquiry about “${T(31)}”`, "From Bilal Ghezali", "/profile?tab=messages", true);
  to(U.nassim, 20, "inquiry_visit", `Meriem Ait Ali asked to visit “${T(32)}”`, `${dateStr(6)} at 11:00`, "/profile?tab=messages", false);
  to(U.omar, 2, "inquiry_new", `New inquiry about “${T(36)}”`, "From Hocine Mebarki", "/profile?tab=messages", false);
  // Immo El Djazair team (agency platform links)
  to(U.nadia, d(86), "application_approved", "Immo El Djazair is now a verified agency on Bayti", "Your application was approved. Your account is now the agency's main account.\n\nWelcome to Bayti! All documents were checked against the Algiers register.", "/", true);
  to(U.nadia, d(15), "inquiry_new", `New inquiry about “${T(3)}”`, "From Yacine Mansouri", chatLink(17), true);
  to(U.nadia, d(14), "inquiry_cancelled", `A client cancelled their request about “${T(3)}”`, null, "/inquiries", true);
  to(U.nadia, d(5), "inquiry_visit", `Imane Touati asked to visit “${T(3)}”`, `${dateStr(1)} at 15:00`, chatLink(9), true);
  to(U.nadia, 46, "inquiry_visit", `Bilal Ghezali asked to visit “${T(13)}”`, `${dateStr(4)} at 14:00`, chatLink(14), false);
  to(U.nadia, 30, "inquiry_new", `New inquiry about “${T(4)}”`, "From Omar Benyoucef", chatLink(10), false);
  to(U.mehdi, 70, "inquiry_new", `New inquiry about “${T(6)}”`, "From Adel Khelifi", chatLink(12), true);
  to(U.riad, P(1).reviewedH, "listing_approved", `Your listing "${T(1)}" is live`, "It's now visible on the marketplace.", "/1", true);
  to(U.riad, P(5).reviewedH, "listing_approved", `Your listing "${T(5)}" is live`, "It's now visible on the marketplace.", "/5", true);
  to(U.riad, 96, "inquiry_new", `New inquiry about “${T(1)}”`, "From Sara Benali", chatLink(1), true);
  to(U.riad, 48, "inquiry_new", `New inquiry about “${T(1)}”`, "From Nour El Houda Saidi", chatLink(11), false);
  to(U.riad, 5, "inquiry_new", `New inquiry about “${T(5)}”`, "From Meriem Ait Ali", chatLink(15), false);
  to(U.amel, d(5), "inquiry_visit", `Rania Bouzid asked to visit “${T(11)}”`, `${dateStr(-2)} at 10:30`, chatLink(13), true);
  to(U.amel, P(8).reviewedH, "listing_rejected", `Your listing "${T(8)}" needs changes`, `Reason: ${P(8).reviewNote}\n\nEdit the listing to send it back for review.`, "/8", false);
  to(U.amel, 20, "inquiry_visit", `Sara Benali asked to visit “${T(2)}”`, `${dateStr(3)} at 17:30`, chatLink(5), false);
  to(U.sofiane, d(13), "agency_deactivated", "Immo El Djazair switched off your access", "You can't use the agency platform or publish for the agency until you're reactivated.", null, false);
  // Other agencies
  to(U.hichem, 144, "inquiry_visit", `Sara Benali asked to visit “${T(14)}”`, `${dateStr(2)} at 10:00`, chatLink(2), true);
  to(U.hichem, 50, "inquiry_visit", `Imane Touati asked to visit “${T(17)}”`, `${dateStr(5)} at 09:30`, chatLink(19), false);
  to(U.wassila, 26, "inquiry_new", `New inquiry about “${T(15)}”`, "From Adel Khelifi", chatLink(18), true);
  to(U.farid, d(14), "agency_verification_revoked", "Constantine Habitat's verification was revoked", `Your listings stay online without the verified badge. Reason: ${Agency[2].verificationNote}`, "/settings", false);
  to(U.farid, 74, "inquiry_new", `New inquiry about “${T(19)}”`, "From Nour El Houda Saidi", chatLink(20), true);
  to(U.rachid, d(20), "agency_suspended", "Sahel Immobilier has been suspended", `Your listings are hidden until this is resolved. Reason: ${Agency[3].statusReason}`, "/", false);
  // Applicants
  to(U.samir, d(17), "application_under_review", "We're reviewing Dar Essalam Immobilier", "Our team has started checking your application and documents.", "/application", true);
  to(U.samir, d(15), "application_info_required", "Dar Essalam Immobilier: more information needed", `Our team needs more from you before deciding:\n\n${AgencyApplication[1].requestMessage}\n\nOpen your application to update it and upload documents.`, "/application", false);
  to(U.leila, d(6, 3), "application_under_review", "We're reviewing Béjaïa Littoral Immobilier", "Our team has started checking your application and documents.", "/application", false);
  to(U.djamel, d(41), "application_under_review", "We're reviewing Djamel Immo Services", "Our team has started checking your application and documents.", "/application", true);
  to(U.djamel, d(38), "application_rejected", "Your agency application for Djamel Immo Services was not approved", `Reason: ${AgencyApplication[4].decisionNote}\n\nYou can submit a new application once the issue is resolved.`, "/application", true);

  // ---------------- Audit log ----------------
  const AuditLog = [];
  const ips = ["41.105.12.44", "41.111.208.17", "105.235.131.9", "197.112.40.226"];
  const log = (h, actorId, action, entityType, entityId, summary, details = null) =>
    AuditLog.push({
      id: 0, actorId, action, entityType, entityId, summary: summary.slice(0, 190), details,
      ip: ips[(actorId || 0) % ips.length], createdAt: iso(h),
    });
  const label = (id) => `"${T(id)}" (#${id})`;
  const agencyLog = (h, actorId, action, summary, details) => log(h, actorId, action, "agency", 1, summary, details);

  // Admin: agencies and applications
  log(d(88), U.admin, "application.start_review", "application", 1, "Immo El Djazair: submitted → under_review", { message: null });
  log(d(88, -2), U.admin, "agency.create", "agency", 2, "Created agency Oran Prestige Immobilier owned by Hichem Bensalah");
  log(d(87), U.ops, "agency.create", "agency", 3, "Created agency Constantine Habitat owned by Farid Zerrouki");
  log(d(86), U.admin, "application.approve", "application", 1, "Immo El Djazair: under_review → approved", { message: AgencyApplication[0].decisionNote, agencyId: 1 });
  log(d(85), U.ops, "agency.create", "agency", 4, "Created agency Sahel Immobilier owned by Rachid Hamidi");
  log(d(41), U.admin, "application.start_review", "application", 5, "Djamel Immo Services: submitted → under_review", { message: null });
  log(d(38), U.admin, "application.reject", "application", 5, "Djamel Immo Services: under_review → rejected", { message: AgencyApplication[4].decisionNote });
  log(d(30), U.admin, "settings.update", "settings", null, "Changed settings: listings, notifications");
  log(d(24, -1), U.admin, "post.update", "post", 1, `Edited ${label(1)}: featured`, { featured: { from: false, to: true } });
  log(d(23), U.admin, "post.update", "post", 32, `Edited ${label(32)}: featured`, { featured: { from: false, to: true } });
  log(d(22, 2), U.admin, "user.suspend", "user", U.walid, `Walid Meziane is now suspended: ${userById.get(U.walid).statusReason}`);
  log(d(22), U.admin, "report.resolved", "report", 3, `Report #3 resolved: ${Report[2].resolution}`);
  log(d(20), U.admin, "agency.suspend", "agency", 4, `Sahel Immobilier suspended: ${Agency[3].statusReason}`);
  log(d(17), U.ops, "application.start_review", "application", 2, "Dar Essalam Immobilier: submitted → under_review", { message: null });
  log(d(16, 3), U.ops, "application.checklist", "application", 2, 'Checked "RC extract matches the legal name, RC number and a real-estate activity"');
  log(d(15, 4), U.ops, "application.checklist", "application", 2, 'Checked "Business phone and email reached the agency"');
  log(d(15), U.ops, "application.request_info", "application", 2, "Dar Essalam Immobilier: under_review → info_required", { message: AgencyApplication[1].requestMessage });
  log(d(14), U.admin, "agency.revoke", "agency", 3, `Constantine Habitat verification revoked: ${Agency[2].verificationNote}`, { from: "verified", to: "revoked", reason: Agency[2].verificationNote });
  log(d(10), U.ops, "report.dismissed", "report", 4, `Report #4 dismissed: ${Report[3].resolution}`);
  log(d(6, 3), U.admin, "application.start_review", "application", 4, "Béjaïa Littoral Immobilier: submitted → under_review", { message: null });
  log(d(6, 2.5), U.admin, "document.view", "document", Document.find((x) => x.applicationId === 4 && x.kind === "agrement").id, "Opened agrement-bejaia-littoral.pdf");
  log(d(6, 2), U.admin, "application.checklist", "application", 4, 'Checked "Agrément certificate matches the number, wilaya and dates entered"');
  log(d(6, 1.8), U.admin, "application.checklist", "application", 4, 'Checked "Agrément is still valid (5 years from issue, art. 16)"');
  log(d(5, 4), U.ops, "application.checklist", "application", 4, 'Checked "RC extract matches the legal name, RC number and a real-estate activity"');
  log(d(5, 3), U.ops, "application.checklist", "application", 4, 'Checked "Business phone and email reached the agency"');

  // Admin: listing moderation (from each listing's review)
  for (const p of postById.values()) {
    if (!p.reviewedH) continue;
    const actor = p.id % 3 === 0 ? U.ops : U.admin;
    if (p.status === "rejected") {
      log(p.reviewedH, actor, "post.rejected", "post", p.id, `${label(p.id)}: pending → rejected (${p.reviewNote})`);
    } else {
      log(p.reviewedH, actor, "post.approved", "post", p.id, `${label(p.id)}: pending → approved`);
    }
  }

  // Immo El Djazair team activity
  agencyLog(d(80), U.nadia, "agency.member_create", "Created an account for Mehdi Saadi as manager", { userId: U.mehdi });
  agencyLog(d(78), U.nadia, "agency.member_create", "Created an account for Riad Belkacem as agent", { userId: U.riad });
  agencyLog(d(76), U.mehdi, "agency.member_create", "Created an account for Sofiane Larbi as agent", { userId: U.sofiane });
  agencyLog(d(62), U.nadia, "agency.member_invite", "Invited Amel Kaci as agent", { userId: U.amel, invitationId: 3 });
  for (const p of postById.values()) {
    if (p.agencyId !== 1) continue;
    agencyLog(p.createdH, p.createdById, "agency.listing_create", `Created “${p.title}”`, { postId: p.id, agentId: p.userId });
  }
  agencyLog(d(40), U.mehdi, "agency.listing_archive", `Archived “${T(10)}”`, { postId: 10 });
  agencyLog(d(30), U.nadia, "agency.member_invite", "Invited Nour El Houda Saidi as agent", { userId: U.nour, invitationId: 5 });
  agencyLog(d(30, -1), U.riad, "agency.inquiry_closed", `Marked the inquiry about “${T(12)}” closed`, { postId: 12, inquiryId: 16 });
  agencyLog(d(25), U.nadia, "agency.profile_update", "Updated the agency profile");
  agencyLog(d(15), U.riad, "agency.listing_offline", `Took offline “${T(9)}”`, { postId: 9 });
  agencyLog(d(13), U.nadia, "agency.member_update", "Updated Sofiane Larbi: access switched off", { userId: U.sofiane, agencyActive: false });
  agencyLog(d(12, 23), U.nadia, "agency.listing_assign", `Assigned “${T(11)}” to Amel Kaci`, { postId: 11, from: U.sofiane, to: U.amel });
  agencyLog(d(7), U.nadia, "agency.legal_update", "Changed address", { address: { from: "8 Rue Ahmed Ouaked, Hydra", to: "12 Rue Ahmed Ouaked, Hydra" } });
  agencyLog(d(6), U.riad, "agency.listing_update", `Edited “${T(1)}”`, { postId: 1 });
  agencyLog(d(4, 20), U.nadia, "agency.inquiry_scheduled", `Marked the inquiry about “${T(3)}” scheduled`, { postId: 3, inquiryId: 9 });
  agencyLog(d(4, 18), U.amel, "agency.inquiry_scheduled", `Marked the inquiry about “${T(11)}” scheduled`, { postId: 11, inquiryId: 13 });
  agencyLog(d(2, 16), U.mehdi, "agency.member_invite", "Invited Bilal Ghezali as agent", { userId: U.bilal, invitationId: 2 });
  agencyLog(d(2), U.nadia, "agency.member_invite", "Invited Yacine Mansouri as agent", { userId: U.yacine, invitationId: 1 });
  agencyLog(d(1, 18), U.amel, "agency.inquiry_closed", `Marked the inquiry about “${T(11)}” closed`, { postId: 11, inquiryId: 13 });
  agencyLog(d(1, 17), U.amel, "agency.listing_update", `Edited “${T(11)}”`, { postId: 11 });
  agencyLog(d(1, 3), U.mehdi, "agency.invite_revoke", "Withdrew an invitation", { invitationId: 2 });
  agencyLog(48, U.mehdi, "agency.inquiry_closed", `Marked the inquiry about “${T(6)}” closed`, { postId: 6, inquiryId: 12 });
  // Oran Prestige team activity
  log(d(66), U.hichem, "agency.member_invite", "agency", 2, "Invited Wassila Boukhari as agent", { userId: U.wassila, invitationId: 4 });
  for (const p of postById.values()) {
    if (p.agencyId !== 2) continue;
    log(p.createdH, p.createdById, "agency.listing_create", "agency", 2, `Created “${p.title}”`, { postId: p.id, agentId: p.userId });
  }
  log(130, U.hichem, "agency.inquiry_scheduled", "agency", 2, `Marked the inquiry about “${T(14)}” scheduled`, { postId: 14, inquiryId: 2 });

  AuditLog.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  AuditLog.forEach((row, i) => (row.id = i + 1));

  return {
    User,
    Agency,
    Post,
    PostDetail,
    PostView,
    SavedPost,
    Chat,
    ChatUser,
    Message,
    Inquiry,
    AgencyInvitation,
    AgencyApplication,
    ApplicationEvent,
    ApplicationNote,
    Document,
    Notification,
    AuditLog,
    Report,
    Setting: [],
    PasswordResetToken: [],
  };
}
