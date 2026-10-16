/** Fact identity is independent of narrative language. Chinese is the authored master
 * where it exists; otherwise use Japanese, English, then the first authored version.
 * Raw translations stay available for drift review and source editing.
 */
export const sharedFactFields=['roles','lifecycle','affiliations','relations','sources','releaseDate','duration','performers','credits','genres','tags','media','lyricsSources','releaseType','primaryArtist','label','catalogNumber','tracks','editions','status','subProjects','orgType','parentOrg','eventType','dateRange','venue','headliners','guestPerformers','organizer','setlist','setlistStatus','loreCategory','belongToUniverse','relatedEntities','voiceEngines','genome','versions','visualHistory','evidence','liveInfo','license','sourceHistory'];
export function canonicalEntityEntry(translations) {
 return translations.get('zh') || translations.get('ja') || translations.get('en') || translations.values().next().value;
}
export function sharedEntityFacts(translations) {
 const canonical=canonicalEntityEntry(translations),facts={};
 for(const key of sharedFactFields)if(canonical.data[key]!==undefined)facts[key]=canonical.data[key];
 return {facts,locale:canonical.data.locale,filePath:canonical.filePath};
}
export function resolveSharedEntityData(translations,narrative) {
 const {facts}=sharedEntityFacts(translations),data={...narrative};
 for(const key of sharedFactFields)delete data[key];
 return {...data,...facts};
}
