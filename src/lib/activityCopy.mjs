import {communityCopy} from './communityCopy.mjs';
import {resolveLocaleCopy} from './i18n.mjs';
export function activityCopy(locale='zh'){
 const labels={
 promotion_unconfigured:['尚无人工宣传排期；公开活动可能参与近期自动推荐。','No manual promotion schedule; public events may qualify for automatic recommendations.','手動の告知予定はありません。公開イベントは自動推薦の対象となる場合があります。'],
 promotion_scheduled:['已配置宣传时段，尚未开始。','Promotion window configured; not started yet.','告知期間設定済み・開始前。'],
 promotion_eligible:['当前配置允许参与推荐；实际展示仍取决于排序与位置。','Currently eligible for recommendations; actual display depends on ranking and placement.','推薦の対象です。表示は順位と掲載場所によって異なります。'],
 promotion_ended:['宣传时段或活动已结束，历史内容保留。','Promotion window or event ended; the archive is retained.','告知期間またはイベントは終了しました。記録は保持されます。'],
 promotion_archived:['已退出宣传推荐，历史内容保留。','Removed from recommendations; the archive is retained.','推薦から除外されています。記録は保持されます。'],
 promotion_hidden:['活动当前未公开，不参与推荐。','Event is not public and is excluded from recommendations.','現在非公開のため推薦されません。'],
 promotion_paused:['活动已延期或取消，暂不参与推荐。','Event postponed or cancelled; excluded from recommendations.','延期または中止のため推薦されません。'],

 communityTabShort:['观测者企划','Community','観測者企画'],officialTabShort:['官方活动','Official','公式イベント'],publishProjectShort:['发布企划','Submit','企画を投稿'],
 publishProject:['发布企划','Submit a project','企画を投稿'],filterShort:['筛选','Filter','絞り込み'],
 applyPromotion:['申请合作宣传','Request promotion','告知を依頼'],contributeInfo:['补充活动情报','Contribute an event','活動情報を追加'],
 past:['往期活动','Past events','過去のイベント'],pastArchive:['往期企划归档','Past event archive','過去の企画'],older:['查看更早一年','Previous year','さらに前の1年'],pastAll:['查看全部往期','All past events','過去のイベント一覧'],searchResults:['搜索结果','Search results','検索結果'],searchScope:['搜索范围','Search window','検索範囲'],selectedDay:['当日企划','Selected day','選択日の企画'],jump:['在日历中定位','Locate in calendar','カレンダーで表示'],archiveEmpty:['此范围暂无往期活动，可查看更早一年。','No past events here. Try the previous year.','この期間の過去イベントはありません。前の年をご覧ください。'],archiveError:['往期归档暂时无法读取','Archive temporarily unavailable','アーカイブを読み込めません'],
 linkRole:['链接用途','Link purpose','リンクの用途'],linkPrimary:['作为主参与入口','Primary participation link','主な参加リンク'],linkStarts:['生效时间（含时区，可留空）','Active from (with time zone, optional)','開始日時（時間帯付き・任意）'],linkEnds:['失效时间（含时区，可留空）','Active until (with time zone, optional)','終了日時（時間帯付き・任意）'],otherLink:['其他链接','Other link','その他のリンク'],
 promotionHelp:['活动收录与合作推荐分别确认。请填写可核对的公告、参与方式及联系渠道；审核通过不自动保证推荐位置或宣传排期。','Listing and promotional cooperation are confirmed separately. Provide a public announcement, participation instructions and a contact channel. Approval does not guarantee placement or timing.','掲載と告知協力は個別に確認します。公開告知・参加方法・連絡先をご記入ください。承認は推薦枠や掲載期間を保証するものではありません。'],
 discuss:['查看审核讨论','Review discussion','審査のやりとり'],publicResult:['查看公开活动','View published event','公開イベントを見る'],promotionStarts:['宣传开始','Promotion starts','告知開始'],promotionEnds:['宣传结束','Promotion ends','告知終了'],promotionStatus:['宣传反馈','Promotion status','告知状況'],

 home:['首页','Home','ホーム'],activityInfo:['活动信息','Event information','イベント情報'],moreInfo:['更多资料','More information','詳しい情報'],undated:['时间待公布','Dates to be announced','日程は後日発表'],allDay:['全天','All day','終日'],
 locationShort:['活动地点','Location','開催場所'],viewPoster:['查看完整海报','View full poster','ポスターを拡大'],closePoster:['关闭海报','Close poster','ポスターを閉じる'],materialCredits:['素材与署名','Artwork credits','素材・クレジット'],shareShort:['分享','Share','共有'],calendarShort:['加入日历','Add to calendar','カレンダーに追加'],
 title:['活动中心','Activity Center','イベントセンター'],intro:['观测者企划与官方日程，在这里找到下一场相遇。','Find community projects and official events in one place.','観測者企画と公式イベントから、次の出会いを見つけましょう。'],
 officialTab:['官方活动','Official events','公式イベント'],communityTab:['观测者企划','Community projects','観測者企画'],nearby:['未来 30 天','Next 30 days','今後30日'],deadlineView:['即将截止','Upcoming deadlines','締切が近い企画'],allArtists:['全部艺人','All artists','すべてのアーティスト'],keyword:['活动名称、艺人或主办方','Event, artist or organizer','イベント名・アーティスト・主催者'],
 clear:['清除筛选','Clear filters','絞り込みを解除'],emptyRange:['这个范围暂时没有公开活动。试试其他月份或查看未来 30 天。','No public events in this range. Try another month or the next 30 days.','この範囲に公開イベントはありません。別の月や今後30日をご覧ください。'],emptyFiltered:['没有符合筛选条件的活动。','No events match these filters.','条件に合うイベントはありません。'],unavailable:['暂时无法读取活动，请重试。','Events are temporarily unavailable. Please retry.','イベントを読み込めません。再度お試しください。'],cached:['正在显示上次成功读取的数据','Showing the last available data','前回取得できた情報を表示しています'],fetched:['读取时间','Retrieved','取得日時'],endUnknown:['结束时间未公布','End time not announced','終了時刻未発表'],started:['已开始 · 结束时间待公布','Started · end time unannounced','開始済み・終了時刻未発表'],
 sourceLink:['查看官方原文','Official announcement','公式の告知へ'],share:['复制分享文案','Copy share text','紹介文をコピー'],shareImage:['保存分享图','Save share image','紹介画像を保存'],shareCopied:['文案和链接已复制','Text and link copied','紹介文とリンクをコピーしました'],shareError:['分享操作未完成，请重试或直接复制链接。','Sharing could not finish. Retry or copy the link.','共有できませんでした。再試行するかリンクをコピーしてください。'],imageError:['图片暂时无法导出，仍可复制文案和链接。','Image export is unavailable. You can still copy the text and link.','画像を書き出せません。紹介文とリンクはコピーできます。'],
 introduction:['活动介绍','Introduction','イベント紹介'],participate:['参与方式','Participation','参加方法'],timeline:['时间安排','Schedule','日程'],notes:['注意事项','Notes','注意事項'],featuredTitle:['精选企划','Coming together','これからの出会い'],viewAll:['查看全部','View all','すべて見る'],more:['更多活动','More events','ほかのイベント'],basis:['日期按活动原时区显示；具体时刻同时提供你的本地时间。','Dates follow each event’s original time zone. Timed events also show your local time.','日付は開催地の時間帯を基準とし、時刻にはあなたの現地時間も表示します。'],subscriptionHint:['订阅沿用当前筛选，不限于正在查看的月份。日历应用决定刷新频率。','Subscriptions keep your filters across months. Your calendar app decides when to refresh.','購読には現在の絞り込みが適用されます。更新頻度はカレンダーアプリによって異なります。'],
 primary:['前往参与','Participate','参加する'],registrationLink:['前往报名','Register','申し込む'],submissionLink:['提交作品','Submit work','作品を投稿'],liveLink:['进入直播','Watch live','配信を見る'],replayLink:['观看回放','Watch replay','アーカイブを見る'],upcomingTime:['即将开始','Upcoming','開催予定'],sectionMissing:['请以主办方公告为准。','Refer to the organizer’s announcement.','主催者の告知をご確認ください。']
 };
 const zh={},en={},ja={};for(const [key,v]of Object.entries(labels)){zh[key]=v[0];en[key]=v[1];ja[key]=v[2];}
 return {...communityCopy(locale),...resolveLocaleCopy({zh,en,ja},locale)};
}
