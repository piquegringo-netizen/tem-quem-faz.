# Project memory

## Product intent & audience

- **Tem Quem Faz** is a service-provider marketplace app connecting local service providers with clients via WhatsApp.
- Phase One scoped to the **Poté / Vale do Mucuri – MG** region, starting with 24 cities.
- Target users: local residents searching for providers, and providers registering/being approved.

## Brand personality & voice

- Friendly, community-oriented local marketplace.
- Social-network feel (Instagram-like stories, provider profiles).
- Content and UI are in **Portuguese (Brazilian)**.

## Visual design & UX direction

- Mobile-first responsive layout.
- Current visual style preserved across phases — do not redesign when adding features.
- Instagram-style story circles at top; tap to open full-screen image + short caption.
- Provider cards show key info; "Ver perfil" opens a clean social-network-style profile (photo/initials, name, category, city, description, active seals, rating, WhatsApp button, recent stories).
- Lucide React icons used throughout.

## Decisions, constraints & rationale

- Stack: Vite + React, Tailwind CSS, Lucide React, `@/` path alias → `src/`.
- Data layer: mock data + localStorage for now; code organized for future Supabase migration (cities/providers/stories structured as swappable data sources).
- Cities stored as a table with slug + coordinates; adding a city requires only inserting into the table — no code changes needed.
- Payment is **simulated** (R$ 49,90 registration fee), not real.
- Admin panel uses a **mocked login** for testing; can approve/reject pending providers.
- Provider registration includes seals/badges (types: bairro, cidade, região) and the R$ 49,90 fee.
- Only **approved** providers can post stories; stories auto-expire after 24h.
- Caratinga and Mantena kept active because they had pre-existing test data; may be removed before launch.
- Example/test data is preserved across phases; cleanup deferred to final phase.

## Open questions & assumptions

- Whether to remove Caratinga and Mantena from active cities at launch (pending user decision).
- Supabase integration timing not yet specified.
- Real payment integration deferred — no timeline given.
- Admin login credentials/auth method to be defined when moving beyond mock.