// The paragraph selector and the named "格式" / "插入" menus are always shown.
// At most six common shortcuts stay inline; every action remains in a menu.
export const toolbarShortcutPriority = ['bold', 'italic', 'link', 'bulletList', 'image', 'table'] as const;
export function visibleToolbarShortcuts(width: number): ReadonlySet<string> {
  const reserved = width < 400 ? 236 : 260;
  const count = Math.min(toolbarShortcutPriority.length, Math.max(0, Math.floor((width - reserved) / 31)));
  return new Set(toolbarShortcutPriority.slice(0, count));
}
