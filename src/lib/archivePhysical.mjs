import {validBarcode} from './archiveBarcode.mjs';
import {stableIdPattern} from './entityContract.mjs';
export function validatePhysicalItems(items,knownEntities){
 if(!Array.isArray(items) || items.length>10000)throw Error('Invalid physical catalogue');
 const ids=new Set();
 for(const item of items){
  if(!item || !stableIdPattern.test(item.id || '') || ids.has(item.id))throw Error('Duplicate or invalid physical ID');
  ids.add(item.id);
  if(!['cd','bluray','merchandise','magazine','bonus','other'].includes(item.type))throw Error('Invalid physical type: '+item.id);
  if(!item.names || !Object.values(item.names).some(name=>typeof name==='string' && name.trim()))throw Error('Missing physical title: '+item.id);
  if(!Array.isArray(item.relatedEntities) || !item.relatedEntities.length || item.relatedEntities.some(id=>!knownEntities.has(id)))throw Error('Unresolved physical relation: '+item.id);
  if(item.barcode && !validBarcode(item.barcode))throw Error('Invalid physical barcode: '+item.id);
  if(!Array.isArray(item.sources) || !item.sources.length || item.sources.some(source=>typeof source.title!=='string' || !/^https?:\/\//.test(source.url || '')))throw Error('Missing physical sources: '+item.id);
 }
 return items;
}
