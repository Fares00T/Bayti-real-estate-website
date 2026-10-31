// Copy for the About, Help, Terms and Privacy pages. Kept apart from the
// layout so a French or Arabic version can be added page by page.
// Everything here describes what the product actually does today; update it
// when features change.

const UPDATED = "31 October 2026";

export const PAGES = {
  about: {
    title: "About Bayti",
    intro:
      "Bayti (بيتي, “my home”) is a property marketplace for Algeria. Owners and agencies publish homes and commercial spaces for sale or rent; everyone else can search them by wilaya, district and budget.",
    sections: [
      {
        heading: "Why we built it",
        body: [
          "Finding a flat in Algeria still means scrolling through social media groups, calling numbers that no longer answer and visiting places that look nothing like their photos. Bayti puts listings in one place, with real photos, prices in DZD and a pin on the map.",
        ],
      },
      {
        heading: "Who it's for",
        body: [],
        list: [
          "People buying or renting a home, an office or a shop.",
          "Owners who want to sell or rent out a property themselves.",
          "Real estate agencies that want to present their portfolio and their team professionally.",
        ],
      },
      {
        heading: "How we keep it useful",
        body: [
          "Our team reviews listings before they are published, and checks each agency's agrément and Registre de Commerce extract before giving it a verified badge. Bayti is not a party to any sale or rental: the agreement is always between you and the owner or agency.",
        ],
      },
    ],
    links: [
      { to: "/help", label: "Help center" },
      { to: "/agencies", label: "Bayti for agencies" },
      { to: "/terms", label: "Terms of use" },
    ],
  },

  help: {
    title: "Help center",
    intro: "Answers to the questions we hear most. Can't find yours? Contact us at the bottom of this page.",
    faq: [
      {
        heading: "Searching",
        items: [
          {
            q: "How do I search only rentals or only sales?",
            a: "Use Buy or Rent in the top menu, or the switch above the search on the home page. On the results page you can change it at any time.",
            link: { to: "/list?type=rent", label: "See rentals" },
          },
          {
            q: "How do I save a listing?",
            a: "Tap the heart on its photo. You need an account; saved listings are under Saved in your account.",
          },
          {
            q: "Are rental prices per month?",
            a: "Yes. Rentals show a monthly price in DZD; sales show the total asking price.",
          },
          {
            q: "How do I contact an owner or an agency?",
            a: "Open the listing and send a message. For agency listings you can also request a visit at a date that suits you.",
          },
        ],
      },
      {
        heading: "Publishing a property",
        items: [
          {
            q: "Who can publish a listing?",
            a: "Anyone with a Bayti account. Owners publish their own property; agencies publish on behalf of their clients.",
            link: { to: "/sell", label: "How listing works" },
          },
          {
            q: "Why isn't my listing visible yet?",
            a: "New and edited listings are reviewed by our team first. You can see each listing's status under My listings in your account. If it was sent back, the note tells you what to change.",
          },
          {
            q: "How do I mark a property as sold or remove it?",
            a: "Open My listings in your account, then edit or delete the listing.",
          },
        ],
      },
      {
        heading: "Agencies",
        items: [
          {
            q: "How does an agency get verified?",
            a: "Apply from the agency registration page with your agrément and your Registre de Commerce extract. Our team reviews the application and tells you the outcome in your notifications.",
            link: { to: "/agencies", label: "Bayti for agencies" },
          },
          {
            q: "Can several people from one agency use Bayti?",
            a: "Yes. Once the agency is approved, its owner adds agents from the agency dashboard using the email of their Bayti account.",
          },
        ],
      },
      {
        heading: "Your account",
        items: [
          {
            q: "I forgot my password.",
            a: "Use “Forgot your password?” on the log-in page and we'll email you a reset link.",
            link: { to: "/forgot-password", label: "Reset my password" },
          },
          {
            q: "How do I change my name, photo or password?",
            a: "Open the menu at the top right, then Account settings.",
          },
        ],
      },
    ],
  },

  terms: {
    title: "Terms of use",
    updated: UPDATED,
    intro: "These terms apply to everyone who uses Bayti, with or without an account. By using Bayti you accept them.",
    sections: [
      {
        heading: "What Bayti is",
        body: [
          "Bayti is a listings platform. It lets owners and agencies publish properties and lets visitors find and contact them. Bayti is not a real estate agent, does not own the properties listed and is not a party to any sale or rental agreement made between users.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You are responsible for what is done with your account and for keeping your password private. Give accurate information when you sign up. We may suspend an account that breaks these terms.",
        ],
      },
      {
        heading: "Publishing listings",
        body: ["When you publish a listing, you confirm that:"],
        list: [
          "you own the property or are authorised to sell or rent it;",
          "the price, photos and description are accurate and current;",
          "the photos are yours or you have the right to use them.",
        ],
      },
      {
        heading: "Review and moderation",
        body: [
          "Listings are reviewed before publication and may be refused, edited back to you with a note, unpublished or removed if they break these terms or appear misleading. Agencies get a verified badge only after we review their documents. A review is not a guarantee: always visit a property and check its documents before paying anything.",
        ],
      },
      {
        heading: "What's not allowed",
        body: [],
        list: [
          "Listings for properties that don't exist or aren't available.",
          "Duplicate listings of the same property.",
          "Using messages for spam, harassment or anything unrelated to a property.",
          "Collecting other users' contact details for other purposes.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms as Bayti evolves. The date at the top of this page shows the latest version.",
        ],
      },
    ],
    links: [
      { to: "/privacy", label: "Privacy" },
      { to: "/help", label: "Help center" },
    ],
  },

  privacy: {
    title: "Privacy",
    updated: UPDATED,
    intro: "What Bayti collects, why, and who can see it.",
    sections: [
      {
        heading: "What we collect",
        body: [],
        list: [
          "Your account: username, email address, password (stored encrypted) and, if you add one, a profile photo.",
          "What you publish: listings, their photos, prices, addresses and map locations.",
          "Your activity: saved listings, messages you send and receive, and visit requests (including the phone number you give for them).",
          "Agency applications: company details, the representative's details and the documents you upload.",
          "Reports you send us about listings or users.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To run your account, show your listings, deliver your messages, review listings and agency applications, and keep the marketplace safe. Listing pages count views; that count doesn't identify you.",
        ],
      },
      {
        heading: "Who can see it",
        body: [
          "Published listings are public. Messages are visible to you and the person you're writing to. Agency documents are seen only by the Bayti team reviewing them. We don't sell your data.",
        ],
      },
      {
        heading: "Cookies and services we rely on",
        body: [
          "We use one cookie to keep you logged in. Photos are stored with Cloudinary, maps are drawn with OpenStreetMap, and fonts load from Google Fonts.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can edit your profile and delete your listings at any time from your account. To have your account deleted, contact us from the Help center.",
        ],
      },
    ],
    links: [
      { to: "/terms", label: "Terms of use" },
      { to: "/help#contact", label: "Contact us" },
    ],
  },
};
