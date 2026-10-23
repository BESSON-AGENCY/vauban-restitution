import sys
from PIL import Image
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'captures'))
a=Image.open('ref-maquette.png'); b=Image.open('exemple.png')
def sheet(start,end,name,scale=0.42):
    ims=[]
    for im in (a,b):
        h=int(1155*(end-start))
        y0=1155*start
        c=im.crop((0,y0,900,min(im.height,y0+h+32)))
        ims.append(c.resize((int(c.width*scale),int(c.height*scale))))
    W=sum(i.width for i in ims)+10; H=max(i.height for i in ims)
    s=Image.new('RGB',(W,H),'white'); s.paste(ims[0],(0,0)); s.paste(ims[1],(ims[0].width+10,0)); s.save(name)
sheet(0,4,'cmp-1.png'); sheet(4,8,'cmp-2.png'); sheet(8,12,'cmp-3.png')
