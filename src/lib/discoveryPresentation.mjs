export const discoveryFormat = (text, values) => Object.entries(values).reduce((value, [key, replacement]) => value.replace('{' + key + '}', String(replacement)), text);
export function discoveryReason(reason, catalog, copy) {
  if (reason.type === 'connection') {
    const source = catalog.nodes.find(node => node.id === reason.seed);
    return discoveryFormat(reason.steps.length === 1 ? copy.direct : copy.indirect, { name: source?.title || reason.seed });
  }
  if (reason.type === 'style') return discoveryFormat(copy.styleReason, { name: catalog.facets.styles.find(style => style.id === reason.value)?.title || reason.value });
  if (reason.type === 'year') return discoveryFormat(copy.yearReason, { year: reason.end && reason.end !== reason.value ? reason.value + ' – ' + reason.end : reason.value });
  if (reason.type === 'keyword') return discoveryFormat(copy.keywordReason, { query: reason.value });
  return copy.dailyReason;
}
export function discoveryEdgeText(step, copy) {
  return [(step.inverse ? '← ' : '→ ') + (copy.path.relationLabels[step.edge.type] || step.edge.type),
    step.edge.role ? copy.path.roleLabels[step.edge.role] || step.edge.role : '',
    step.edge.current === false ? copy.path.historical : '',
    [step.edge.startDate, step.edge.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' · ');
}
