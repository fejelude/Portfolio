"""Original Daedalus observatory. Run with Blender in background mode."""
import bpy, math, sys, os, random, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=os.path.abspath(args[0] if args else 'watch-renders')
mode=args[1] if len(args)>1 else 'preview'
os.makedirs(out,exist_ok=True)
T=math.tau
rng=random.Random(4218)

def material(name,color,metal=0,rough=.3):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    for k,v in [('Base Color',(*color,1)),('Metallic',metal),('Roughness',rough)]:p.inputs[k].default_value=v
    return m,p

gold,_=material('Polished copper alloy',(.79,.42,.26),.92,.18)
edge,_=material('Bright rose-gold chamfers',(.96,.64,.43),.9,.14)
brush,p=material('Brushed rose-gold case',(.60,.31,.19),.83,.29);p.inputs['Anisotropic'].default_value=.38
steel,_=material('Mirror-finished steel',(.53,.65,.78),.90,.18)
dark,_=material('Blued steel',(.045,.077,.12),.83,.26)
black,_=material('Recesses',(.009,.014,.022),.54,.36)
ink,_=material('Ivory dial engravings',(.9,.77,.56),.32,.29)
ruby,p=material('Ruby bearings',(.45,.023,.076),.38,.15);p.inputs['Coat Weight'].default_value=.7
enamel,p=material('Midnight blue enamel',(.009,.035,.16),.43,.34);p.inputs['Coat Weight'].default_value=.25
dial,_=material('Blue chapter ring',(.023,.055,.126),.52,.23)
ocean,p=material('Marine-blue lacquer',(.012,.095,.33),.49,.19);p.inputs['Coat Weight'].default_value=.7
land,_=material('Gold relief on the terrestrial globe',(.86,.51,.22),.74,.23)
moon_mats=[]
for i in range(7):
    v=.28+i*.075
    m,p=material('Moon facet %d'%i,(v*.83,v*.93,v),.69,.12)
    moon_mats.append(m)
glass=bpy.data.materials.new('Clear curved sapphire');glass.use_nodes=True
n=glass.node_tree.nodes;n.clear();link=glass.node_tree.links.new
o=n.new('ShaderNodeOutputMaterial');mix=n.new('ShaderNodeMixShader')
clear=n.new('ShaderNodeBsdfTransparent');clear.inputs[0].default_value=(.976,.991,1,1)
shine=n.new('ShaderNodeBsdfGlossy');shine.inputs['Color'].default_value=(.60,.77,1,1);shine.inputs['Roughness'].default_value=.094
f=n.new('ShaderNodeFresnel');f.inputs[0].default_value=1.46
power=n.new('ShaderNodeMath');power.operation='MULTIPLY';power.inputs[1].default_value=.51
link(f.outputs[0],power.inputs[0]);link(power.outputs[0],mix.inputs[0]);link(clear.outputs[0],mix.inputs[1]);link(shine.outputs[0],mix.inputs[2]);link(mix.outputs[0],o.inputs[0])

def finish(obj,name,mat,smooth=False):
    obj.name=name;obj.data.materials.append(mat)
    if smooth:
        for poly in obj.data.polygons:poly.use_smooth=True
    return obj

def mesh(name,vertices,faces,mat,smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob)
    return finish(ob,name,mat,smooth)

def bevel(ob,width=.014):
    m=ob.modifiers.new('Machined bevel','BEVEL');m.width=width;m.segments=2
    ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return ob

def lathe(name,profile,mat,xy=(0,0),count=128,close=True):
    verts=[(xy[0]+r*math.cos(i*T/count),xy[1]+r*math.sin(i*T/count),z) for r,z in profile for i in range(count)]
    faces=[(j*count+i,j*count+(i+1)%count,((j+1)%len(profile))*count+(i+1)%count,((j+1)%len(profile))*count+i) for j in range(len(profile) if close else len(profile)-1) for i in range(count)]
    return mesh(name,verts,faces,mat,True)

def ring(name,x,y,z,r,w,h,mat,count=96):
    return lathe(name,[(r,z-h/2),(r,z+h/2),(r-.014,z+h/2+.012),(r-w+.012,z+h/2+.012),(r-w,z+h/2),(r-w,z-h/2)],mat,(x,y),count)

def cyl(name,p,r,depth,mat,count=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=count,radius=r,depth=depth,location=p)
    return bevel(finish(bpy.context.object,name,mat,True),min(.02,depth/3))

def bar(name,a,b,r,mat,sides=10):
    a,b=Vector(a),Vector(b)
    ob=cyl(name,(a+b)/2,r,(b-a).length,mat,sides)
    ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return ob

