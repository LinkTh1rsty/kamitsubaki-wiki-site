export type Translation={zh:string;en:string;ja:string};
export const archiveFeatureDefinitions:Array<[string,string,string,Translation,Translation]>;
export function archiveFeature(locale:string,module:string):{id:string;system:string;roadmap:string;title:string;intro:string};
export function archiveFeatureCopy(locale:string):Record<string,string>;
