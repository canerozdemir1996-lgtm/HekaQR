export const UNTAGGED_UTM_CAMPAIGN = "Kampanyasız QR'lar";

export type UtmCampaignRecord = {
  utm_campaign?: string | null;
};

export type UtmCampaignGroup<T extends UtmCampaignRecord> = {
  name: string;
  codes: T[];
};

/**
 * UTM campaigns are a reporting dimension, not an ownership container.
 * Folder membership is intentionally ignored so one QR can belong to both.
 */
export function groupByUtmCampaign<T extends UtmCampaignRecord>(records: T[]): UtmCampaignGroup<T>[] {
  const groups = new Map<string, T[]>();

  records.forEach((record) => {
    const name = record.utm_campaign?.trim() || UNTAGGED_UTM_CAMPAIGN;
    groups.set(name, [...(groups.get(name) ?? []), record]);
  });

  return [...groups.entries()].map(([name, codes]) => ({ name, codes }));
}