def box(name,p,size,mat,rounding=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p)
    ob=bpy.context.object;ob.dimensions=size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return bevel(finish(ob,name,mat),rounding)

def screw(p,r=.055):
    cyl('Polished screw head',p,r,.039,steel,20)
    ob=box('Engraved screw slot',(p[0],p[1],p[2]+.019),(r*1.5,.012,.005),black,.002)
    ob.rotation_euler.z=rng.uniform(0,T)

def jewel(x,y,z,r=.07):
    ring('Burnished jewel seat',x,y,z,r,.02,.04,edge,36)
    ob=cyl('Ruby pivot',(x,y,z+.016),r*.68,.05,ruby,12)
    return ob

def gear(name,x,y,z,r,teeth,mat):
    verts=[]
    for height in [z-.027,z+.027]:
        for i in range(teeth*4):
            a=i*T/(teeth*4);radius=r*(.91 if i%4 in (0,3) else 1)
            verts.append((x+radius*math.cos(a),y+radius*math.sin(a),height))
    N=teeth*4
    faces=[tuple(range(N-1,-1,-1)),tuple(range(N,N*2))]
    faces.extend((i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N))
    ob=bevel(mesh(name,verts,faces,mat),.004)
    for j in range(6):
        a=j*T/6
        cyl('Dark milled wheel pocket',(x+math.cos(a)*r*.51,y+math.sin(a)*r*.51,z+.029),r*.14,.007,black,16)
    jewel(x,y,z+.05,r*.18)
    return ob

def inscription(s,p,size,mat=ink,parent=None,angle=0):
    curve=bpy.data.curves.new('Engraving '+s,'FONT');curve.body=s;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER'
    ob=bpy.data.objects.new(s,curve);scene.collection.objects.link(ob);ob.data.materials.append(mat)
    ob.parent=parent;ob.location=p;ob.rotation_euler.z=angle
    return ob

def empty(name,p):
    ob=bpy.data.objects.new(name,None);scene.collection.objects.link(ob);ob.location=p
    return ob

def adopt(ob,parent):
    bpy.context.view_layer.update()
    ob.parent=parent;ob.matrix_parent_inverse=parent.matrix_world.inverted()
    return ob

def sphere(name,p,r,mat,sub=2,ico=False):
    if ico:bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=r,location=p)
    else:bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=r,location=p)
    return finish(bpy.context.object,name,mat,not ico)

# Machined case shoulders, sapphire band and lower observatory plate.
lathe('Sculpted case back',[(2.12,-.38),(2.4,-.39),(2.52,-.33),(2.59,-.25),(2.61,-.07),(2.58,.09),(2.48,.15),(2.36,.12),(2.28,-.10)],brush)
for z,r,w,mat in [(-.32,2.54,.071,edge),(-.25,2.63,.046,gold),(-.08,2.62,.027,edge),(.09,2.59,.052,gold),(.18,2.55,.044,edge),(.64,2.50,.057,gold),(.71,2.52,.064,edge),(.746,2.505,.021,steel)]:
    ring('Case moulding',0,0,z,r,w,.04,mat)
lathe('Tall transparent sapphire sidewall',[(2.496,.17),(2.48,.63),(2.46,.69)],glass,count=160,close=False)
lathe('Curved sapphire envelope',[(2.468,.69)]+[(2.468*math.cos(i*math.pi/64),.69+1.84*math.sin(i*math.pi/64)) for i in range(1,33)],glass,count=160,close=False)
cyl('Aventurine enamel plate',(0,0,-.025),2.41,.22,enamel,128)
for r in [1.49,1.86,2.04,2.10,2.25,2.37]:
    ring('Fine concentric engraving',0,0,.093,r,.008,.002,steel if r in (1.86,2.25) else dark)
for i in range(120):
    a=i*T/120;length=.12 if i%5==0 else .046
    b=box('Engraved calibration',((2.31-length*.5)*math.cos(a),(2.31-length*.5)*math.sin(a),.091),(length,.014 if i%5==0 else .007,.005),ink,.001);b.rotation_euler.z=a
for i in range(210):
    a,r=rng.random()*T,math.sqrt(rng.random())*2.20
    if r>2.01 and i%2:continue
    box('Aventurine fleck',(r*math.cos(a),r*math.sin(a),.09),(rng.uniform(.009,.026),.009,.006),edge if i%4==0 else steel,.001)
