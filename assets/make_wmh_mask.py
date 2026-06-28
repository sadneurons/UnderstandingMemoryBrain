#!/usr/bin/env python3
"""
Trace the white-matter hyperintensities (WMH) on axial_wmh.jpg and write
shape-accurate highlight masks: wmh_mask_left.png / wmh_mask_right.png
(transparent PNGs, same size as the scan, tinted + outlined over the lesions).

WMH are bright on FLAIR, so we threshold by intensity inside the brain.
Skull/scalp is excluded with a distance transform (keep only deep tissue),
and a depth filter drops shallow rim artefacts.

Run from the assets/ folder:  python3 make_wmh_mask.py
Tune the four constants below if the mask is too greedy / too sparse.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

PCTL      = 95.5   # intensity percentile for "bright" (higher = stricter)
MIN_SIZE  = 70     # smallest lesion to keep, in pixels
MIN_DEPTH = 48     # mean distance (px) a lesion must sit inside the brain
TINT      = (255, 210, 0)   # highlight colour (R,G,B)

g0 = np.asarray(Image.open("axial_wmh.jpg").convert("L")).astype(float)
g  = ndi.gaussian_filter(g0, 1.0)
H, W = g.shape
mid = W // 2

interior = np.zeros((H, W), bool)
dist     = np.zeros((H, W))
for x0, x1 in [(0, mid), (mid, W)]:                 # treat the two panels separately
    head = ndi.binary_fill_holes(ndi.binary_opening(g[:, x0:x1] > 35, iterations=2))
    d = ndi.distance_transform_edt(head)
    dist[:, x0:x1] = d
    interior[:, x0:x1] = d > 30

thr = np.percentile(g[interior], PCTL)
bright = ndi.binary_opening((g > thr) & interior, iterations=1)
lbl, n = ndi.label(bright)
sizes = np.bincount(lbl.ravel())

keep = np.zeros_like(bright)
for i in range(1, n + 1):
    comp = (lbl == i)
    if sizes[i] >= MIN_SIZE and g[comp].max() > 150 and dist[comp].mean() > MIN_DEPTH:
        keep |= comp
keep = ndi.binary_fill_holes(ndi.binary_closing(keep, iterations=2))


def overlay(mask, path):
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = TINT
    rgba[..., 3] = np.where(mask, 115, 0)                       # ~45% fill
    edge = ndi.binary_dilation(mask, iterations=2) & ~mask
    rgba[edge] = [TINT[0], TINT[1], TINT[2], 255]              # solid outline
    Image.fromarray(rgba, "RGBA").save(path)


left = keep.copy();  left[:, mid:] = False
right = keep.copy(); right[:, :mid] = False
overlay(left,  "wmh_mask_left.png")
overlay(right, "wmh_mask_right.png")
print(f"thr={thr:.0f}  lesion_px={int(keep.sum())}  -> wmh_mask_left.png, wmh_mask_right.png")
