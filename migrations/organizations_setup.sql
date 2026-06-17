-- ─── Organizations / Sub-user System ────────────────────────────────────────
-- Run once in Supabase SQL Editor.
--
-- Tables:
--   organizations        - org entity (owner + metadata)
--   organization_members - membership with role (owner|admin|editor|viewer)
--   organization_invites - pending email invitations with token
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_owner ON organizations(owner_id);

-- Membership: owner is also stored here with role='owner' for uniform querying.
CREATE TABLE IF NOT EXISTS organization_members (
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'suspended')),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- Pending email invitations (user may not exist yet).
CREATE TABLE IF NOT EXISTS organization_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

-- Service role bypasses RLS; enable RLS to block direct anon access.
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- QR sharing: assign a QR to an organization so active members can see it
-- through the server API. User ownership is still kept on qr_codes.user_id.
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_organization_id ON qr_codes(organization_id);

-- New Supabase projects may not expose public tables to the Data API by default.
-- The app accesses these tables through server routes with the service role.
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_invites TO service_role;
GRANT SELECT, UPDATE ON qr_codes TO service_role;
