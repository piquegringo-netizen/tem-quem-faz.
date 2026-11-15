/*
# Add Vale do Mucuri cities (Poté region) and example providers

1. New Rows in `cities`
- Adds 21 cities from the Vale do Mucuri region, all active:
  Teófilo Otoni, Ladainha, Malacacheta, Nanuque, Carlos Chagas, Itambacuri, Frei Gaspar,
  Ouro Verde de Minas, Pavão, Catuji, Novo Oriente de Minas, Águas Formosas, Fronteira dos Vales,
  Santa Helena de Minas, Bertópolis, Umburatiba, Crisólita, Machacalis, Águas Vermelhas,
  Divisa Alegre and Palmópolis.
- Each has slug, UF 'MG' and approximate coordinates for distance sorting.
- Poté (already seeded) stays the launch city. Caratinga and Mantena remain active so their
  existing example providers keep showing while we are still testing.

2. New Rows in `providers`
- Six example providers spread across the new cities (Teófilo Otoni, Nanuque, Carlos Chagas,
  Malacacheta), most approved with different seals, one pending for the admin panel demo.
- All flagged with `registration_fee_paid = true` and the matching `selected_plans`.

3. Notes
- Every statement is idempotent (`ON CONFLICT DO NOTHING` with fixed ids), so re-applying is safe.
- To add more cities later, just insert rows in `cities` with a unique slug and coordinates —
  the app picks them up automatically in search and registration.
*/

