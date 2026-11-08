import {resolveLocaleCopy} from './i18n.mjs';
const text=(zh,en,ja)=>({zh,en,ja});
export const siteFeatures=[
 {id:'database',group:'main',path:'/database/',title:text('百科','Encyclopedia','百科'),summary:text('人物、团体、项目与音乐作品','People, groups, projects and music','人物・グループ・企画・音楽')},
 {id:'articles',group:'main',path:'/articles/',title:text('文章专栏','Articles','記事'),summary:text('考据、观点与观测记录','Research, perspectives and observations','考察・視点・観測記録')},
 {id:'community',group:'main',path:'/community/activities/',title:text('观测者企划','Observer Projects','観測者企画'),summary:text('社群活动日历、应援与同人企划','Fan events, support and creative projects','ファンイベント・応援・創作企画')},
 {id:'explore',group:'main',path:'/explore/',title:text('探索','Explore','探索'),summary:text('循着时间与关联，发现更多','Follow time and connections','時間とつながりをたどる')},
 {id:'labs',group:'main',path:'/labs/',beta:true,title:text('LABs · Beta','LABs · Beta','LABs · Beta'),summary:text('游戏与实验体验','Games and experiments','ゲームと実験')},
 {id:'contribute',group:'main',path:'/contribute/',title:text('参与共建','Contribute','貢献'),summary:text('编辑词条、投稿文章与图片','Edit records, contribute articles and images','項目・記事・画像を投稿')},
 {id:'docs',group:'main',path:'/docs/',title:text('文档中心','Documents','ドキュメント'),summary:text('网站、贡献与开发说明书','Site, contribution, and development manuals','サイト・投稿・開発の説明書')},
 {id:'chronicle',group:'explore',section:'archive',path:'/chronicle/',title:text('纪元时间轴','Chronicle','年代記'),summary:text('四个纪元，交汇的历史','Four eras, connected histories','四つの時代、交差する歴史')},
 {id:'gallery',group:'explore',section:'archive',path:'/gallery/',title:text('图库','Image archive','画像アーカイブ'),summary:text('公开照片、设定图与视觉资料','Public photos, setting art and visual sources','公開写真・設定画・ビジュアル資料')},
 {id:'relations',group:'explore',section:'connections',path:'/explore/relations/',title:text('关联网络','Connections','関係図'),summary:text('人物、作品与项目之间的联系','People, works and projects connected','人物・作品・企画のつながり')},
 {id:'world',group:'explore',section:'connections',path:'/explore/world/',title:text('世界观导览','World guide','世界観ガイド'),summary:text('故事与世界的阅读入口','Find your way through stories and worlds','物語と世界を読む')},
 {id:'game',group:'labs',path:'/games/memory-corridor',beta:true,title:text('记忆回廊','Memory Corridor','記憶回廊'),summary:text('在像素世界里探索神椿','Explore Kamitsubaki in pixels','ピクセルの神椿を探索')},
 {id:'chat',group:'labs',path:'https://chat.kamitsubaki.wiki/',beta:true,title:text('角色对话','Character chat','キャラクター対話'),summary:text('与角色展开 AI 对话','AI conversations with characters','キャラクターとの AI 対話')},
];
export function featuresFor(locale,group){return siteFeatures.filter(item=>!group||item.group===group).map(item=>({...item,title:resolveLocaleCopy(item.title,locale),summary:resolveLocaleCopy(item.summary,locale),href:item.path.startsWith('https:')?item.path:`/${locale}${item.path}`}));}
