import map from '../data/classification-map.json' with {type:'json'};
import {categoryEntities,navigationCategories,categoryLabel} from './entityNavigation.mjs';
import {resolveLocaleCopy} from './i18n.mjs';
export const classificationTree=map.tree;
export const classificationArticles=map.articles;
export function classificationLabel(node,locale){return categoryLabel(node,locale);}
export function flattenClassification(nodes=classificationTree){return nodes.flatMap(n=>[n,...flattenClassification(n.children||[])]);}
// The approved tree is the starting point; unit entries supply new branches.
const trees=new WeakMap();
/** @returns {typeof classificationTree} */
export function buildClassificationTree(registry,locale='zh'){
 let cache=trees.get(registry);if(!cache){cache=new Map();trees.set(registry,cache);}if(cache.has(locale))return cache.get(locale);
 const tree=structuredClone(classificationTree);
 const groups=flattenClassification(tree).find(n=>n.category==='groups');
 if(groups){
  groups.children ||= [];
  const entries=registry.list(locale);
  const units=entries.filter(e=>e.data.entityType==='unit');
  for(const unit of units){
   let branch=groups.children.find(n=>n.overviewIds?.includes(unit.data.id));
   if(!branch){const label=unit.data.name||unit.data.title||unit.data.id;branch={id:`group-${unit.data.id}`,labels:[label,label,label],overviewIds:[unit.data.id],ids:[]};groups.children.push(branch);}
   branch.groupEntity=unit.data.id;
   branch.ids=[...new Set([...(branch.ids||[]),...entries.filter(e=>e.data.relations?.some(r=>r.type==='member-of'&&r.target===unit.data.id)).map(e=>e.data.id)])];
  }
 }
 cache.set(locale,tree);return tree;
}
const caches=new WeakMap();
export function classificationEntries(registry,node,locale){
 let cache=caches.get(registry);if(!cache){cache=new Map();caches.set(registry,cache);}const key=locale+':'+node.id+':'+JSON.stringify(node.ids||[]);if(cache.has(key))return cache.get(key);
 const ids=new Set([...(node.overviewIds||[]),...(node.ids||[])]);
 for(const child of node.children||[])for(const e of classificationEntries(registry,child,locale))ids.add(e.data.id);
 if(node.category){const category=navigationCategories.find(c=>c.id===node.category);if(category)for(const e of categoryEntities(registry,category,locale))if(category.discover||e.data.classification?.primary===node.category||e.data.classification?.additional?.includes(node.id))ids.add(e.data.id);}
 if(node.releaseType)for(const e of registry.list(locale))if(e.data.entityType==='work-release'&&e.data.releaseType===node.releaseType)ids.add(e.data.id);
 if(node.eventTypes)for(const e of registry.list(locale))if(e.data.entityType==='live-event'&&node.eventTypes.includes(e.data.eventType))ids.add(e.data.id);
 for(const e of registry.list(locale))if(e.data.classification?.additional?.includes(node.id))ids.add(e.data.id);
 const entries=[...ids].map(id=>registry.resolveEntity(id,locale)).filter(Boolean);cache.set(key,entries);return entries;
}
export function classificationCopy(locale){return resolveLocaleCopy({zh:{placeholder:'待补全',verification:'待核实',records:'词条',overview:'总览',more:'继续展开',collapse:'收起',empty:'暂无词条',index:'打开此分类',path:'当前目录',included:'已收录',pending:'待补全'},ja:{placeholder:'準備中',verification:'要確認',records:'件',overview:'概要',more:'続きを表示',collapse:'閉じる',empty:'項目はありません',index:'この分類を開く',path:'現在の分類',included:'収録済み',pending:'準備中'},en:{placeholder:'To be completed',verification:'Verification required',records:'entries',overview:'Overview',more:'Show more',collapse:'Collapse',empty:'No entries',index:'Open this category',path:'Current category',included:'Available',pending:'To be completed'}},locale);}
