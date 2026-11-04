"""Capture anonymous published data only; no cookies, credentials or private APIs."""
import concurrent.futures,json,subprocess,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WIKI=ROOT.parents[1]
queries=['offset=0','entity=kaf','entity=rim','entity=harusaruhi','entity=koko','entity=isekai-joucho','entity=dustcell','type=portrait','type=promo']
def fetch(query):
 url='https://api.kamitsubaki.wiki/api/gallery/items?'+query
 raw=subprocess.check_output(['curl','-fsS','--retry','1','--max-time','30','-H','Origin: https://kamitsubaki.wiki','-H','User-Agent: Mozilla/5.0',url])
 data=json.loads(raw)
 return query,data
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(fetch,queries))
rows={}
for query,data in results:
 print(query,len(data.get('items',[])),data.get('total'))
 for row in data.get('items',[]):
  if row.get('src','').startswith('https://images.kamitsubaki.wiki/gallery/'):
   rows[row['id']]=row
out={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'https://api.kamitsubaki.wiki/api/gallery/items','scope':'anonymous published items only','queries':queries,'items':list(rows.values())}
(ROOT/'data/public-gallery.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
entities=json.loads((WIKI/'src/data/gallery-entities.json').read_text())
(ROOT/'data/entities.json').write_text(json.dumps(entities,ensure_ascii=False,indent=2)+'\n')
print('captured',len(rows),'published images')
