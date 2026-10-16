export function archiveFixture(){
 const row=(id,type,facts={},date='2024-02-29')=>({id,type,facts,date,status:'published',datePrecision:'day',image:'',morphing:null,media:[],completeness:{score:70,tier:'good',missing:[{field:'sources',weight:2}]},sourceFile:'src/content/songs/'+id+'/zh.md',history:[],narratives:{zh:{locale:'zh',title:id==='kaf'?'花譜':id,romanized:id,aliases:[],path:'/zh/database/'+id+'/',summary:''},en:{locale:'en',title:id,romanized:id,aliases:[],path:'/en/database/'+id+'/',summary:''}}});
 return {version:1,snapshot:'fixture',entities:[
  row('kaf','virtual-avatar',{},'2018-10-18'),row('kafu','software-voice'),row('maker','person'),
  row('song-a','work-track',{performers:[{entity:'kaf'}],credits:[{entity:'maker',role:'composer'}],duration:'03:20'}),
  row('song-b','work-track',{performers:[{entity:'kaf'}],credits:[{entity:'maker',role:'lyricist'}]},'2023'),
  row('remix','work-track',{performers:[{entity:'kaf'}]},'2024-06-01'),
  row('live-a','live-event',{eventType:'oneman-live',setlist:[{songId:'song-a'},{songId:'song-a'},{title:'Unlinked'}]},'2024-02-29'),
  row('live-b','live-event',{eventType:'oneman-live'},'2024-03'),
  row('release','work-release',{primaryArtist:'kaf',editions:[{id:'alpha',name:'Alpha',format:'CD',barcode:'4901234567894'}]},'2024-04-10'),
 ],relations:[{source:'remix',target:'song-a',type:'version-of'},{source:'song-a',target:'remix',type:'derived-from'},{source:'song-a',target:'maker',type:'credited-to'},{source:'song-b',target:'maker',type:'credited-to'}],
 events:[{id:'leap-event',date:{start:'2020-02-29',precision:'day'},text:{zh:{title:'leap'},en:{title:'Leap'}}},{id:'year-event',date:{start:'2024',precision:'year'},text:{zh:{title:'year'}}},{id:'month-event',date:{start:'2024-02',precision:'month'},text:{zh:{title:'month'}}}],evidence:[],physical:[],issues:[]};
}
