-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_projects_owner_name on projects(owner_id, name);

-- Scenarios
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module text not null, -- 'GFA' | 'InventoryOptimization' | others
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_scenarios_project_module_name
  on scenarios(project_id, module, name);

-- Results
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  module text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  version int not null default 1
);

create unique index if not exists uq_results_scenario_name on results(scenario_id, name);
create index if not exists ix_results_scenario_created_desc on results(scenario_id, created_at desc);

-- RLS
alter table projects enable row level security;
alter table scenarios enable row level security;
alter table results enable row level security;

create policy p_projects_owner_rw on projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy p_scenarios_owner_rw on scenarios
  for all using (exists (select 1 from projects p where p.id = scenarios.project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = scenarios.project_id and p.owner_id = auth.uid()));

create policy p_results_owner_rw on results
  for all using (exists (
    select 1 from projects p
    join scenarios s on s.project_id = p.id
    where s.id = results.scenario_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from projects p
    join scenarios s on s.project_id = p.id
    where s.id = results.scenario_id and p.owner_id = auth.uid()
  ));
