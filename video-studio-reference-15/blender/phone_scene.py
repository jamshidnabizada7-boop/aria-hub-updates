"""Optional Blender scaffold for a fully physical 3D ARIA HUB smartphone.
Run on a machine with Blender installed:
    blender -b -P blender/phone_scene.py

The delivered MP4 does not require this script; the final master is already rendered.
"""
import bpy, math
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

bpy.ops.mesh.primitive_cube_add(location=(0,0,0))
body=bpy.context.object
body.name='ARIA_HUB_Phone'
body.scale=(1.55,.11,3.25)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bev=body.modifiers.new('Rounded edges','BEVEL')
bev.width=.18
bev.segments=8
frame_mat=bpy.data.materials.new('MidnightFrame')
frame_mat.diffuse_color=(.015,.018,.025,1)
body.data.materials.append(frame_mat)

bpy.ops.mesh.primitive_plane_add(size=2,location=(0,-.121,0),rotation=(math.radians(90),0,0))
screen=bpy.context.object
screen.name='ARIA_HUB_Screen'
screen.scale=(1.43,3.10,1)
screen.parent=body
screen_mat=bpy.data.materials.new('Screen')
screen_mat.diffuse_color=(.97,.98,1,1)
screen.data.materials.append(screen_mat)

bpy.ops.object.camera_add(location=(0,-13,1.1))
cam=bpy.context.object
bpy.context.scene.camera=cam
cam.data.lens=55

def look_at(obj,target=(0,0,0)):
    direction=Vector(target)-obj.location
    obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

look_at(cam)

body.rotation_euler=(math.radians(7),math.radians(-36),math.radians(-7))
body.keyframe_insert('rotation_euler',frame=1)
body.rotation_euler=(0,math.radians(-5),0)
body.keyframe_insert('rotation_euler',frame=72)

bpy.ops.object.light_add(type='AREA',location=(-4,-5,6))
key=bpy.context.object
key.data.energy=900
key.data.size=5
look_at(key)

bpy.ops.object.light_add(type='AREA',location=(5,-2,2))
fill=bpy.context.object
fill.data.energy=550
fill.data.size=4
look_at(fill)

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1920
scene.render.resolution_y=1080
scene.render.resolution_percentage=100
scene.render.fps=30
scene.frame_start=1
scene.frame_end=90
scene.render.filepath='out/blender-phone.mp4'
scene.render.image_settings.file_format='FFMPEG'
scene.render.ffmpeg.format='MPEG4'
scene.render.ffmpeg.codec='H264'
bpy.ops.wm.save_as_mainfile(filepath='aria-hub-reference-15-phone.blend')