for i in range(8):
    a=i*T/8+.21; x,y=2.45*math.cos(a),2.45*math.sin(a)
    cyl('Sapphire column foot',(x,y,.22),.111,.13,gold,24)
    bar('Sapphire column',(x,y,.1),(x*.99,y*.99,.67),.05,brush)
    screw((x*.99,y*.99,.74),.055)
for x in [-1.56,1.56]:
    for y in [-1,1]:
        ob=box('Tapered case lug',(x,2.12*y,-.20),(.53,.69,.28),gold,.09);ob.rotation_euler.z=-.15*x*y
# Recessed fluted crown at three o’clock.
bar('Crown tube',(2.40,0,.05),(2.82,0,.05),.14,brush,24)
for j in range(22):
    a=j*T/22; bar('Crown flute',(2.60,.164*math.cos(a),.05+.164*math.sin(a)),(2.79,.164*math.cos(a),.05+.164*math.sin(a)),.021,edge,8)
bar('Crown end face',(2.77,0,.05),(2.85,0,.05),.158,gold,48)
inscription('D A E D A L U S',(0,-1.94,.099),.17)
inscription('F E J E L U D E   /   0 0 1',(0,-2.12,.099),.069)

# Connected satellites with paired rails and pinioned shafts under them.
for x,y,z in [(-1.15,.63,1.11),(.76,1.1,1.42),(-1.04,-.91,.82),(1.11,-.58,.98)]:
    cyl('Satellite foot',(x,y,.24),.22,.29,brush)
    bar('Satellite shaft',(x,y,.37),(x,y,z),.071,steel)
    for s in [-1,1]:
        a=(.15*x+s*.10,.15*y+s*.09,.49);b=(.86*x+s*.10,.86*y+s*.09,.49)
        bar('Twin skeleton bridge',a,b,.06,gold,6)
        bar('Raised bridge chamfer',(a[0],a[1],.548),(b[0],b[1],.548),.021,edge,6)
    for q in [.33,.81]:
        cyl('Arm attachment lug',(q*x,q*y,.49),.134,.13,gold,24)
        screw((q*x,q*y,.58),.043)
for x,y,z,r,n,mat in [(0,0,.37,.43,44,gold),(.47,-.20,.32,.25,28,steel),(.63,-.51,.24,.17,18,gold),(-.39,-.34,.30,.22,22,edge),(-.62,-.21,.23,.16,16,steel),(.24,.41,.30,.22,22,steel),(-.22,.57,.26,.24,24,gold)]:
    gear('Transmission wheel',x,y,z,r,n,mat)
cyl('Central stepped turret',(0,0,.58),.27,.30,gold)
ring('Crown of central transmission',0,0,.74,.28,.085,.06,steel,64)
jewel(0,0,.77,.112)

# Modest geographic relief mapped onto the spherical Earth.
earth=empty('Earth axis',(-1.15,.63,1.32));earth.rotation_euler.y=-.28
globe=sphere('Lacquered Earth',earth.location,.51,ocean);adopt(globe,earth)
coastlines=[
 [(-167,66),(-143,59),(-130,55),(-125,47),(-120,35),(-112,28),(-98,18),(-85,22),(-80,32),(-75,44),(-59,53),(-70,62),(-91,74),(-108,73),(-120,70),(-143,71)],
 [(-83,10),(-75,12),(-59,9),(-49,2),(-34,-6),(-39,-19),(-52,-31),(-66,-55),(-73,-48),(-75,-29),(-80,-9)],
 [(-72,76),(-56,84),(-26,80),(-20,69),(-43,59),(-56,64)],
 [(-17,36),(4,37),(21,34),(31,31),(38,15),(51,10),(43,-12),(33,-27),(18,-35),(9,-26),(-3,-4),(-11,4),(-16,13)],
 [(-10,37),(1,49),(0,51),(12,54),(18,69),(34,71),(53,71),(64,76),(104,77),(144,74),(171,66),(163,58),(146,52),(142,44),(129,42),(121,30),(109,21),(109,10),(101,12),(99,20),(91,22),(84,13),(78,7),(69,24),(58,25),(55,16),(47,12),(43,25),(34,31),(32,40),(24,39),(18,43),(14,38),(9,43),(0,43),(-7,36)],
 [(113,-22),(123,-13),(133,-12),(140,-17),(146,-11),(152,-21),(153,-30),(146,-39),(135,-35),(114,-34)],
 [(46,-12),(50,-16),(45,-26),(42,-23)],
 [(130,31),(137,34),(142,44),(146,44),(142,35),(136,31)],
 [(96,4),(106,-6),(120,-9),(132,-5),(140,-6),(147,-8),(151,-4),(143,0),(132,0),(119,-2),(114,4),(108,0)],
 [(-11,50),(-4,59),(0,54),(1,51)],[(166,-45),(174,-36),(178,-38),(174,-44)]
]
# Rasterize the original relief mask to a small longitude/latitude texture.
def world_texture():
    w,h=480,240
    pixels=[0.0]*(w*h*4)
    for row in range(h):
        lat=row*180/h-90
        crossings=[]
        for poly in coastlines:
            xs=[x1+(lat-y1)*(x2-x1)/(y2-y1) for (x1,y1),(x2,y2) in zip(poly,poly[1:]+poly[:1]) if (y1>lat)!=(y2>lat)]
            xs.sort();crossings.extend(zip(xs[::2],xs[1::2]))
        for col in range(w):
            lon=(col*360/w+95)%360-180
            value=float(any(a<=lon<b for a,b in crossings))
            k=4*(row*w+col);pixels[k:k+4]=[value,value,value,1.0]
    img=bpy.data.images.new('Original coastline relief',width=w,height=h);img.pixels.foreach_set(pixels);img.pack()
    return img
