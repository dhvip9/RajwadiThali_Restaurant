# -*- coding: utf-8 -*-
"""
Builds the site icon set for the Rajwadi Thali restaurant Dine page.

    Input:   site/assets/img/title logo.png   (1254x1254 brand squircle)
    Outputs: site/assets/img/icon-512.png     master / manifest
             site/assets/img/icon-192.png     <-- the one Google Search reads
             site/assets/img/icon-96.png
             site/assets/img/icon-48.png
             site/assets/img/icon-32.png      browser tabs
             site/assets/img/apple-touch-icon.png (180, iOS home screen)
             site/favicon.ico                 16 + 32 + 48, multi-resolution
    Run:     python3 make_favicon.py

WHY THE SIZES ARE WHAT THEY ARE
Google Search shows a generic globe instead of the site mark unless BOTH of
these hold, and either one alone still fails:

  1. There is a /favicon.ico at the DOCUMENT ROOT. Google's favicon crawler is
     a separate crawler from Googlebot and looks there first -- a site can
     declare <link rel="icon"> perfectly and still get the placeholder.
  2. A declared rel="icon" is a square whose sides are a MULTIPLE OF 48px.
     That is why icon-192 exists and is declared: 512 is square but not
     divisible by 48, and 32 is under the minimum. Icons that live only in a
     webmanifest do not count -- the favicon crawler does not read it.

Both lessons are inherited from the catering site, which hit exactly this and
whose make_favicon.py carries the same note.

THE SOURCE ART
"title logo.png" is the finished brand tile -- the Rajwadi arch with a fork and
spoon, which is what distinguishes the restaurant mark from the catering one.
It is delivered as RGB with the squircle sitting on a BLACK square, so the
rounded corners have to be cut back to transparency or every browser tab and
search result renders a black tile with a small orange shape inside it. That is
what alpha_from_black() below does. Measured on the supplied file: the corner
ground sits under brightness 12 and the darkest pixel inside the squircle is
63, so the threshold has a wide margin and no interior detail is eaten.

The source keeps its original name, spaces and all -- it is never referenced by
a URL, only read here, so nothing has to cope with "%20".

This is a one-off -- the output is committed. Re-run it only if the brand mark
changes. It lives outside the site directory on purpose: it needs Pillow, and
nothing else in this project has a dependency.
"""
import os
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:                                           # pragma: no cover
    sys.exit("make_favicon: Pillow and numpy are required -- pip install Pillow numpy")

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "site")
IMG = os.path.join(SITE, "assets", "img")
SRC = os.path.join(IMG, "title logo.png")

# brightness window over which the black corner ground fades into the artwork
CUT_LO, CUT_HI = 8, 40

PNG_SIZES = [512, 192, 96, 48, 32]
ICO_SIZES = [(16, 16), (32, 32), (48, 48)]


def alpha_from_black(im):
    """Turn the black square behind the squircle into transparency.

    The edge pixels are a blend of artwork over black, i.e. already
    premultiplied, so the colour is divided back out by the alpha it gets.
    Without that un-premultiply the rounded edge keeps a dark fringe and reads
    as a dirty outline on a white search-results row.
    """
    rgb = np.array(im.convert("RGB")).astype(np.float64)
    mx = rgb.max(axis=2)
    a = np.clip((mx - CUT_LO) / float(CUT_HI - CUT_LO), 0.0, 1.0)

    safe = np.where(a > 0, a, 1.0)[:, :, None]
    straight = np.clip(rgb / safe, 0, 255)

    out = np.dstack([straight, a * 255.0]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main():
    if not os.path.exists(SRC):
        sys.exit("make_favicon: missing source %s" % SRC)

    master = alpha_from_black(Image.open(SRC))
    if master.width != master.height:
        sys.exit("make_favicon: source must be square, got %dx%d"
                 % (master.width, master.height))

    for s in PNG_SIZES:
        img = master.resize((s, s), Image.LANCZOS)
        path = os.path.join(IMG, "icon-%d.png" % s)
        img.save(path, "PNG", optimize=True)
        print("  %-46s %dx%d" % (os.path.relpath(path, HERE), s, s))

    # iOS rounds the home-screen icon itself and does not honour transparency,
    # so this one is flattened onto the tile's own orange -- transparent corners
    # would come back as black once iOS composites it.
    px = np.array(master)
    edge = px[px.shape[0] // 2, :, :]                 # scan the vertical middle
    solid = np.where(edge[:, 3] > 250)[0]
    fill = tuple(int(v) for v in edge[solid[0]][:3])  # the squircle's edge orange
    apple = Image.new("RGBA", master.size, fill + (255,))
    apple.alpha_composite(master)
    apath = os.path.join(IMG, "apple-touch-icon.png")
    apple.convert("RGB").resize((180, 180), Image.LANCZOS).save(apath, "PNG", optimize=True)
    print("  %-46s 180x180  ground %s" % (os.path.relpath(apath, HERE), "#%02X%02X%02X" % fill))

    # 16/32 are what browser tabs use; 48 is the one Google wants
    ipath = os.path.join(SITE, "favicon.ico")
    master.save(ipath, "ICO", sizes=ICO_SIZES)
    print("  %-46s %s" % (os.path.relpath(ipath, HERE),
                          " + ".join("%d" % w for w, _ in ICO_SIZES)))


if __name__ == "__main__":
    main()
