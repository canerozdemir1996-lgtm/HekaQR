import assert from "node:assert/strict";
import test from "node:test";
import { groupByUtmCampaign, UNTAGGED_UTM_CAMPAIGN } from "../lib/qr-grouping";

test("UTM campaigns group by trimmed reporting value", () => {
  const groups = groupByUtmCampaign([
    { id: "a", utm_campaign: " Yaz 2026 " },
    { id: "b", utm_campaign: "Yaz 2026" },
    { id: "c", utm_campaign: "Bayi" },
  ]);

  assert.deepEqual(groups.map((group) => [group.name, group.codes.map((code) => code.id)]), [
    ["Yaz 2026", ["a", "b"]],
    ["Bayi", ["c"]],
  ]);
});

test("folder membership does not change UTM campaign membership", () => {
  const groups = groupByUtmCampaign([
    { id: "a", folder_id: "folder-1", utm_campaign: "Lansman" },
    { id: "b", folder_id: "folder-2", utm_campaign: "Lansman" },
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].codes.map((code) => code.id), ["a", "b"]);
});

test("blank campaign values stay visible in an untagged reporting group", () => {
  const groups = groupByUtmCampaign([
    { id: "a", utm_campaign: null },
    { id: "b", utm_campaign: "   " },
  ]);

  assert.equal(groups[0].name, UNTAGGED_UTM_CAMPAIGN);
  assert.equal(groups[0].codes.length, 2);
});