nodes=ocean.node_tree.nodes;ll=ocean.node_tree.links
tex=nodes.new('ShaderNodeTexImage');tex.image=world_texture()
mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.016,.105,.38,1);mix.inputs[2].default_value=(.75,.43,.16,1)
ll.new(tex.outputs['Color'],mix.inputs[0])
p=nodes.get('Principled BSDF');ll.new(mix.outputs[0],p.inputs['Base Color'])
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.31;bump.inputs['Distance'].default_value=.017
ll.new(tex.outputs['Color'],bump.inputs['Height']);ll.new(bump.outputs[0],p.inputs['Normal'])
for sign in [-1,1]:
    end=earth.location+Vector((-.15*sign,0,.55*sign))
    sphere('Earth cap',end,.070,edge)
bar('Earth polar pin',earth.location+Vector((.17,0,-.62)),earth.location+Vector((-.17,0,.62)),.042,steel)

moon_root=empty('Lunar spindle',(.76,1.10,1.57))
moon=sphere('Hand-cut faceted lunar sphere',moon_root.location,.464,moon_mats[0],3,True)
for mat in moon_mats[1:]:moon.data.materials.append(mat)
for poly in moon.data.polygons:poly.material_index=rng.choices(range(7),[2,6,13,14,10,7,4])[0]
adopt(moon,moon_root)
jewel(.76,1.10,1.09,.11)
sphere('Lunar upper pivot',(.76,1.10,2.035),.052,edge)
bar('Lunar pin',(.76,1.10,1.04),(.76,1.10,1.22),.048,steel)

# Tourbillon carriage. Nested cages turn on supports inclined to the plate.
cx,cy=-1.04,-.91
gear('Exposed toothed carriage',cx,cy,.44,.586,62,gold)
ring('Lower cage rail',cx,cy,.59,.570,.052,.068,steel)
ring('Lower ruby ring',cx,cy,.66,.49,.03,.026,gold)
cage=empty('Turning outer carriage',(cx,cy,.94))
balance=empty('Oscillating balance',(cx,cy,.95));adopt(balance,cage)
for i in range(3):
    a=i*T/3+.28;x,y=cx+math.cos(a)*.51,cy+math.sin(a)*.51
    adopt(bar('Cage load-bearing column',(x,y,.59),(x,y,1.22),.046,steel,14),cage)
    adopt(bar('Cage Y bridge',(x,y,1.20),(cx,cy,1.30),.041,gold,8),cage)
    adopt(sphere('Upper cage rivet',(x,y,1.23),.055,edge),cage)
for z,mat in [(1.20,edge),(1.24,steel)]:
    adopt(ring('Inclined upper cage ring',cx,cy,z,.56,.034,.035,mat),cage)
adopt(jewel(cx,cy,1.30,.093),cage)
gimbal=empty('Angled inner cage',(cx,cy,.94));adopt(gimbal,cage);gimbal.rotation_euler.x=.91
adopt(ring('Secondary ring at oblique incidence',cx,cy,.94,.415,.047,.046,gold),gimbal)
adopt(ring('Steel balance wheel rim',cx,cy,.95,.33,.032,.035,steel),balance)
for i in range(6):
    a=i*T/6
    x,y=cx+.306*math.cos(a),cy+.306*math.sin(a)
    adopt(bar('Balance spoke',(cx,cy,.949),(x,y,.949),.016,edge),balance)
    adopt(sphere('Balance mass',(x,y,.959),.028,edge),balance)
