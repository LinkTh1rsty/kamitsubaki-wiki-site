from pathlib import Path
import re
r=Path(__file__).resolve().parents[1]
for f in ['AGENTS.md','CONTRIBUTING.md','README.md','CLAUDE.md','GEMINI.md','.github/copilot-instructions.md','maintenance/README.md']:
 assert (r/f).is_file(),f
for f in ['CLAUDE.md','GEMINI.md']:
 assert '@AGENTS.md' in (r/f).read_text(),f
for f in ['README.md','CONTRIBUTING.md','maintenance/README.md']:
 text=re.sub(r'```.*?```','',(r/f).read_text(encoding='utf-8'),flags=re.S)
 for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
  if re.match(r'^[a-z]+:|^#|^/',target):continue
  assert (r/f).parent.joinpath(target.split('#')[0]).exists(),target
mirror=r/'scripts/sync-docs.mjs'
if mirror.exists():
 assert '../../docs/' not in mirror.read_text(encoding='utf-8'),'Workspace mirror generator is forbidden'
print('Workflow entry files and local links valid; no workspace mirror generator')

# All build/sync jobs select the same exact patch and verify the actual binary.
assert re.fullmatch(r'\d+\.\d+\.\d+\n?', (r/'.node-version').read_text()), 'Pin an exact Node patch'
for workflow in (r/'.github/workflows').glob('*.yml'):
 text=workflow.read_text()
 if 'actions/setup-node@' in text:
  assert 'node-version:' not in text, f'{workflow.name}: use .node-version'
  assert "node-version-file: '.node-version'" in text, workflow.name
  assert 'run: node scripts/check-node-version.mjs' in text, workflow.name
print('Node runtime selection and verification valid')
