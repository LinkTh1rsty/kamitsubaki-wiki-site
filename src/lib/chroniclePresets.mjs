import {resolveLocaleCopy} from './i18n.mjs';
export const chroniclePresets=[
 {id:'kaf',query:{entity:'kaf'},title:{zh:'花谱的足迹',en:'KAF footprints',ja:'花譜の足跡'}},
 {id:'vwp',query:{entity:'vwp'},title:{zh:'V.W.P 的足迹',en:'V.W.P footprints',ja:'V.W.P の足跡'}},
 {id:'music',query:{tracks:'music-live'},title:{zh:'音乐与现场',en:'Music & live',ja:'音楽とライブ'}},
 {id:'worlds',query:{tracks:'project-verse'},title:{zh:'企划与世界观',en:'Projects & worlds',ja:'企画と世界観'}},
 {id:'voices',query:{tracks:'isotope-synth'},title:{zh:'同位体与合成',en:'Isotopes & synthesis',ja:'同位体と合成音声'}},
];
export function chroniclePresetLinks(locale){
 return chroniclePresets.map(preset=>({id:preset.id,title:resolveLocaleCopy(preset.title,locale),href:'/'+locale+'/chronicle/?'+new URLSearchParams({...preset.query,preset:preset.id})}));
}
export function resolveChroniclePreset(id){return chroniclePresets.find(preset=>preset.id===id)?.query || null;}
