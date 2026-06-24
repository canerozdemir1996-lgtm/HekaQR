import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveOrganizationBranding,
  resolveQrBranding,
  type OrganizationLookupClient,
} from "../lib/organizations/branding";

function fakeClient(org: Record<string, unknown> | null): OrganizationLookupClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: org, error: null }),
              };
            },
          };
        },
      };
    },
  } as unknown as OrganizationLookupClient;
}

test("resolveOrganizationBranding: uses brand_* overrides when set", async () => {
  const sb = fakeClient({
    id: "org-1",
    name: "Acme Inc",
    logo_url: "https://example.com/logo.png",
    brand_name: "Acme White Label",
    brand_logo_url: "https://example.com/brand-logo.png",
    brand_primary_color: "#ff0000",
  });

  const branding = await resolveOrganizationBranding(sb, "org-1");
  assert.deepEqual(branding, {
    organizationId: "org-1",
    name: "Acme White Label",
    logoUrl: "https://example.com/brand-logo.png",
    primaryColor: "#ff0000",
  });
});

test("resolveOrganizationBranding: falls back to the organization's own name/logo when brand_* is unset", async () => {
  const sb = fakeClient({
    id: "org-1",
    name: "Acme Inc",
    logo_url: "https://example.com/logo.png",
    brand_name: null,
    brand_logo_url: null,
    brand_primary_color: null,
  });

  const branding = await resolveOrganizationBranding(sb, "org-1");
  assert.deepEqual(branding, {
    organizationId: "org-1",
    name: "Acme Inc",
    logoUrl: "https://example.com/logo.png",
    primaryColor: null,
  });
});

test("resolveOrganizationBranding: returns null when the organization can't be found", async () => {
  const sb = fakeClient(null);
  const branding = await resolveOrganizationBranding(sb, "missing-org");
  assert.equal(branding, null);
});

test("resolveQrBranding: returns null when the QR has no organization_id (no white-label applied)", async () => {
  const sb = fakeClient({ id: "org-1", name: "Acme Inc" });
  const branding = await resolveQrBranding(sb, { organization_id: null });
  assert.equal(branding, null);
});

test("resolveQrBranding: resolves the owning organization's branding when organization_id is set", async () => {
  const sb = fakeClient({
    id: "org-1",
    name: "Acme Inc",
    logo_url: null,
    brand_name: "Acme White Label",
    brand_logo_url: null,
    brand_primary_color: "#123456",
  });
  const branding = await resolveQrBranding(sb, { organization_id: "org-1" });
  assert.equal(branding?.name, "Acme White Label");
  assert.equal(branding?.primaryColor, "#123456");
});
