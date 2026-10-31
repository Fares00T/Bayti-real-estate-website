# Bayti

Bayti ("my home" in Arabic) is a property marketplace for Algeria. Individuals and verified agencies list homes and commercial spaces for sale or rent; visitors search by wilaya and district, browse listings on a map, save favourites, message owners and request tours. Admins approve agencies and moderate listings.

## Users
- **Home seekers** (most traffic): browse on phones and laptops, compare listings, contact owners.
- **Agencies**: manage many listings, answer tour requests from a dashboard.
- **Individual owners**: occasionally post one listing.
- **Admins**: review agency applications, users and listings.

## Visual direction (pinned by the owner)
Follow Airbnb's design language: white canvas, near-black text, one coral brand colour used sparingly for primary actions, pill-shaped search, image-first listing grid with rounded photos and text underneath, thin dividers instead of boxes, a single friendly geometric sans. Bayti keeps its own name and logo; nothing copies Airbnb's branding.

## Constraints
- React + Vite client, SCSS per component, some MUI widgets (themed to match).
- Prices in DZD; locations are Algerian wilayas and dairas (`public/wilaya.json`).
- Must work at phone width.

_Assumptions inferred from the owner's brief and the codebase, not from an interview._
