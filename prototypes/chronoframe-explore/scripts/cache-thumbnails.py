"""Cache only public 480px derivatives. Originals stay remote until viewer open."""
from pathlib import Path
from urllib.parse import urlparse
import json,subprocess,concurrent.futures
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
items=json.loads((ROOT/'data/public-gallery.json').read_text())['items']
out=ROOT/'public/media/thumbnails';out.mkdir(parents=True,exist_ok=True)
def cache(item):
 target=out/(item['id']+'.webp')
 if target.exists(): return item['id'],True
 url='https://api.kamitsubaki.wiki/api/gallery/thumbnails/480'+urlparse(item['src']).path
 result=subprocess.run(['curl','-fsS','--retry','2','--max-time','30','-H','Origin: https://kamitsubaki.wiki','-H','User-Agent: Mozilla/5.0',url,'-o',str(target)],capture_output=True)
 if result.returncode: return item['id'],False
 try:
  im=Image.open(target); assert max(im.size)<=15000; assert im.width<=480
  return item['id'],True
 except Exception:return item['id'],False
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 results=list(pool.map(cache,items))
print('cached',sum(ok for _,ok in results),'of',len(items))
failed=[id for id,ok in results if not ok]
if failed:print('failed',failed);raise SystemExit(1)
