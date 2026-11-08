import {workbenchText as t} from '@/lib/workbench-copy';
import { useContext, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LocalReviewService, type ReviewState, type ReviewResolution, type ReviewConflict } from '@/lib/review-service';
import { prepareReviewMerge } from '@/lib/review-merge-client';
import { resolveReviewMerge, type MergeChoice, type ReviewMergePlan, type MergePiece } from '@/lib/review-merge';
import { metadataChanges } from '@/lib/metadata-changes';
import { metadataDisplayLabel } from '@/lib/metadata-guide';
import { CatalogContext } from './entity-picker';
import { PreviewPane } from './reader-preview';
import { Button } from './ui/button';
export function ReviewConflictPanel({ service, state, disabled, onApply }: { service: LocalReviewService; state: ReviewState; disabled: boolean; onApply: (source: string, base: string, resolution: ReviewResolution) => void }) {
  const [plan, setPlan] = useState<ReviewMergePlan | null>(null), [context, setContext] = useState<ReviewConflict | null>(null);
  const [choices, setChoices] = useState<Record<string, MergeChoice>>({}), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0), [phase, setPhase] = useState<'branch' | 'main'>('main');
  const comparison = useRef<AbortController>();
  const { entries, locale } = useContext(CatalogContext);
  useEffect(() => {
    const controller = new AbortController(); comparison.current = controller; setPlan(null); setError(''); setChoices({});
    service.conflict(state, controller.signal).then(async context => {
      if (controller.signal.aborted) return;
      if (!context.original) throw Error(t('找不到共同原文，暂时无法自动合并。两份版本均保留，请重新打开原文核对。'));
      const branchChanged = Boolean(context.branchContent && context.branchContent !== context.yours);
      setPhase(branchChanged ? 'branch' : 'main');
      const plan = await prepareReviewMerge(branchChanged ? context.yours : context.original, state.snapshot.content, branchChanged ? context.branchContent! : context.current, controller.signal);
      if (!controller.signal.aborted) { setContext(context); setPlan(plan); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [service, state.snapshot, state.account.id, state.selected?.version, attempt]);
  const conflicts = plan ? [...plan.metadata, ...plan.body].filter(part => !part.ok) : [];
  const unresolved = conflicts.filter(part => !choices[part.id]).length;
  const name = (id: string) => (entries.find(entry => entry.id === id && entry.locale === locale) || entries.find(entry => entry.id === id))?.title;
  const excerpt = (part: MergePiece, version: MergeChoice) => part.key ? <dl className="wiki-conflict-properties">{metadataChanges({ [part.key]: plan!.original[part.key] }, { [part.key]: (version === 'mine' ? plan!.yours : plan!.latest)[part.key] }, name).map(row => <div key={row.key}><dt>{row.label}</dt><dd>{row.after}</dd></div>)}</dl> : part[version]!.join('\n').trim() ? <PreviewPane source={part[version]!.join('\n')} title={t("这一处正文")} compact /> : <p className="wiki-review-help">{t("此处内容已移除。")}</p>;
  return <section className="wiki-review-conflict" aria-label={t("核对原文更新")}>
    <h3>{phase === 'branch' ? t("先核对审核分支的新修改") : t("核对两边的修改")}</h3><p className="wiki-review-help">{t("不同位置的修改会合并。两边修改同一处时，请选择这一处要保留的版本；应用前会另外保存你的完整草稿。")}</p>
    {!plan && !error ? <p role="status"><Loader2 className="animate-spin" />{t("正在比较词条属性和正文…")}</p> : null}
    {error ? <><p role="alert">{error}</p><Button variant="outline" disabled={disabled} onClick={() => setAttempt(attempt + 1)}>{t("重新比较")}</Button></> : null}
    {plan ? <>{conflicts.length ? conflicts.map((part, index) => <section className="wiki-conflict-choice" key={part.id}><h4>{part.key ? metadataDisplayLabel(part.key) : `正文中的第 ${index + 1} 处重叠修改`}</h4><div className="wiki-conflict-columns">{(['mine', 'current'] as const).map(version => <div className="wiki-conflict-version" key={version} data-selected={choices[part.id] === version}><strong>{version === 'mine' ? t("我的修改") : phase === 'branch' ? t("审核分支的新修改") : t("最新原文")}</strong>{excerpt(part, version)}<Button variant={choices[part.id] === version ? 'secondary' : 'outline'} aria-pressed={choices[part.id] === version} disabled={disabled} onClick={() => setChoices(current => ({ ...current, [part.id]: version }))}>{version === 'mine' ? t("保留我这一处的修改") : phase === 'branch' ? t("保留审核分支这一处修改") : t("使用这一处的最新原文")}</Button></div>)}</div></section>) : <p className="wiki-review-message">{t("两边修改的位置不同，可以完整合并。")}</p>}<Button disabled={disabled || Boolean(unresolved)} onClick={async () => { try { const merged = resolveReviewMerge(plan, choices); if (phase === 'branch') { setPlan(null); setChoices({}); const next = await prepareReviewMerge(context!.original!, merged, context!.current, comparison.current!.signal); if (!comparison.current!.signal.aborted) { setPhase('main'); setPlan(next); } } else onApply(merged, context!.current, { accountId: state.account.id, currentSha: context!.currentSha, submissionId: context!.id, version: context!.version, expectedHead: context!.headSha }); } catch (error: any) { if (error.name !== 'AbortError') setError(error.message); } }}>{unresolved ? `还需选择 ${unresolved} 处修改` : phase === 'branch' ? t("继续核对最新原文") : t("保存备份并应用合并结果")}</Button><p className="wiki-review-help">{t("应用后会回到正文，可继续检查、修改或撤销，再提交审核。")}</p></> : null}
  </section>;
}
