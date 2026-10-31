"""The approved side-on pose: lid towards the bottom-right of the frame, seen from straight above."""
from mathutils import Matrix, Vector

AXIS = Vector((0.66, -0.50, 0.56)).normalized()   # body to lid: right, down the frame, towards the camera
LONG = Vector((0.75, 0.66, 0.0))                  # long sides lean up to the right
CENTER = Vector((0.0, 0.0, 130.0))


def stack_rotation(flip=False):
    """flip turns the part 180 degrees in its own plane, which puts the box connector top-right."""
    z = AXIS
    x = (LONG - z * LONG.dot(z)).normalized()
    if flip:
        x = -x
    y = z.cross(x)
    return Matrix((x, y, z)).transposed()
