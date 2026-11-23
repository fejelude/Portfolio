"""Pack Blender's 24 rendered positions into feathered movement sheets.

    blender -b -P design/render-tourbillon.py -- /path/to/renders all
    python design/pack-tourbillon.py /path/to/renders assets/tourbillon
"""
import json
from pathlib import Path
import sys
from PIL import Image, ImageFilter

source=Path(sys.argv[1])
target=Path(sys.argv[2])
target.mkdir(parents=True,exist_ok=True)
poster=Image.open(source/'poster.png').convert('RGBA')
poster.save(target/'observatory.webp',quality=86,method=6)

bounds=[(85,100,168,187),(221,74,301,155),(87,181,188,296)]
patches=[]
for x,y,right,bottom in bounds:
    patches.append(dict(x=x,y=y,w=right-x,h=bottom-y,offset=sum(p['w'] for p in patches)))
tile=(sum(p['w'] for p in patches),max(p['h'] for p in patches))
sheets=[]
for first in range(0,24,8):
    atlas=Image.new('RGBA',(4*tile[0],2*tile[1]))
    for i in range(8):
        frame=Image.open(source/f'frame-{first+i:02d}.png').convert('RGBA')
        for p,bound in zip(patches,bounds):
            patch=frame.crop(bound).filter(ImageFilter.GaussianBlur(.42))
            w,h=patch.size
            # Fade the edges into the sharp full-resolution base render.
            alpha=Image.new('L',(w,h))
            alpha.putdata([min(255,round(255*min(x,y,w-1-x,h-1-y)/7))
                           for y in range(h) for x in range(w)])
            patch.putalpha(alpha)
            atlas.paste(patch,(i%4*tile[0]+p['offset'],i//4*tile[1]))
    name=f'motion-{first//8+1}.webp'
    atlas.save(target/name,quality=80,method=6)
    sheets.append('/assets/tourbillon/'+name)
projection=json.loads((source/'projection.json').read_text())
manifest=dict(dial=projection['dial'],size=420,patches=patches,tile=tile,sheets=sheets)
(target/'projection.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
