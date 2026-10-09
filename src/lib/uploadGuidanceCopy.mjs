import {resolveLocaleCopy} from './i18n.mjs';

// Channel IDs identify suggestions, never a copyright declaration or a source URL.
export const uploadSourceChannels=Object.freeze([
 {id:'official-x',labels:{zh:'官方 X',ja:'公式 X',en:'Official X'}},
 {id:'official-site',labels:{zh:'官方网站',ja:'公式サイト',en:'Official website'}},
 {id:'official-video',labels:{zh:'官方视频发布',ja:'公式動画',en:'Official video release'}},
 {id:'creator-original',labels:{zh:'创作者原始发布',ja:'作者による原投稿',en:'Creator’s original post'}},
]);

export const uploadGuidanceCopy=locale=>resolveLocaleCopy({
 zh:{
  newDraft:'新建另一份草稿',drafts:'查看我的草稿',authorLabel:'图片作者',sourceLabel:'来源名称',urlLabel:'原始链接',rightsLabel:'使用依据',title:'第一次上传？先看这份填写说明',steps:['选择图片后自动私有暂存，可以同时填写资料。','同一作者和出处填一次；不同的图片单独补充。','检查资料后明确点击「提交审核」，审核通过并完成发布后才公开。'],
  examples:'填写标准与示例',field:'字段',example:'怎么填写',
  authorExample:'填写原作者或署名，例如画师名、摄影者名或官方署名；不要自动填写上传者。',
  sourceExample:'选择出处渠道，再补充实际账号或作品名称，例如「花譜官方 X · 发布帖」。',
  urlExample:'复制原始发布页面的链接，优先单条发布帖；不要填写搜索结果、转载或图片缓存地址。',
  rightsExample:'官方公开、本人原创、已获授权三选一。公开可查看不等于允许转载；授权素材须说明许可范围和凭据。',
  classification:'分类优先选择现有候选。照片的人物、类型和标签可以留空；设定组的人物在提交审核前补齐。新形态使用原作品名称，并保留出处。',
  manual:'完整上传教程',rightsManual:'来源与使用依据',sourcePlaceholder:'选择渠道并补充实际发布者',authorPlaceholder:'原作者或原图署名',urlPlaceholder:'原始发布页面的完整链接',basisPlaceholder:'请选择使用依据',
  local:'本机草稿',cloud:'云端草稿',localWaiting:'等待本机保存',cloudWaiting:'尚未同步',conflictTitle:'云端草稿已被另一窗口修改',conflictNote:'两份内容都会保留。检查后选择使用本机修改或载入云端版本。',useLocal:'保留本机修改并同步',useRemote:'载入云端版本',
  selectStep:'选图 · 自动私有暂存',detailsStep:'填写并核对资料',submitStep:'明确提交审核',inspectorTitle:'单张图片资料',inspectorClose:'完成并返回照片',inspectPhoto:'查看并编辑',retryPhoto:'重试此图',
 },
 ja:{
  newDraft:'別の下書きを作成',drafts:'自分の下書きを表示',authorLabel:'画像の作者',sourceLabel:'出典名',urlLabel:'原典 URL',rightsLabel:'利用根拠',title:'初めての投稿：情報の記入方法',steps:['画像を選ぶと非公開で一時保存します。保存中も情報を記入できます。','作者と出典が共通なら一度だけ記入し、異なる画像は個別に補足します。','確認後に「審査に提出」を押します。承認と公開処理が完了すると公開されます。'],
  examples:'記入例',field:'項目',example:'記入方法',authorExample:'イラストレーター、撮影者、公式のクレジットなど、画像の原作者を記入します。投稿者名を自動的に使用しません。',sourceExample:'出典の種類を選び、実際のアカウントや作品名を補足します。例：「花譜公式 X・投稿」。',urlExample:'元の公開ページ、できれば該当する投稿の URL を記入します。検索結果・転載・画像キャッシュの URL は使用しません。',rightsExample:'公式公開素材・本人のオリジナル・許可済みから選択します。閲覧可能でも転載の許可とは限りません。許可済みの場合は範囲と証拠を補足します。',classification:'分類は既存の候補を優先します。単独画像の人物・種類・タグは後から補足できます。設定セットの人物は提出前に選択し、新しい形態は原作品の名前と出典を使用します。',manual:'投稿ガイドを読む',rightsManual:'出典と利用根拠',sourcePlaceholder:'出典の種類と実際の公開元',authorPlaceholder:'原作者・画像のクレジット',urlPlaceholder:'原典ページの完全な URL',basisPlaceholder:'利用根拠を選択',local:'端末内の下書き',cloud:'クラウドの下書き',localWaiting:'端末への保存待ち',cloudWaiting:'未同期',conflictTitle:'別の画面で下書きが変更されました',conflictNote:'両方の内容を保持します。確認して端末の変更を同期するか、クラウドの版を読み込んでください。',useLocal:'端末の変更を保持して同期',useRemote:'クラウドの版を読み込む',selectStep:'画像選択・非公開で一時保存',detailsStep:'情報を記入・確認',submitStep:'審査に提出',inspectorTitle:'画像ごとの情報',inspectorClose:'完了して画像一覧へ',inspectPhoto:'確認・編集',retryPhoto:'この画像を再試行',
 },
 en:{
  newDraft:'Create another draft',drafts:'View my drafts',authorLabel:'Image creator',sourceLabel:'Source name',urlLabel:'Original URL',rightsLabel:'Basis for use',title:'First upload? See how to fill in the details',steps:['Choose photos to stage them privately. You can enter details while they upload.','Enter a shared creator and source once; add differences to the individual photo.','Check the details and explicitly submit for review. Photos become public after approval and publication complete.'],
  examples:'Field standards and examples',field:'Field',example:'How to fill it in',authorExample:'Use the original illustrator, photographer or official credit. Do not automatically use the uploader’s name.',sourceExample:'Choose a source channel and add the actual account or work, such as “KAF official X · release post”.',urlExample:'Link to the original release page, preferably the specific post. Avoid search results, reposts and cached image URLs.',rightsExample:'Choose official public material, your original work or authorized use. Public access alone does not grant permission to repost. Describe the scope and evidence of any authorization.',classification:'Prefer existing classification candidates. People, type and tags can stay blank for standalone photos. Choose a person before submitting a design set. Use the original work’s name and source for new forms.',manual:'Read the upload guide',rightsManual:'Sources and basis for use',sourcePlaceholder:'Choose a channel and add the actual publisher',authorPlaceholder:'Original creator or image credit',urlPlaceholder:'Full URL of the original release page',basisPlaceholder:'Choose a basis for use',local:'Local draft',cloud:'Cloud draft',localWaiting:'Waiting for local save',cloudWaiting:'Not synced yet',conflictTitle:'Another window changed the cloud draft',conflictNote:'Both versions are kept. Check them, then keep and sync your local changes or load the cloud version.',useLocal:'Keep and sync local changes',useRemote:'Load cloud version',selectStep:'Choose photos · automatic private staging',detailsStep:'Add and check details',submitStep:'Submit for review',inspectorTitle:'Photo details',inspectorClose:'Done · return to photos',inspectPhoto:'View and edit',retryPhoto:'Retry this photo',
 }
},locale);

export const uploadSourceLabels=locale=>uploadSourceChannels.map(channel=>({id:channel.id,label:resolveLocaleCopy(channel.labels,locale)}));
