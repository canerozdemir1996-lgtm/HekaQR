-- DNS TXT doğrulaması (status) ile sunucu tarafı nginx+TLS kurulumu farklı
-- aşamalardır: domain sahipliği TXT ile kanıtlanabilir ama nginx server
-- block + Let's Encrypt sertifikası ayrıca, kök yetkisi gereken bir adımla
-- kurulur (scripts/provision-custom-domain.sh). Bu kolonlar o aşamanın
-- durumunu ayrı izler.

alter table public.custom_domains add column if not exists server_status text not null default 'not_started';
alter table public.custom_domains add column if not exists server_provisioned_at timestamptz;
alter table public.custom_domains add column if not exists server_error text;

alter table public.custom_domains drop constraint if exists custom_domains_server_status_check;
alter table public.custom_domains
  add constraint custom_domains_server_status_check
  check (server_status in ('not_started', 'provisioning', 'provisioned', 'failed'));
