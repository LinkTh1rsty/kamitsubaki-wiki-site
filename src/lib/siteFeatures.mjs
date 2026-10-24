import {resolveLocaleCopy} from './i18n.mjs';
import {archiveFeatureDefinitions} from './archiveFeatureCopy.mjs';
const text=(zh,en,ja)=>({zh,en,ja});
export const siteFeatures=[
 {id:'database',group:'main',path:'/database/',title:text('百科','Encyclopedia','百科'),summary:text('人物、团体、项目与音乐作品','People, groups, projects and music','人物・グループ・企画・音楽')},
 {id:'articles',group:'main',path:'/articles/',title:text('文章专栏','Articles','記事'),summary:text('考据、观点与观测记录','Research, perspectives and observations','考察・視点・観測記録')},
 {id:'community',group:'main',path:'/community/activities/',title:text('观测者企划','Observer Projects','観測者企画'),summary:text('社群活动日历、应援与同人企划','Fan events, support and creative projects','ファンイベント・応援・創作企画')},
 {id:'explore',group:'main',path:'/explore/',title:text('探索','Explore','探索'),summary:text('循着时间与关联，发现更多','Follow time and connections','時間とつながりをたどる')},
 {id:'graph',group:'main',path:'/graph/',title:text('关系图谱','Graph','関係図'),summary:text('探索全站连接，比较人物与作品之间的路径','Explore archive connections and compare paths','全体のつながりと経路を探索')},
 {id:'labs',group:'main',path:'/labs/',beta:true,title:text('LABs · Beta','LABs · Beta','LABs · Beta'),summary:text('游戏与实验体验','Games and experiments','ゲームと実験')},
 {id:'contribute',group:'main',path:'/contribute/',title:text('参与共建','Contribute','貢献'),summary:text('编辑词条、投稿文章与图片','Edit records, contribute articles and images','項目・記事・画像を投稿')},
 {id:'docs',group:'main',path:'/docs/',title:text('文档中心','Documents','ドキュメント'),summary:text('网站、贡献与开发说明书','Site, contribution, and development manuals','サイト・投稿・開発の説明書')},
 {id:'chronicle',group:'explore',section:'archive',path:'/chronicle/',title:text('纪元时间轴','Chronicle','年代記'),summary:text('四个纪元，交汇的历史','Four eras, connected histories','四つの時代、交差する歴史')},
 {id:'gallery',group:'explore',section:'archive',path:'/gallery/',title:text('图片档案','Image archive','画像アーカイブ'),summary:text('公开照片、设定图与视觉资料','Public photos, setting art and visual sources','公開写真・設定画・ビジュアル資料')},
 {id:'live-archive',group:'explore',section:'archive',path:'/explore/lives/',title:text('演出档案馆','Live archive','ライブアーカイブ'),summary:text('循着出演者、场地与曲目查阅活动记录','Events connected through performers, venues and setlists','出演者・会場・曲目から記録を探す')},
 {id:'credits-archive',group:'explore',section:'connections',path:'/explore/credits/',title:text('创作者与合作作品','Creators & collaborations','クリエイターと共作'),summary:text('按创作者、演唱者和角色查阅制作名单','Explore credits by creator, performer and role','制作者・歌唱者・役割からクレジットを探す')},
 {id:'discovery',group:'explore',section:'connections',path:'/explore/discovery/',title:text('Discovery · 今日探索','Discovery · daily routes','Discovery · 今日の探索'),summary:text('按偏好发现档案，每天沿关联走一条新路线','Discover entries by interest and follow a daily route','好みから記録を見つけ、毎日の経路をたどる')},
 {id:'stories',group:'explore',section:'connections',path:'/explore/stories/',title:text('Story Mode · 入坑路线','Story Mode · guided routes','Story Mode · 入門ガイド'),summary:text('从花谱、V.W.P 与神椿市开始，边读边听、保存进度','Meet KAF, V.W.P and Kamitsubaki City through reading, listening and saved progress','花譜・V.W.P・神椿市から、読み・聴き・進捗を残す')},
 {id:'relations',group:'explore',section:'connections',path:'/graph/',title:text('Graph · 全站关系图谱','Graph · archive connections','Graph · 全体の関係図'),summary:text('浏览全图，沿关联继续探索并比较连接路径','Browse the graph, follow connections and compare paths','全体を見渡し、関連と経路をたどる')},
 {id:'world',group:'explore',section:'connections',path:'/explore/world/',title:text('世界观导览','World guide','世界観ガイド'),summary:text('故事与世界的阅读入口','Find your way through stories and worlds','物語と世界を読む')},
 {id:'knowledge',group:'explore',section:'connections',path:'/contribute/missing/',title:text('资料完善看板','Contribution board','資料整備ボード'),summary:text('找出缺失资料，参与完善档案','Find missing details and improve the archive','不足資料を見つけて記録を補う')},
 {id:'game',group:'labs',path:'/games/memory-corridor',beta:true,title:text('记忆回廊','Memory Corridor','記憶回廊'),summary:text('在像素世界里探索神椿','Explore Kamitsubaki in pixels','ピクセルの神椿を探索')},
 {id:'chat',group:'labs',path:'https://chat.kamitsubaki.wiki/',beta:true,title:text('角色对话','Character chat','キャラクター対話'),summary:text('与角色展开 AI 对话','AI conversations with characters','キャラクターとの AI 対話')},
];
siteFeatures.push(...archiveFeatureDefinitions.map(([id,section,roadmap,title,summary])=>({id:'archive-'+id,group:'explore',section,path:'/explore/'+id+'/',title,summary})));
export function featuresFor(locale,group){return siteFeatures.filter(item=>!group||item.group===group).map(item=>({...item,title:resolveLocaleCopy(item.title,locale),summary:resolveLocaleCopy(item.summary,locale),href:item.path.startsWith('https:')?item.path:`/${locale}${item.path}`}));}
