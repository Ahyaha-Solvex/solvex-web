"""Shared mesh tools: analytic outlines and a small loft kit. 1 Blender unit = 1 mm."""
import math

import bmesh
import bpy
from mathutils import geometry

SEG = 16        # segments per 90 degrees of plan corner


def arc(cx, cy, r, a0, a1, n, end=True):
    last = n + 1 if end else n
    return [
        (cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n))
        for i in range(last)
    ]


def rounded_rect(hx, hy, r, seg=SEG):
    pts = []
    for cx, cy, a in ((hx - r, hy - r, 0), (r - hx, hy - r, 90), (r - hx, r - hy, 180), (hx - r, r - hy, 270)):
        pts += arc(cx, cy, r, math.radians(a), math.radians(a + 90), seg)
    return pts


def circle(cx, cy, r, n=32):
    return arc(cx, cy, r, 0.0, 2 * math.pi, n, end=False)


# ---------------------------------------------------------------- mesh kit
class Kit:
    def __init__(self):
        self.bm = bmesh.new()
        self.caps = set()

    def ring(self, pts, z):
        return [self.bm.verts.new((x, y, z)) for x, y in pts]

    def bridge(self, a, b, mat=0):
        n = len(a)
        for i in range(n):
            j = (i + 1) % n
            f = self.bm.faces.new((a[i], a[j], b[j], b[i]))
            f.material_index = mat

    def cap(self, loops, mat=0):
        coords = [[v.co.copy() for v in loop] for loop in loops]
        flat = [v for loop in loops for v in loop]
        for tri in geometry.tessellate_polygon(coords):
            f = self.bm.faces.new((flat[tri[0]], flat[tri[1]], flat[tri[2]]))
            f.material_index = mat
            self.caps.add(f)

    def loft(self, profile, mat=0):
        """profile: list of (points, z). Returns the rings."""
        rings = [self.ring(p, z) for p, z in profile]
        for a, b in zip(rings, rings[1:]):
            self.bridge(a, b, mat)
        return rings

    def finish(self, name, mats):
        bm = self.bm
        bm.verts.index_update()
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) != 2:
                e.smooth = False
                continue
            f1, f2 = e.link_faces
            if (
                (f1 in self.caps) != (f2 in self.caps)
                or f1.material_index != f2.material_index
                or e.calc_face_angle(0.0) > math.radians(32)
            ):
                e.smooth = False
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for m in mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
        return ob


def lathe(name, profile, mats, seg=64, closed_top=True, closed_bottom=True):
    """profile: list of (r, z) or (r, z, mat)."""
    k = Kit()
    rings = [k.ring(circle(0, 0, p[0], seg), p[1]) for p in profile]
    for i, (a, b) in enumerate(zip(rings, rings[1:])):
        k.bridge(a, b, profile[i][2] if len(profile[i]) > 2 else 0)
    if closed_bottom:
        k.cap([rings[0]], profile[0][2] if len(profile[0]) > 2 else 0)
    if closed_top:
        k.cap([rings[-1]], profile[-1][2] if len(profile[-1]) > 2 else 0)
    return k.finish(name, mats)
