const copy = {
  zh: {
    title: '从神椿资料开始',
    description: '先选资料类型，再写正文。已经有原稿，也可以直接载入继续编辑。',
    song: '新建歌曲', album: '新建专辑', isotope: '新建同位体', person: '新建人物', existing: '编辑已有词条',
    articleTitle: '开始写文章', articleDescription: '先写标题与正文。需要特殊排版时，可直接插入下面的内容块。',
    tools: '常用的神椿内容', lyrics: '双语歌词', media: '多平台视听', ruby: '日文注音', details: '折叠资料',
    tip: '在空白行输入 / 可搜索全部内容块；输入 @ 或 [[ 可引用站内资料。',
    domainGroup: '神椿内容', basicGroup: '基础内容',
  },
  'zh-tw': {
    title: '從神椿資料開始',
    description: '先選資料類型，再寫內文。若已有原稿，也可以直接載入繼續編輯。',
    song: '新增歌曲', album: '新增專輯', isotope: '新增同位體', person: '新增人物', existing: '編輯現有詞條',
    articleTitle: '開始寫文章', articleDescription: '先寫標題與內文。需要特殊排版時，可直接插入下方的內容區塊。',
    tools: '常用的神椿內容', lyrics: '雙語歌詞', media: '多平台影音', ruby: '日文注音', details: '摺疊資料',
    tip: '在空白行輸入 / 可搜尋全部內容區塊；輸入 @ 或 [[ 可引用站內資料。',
    domainGroup: '神椿內容', basicGroup: '基本內容',
  },
  'zh-hk': {
    title: '從神椿資料開始',
    description: '先選資料類型，再寫內文。如已有原稿，也可以直接載入繼續編輯。',
    song: '新增歌曲', album: '新增專輯', isotope: '新增同位體', person: '新增人物', existing: '編輯現有詞條',
    articleTitle: '開始寫文章', articleDescription: '先寫標題與內文。需要特殊排版時，可直接插入下方的內容區塊。',
    tools: '常用的神椿內容', lyrics: '雙語歌詞', media: '多平台影音', ruby: '日文注音', details: '摺疊資料',
    tip: '在空白行輸入 / 可搜尋全部內容區塊；輸入 @ 或 [[ 可引用站內資料。',
    domainGroup: '神椿內容', basicGroup: '基本內容',
  },
  ja: {
    title: '神椿の資料から始める',
    description: '資料の種類を選んでから本文を書きます。既存の原稿を読み込んで編集することもできます。',
    song: '楽曲を作成', album: 'アルバムを作成', isotope: '音楽的同位体を作成', person: '人物を作成', existing: '既存の記事を編集',
    articleTitle: '記事を書き始める', articleDescription: 'まずタイトルと本文を入力します。特殊な構成は下のブロックから挿入できます。',
    tools: '神椿でよく使う内容', lyrics: '対訳歌詞', media: '配信先の切り替え', ruby: 'ふりがな', details: '折りたたみ資料',
    tip: '空行で / を入力すると全ブロックを検索できます。@ または [[ でサイト内の資料を参照できます。',
    domainGroup: '神椿の内容', basicGroup: '基本の内容',
  },
  en: {
    title: 'Start with a KAMITSUBAKI entry',
    description: 'Choose the kind of entry, then write its content. You can also load an existing source to continue editing.',
    song: 'New song', album: 'New album', isotope: 'New musical isotope', person: 'New person', existing: 'Edit an existing entry',
    articleTitle: 'Start writing an article', articleDescription: 'Add a title and body first. Insert a specialized block below whenever you need one.',
    tools: 'Common KAMITSUBAKI content', lyrics: 'Bilingual lyrics', media: 'Media platforms', ruby: 'Japanese ruby', details: 'Collapsible details',
    tip: 'Type / on an empty line to search all blocks. Type @ or [[ to link to an entry.',
    domainGroup: 'KAMITSUBAKI content', basicGroup: 'Basic content',
  },
};

export function editorStarterCopy(locale) { return copy[locale] || copy.zh; }

export const domainInsertTypes = ['lyrics', 'media-switcher', 'ruby', 'details', 'inline'];

export function insertActionGroup(type) { return domainInsertTypes.includes(type) ? 'domain' : 'basic'; }

export function sortInsertActions(actions) {
  const domain = new Map(domainInsertTypes.map((type, index) => [type, index]));
  return [...actions].sort((a, b) => {
    const groupA = insertActionGroup(a.type);
    const groupB = insertActionGroup(b.type);
    if (groupA !== groupB) return groupA === 'domain' ? -1 : 1;
    if (groupA === 'domain') return domain.get(a.type) - domain.get(b.type);
    return 0;
  });
}

export function isUntouchedEditorDraft(draft, articleMode = false) {
  if (!draft || draft.kind !== (articleMode ? 'articles' : 'projects')) return false;
  if (draft.path || draft.create || draft.originalMeta || draft.assets?.length) return false;
  if (String(draft.meta?.name || draft.meta?.title || '').trim()) return false;
  return draft.blocks?.length === 1 && draft.blocks[0].type === 'paragraph' && !String(draft.blocks[0].text || '').trim();
}
