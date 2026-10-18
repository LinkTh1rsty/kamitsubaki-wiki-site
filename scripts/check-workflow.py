from pathlib import Path
import re
r=Path(__file__).resolve().parents[1]
for f in ['AGENTS.md','CONTRIBUTING.md','README.md','CLAUDE.md','GEMINI.md','.github/copilot-instructions.md','maintenance/README.md']:
 assert (r/f).is_file(),f
for f in ['CLAUDE.md','GEMINI.md']:
 assert '@AGENTS.md' in (r/f).read_text(),f
for f in ['README.md','CONTRIBUTING.md','maintenance/README.md']:
 text=re.sub(r'```.*?```','',(r/f).read_text(),flags=re.S)
 for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
  if re.match(r'^[a-z]+:|^#|^/',target):continue
  assert (r/f).parent.joinpath(target.split('#')[0]).exists(),target
mirror=r/'scripts/sync-docs.mjs'
if mirror.exists():
 assert '../../docs/' not in mirror.read_text(),'Workspace mirror generator is forbidden'
print('Workflow entry files and local links valid; no workspace mirror generator')
