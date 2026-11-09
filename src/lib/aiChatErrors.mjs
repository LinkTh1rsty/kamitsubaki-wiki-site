const messages = {
  interrupted: ['回答传输中断，请重试。', 'The reply was interrupted. Please retry.', '回答が途中で中断されました。再試行してください。', '回答傳輸中斷，請重試。'],
  expired: ['续传时间已过，请重试这条消息。', 'The resume window has expired. Retry this message.', '再開できる時間を過ぎました。このメッセージを再試行してください。', '續傳時間已過，請重試這則訊息。'],
  timeout: ['回答超时，请重试。', 'The reply timed out. Please retry.', '回答がタイムアウトしました。再試行してください。', '回答逾時，請重試。'],
  rate: ['请求过于频繁，请稍后再试。', 'Too many requests. Try again later.', 'リクエストが多すぎます。時間をおいて再試行してください。', '請求過於頻繁，請稍後再試。'],
  length: ['消息超过长度限制，请缩短后重试。', 'Your message is too long. Shorten it and try again.', 'メッセージが長すぎます。短くして再試行してください。', '訊息超過長度限制，請縮短後重試。'],
  context: ['检索资料过多，请重试或关闭联网检索。', 'Too much material was retrieved. Retry or turn off web retrieval.', '検索資料が多すぎます。再試行するか、ウェブ検索を無効にしてください。', '檢索資料過多，請重試或關閉連網檢索。'],
  policy: ['这条消息无法发送，请修改后再试。', 'This message could not be sent. Revise it and try again.', 'このメッセージは送信できません。修正して再試行してください。', '這則訊息無法傳送，請修改後再試。'],
  login: ['请先登录后继续。', 'Sign in to continue.', '続行するにはログインしてください。', '請先登入後繼續。'],
  unavailable: ['暂时无法获取回答，请稍后重试。', 'Replies are unavailable right now. Try again later.', '現在回答を取得できません。時間をおいて再試行してください。', '暫時無法取得回答，請稍後重試。'],
};

export function aiChatErrorText(code, locale, fallback) {
  const value = String(code || '').trim().toLowerCase();
  const kind = value === 'stream_resume_expired' ? 'expired'
    : /interrupted|truncated/.test(value) ? 'interrupted'
    : /timeout/.test(value) ? 'timeout'
    : /rate_limit|too_many_requests|quota/.test(value) ? 'rate'
    : /message_too_long|payload_too_large/.test(value) ? 'length'
    : /request_too_large|knowledge_sources_invalid/.test(value) ? 'context'
    : /policy_blocked/.test(value) ? 'policy'
    : /login_required|auth_required|unauthorized/.test(value) ? 'login'
    : /gateway|astrbot|upstream|unavailable|network/.test(value) ? 'unavailable' : null;
  const language = String(locale || 'zh').toLowerCase();
  const index = language.startsWith('en') ? 1 : language.startsWith('ja') ? 2
    : /zh-(tw|hk|hant)/.test(language) ? 3 : 0;
  return kind ? messages[kind][index] : fallback || messages.unavailable[index];
}