adopt(jewel(cx,cy,.988,.073),balance)
for i in range(3):screw((cx+.53*math.cos(i*T/3),cy+.53*math.sin(i*T/3),.693),.042)

# Dial rises on a fork. Its local XY basis will also drive the live SVG hands.
face=empty('Raised time dial basis',(1.11,-.64,1.03));face.rotation_euler.x=.70
def dialpart(ob):
    ob.parent=face;return ob
def disk_ring(name,z,r,w,mat):
    return dialpart(ring(name,0,0,z,r,w,.035,mat))
for z,r,w,mat in [(0,.73,.16,brush),(.036,.74,.06,edge),(.066,.69,.018,steel),(.082,.671,.105,dial),(.098,.57,.014,steel)]:
    disk_ring('Machined dial chapter ring',z,r,w,mat)
dialpart(cyl('Sunken dial well',(0,0,.012),.61,.044,black,96))
for x,y,r in [(.18,.16,.22),(-.20,-.13,.22),(.18,-.24,.15),(-.24,.22,.14)]:
    before=set(bpy.data.objects)
    gear('Exposed dial wheel',x,y,.046,r,25,steel if x<0 else gold)
    for ob in set(bpy.data.objects)-before:dialpart(ob)
for i in range(60):
    angle=i*T/60
    b=dialpart(box('Dial minute notch',(.646*math.sin(angle),.646*math.cos(angle),.103),(.008 if i%5 else .014,.027,.005),ink,.001))
    b.rotation_euler.z=-angle
for i,s in enumerate(['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI']):
    a=i*T/12;inscription(s,(.611*math.sin(a),.611*math.cos(a),.122),.083,ink,face)
for side in [-1,1]:
    bar('Dial mounting fork',(1.11+side*.39,-.42,.41),(1.11+side*.50,-.61,.93),.057,brush)

# Lighting is baked offline; the browser composites only the changing detail.
bpy.ops.object.camera_add(location=(0,-8.2,7.65))
camera=bpy.context.object;camera.rotation_euler=(Vector((.05,0,.67))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=6.06;scene.camera=camera
def light(name,p,target,power,size,color,shape='DISK',height=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape=shape;data.size=size;data.color=color
    if height:data.size_y=height
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=p
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
light('Warm key softbox',(-3.2,-4.2,6.6),(0,0,.7),640,4.6,(1,.82,.69),'RECTANGLE',2.08)
light('Icy rim strip',(3.2,2.9,5.7),(0,0,.5),980,3.6,(.64,.79,1),'RECTANGLE',1.0)
light('Behind the sapphire',(-1.4,4.8,3.3),(0,0,.6),720,3.9,(.78,.87,1),'RECTANGLE',2.7)
light('Soft frontal silver bounce',(2.5,-5,2.0),(0,0,.5),375,4.0,(.99,.94,.91),'RECTANGLE',1.8)
scene.world.color=(.20,.20,.22)
scene.render.engine='CYCLES'
scene.cycles.use_denoising=False
scene.cycles.samples=16 if mode=='preview' else 130
scene.cycles.max_bounces=5;scene.cycles.transparent_max_bounces=6
scene.render.film_transparent=True
scene.render.resolution_x=scene.render.resolution_y=460 if mode=='preview' else 820
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'

bpy.context.view_layer.update()
def uv(v):
    p=world_to_camera_view(scene,camera,Vector(v))
    return [round(p.x*1000,3),round((1-p.y)*1000,3)]
xy=[uv(face.matrix_world@Vector(x)) for x in [(0,0,.124),(1,0,.124),(0,-1,.124)]]
meta={'dial':xy,'earth':uv(earth.location),'moon':uv(moon_root.location),'cage':uv(cage.location)}
with open(os.path.join(out,'projection.json'),'w') as f:json.dump(meta,f)
def render(name):
    scene.render.filepath=os.path.join(out,name+'.png')
    bpy.ops.render.render(write_still=True)
if mode in ('preview','poster'):
    render(mode)
else:
    start=int(args[2]) if len(args)>2 else 0
    stop=int(args[3]) if len(args)>3 else 24
    if mode=='all':
        render('poster')
    scene.cycles.samples=40
    scene.render.resolution_x=scene.render.resolution_y=420
    for index in range(start,stop):
        phase=index*T/24
        globe.rotation_euler.z=phase
        moon_root.rotation_euler=(.18*math.sin(phase),.30,phase*2)
        cage.rotation_euler.z=phase
        gimbal.rotation_euler.x=.91+.21*math.sin(phase*2)
        balance.rotation_euler.z=.35*math.sin(phase*5)
        render('frame-%02d'%index)
