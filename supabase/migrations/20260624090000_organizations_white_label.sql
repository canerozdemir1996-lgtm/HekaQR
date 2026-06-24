alter table public.organizations add column if not exists brand_name text;
alter table public.organizations add column if not exists brand_logo_url text;
alter table public.organizations add column if not exists brand_primary_color text;

alter table public.organizations drop constraint if exists organizations_brand_primary_color_check;
alter table public.organizations
  add constraint organizations_brand_primary_color_check
  check (brand_primary_color is null or brand_primary_color ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$');
