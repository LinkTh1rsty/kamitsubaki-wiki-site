/** Shared, browser-safe V3 content contract. IDs describe entities, never paths. */
export const entityTypes = ['person','virtual-avatar','unit','software-voice','work-track','work-release','project','organization','live-event','lore-concept','editorial-article'];
export const entityCollections = ['people','units','isotopes','songs','releases','projects','lives','organizations','lore'];
export const concertEventTypes = ['oneman-live','joint-live','xr-sinka-live'];
export const authorableRelations = {
  'member-of':'has-member','persona-related':'persona-related','based-on-voice':'voice-source-of',
  'voice-source-of':'based-on-voice','fictional-counterpart':'fictional-counterpart',
  'character-designed-by':'designed-character','affiliated-with':'has-affiliated-entity',
  'related-project':'has-related-entity','related-release':'related-to-event',
  'derived-from':'derivative-work','soundtrack-for':'has-soundtrack','theme-song-for':'has-theme-song',
  'version-of':'has-version',
};
export const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
