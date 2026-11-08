/** Shared submission-title rule: the title becomes the review/PR title, so it must say what changed. */
export const SUBMISSION_TITLE_MAX = 200;
const generic = /^(?:更新|修改|编辑|修正|补充|update|edit|fix|change|modify|test|测试|untitled|未命名|无标题|更新\s*\S+\.md|update\s+\S+\.md|\S+\.(?:md|yaml|yml))$/i;
export type SubmissionTitleIssue = 'empty' | 'tooLong' | 'control' | 'tooShort' | 'generic';
export function submissionTitleIssue(value: string): SubmissionTitleIssue | null {
  const title = value.trim();
  if (!title) return 'empty';
  if (title.length > SUBMISSION_TITLE_MAX) return 'tooLong';
  if (/[\u0000-\u001f\u007f]/.test(title)) return 'control';
  if (generic.test(title)) return 'generic';
  if ([...title].length < 4) return 'tooShort';
  return null;
}
export const submissionTitleMessages: Record<SubmissionTitleIssue, string> = {
  empty: '请填写投稿标题。',
  tooLong: '投稿标题请控制在 200 字以内。',
  control: '投稿标题不能包含换行或控制字符。',
  tooShort: '投稿标题太短，请写清楚这次补充或修正了什么。',
  generic: '请不要只写“更新”“修改”或文件名，写清楚这次补充或修正了什么。',
};