INSERT INTO cities (id, slug, name, uf, latitude, longitude, is_active) VALUES
  ('c0000000-0000-4000-8000-000000000004', 'teofilo-otoni-mg', 'Teófilo Otoni', 'MG', -18.5794, -41.5069, true),
  ('c0000000-0000-4000-8000-000000000005', 'ladainha-mg', 'Ladainha', 'MG', -17.2444, -42.0269, true),
  ('c0000000-0000-4000-8000-000000000006', 'malacacheta-mg', 'Malacacheta', 'MG', -17.7664, -42.0169, true),
  ('c0000000-0000-4000-8000-000000000007', 'nanuque-mg', 'Nanuque', 'MG', -17.7628, -40.3528, true),
  ('c0000000-0000-4000-8000-000000000008', 'carlos-chagas-mg', 'Carlos Chagas', 'MG', -17.7089, -40.7678, true),
  ('c0000000-0000-4000-8000-000000000009', 'itambacuri-mg', 'Itambacuri', 'MG', -18.0375, -41.6822, true),
  ('c0000000-0000-4000-8000-00000000000a', 'frei-gaspar-mg', 'Frei Gaspar', 'MG', -18.4253, -41.6250, true),
  ('c0000000-0000-4000-8000-00000000000b', 'ouro-verde-de-minas-mg', 'Ouro Verde de Minas', 'MG', -17.8367, -41.7272, true),
  ('c0000000-0000-4000-8000-00000000000c', 'pavao-mg', 'Pavão', 'MG', -17.4050, -41.6458, true),
  ('c0000000-0000-4000-8000-00000000000d', 'catuji-mg', 'Catuji', 'MG', -17.6075, -41.7522, true),
  ('c0000000-0000-4000-8000-00000000000e', 'novo-oriente-de-minas-mg', 'Novo Oriente de Minas', 'MG', -17.3694, -41.5886, true),
  ('c0000000-0000-4000-8000-00000000000f', 'aguas-formosas-mg', 'Águas Formosas', 'MG', -17.0917, -41.0644, true),
  ('c0000000-0000-4000-8000-000000000010', 'fronteira-dos-vales-mg', 'Fronteira dos Vales', 'MG', -16.9489, -40.9842, true),
  ('c0000000-0000-4000-8000-000000000011', 'santa-helena-de-minas-mg', 'Santa Helena de Minas', 'MG', -16.9033, -40.8703, true),
  ('c0000000-0000-4000-8000-000000000012', 'bertopolis-mg', 'Bertópolis', 'MG', -17.1536, -40.8036, true),
  ('c0000000-0000-4000-8000-000000000013', 'umburatiba-mg', 'Umburatiba', 'MG', -17.0328, -40.7172, true),
  ('c0000000-0000-4000-8000-000000000014', 'crisolita-mg', 'Crisólita', 'MG', -17.1989, -40.6992, true),
  ('c0000000-0000-4000-8000-000000000015', 'machacalis-mg', 'Machacalis', 'MG', -17.1319, -40.6739, true),
  ('c0000000-0000-4000-8000-000000000016', 'aguas-vermelhas-mg', 'Águas Vermelhas', 'MG', -15.7367, -41.4753, true),
  ('c0000000-0000-4000-8000-000000000017', 'divisa-alegre-mg', 'Divisa Alegre', 'MG', -16.8339, -40.8336, true),
  ('c0000000-0000-4000-8000-000000000018', 'palmopolis-mg', 'Palmópolis', 'MG', -16.7433, -40.8317, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO providers (id, city_id, name, headline, description, whatsapp, plan, status, latitude, longitude,
                       selected_plans, registration_fee_paid) VALUES
  ('b0000000-0000-4000-8000-000000000017', 'c0000000-0000-4000-8000-000000000004',
   'Marcos Vinícius Pereira', 'Elétrica residencial e comercial',
   'Instalações elétricas, quadros de distribuição e manutenção preventiva em Teófilo Otoni e região.',
   '5533998200017', 'cidade', 'aprovado', -18.5794, -41.5069,
   ARRAY['bairro','cidade'], true),
  ('b0000000-0000-4000-8000-000000000018', 'c0000000-0000-4000-8000-000000000004',
   'Débora Almeida', 'Diarista e faxina pesada',
   'Limpeza residencial e pós-obra com agendamento flexível, atendo a região central e bairros.',
   '5533998200018', 'bairro', 'aprovado', -18.5794, -41.5069,
   ARRAY['bairro'], true),
  ('b0000000-0000-4000-8000-000000000019', 'c0000000-0000-4000-8000-000000000004',
   'Josué Crispim', 'Jardinagem e poda de árvores',
   'Cuidado de jardins, poda e remoção de árvores com segurança.', '5533998200019',
   NULL, 'aprovado', -18.5794, -41.5069, NULL, true),
  ('b0000000-0000-4000-8000-00000000001a', 'c0000000-0000-4000-8000-000000000007',
   'Wagner Souza', 'Pintura interna e externa',
   'Pintura residencial com acabamento fino, texturas e grafiato.', '5533998200020',
   'bairro', 'aprovado', -17.7628, -40.3528, ARRAY['bairro'], true),
  ('b0000000-0000-4000-8000-00000000001b', 'c0000000-0000-4000-8000-000000000008',
   'Elias Fernandes', 'Construção e alvenaria',
   'Reformas, laje e alvenaria estrutural em Carlos Chagas e cidades vizinhas.',
   '5533998200021', 'regiao', 'aprovado', -17.7089, -40.7678,
   ARRAY['bairro','cidade','regiao'], true),
  ('b0000000-0000-4000-8000-00000000001c', 'c0000000-0000-4000-8000-000000000006',
   'Cleide Ribeiro', 'Diarista para casas e lojas',
   'Limpeza completa com produtos próprios, atendo Malacacheta e distritos.', '5533998200022',
   NULL, 'pendente', -17.7664, -42.0169, NULL, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provider_categories (provider_id, category_id) VALUES
  ('b0000000-0000-4000-8000-000000000017', 'ca000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000018', 'ca000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000019', 'ca000000-0000-4000-8000-000000000006'),
  ('b0000000-0000-4000-8000-00000000001a', 'ca000000-0000-4000-8000-000000000004'),
  ('b0000000-0000-4000-8000-00000000001b', 'ca000000-0000-4000-8000-000000000005'),
  ('b0000000-0000-4000-8000-00000000001c', 'ca000000-0000-4000-8000-000000000003')
ON CONFLICT DO NOTHING;
