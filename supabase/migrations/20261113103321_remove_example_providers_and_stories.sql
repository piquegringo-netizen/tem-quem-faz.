/*
# Remove all example (seed) providers and stories

1. Data Changes
- Deletes every example provider seeded for testing (Carlos Eduardo Lima, Anderson Pires, Marta Rocha,
  Paulo Henrique Souza, Jorge Batista, Roberto Martins, Fernanda Gomes, Lúcia Ferreira, Elias Fernandes,
  Thiago Nogueira, Patrícia Mendes, Joana Santos, and the pending/rejected test registrations).
- Deletes every example story. Stories cascade automatically when their provider is deleted.
- Real providers registered through the app are kept. Cities and categories remain untouched.

2. Why a migration
- The seed data was inserted by earlier migrations, so this cleanup must also be a migration to keep
  database rebuilds consistent (rebuild replays seeds, then this removes them).

3. Notes
- Foreign keys use ON DELETE CASCADE, so provider_categories, profile_views, contact_clicks and stories
  rows linked to the deleted providers are removed automatically in the same statement.
- Idempotent: deleting again removes nothing.
*/

DELETE FROM providers;
