// 导出主站词条定义的艺人标识符清单（id + 各语言显示名），供 events API 数据对齐使用。
// 用法：node scripts/export-wiki-artist-ids.mjs <输出路径>
import { writeFile } from 'node:fs/promises';
import { getEntityRegistry } from '../src/lib/entityRegistry.mjs';

const outputPath = process.argv[2] || '../apitext/research/wiki-artist-ids.json';
const registry = await getEntityRegistry();
const eligible = new Set(['person', 'virtual-avatar', 'software-voice', 'unit']);

const rows = [];
for (const entry of registry.list('zh')) {
  const d = entry.data;
  if (!eligible.has(d.entityType)) continue;
  const labels = {};
  for (const locale of ['zh', 'zh-tw', 'zh-hk', 'ja', 'en']) {
    labels[locale] = registry.resolveEntity(d.id, locale)?.data?.name || d.name;
  }
  rows.push({ id: d.id, type: d.entityType, name: d.name, labels });
}
rows.sort((a, b) => a.id.localeCompare(b.id));
await writeFile(outputPath, `${JSON.stringify(rows, null, 2)}\n`);
console.log(`导出 ${rows.length} 个艺人标识符 -> ${outputPath}`);
