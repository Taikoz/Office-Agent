"""Generate the agent-office sprite pack sources (run again after changing a piece).

  python3 -I app/sprites/tools/make_pack.py

Writes, under app/sprites/:
  src/base_character.piskel        body + shadow (+ the default outfit, for reference)
  src/<category>/template.piskel   'ref' layer (base in transparency) + empty 'item' layer
  src/<category>/<item>.piskel     the items: 'item' layer, and 'behind' for what goes behind the body
  src/props/<prop>.piskel          what a hand holds (small, 1 or 2 frames, its grip point in props.json)
  palettes.json                    colour ramps, their variants, which category uses which
  rig.json                         poses, head offset and hand anchors of every frame
  props.json                       grip point of each prop
  build/preview.png                the default outfit, every frame, to check by eye

Frame grid: 40x56, 15 poses x 4 frames (see POSES). Front = 3/4 facing down-right, back = up-left.
Pieces are ASCII masks: '#' = fill, auto-shaded with the light from the top right; 'h' '1' '2' '3' '4' force a
tone; other letters are fixed colours of the ramp. Each piece gets its own outline: dark on the shaded side,
softer on the lit side, a deep tone (not black) where it overlaps another piece of the same layer.
Arms are polylines (shoulder → elbow → hand) drawn as limbs, so a pose is a few points.
"""
import base64
import io
import json
import math
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
W, H, COLS = 40, 64, 4
OFF = 8  # headroom over the head (tall hats): everything sits 8 px lower than in a 40x56 frame
# name, seen from behind, frames (4, the walk 8)
POSES = [("idle", False, 4), ("walk_front", False, 8), ("walk_back", True, 8), ("sit", True, 4), ("drink", False, 4),
         ("type_front", False, 4), ("arms_up", False, 4), ("arms_up_back", True, 4), ("talk", False, 4), ("hold_front", False, 4),
         ("reach", False, 4), ("reach_back", True, 4), ("pour", False, 4), ("baton", False, 4), ("read", False, 4)]
BACK = {p: b for p, b, _ in POSES}
COUNT = {p: c for p, _, c in POSES}
FRAMES = sum(COUNT.values())
ORDER = ["body", "bottom", "shoes", "top", "extra", "head", "face", "mouth", "beard", "hair", "glasses", "hat"]
TONES = ["h", "1", "2", "3", "4", "o", "O"]

# Colour ramps: 7 tones (highlight → deep, outline, lit outline). A ramp = a family + the variant its pieces are
# drawn with; the build / the page recolour that variant to any other of the family.
VARIANTS = {
    "skin": {
        "peche": ["#ffeedd", "#ffd9bb", "#f6bb93", "#e0946d", "#b86b50", "#5c2f22", "#9a5440"],
        "claire": ["#fff3ea", "#ffe4d0", "#f8cdb0", "#e6a88a", "#c4826a", "#6b3a2a", "#a86a55"],
        "mate": ["#f4c79c", "#e0a878", "#c88a5a", "#a86c42", "#84502e", "#42220f", "#6e4024"],
        "brune": ["#d79a6c", "#b87a4e", "#9a5f38", "#7a4628", "#5a321c", "#2a160a", "#4a2816"],
        "foncee": ["#a8714e", "#8a5636", "#6e4128", "#55301c", "#3e2214", "#1a0d06", "#321a0e"],
    },
    "hair": {
        "brun": ["#c08a5c", "#9a6440", "#74472a", "#56331d", "#3c2214", "#1f0f08", "#3c2214"],
        "noir": ["#5a5a6e", "#3e3e50", "#2a2a38", "#1d1d28", "#14141c", "#08080c", "#14141c"],
        "chatain": ["#a8784e", "#86582f", "#5b3a20", "#432a16", "#2e1c0e", "#160c05", "#2e1c0e"],
        "blond": ["#fff1b0", "#f5d77a", "#ddb453", "#b98b38", "#8e6526", "#4a3010", "#8e6526"],
        "roux": ["#ffb070", "#e8803e", "#c45a24", "#973f17", "#6e2b0e", "#3a1405", "#6e2b0e"],
        "gris": ["#f0f0f4", "#cfd1da", "#a9acb9", "#848897", "#626674", "#2e303a", "#626674"],
        "blanc": ["#ffffff", "#f6f6f8", "#e6e6ec", "#c8c8d2", "#a2a2b0", "#4a4a56", "#a2a2b0"],
        "bleu": ["#9ee6ff", "#5cc4ee", "#3496c8", "#23709c", "#184f72", "#0a2438", "#184f72"],
        "violet": ["#e2ccff", "#c8a8ff", "#a882f0", "#8460c8", "#5e4096", "#2a1a4a", "#5e4096"],
        "rose": ["#ffc4e1", "#f592c4", "#d9669f", "#b04479", "#842d58", "#43122a", "#842d58"],
        "vert": ["#b8f5c0", "#7ee08c", "#51c060", "#389446", "#256a30", "#0e2e14", "#256a30"],
    },
    "cloth": {
        "marine": ["#6a8fe6", "#4366c2", "#2a4697", "#1b316f", "#12214f", "#070d26", "#12214f"],
        "nuit": ["#4a5a88", "#2e3c66", "#1a2648", "#111a34", "#0b1124", "#04060e", "#0b1124"],
        "bleu": ["#a8d4ff", "#6cb0f0", "#4090d7", "#2c6ca8", "#1e4c78", "#0c2038", "#1e4c78"],
        "cyan": ["#b8f2ff", "#74d8f0", "#3ab8d8", "#2690aa", "#1a6678", "#0a2c34", "#1a6678"],
        "rouge": ["#ff8a7a", "#e8574a", "#c23a30", "#962822", "#6c1b17", "#340a08", "#6c1b17"],
        "bordeaux": ["#d87a90", "#b04a64", "#8f2b46", "#6c1e34", "#4c1424", "#22080e", "#4c1424"],
        "rose": ["#ffd2ea", "#f4aad4", "#e98fc4", "#c86aa2", "#9a4a7a", "#4a1e38", "#9a4a7a"],
        "vert": ["#8fe0a0", "#52b86a", "#36904e", "#256b39", "#194c28", "#0a2412", "#194c28"],
        "kaki": ["#c8cf8e", "#a3ab66", "#7f874a", "#626936", "#464b25", "#1f220e", "#464b25"],
        "jaune": ["#ffe08a", "#ffc93d", "#fbaa08", "#d48a00", "#a86a00", "#4a2c00", "#a86a00"],
        "or": ["#f2dc9a", "#e0c070", "#c9a24b", "#a07e32", "#765a20", "#36280c", "#765a20"],
        "beige": ["#fff0d0", "#ecd6a8", "#d4b882", "#b09260", "#876d44", "#3e301a", "#876d44"],
        "marron": ["#c89a6a", "#a0703f", "#7d532a", "#5e3c1d", "#432a13", "#1f1208", "#432a13"],
        "blanc": ["#ffffff", "#f6f7fa", "#e3e6ee", "#c4c9d6", "#9aa0b2", "#3e4250", "#9aa0b2"],
        "gris": ["#d9dce5", "#b3b8c6", "#8d93a5", "#6b7184", "#4d5263", "#23262f", "#4d5263"],
        "ardoise": ["#8a92a8", "#646d86", "#4a526a", "#363c50", "#262a3a", "#0e1018", "#262a3a"],
        "noir": ["#6a6e80", "#4a4e5e", "#33363f", "#24262d", "#18191e", "#08080a", "#18191e"],
        "violet": ["#c6a2ff", "#9a6fe0", "#7448bd", "#563393", "#3c226a", "#1b0d33", "#3c226a"],
        "jean": ["#9cc0ec", "#6b97d2", "#4a73b0", "#355689", "#253d63", "#101b30", "#253d63"],
    },
}
RAMP_SOURCES = {"skin": ("skin", "peche"), "hair": ("hair", "brun"), "beard": ("hair", "chatain"),
                "top": ("cloth", "marine"), "tie": ("cloth", "rouge"), "bottom": ("cloth", "gris"),
                "shoes": ("cloth", "blanc"), "hat": ("cloth", "jaune"), "scarf": ("cloth", "bordeaux"),
                "scarf2": ("cloth", "or")}
CATEGORIES = {"body": ["skin"], "head": ["skin"], "mouth": [], "bottom": ["bottom"], "shoes": ["shoes"], "top": ["top"], "extra": [],
              "face": ["skin", "hair"], "beard": ["beard"], "hair": ["hair"], "glasses": [], "hat": []}


def ramp(name, **extra):
    family, source = RAMP_SOURCES[name]
    return dict(zip(TONES, VARIANTS[family][source]), **extra)


def fixed(hexes, **extra):
    return dict(zip(TONES, hexes), **extra)


TIE = ramp("tie")
R = {
    "skin": ramp("skin", p="#f59a8c"),
    "hair": ramp("hair"),
    "beard": ramp("beard"),
    "top": ramp("top", y="#fbaa08", Y="#c98200", w="#f2f3f7", W="#c4c9d6", k="#1b1a22", K="#3a3a48",
                t=TIE["2"], T=TIE["4"], r="#d23a3a", R="#7a1420", f="#ff7aa8", g="#3faa58", c="#3be4ff",
                m="#ff3df2", e="#e0c070"),
    "bottom": ramp("bottom"),
    "shoes": ramp("shoes", s="#2a4697"),
    "hat": ramp("hat", w="#f2f3f7", y="#ffe37a", r="#e8402a", g="#51cf66", b="#3bc4ff", k="#1c1c24"),
    "scarf": ramp("scarf"),
    "scarf2": ramp("scarf2"),
    "face": {"k": "#1b1530", "K": "#120c18", "w": "#ffffff", "s": "#f4f1ec", "b": "#3c2214", "m": "#8a3b36", "t": "#c45b55",
             "p": "#ff9e9e", "n": "#e0946d", "N": "#b86b50", "l": "#d0566a"},
    "dark": fixed(["#7a7f94", "#585d70", "#3e4252", "#2c2f3b", "#1f2129", "#0b0c10", "#1f2129"],
                  y="#fbaa08", w="#ffffff", g="#1b1530", c="#3be4ff", C="#bff6ff", r="#d23a3a", R="#7a1420"),
    "metal": fixed(["#ffffff", "#e3e7ee", "#b9c0cc", "#8e96a6", "#666e80", "#262a34", "#666e80"],
                   r="#e8402a", y="#fbaa08", f="#ff9a2a", F="#ffe08a"),
    "gold": fixed(["#fff3b0", "#ffd84a", "#e8b020", "#b88410", "#8a5e08", "#3c2600", "#8a5e08"],
                  r="#ff4d5e", b="#3bc4ff", g="#51cf66"),
    "straw": fixed(["#fff0b8", "#f0d88a", "#e2c27a", "#c8a258", "#a0803e", "#4a3618", "#a0803e"],
                   r="#e8402a", k="#1c1c24"),
    "felt": fixed(["#9a7a58", "#7a5e42", "#5c4632", "#463424", "#322418", "#140c06", "#322418"], k="#1c1c24"),
    "wizard": fixed(["#6a5ab8", "#4a3c8e", "#2a2350", "#1e1838", "#141026", "#06040e", "#141026"],
                    y="#fbaa08", w="#fff3b0"),
    "white": fixed(["#ffffff", "#f6f7fa", "#e9ebf2", "#cfd3de", "#a8adbd", "#4a4e5c", "#a8adbd"], r="#e8402a"),
    "glass": {"o": "#1b1530", "O": "#1b1530", "w": "#ffffff", "g": "#2a2a3a", "G": "#4a4a64", "c": "#bfe9ff",
              "a": "#bfe9ff40", "A": "#e8f8ff90"},
    "parrot": {"o": "#2a0a0a", "O": "#2a0a0a", "r": "#e8302a", "R": "#a8181a", "y": "#ffd23a", "b": "#2a7ad8",
               "B": "#1a4a98", "w": "#ffffff", "k": "#1c1c24", "K": "#d8d0c0"},
    "lei": {"f": "#ff6a8a", "y": "#ffd23a", "o": "#ff8a3a", "w": "#f4f2ea", "g": "#3faa58"},
}

# ---------------------------------------------------------------- pieces: body
HEAD = """
.......######.......
....############....
...##############...
..################..
.##################.
.##################.
####################
####################
####################
####################
###31###############
###31###############
####3###############
.###################
..##################
...################.
.....############...
.......########.....
"""
NECK = "######\n######\n######"
NECK_SHADE = "444444\n333333\n.3333."
TORSO = """
....########....
..############..
.##############.
################
################
################
################
################
################
################
.###############
.###############
..##############
"""
HAND = ".##.\n####\n####\n.##."
LEG = "######\n" * 8 + ".#####\n.####."
SHADOW = """
.....xxxxxxxxxx.....
..xxxxxxxxxxxxxxxx..
xxxxxxxxxxxxxxxxxxxx
..xxxxxxxxxxxxxxxx..
.....xxxxxxxxxx.....
"""


# ---------------------------------------------------------------- drawing primitives
def rgba(hexa):
    hexa = hexa.lstrip("#")
    alpha = int(hexa[6:8], 16) if len(hexa) == 8 else 255
    return tuple(int(hexa[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def parse(art, flip=False):
    rows = art.strip("\n").split("\n")
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, ".") for r in rows]
    return [r[::-1] for r in rows] if flip else rows


def stamp(img, art, x, y, rmp, flip=False, outline=True, shade=True):
    """Draw one piece: auto-shaded fill + its own selective outline."""
    rows = parse(art, flip) if isinstance(art, str) else art
    h, w = len(rows), len(rows[0])

    def inside(i, j):
        return 0 <= j < h and 0 <= i < w and rows[j][i] != "."

    def dist(i, j, di, dj):
        n = 0
        while inside(i + di * (n + 1), j + dj * (n + 1)):
            n += 1
        return n + 1

    thick = 2 if min(w, h) >= 9 else 1
    tones = {}
    for j in range(h):
        for i in range(w):
            ch = rows[j][i]
            if ch == ".":
                continue
            if ch == "#" and shade:
                dl, dr, dt, db = dist(i, j, -1, 0), dist(i, j, 1, 0), dist(i, j, 0, -1), dist(i, j, 0, 1)
                if dl == 1 and db == 1:
                    ch = "4"
                elif dl <= thick or db == 1:
                    ch = "3"
                elif dt == 1 and dr <= 2 * thick + 2:
                    ch = "h"
                elif dt <= thick or dr == 1:
                    ch = "1"
                else:
                    ch = "2"
            elif ch == "#":
                ch = "2"
            tones[(i, j)] = ch
    for (i, j), ch in tones.items():
        px, py = x + i, y + j
        if 0 <= px < img.width and 0 <= py < img.height:
            c = (20, 14, 40, 60) if ch == "x" else rgba(rmp[ch])
            if c[3] == 255:
                img.putpixel((px, py), c)
            else:
                img.alpha_composite(Image.new("RGBA", (1, 1), c), (px, py))
    if not outline:
        return
    for j in range(-1, h + 1):
        for i in range(-1, w + 1):
            if inside(i, j):
                continue
            nb = [(i + a, j + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if inside(i + a, j + b)]
            px, py = x + i, y + j
            if not nb or not (0 <= px < img.width and 0 <= py < img.height):
                continue
            lit = all(tones[n] in "h1" for n in nb)
            under = img.getpixel((px, py))[3] > 0
            img.putpixel((px, py), rgba(rmp["4" if under else ("O" if lit else "o")]))


def flat(img, art, x, y, rmp, flip=False):
    stamp(img, art, x, y, rmp, flip=flip, outline=False, shade=False)


def seg_dist(px, py, a, b):
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def cut(pts, length):
    """The first `length` pixels of a polyline."""
    out, left = [pts[0]], length
    for a, b in zip(pts, pts[1:]):
        d = math.dist(a, b)
        if d >= left:
            t = left / d if d else 0
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            return out
        out.append(b)
        left -= d
    return out


def length(pts):
    return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))


def limb(img, pts, width, rmp):
    """A thick polyline (an arm, a sleeve), shaded and outlined like any piece."""
    r = width / 2 - 0.2
    x0, y0 = math.floor(min(p[0] for p in pts) - r), math.floor(min(p[1] for p in pts) - r)
    x1, y1 = math.ceil(max(p[0] for p in pts) + r), math.ceil(max(p[1] for p in pts) + r)
    rows = []
    for y in range(y0, y1 + 1):
        row = ""
        for x in range(x0, x1 + 1):
            d = min(seg_dist(x, y, a, b) for a, b in zip(pts, pts[1:])) if len(pts) > 1 else math.dist((x, y), pts[0])
            row += "#" if d <= r else "."
        rows.append(row)
    stamp(img, rows, x0, y0, rmp)


# ---------------------------------------------------------------- the rig
class Arm:
    def __init__(self, pts, hand=True, cross=False):
        self.pts, self.hand, self.cross = pts, hand, cross


ARM_SWING = 1.8  # how far a hand comes down (ahead) / goes up (behind) as the arm swings, in sprite pixels
STRIDE_PX = 2.7  # how far a foot goes ahead of / behind its hip on screen, in sprite pixels (1.6 per unit)


class Leg:
    def __init__(self, pts, lift=0.0):
        self.pts, self.lift = pts, lift

    @property
    def ankle(self):
        return self.pts[-1]


class Rig:
    """Where every part sits for one frame."""

    def __init__(self, pose, n):
        self.pose, self.n = pose, n
        self.back = BACK[pose]
        self.sit = pose == "sit"
        walking = pose.startswith("walk")
        # the walk: 8 frames, contact (legs apart, body down) → passing (a foot up, body up) → contact…
        self.phase = 2 * math.pi * n / COUNT[pose] if walking else None
        jump = [0, -2, 0, -2][n] if pose.startswith("arms_up") else 0
        if walking:
            body_bob = 1 if math.cos(2 * self.phase) > 0.5 else 0  # a little down on each footfall, never up (no running)
        else:
            body_bob = {"idle": [0, 0, 1, 1]}.get(pose, [0] * 4)[n] + jump
        head_bob = body_bob + (1 if pose == "read" else 0)
        dy = 5 if self.sit else 0
        self.hx, self.hy = 10 + (1 if pose == "talk" and n == 2 else 0), 6 + OFF + head_bob + dy
        self.tx, self.ty = 12, 25 + OFF + body_bob + dy
        self.legs = [] if self.sit else self.make_legs(jump)
        self.mouth = (self.hx + 13, self.hy + 15)
        self.behind, self.front = self.arms(pose, n, walking)
        self.blink = (pose == "idle" and n == 3) or (pose == "drink" and n == 3)

    def make_legs(self, jump):
        """Hip → knee → ankle of the far and the near leg (the ankle = where the shoe sits).

        The walk in 3/4 view: each foot travels along the screen diagonal the person walks on (iso: 2 across for
        1 down), so the foot on the ground goes back exactly as the body goes forward — STRIDE_PX each way, which
        scene.js PERSON_STRIDE matches — and the foot in the air is barely lifted (a walk, not a run). The feet keep
        a gap and the nearest one is drawn last.
        """
        hip_y = self.ty + 12 - (self.ty - 25 - OFF)  # the hips stay put: only the torso bobs
        out = []
        for side, (x, ankle_y) in ((1, (15.5, 46 + OFF)), (-1, (21.5, 47 + OFF))):
            fwd = lift = 0.0
            if self.phase is not None:
                fwd = math.cos(self.phase) * side                       # 1: this foot ahead, -1: behind
                lift = 1.2 * max(0.0, -math.sin(self.phase) * side)     # in the air while it comes forward
            toward = -1 if self.back else 1                             # ahead = down-right from the front, up-left from behind
            foot = (x + toward * 0.89 * STRIDE_PX * fwd, ankle_y + toward * 0.45 * STRIDE_PX * fwd - lift + jump)
            hip = (x, hip_y + (0 if side == 1 else 1) + jump)
            knee = ((hip[0] + foot[0]) / 2 + toward * lift * 0.5, (hip[1] + foot[1]) / 2 - lift * 0.2)
            out.append(Leg([hip, knee, foot], lift))
        return sorted(out, key=lambda leg: leg.ankle[1] + leg.lift)  # the foot nearest to us (lowest on the ground) drawn last

    def arms(self, pose, n, walking):
        ty = self.ty
        A = lambda pts, hand=True, cross=False: Arm([(x, ty + y) for x, y in pts], hand, cross)
        far, near = 11, 28
        if pose in ("idle", "walk_front", "walk_back"):
            if not walking:
                fa, ne = A([(far, 3), (far, 9)]), A([(near, 3), (near, 9)])
                return (ne, fa) if self.back else (fa, ne)
            # each arm swings against the leg of its side, in depth: the torso is drawn facing us, so the hand that
            # goes ahead comes toward us (a bit lower, in front of the hip) and the one behind goes away (higher,
            # shortened); from behind it is the other way round. Never the two hands spreading apart.
            toward = -1 if self.back else 1
            arms = []
            for x, leg_side, inward in ((far, 1, 1), (near, -1, -1)):
                ahead = -math.cos(self.phase) * leg_side            # 1: this hand ahead
                fwd = max(0.0, ahead)
                hx = x + inward * 1.2 * fwd
                hy = 9 + toward * ARM_SWING * ahead - 0.4 * abs(ahead)
                ex = x + inward * 0.5 * fwd
                ey = 6 + toward * 0.4 * ARM_SWING * ahead
                arms.append(A([(x, 3), (ex, ey), (hx, hy)]))
            fa, ne = arms
            return (ne, fa) if self.back else (fa, ne)
        if pose == "talk":  # the near hand comes up and opens while the words come out
            hand = [(near, 9), (near + 3, 6), (near + 6, 2), (near + 4, 4)][n]
            return A([(far, 3), (far, 9)]), A([(near, 3), (near + 2, 7), hand])
        if pose == "sit":
            t = [(0, 2), (2, 0), (0, 2), (2, 0)][n]
            return A([(near, 3), (near - 1, 6 + t[0])], hand=False), A([(far, 3), (far + 1, 6 + t[1])], hand=False)
        if pose in ("arms_up", "arms_up_back"):
            wv = [0, 1, 0, -1][n]
            return (A([(far, 3), (far - 4, -1), (far - 6 - wv, -7 + abs(wv))]),
                    A([(near, 3), (near + 4, -1), (near + 6 + wv, -7 + abs(wv))]))
        if pose == "reach_back":
            j = [0, 2, 0, 2][n]
            return A([(near, 3), (near - 2, 8 + j)], hand=False), A([(far, 3), (far + 2, 10 - j)], hand=False)
        if pose in ("reach", "type_front"):
            low = 1 if pose == "type_front" else 0
            j = [(0, 2), (2, 0), (0, 2), (2, 0)][n]
            return (A([(far + 1, 3), (far + 3, 8 + low), (far + 9, 9 + low + j[0])], cross=True),
                    A([(near, 3), (near + 1, 8 + low), (near + 5, 9 + low + j[1])]))
        if pose in ("hold_front", "read"):
            y = 7 if pose == "read" else 10
            return (A([(far + 1, 3), (far + 2, y - 2), (far + 6, y)], cross=True),
                    A([(near, 3), (near, y - 2), (near - 4, y)]))
        if pose == "pour":
            return A([(far, 3), (far, 9)]), A([(near, 3), (near + 3, 6), (near + 6, 6 + [0, 0, 1, 1][n])])
        if pose == "baton":
            tip = [(near + 5, -5), (near + 3, -8), (near + 5, -5), (near + 6, -3)][n]
            return A([(far, 3), (far, 9)]), A([(near, 3), (near + 3, -1), tip])
        if pose == "drink":
            hand = [(near, 9), (near - 3, 6), (self.mouth[0] + 1, self.mouth[1] - ty + 1), (self.mouth[0] + 1, self.mouth[1] - ty + 1)][n]
            mid = [(near, 6), (near + 1, 7), (near + 1, 6), (near + 1, 6)][n]
            return A([(far, 3), (far, 9)]), A([(near, 3), mid, hand])
        raise ValueError(pose)

    def hand(self, arm=None):
        arm = arm or self.front
        return arm.pts[-1]

    def anchors(self):
        hx, hy = self.hand()
        bx, by = self.hand(self.behind)
        mid = ((hx + bx) / 2, (hy + by) / 2)
        return {"hand": [round(hx), round(hy)], "mid": [round(mid[0]), round(mid[1])], "back": self.back}


# ---------------------------------------------------------------- body
def arms_in_order(g):
    """(arm, after the torso?) in drawing order."""
    first = [(g.behind, False)] if not g.behind.cross else []
    later = [(g.behind, True)] if g.behind.cross else []
    return first, later + [(g.front, True)]


def draw_arm_skin(img, arm):
    limb(img, arm.pts, 4, R["skin"])
    if arm.hand:
        x, y = arm.pts[-1]
        stamp(img, HAND, round(x) - 2, round(y) - 1, R["skin"])


def draw_shadow(img, g):
    flat(img, SHADOW, 10, OFF + (44 if g.sit else 49), {})


LEG_W = 6


def draw_body(img, g):
    for leg in g.legs:
        limb(img, leg.pts, LEG_W, R["skin"])
    before, after = arms_in_order(g)
    for arm, _ in before:
        draw_arm_skin(img, arm)
    stamp(img, NECK, 17, g.hy + 17, R["skin"], shade=False)
    flat(img, NECK_SHADE, 17, g.hy + 17, R["skin"])
    stamp(img, TORSO, g.tx, g.ty, R["skin"])
    for arm, _ in after:
        draw_arm_skin(img, arm)
    # (the head is its own category: draw_head)


def head_stamp(img, g, art, dx, dy, rmp, back_art=None, outline=True, shade=True):
    """A piece on the head: placed from the head's corner, mirrored around the head from behind."""
    if g.back:
        a = parse(back_art if back_art is not None else art, flip=back_art is None)
        x = g.hx + 20 - dx - len(a[0])
        stamp(img, a, x, g.hy + dy, rmp, outline=outline, shade=shade)
    else:
        stamp(img, art, g.hx + dx, g.hy + dy, rmp, outline=outline, shade=shade)


# ---------------------------------------------------------------- tops
TOP_DETAILS = {
    "pull": ("""
.....wwwwww.....
......4444......
.......44.......
................
................
................
................
................
................
yyyyyyyyyyyyyyyy
YYYYYYYYYYYYYYYY
""", ".....wwwwww.....\n" + "................\n" * 8 + "yyyyyyyyyyyyyyyy\nYYYYYYYYYYYYYYYY"),
    "hoodie": ("""
................
................
......w..w......
......4..4......
................
................
................
................
..4444444444....
..4........4....
..4........4....
""", ".....wwwwww....."),
    "chemise": ("""
....hh....hh....
.....hh..hh.....
......h33h......
.......33.......
.......3h.......
.......33.......
.......3h.......
.......33.......
.......3h.......
.......33.......
""", "....hhhhhhhh....\n.....333333....."),
    "tshirt": ("""
.....444444.....
......4..4......
................
.........y......
........yYy.....
.........y......
""", ".....444444....."),
    "polo": ("""
....hh4444hh....
.....hh..hh.....
.......ww.......
.......ww.......
""", "....hh4444hh....\n.....hhhhhh....."),
    "costume": ("""
....4wwwwww4....
.....4wwtw4.....
......4wtT4.....
.......4t4......
.......4tT......
.......4t4......
........T.......
.......4........
.......4k.......
.......4........
""", "....44444444....\n.....444444....."),
    "smoking": ("""
....hwwwwwwh....
....htTtTtTh....
.....hwwwwh.....
......hwwh......
.......hw.......
.......hk.......
.......hw.......
.......hk.......
.......h........
""", "....44444444....\n.....444444....."),
    "robe": ("""
....yyyyyyyy....
.....y....y.....
......y..y......
.......yy.......
.......y........
.......y........
.......y........
.......y........
tttttttttttttttt
TTTTTTTTTTTTTTTT
""", "....yyyyyyyy....\n" + "................\n" * 7 + "tttttttttttttttt\nTTTTTTTTTTTTTTTT"),
    "pilote": ("""
.....hhhhhh.....
.......4........
...kkkkk4.......
...kckmk4.......
...kkkkk4.......
.......4........
.......4........
.......4........
.......4........
kkkkkkkkkkkkkkkk
kkkkkkkekkkkkkkk
""", ".....hhhhhh.....\n" + "................\n" * 8 + "kkkkkkkkkkkkkkkk\nkkkkkkkkkkkkkkkk"),
    "vampire": ("""
....RR....RR....
.....wwwwww.....
......wwww......
.......ww.......
......wwww......
.......ww.......
.......r........
""", ""),
    "pirate": ("""
....4wwwwww4....
.....4wwww4.....
......4ww4......
...y...44...y...
................
...y........y...
................
...y........y...
rrrrrrrrrrrrrrrr
rRrrrrrrrrrrrrrR
""", "....44444444....\n" + "................\n" * 7 + "rrrrrrrrrrrrrrrr\nRrrrrrrrrrrrrrrR"),
    "kimono": ("""
...ww...........
....ww..........
.....ww.........
......ww........
.......ww.......
........ww......
.........ww.....
TTTTTTTTTTTTTTTT
tttttttttttttttt
TTTTTTTTTTTTTTTT
""", "....wwwwwwww....\n" + "................\n" * 6 + "TTTTTTTTTTTTTTTT\ntttttttttttttttt\nTTTTTTTTTTTTTTTT"),
    "hawaii": ("""
....hh4444hh....
.....hh..hh.....
..f.....4..g.f..
.fff..g.4.....y.
..f..ggg4..f....
.....g..4.fff...
..y.....4..f....
.yyy.f..4.....g.
..y.fff.4..g....
.....f..4.......
""", """
....hh4444hh....
................
..f......g...f..
.fff..g......y..
..f..ggg...f....
.....g....fff...
..y........f....
.yyy.f........g.
..y.fff....g....
.....f..........
"""),
}
SLEEVES = {"pull": "long", "hoodie": "long", "chemise": "long", "tshirt": "short", "polo": "short", "costume": "long",
           "smoking": "long", "robe": "wide", "pilote": "long", "vampire": "long", "pirate": "long", "kimono": "wide",
           "hawaii": "short"}
HEMS = {"robe": 12, "kimono": 12, "pirate": 6}   # long garments: rows of hem under the torso
HOOD_RIM = ".##########.\n###......###\n####....####\n.###....###."
HOOD_BACK = "..########..\n.##########.\n############\n############\n.##########.\n..########.."
CAPE = "\n".join(["....############....", "..################..", ".##################."]
                 + ["####################"] * 17 + ["rrrrrrrrrrrrrrrrrrrr", "rr................rr"])
COLLAR_UP = "RR\nR#\nR#\n##\n##"


def sleeve_path(arm, kind):
    total = length(arm.pts)
    if kind == "short":
        return cut(arm.pts, min(4.5, total)), 5
    if kind == "wide":
        return cut(arm.pts, max(1.0, total - 1.5)), 6
    return cut(arm.pts, max(1.0, total - (1.5 if arm.hand else 0))), 5


def top(name):
    sleeve, (front_d, back_d), hem = SLEEVES[name], TOP_DETAILS[name], HEMS.get(name, 0)

    def draw(img, g):
        rmp = R["top"]
        before, after = arms_in_order(g)
        for arm, _ in before:
            path, w = sleeve_path(arm, sleeve)
            limb(img, path, w, rmp)
        if name == "hoodie":
            stamp(img, HOOD_BACK if g.back else HOOD_RIM, g.tx + 2, g.ty - (3 if g.back else 1), rmp)
        if name == "pilote":
            for leg in g.legs:
                limb(img, leg.pts, LEG_W, rmp)
        stamp(img, TORSO, g.tx, g.ty, rmp)
        if hem and not g.sit:
            rows = [".################."] * 2 + ["##################"] * (hem - 2)
            if name == "robe":
                rows[-1] = "yyyyyyyyyyyyyyyyyy"
            if name == "pirate":
                rows[-1] = ".yyyyyyyyyyyyyyyy."
            stamp(img, "\n".join(rows), g.tx - 1, g.ty + 12, rmp)
        flat(img, back_d if g.back else front_d, g.tx, g.ty, rmp)
        if name == "vampire" and not g.back:
            for x in (g.tx - 1, g.tx + 15):
                stamp(img, COLLAR_UP, x, g.ty - 4, R["dark"], flip=x > g.tx)
        if name == "vampire" and g.back:
            stamp(img, CAPE, g.tx - 2, g.ty - 2, R["dark"])
        for arm, _ in after:
            path, w = sleeve_path(arm, sleeve)
            limb(img, path, w, rmp)

    def behind(img, g):
        if name == "vampire" and not g.back:
            stamp(img, CAPE, g.tx - 2, g.ty - 2, R["dark"])
    return draw, (behind if name == "vampire" else None)


# ---------------------------------------------------------------- bottoms, shoes
JEAN = "##3###\n" * 7 + "11111#\n.#####\n.####."
SHORT = "######\n" * 4 + "444444"
SKIRT = """
..###########..
.#############.
.#############.
###############
###############
###############
444444444444444
"""
SHOE = "..####..\n.######.\n########\n########\nssssssss"
BOOT = ".#####..\n.#####..\n.#####..\n.######.\n.######.\n########\n########\nssssssss"


def legs(kind):
    def draw(img, g):
        for leg in g.legs:
            if kind == "short":
                limb(img, cut(leg.pts, 5), LEG_W + 1, R["bottom"])
                continue
            limb(img, leg.pts, LEG_W, R["bottom"])
            if kind == "jean":  # the turned-up hem
                x, y = leg.ankle
                flat(img, "hhhhh", round(x) - 2, round(y) - 1, R["bottom"])
    return draw


def draw_skirt(img, g):
    if not g.sit:
        stamp(img, SKIRT, g.tx, g.ty + 10, R["bottom"], flip=g.back)


def shoes(art, rise):
    def draw(img, g):
        for leg in g.legs:
            x, y = leg.ankle
            stamp(img, art, round(x) - 4, round(y) - rise, R["shoes"], flip=g.back)
    return draw


# ---------------------------------------------------------------- heads (the shape of the face: same skull, its own jaw)
HEAD_TOP = HEAD.strip("\n").split("\n")[:9]   # the skull: every shape shares it (hair and hats fit them all)
HEADS = {
    "rond": HEAD,
    "carre": "\n".join(HEAD_TOP + [   # a square jaw
        "###31###############", "###31###############", "####3###############", "####################",
        "####################", "####################", ".##################.", "..################..",
        "...##############..."]),
    "ovale": "\n".join(HEAD_TOP + [   # a narrow jaw, a soft chin
        "####################", ".###31##############", ".###31#############.", "..##3##############.",
        "..################..", "...###############..", "....#############...", "......#########.....",
        "........#####......."]),
    "coeur": "\n".join(HEAD_TOP + [   # wide cheeks, a pointed chin
        "####################", "###31###############", "###31###############", "####3###############",
        "####################", ".##################.", "...##############...", "......########......",
        "........####........"]),
}


def head(shape):
    def draw(img, g):
        stamp(img, HEADS[shape], g.hx, g.hy, R["skin"], flip=g.back)
    return draw


# ---------------------------------------------------------------- eyes, brows, nose, cheeks (front only)
# each eye: (far eye art, near eye art, top row offset from hy+10, brows far, brows near, brows row)
# k = the lid, K = the pupil, w = its glint (top right, the light), s = the white (the near eye only: the far one is turned)
EYES = {
    "ronds": ("kk\nKw\nKK", "kkk\nsKw\nsKK", 0, "bb", "bbb", 8),
    "grands": ("kk\nKw\nKK\nKK", "kkk\nsKw\nsKK\nsKK", -1, "bb", "bbb", 7),
    "amande": ("kk\nKw", "kkk\nsKw", 1, "b.", ".bb", 8),
    "points": ("K\nK", "Kw\nKK", 1, "bb", "bb", 8),
    "cils": ("k..\n.kk\n.Kw\n.KK\n.KK", "...k\nkkk.\nsKw.\nsKK.\nsKK.", -2, "bb", "bbb", 7),
    "fatigue": ("NN\nkk\nKw\nNN", "NNN\nkkk\nsKw\nNNN", 0, "bb", "bbb", 9),
}


def eyes(kind):
    far, near, dy, bfar, bnear, brow = EYES[kind]
    lashed = kind == "cils"

    def draw(img, g):
        if g.back:
            return
        f, hx, hy = R["face"], g.hx, g.hy
        down = 1 if g.pose == "read" else 0
        for ex, art, b in ((hx + 9 - (1 if lashed else 0), far, bfar), (hx + 14, near, bnear)):
            flat(img, b, ex + (1 if lashed and ex < hx + 9 else 0), hy + brow, f)
            if g.blink or (g.pose == "drink" and g.n == 3):
                wide = max(len(r) for r in art.split("\n"))
                flat(img, ("k" * wide), ex, hy + 12, f)
                if lashed:  # closed, the lashes still there
                    flat(img, ("k" + "." * (wide - 1)) if ex < hx + 9 else ("." * (wide - 1) + "k"), ex, hy + 11, f)
                continue
            if down:  # reading: the lids half down
                art = "\n".join(["N" * len(r) for r in art.split("\n")[:1]] + art.split("\n")[1:])
            flat(img, art, ex, hy + 10 + dy + down, f)
        flat(img, "n", hx + 18, hy + 12, f)
        if kind != "fatigue":
            flat(img, "pp", hx + 7, hy + 13, f)
            flat(img, "pp", hx + 17, hy + 13, f)
    return draw


# ---------------------------------------------------------------- mouths (front only; talking, cheering, a sip override them)
MOUTHS = {
    "sourire": "m..m\n.tm.",
    "neutre": ".mmm",
    "grand_sourire": "mmmm\nmwwm\n.mm.",
    "moue": ".m.\nmtm\n.m.",
    "levres": "l..l\n.LL.",
    "levres_neutre": ".lll\n..L.",
}


def mouth(kind):
    lips = kind.startswith("levres")

    def draw(img, g):
        if g.back or (g.pose == "drink" and g.n >= 2):
            return  # from behind; the cup hides the mouth
        f = dict(R["face"], L="#e07a8a")
        talking = g.pose == "talk" and g.n in (0, 2)
        art = ("m..m\nmttm\n.mm." if g.pose.startswith("arms_up")
               else ".mm.\nmttm\nmttm\n.mm." if talking else MOUTHS[kind])
        if lips:
            art = art.replace("m", "l")
        flat(img, art, g.hx + 12, g.hy + 14, f)
    return draw


# ---------------------------------------------------------------- beards (front only, recoloured by the beard ramp)
# (art, dx, dy, shaded): from the sideburns along the jaw, the mouth left bare (the beard is drawn over it); no outline
# (a dark ring made blobs of them); the stubble is two flat light tones
BEARDS = {
    "fournie": ("""
....##..............
....##..............
....###.............
.#####.....######.#.
..#######..#....####
...#########....###.
.....############...
......##########....
........#######.....
..........###.......
""", 0, 10, True),
    "courte": ("""
....#...............
....##..............
....##..............
.###.......######...
..####.....#....###.
...#########....##..
.....###########....
......##########....
........######......
""", 0, 10, True),
    "3jours": ("""
....1...............
....11..............
....11..............
.1121......1211.....
..11211...1.....111.
...112111211....12..
.....11211121121....
......1121112111....
........111111......
""", 0, 10, False),
    "moustache": (".####.\n##..##", 11, 13, True),
    "bouc": (".####.\n##..##\n......\n.####.\n.####.\n..##..", 11, 13, True),
}


def beard(name):
    art, dx, dy, shaded = BEARDS[name]

    def draw(img, g):
        if not g.back:
            head_stamp(img, g, art, dx, dy, R["beard"], outline=False, shade=shaded)
    return draw


# ---------------------------------------------------------------- hair (placed from the head's corner)
HAIR_SHORT = """
........#######.......
.....#############....
...#################..
..###hhhh###########..
.##hh1111h###########.
.##1111###############
######################.
#######3#####3####3###
######3##3##3#.#3##.##
#####3#.#..#.....#...#
####..................
####..................
###...................
.##...................
"""
HAIR_SHORT_BACK = """
........#######.......
.....#############....
...#################..
..###hhhh###########..
.##hh1111h###########.
.##1111###############
######################
#####3#######3#######.
#####3#####3##########
####3#####3#####3#####
####3####3######3#####
###3#####3#######3###.
.##3####3########3###.
..######3#######3###..
....###############...
......###########.....
"""


def rows_of(art):
    return art.strip("\n").split("\n")


HAIR_LONG = "\n".join(rows_of(HAIR_SHORT)[:10] + [
    "####...............#.#", "####...............#.#", "####...............###", "####...............###",
    "####...............##.", "####...............##.", "#####..............##.", ".####.............##..",
    ".####.................", "..###.................", "..##..................",
])
HAIR_LONG_BACK = "\n".join(rows_of(HAIR_SHORT_BACK)[:13] + [
    ".###3####3#####3####..", ".###3####3######3###..", ".##3#####3######3###..", ".##3####3########3##..",
    "..##3###3#######3##...", "..###############3#...", "...###############....", ".....###########......",
])
HAIR_BOB = "\n".join(rows_of(HAIR_SHORT)[:7] + [
    "######################.", "###########3##########.", "#####3#.............###", "#####...............###",
    "#####...............###", "#####...............###", "#####...............###", "#####...............##.",
    "#####...............##.", "######.............##..", ".#####.............#...", "..####.................",
    "...##..................",
])
HAIR_BOB_BACK = "\n".join(rows_of(HAIR_SHORT_BACK)[:13] + [
    ".###3####3#####3####..", ".###3####3######3###..", "..##3###3#######3##...", "...##############.....",
    ".....##########.......",
])
BUN = "...#####..............\n..#######.............\n..###hh##.............\n..##h11##.............\n...#####.............."
HAIR_BUN = BUN + "\n" + "\n".join([
    ".....#############....", "...#################..", "..###hhhh###########..", ".##hh1111h###########.",
    ".##1111###############", "######################.", "######3##3#####3####3#", "#####3..............##",
    "####..................", "####..................", "###...................", ".##...................",
])
HAIR_BUN_BACK = ".......#####..........\n......#######.........\n......##hh###.........\n......#h11###.........\n.......#####..........\n" \
    + "\n".join(rows_of(HAIR_SHORT_BACK)[1:])
SPIKES = "....#....#....#.......\n....##..##...##..#....\n...###.###..###.##...."
HAIR_SPIKY = SPIKES + "\n" + "\n".join(rows_of(HAIR_SHORT)[2:])
HAIR_SPIKY_BACK = SPIKES + "\n" + "\n".join(rows_of(HAIR_SHORT_BACK)[2:])
HAIR_QUIFF = """
............####......
..........#######.....
........##hhh####.....
.....#############....
...#################..
..###hhhh###########..
.##hh1111h###########.
.##1111###############
######################.
###########3333#######
#####3###.........####
####..................
####..................
###...................
.##...................
"""
HAIR_QUIFF_BACK = "............####......\n..........#######.....\n........##hhh####.....\n" + "\n".join(rows_of(HAIR_SHORT_BACK)[1:])
HAIR_PART = """
........#######.......
.....#############....
...######.##########..
..#####hh.##hhhh####..
.###hh11#.#h1111h####.
.##111##.##111########
#####3##.#############.
######3###############
#####33###3###3#####3#
#####3##..........####
####..................
####..................
###...................
.##...................
"""
MOHAWK = """
.........#..#..#......
........##.##.##......
........########......
.......##hh######.....
.......#h11######.....
.......##########.....
........########......
"""
STUBBLE = "4.4.4.4..........4.4..\n.4.4.4.4.........4.4.\n4.4.4.4...............\n.4.4.4................\n4.4.4................."
BALD_RING = "##.\n###\n###\n###\n.##"
BALD_RING_BACK = "#..................#\n##................##\n####################\n.##################.\n..################.."


def hair(front, back, dy=2, dx=1):
    def draw(img, g):
        head_stamp(img, g, front, -dx, -dy, R["hair"], back_art=back)
    return draw


def draw_mohawk(img, g):
    head_stamp(img, g, MOHAWK, -1, -5, R["hair"])
    head_stamp(img, g, STUBBLE, -1, 2, R["hair"], outline=False, shade=False)


def draw_bald(img, g):
    if g.back:
        stamp(img, BALD_RING_BACK, g.hx, g.hy + 9, R["hair"])
    else:
        stamp(img, BALD_RING, g.hx, g.hy + 7, R["hair"])


def draw_afro(img, g):
    rows = []
    cx, cy, rx, ry = 14.5, 11.5, 13.0, 11.5
    for j in range(25):
        row = ""
        for i in range(29):
            d = ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2
            face_hole = not g.back and j >= 14 and 11 <= i <= 26
            row += "." if d > 1 or face_hole else "3" if (i * 7 + j * 13) % 11 == 0 else "1" if d < 0.35 and i > cx and j < cy and (i + j) % 3 == 0 else "#"
        rows.append(row)
    stamp(img, rows, g.hx - 4, g.hy - 7, R["hair"])


# ---------------------------------------------------------------- glasses (front only)
def glasses(kind):
    def draw(img, g):
        if g.back:
            if kind == "patch":
                flat(img, "o.o.o.o.o.o.o.o.o.o", g.hx, g.hy + 7, R["glass"])
            return
        G, hx, hy = R["glass"], g.hx, g.hy
        if kind == "patch":
            flat(img, ".ooooo.\nooooooo\nooooooo\n.ooooo.", hx + 13, hy + 9, G)
            flat(img, "o" * 13, hx, hy + 7, G)
            return
        if kind == "round":
            far, near = ".oo.\no..o\no..o\n.oo.", ".ooo.\no...o\no..wo\n.ooo."
        elif kind == "sun":
            far, near = "oooo\noGgo\noggo\noooo", "ooooo\noGggo\noggwo\nooooo"
        else:
            far, near = "oooo\no..o\no..o\no..o\noooo", "ooooo\no...o\no..wo\no...o\nooooo"
        flat(img, far, hx + 8, hy + 9, G)
        flat(img, near, hx + 13, hy + 9, G)
        flat(img, "o", hx + 12, hy + 10, G)
        flat(img, "oooo", hx + 4, hy + 10, G)
    return draw


# ---------------------------------------------------------------- hats
CAP = """
.......#######..........
....#############.......
..#################.....
.###################....
.####################...
######################..
#######33333333333333333
.......3333333333333333.
"""
CAP_BACK = """
.......#######.......
....#############....
..#################..
.###################.
.####################
#####################
#######.....#########
#####################
"""
BEANIE = """
...........##...........
..........#hh#..........
...........##...........
.......##########.......
.....##############.....
....###hh###########....
...###h11############...
..####################..
..####################..
.######################.
.######################.
343434343434343434343434
434343434343434343434343
"""
PARTY = """
....yy....
....yy....
....##....
...####...
...#y##...
..######..
..###r##..
.########.
.##g#####.
##########
"""
CROWN = """
#....##....#
##..####..##
############
#r##g##b##r#
############
"""
STRAW = """
.........##########.........
........############........
........############........
........rrrrrrrrrrrr........
..########################..
############################
..########################..
"""
KASA = """
..............##..............
...........###3####...........
........#####3######3.........
.....#####3#####3######.......
..###3######3#####3#######....
##############################
"""
HACHIMAKI = "######################\n##########rr##########\n######################"
HACHI_TAILS = "##..\n###.\n.###\n..##"
TRICORNE = """
.....##########.....
...##############...
.##################.
####################
.y################y.
"""
TOPHAT = """
...############...
...############...
...############...
...############...
...############...
...rrrrrrrrrrrr...
...############...
##################
.################.
"""
FEDORA = """
......##########......
.....###hh###h####....
....##############....
....kkkkkkkkkkkkkk....
######################
.####################.
"""
WIZARD = """
.................###.
...............####..
.............####....
............####.....
...........#####.....
..........######.....
.........###y###.....
........#########....
.......####w######...
......############...
.....##############..
.....yyyyyyyyyyyyyy..
#####################.
.###################..
"""
VR = """
.........#############
.........#ccccccCcccc#
.........#cccccccCccc#
.........#############
"""
HEADBAND = "o" * 22


def hat(art, dx, dy, rmp, back=None):
    def draw(img, g):
        head_stamp(img, g, art, dx, dy, R[rmp], back_art=back)
    return draw


def draw_hachimaki(img, g):
    head_stamp(img, g, HACHIMAKI, -1, 4, R["white"])
    head_stamp(img, g, HACHI_TAILS, -4, 6, R["white"])


def draw_vr(img, g):
    head_stamp(img, g, HEADBAND, -1, 9, R["dark"], outline=False, shade=False)
    if not g.back:
        stamp(img, VR, g.hx - 1, g.hy + 8, R["dark"], shade=False)


def draw_visor(img, g):
    if g.back:
        head_stamp(img, g, HEADBAND, -1, 10, R["dark"], outline=False, shade=False)
    else:
        flat(img, "ccccccccccccc\nCCcccccccccCC\nccccccccccccc", g.hx + 7, g.hy + 9, R["dark"])
        flat(img, "oooo", g.hx + 3, g.hy + 10, R["dark"])


def draw_helmet(img, g):
    rows = []
    cx, cy, rx, ry = 13.0, 12.0, 13.5, 13.0
    for j in range(26):
        row = ""
        for i in range(27):
            d = ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2
            row += "." if d > 1 else ("A" if d < 0.6 and 0.3 < (i - cx) / rx < 0.6 and (j - cy) / ry < -0.2 else "a")
        rows.append(row)
    stamp(img, rows, g.hx - 3, g.hy - 4, R["glass"], shade=False)
    flat(img, "o" * 22, g.hx - 1, g.hy + 20, R["glass"])  # the collar ring


def _phones(img, g):
    d = R["dark"]
    cx, cy = g.hx + 10, g.hy + 8
    for a in range(200, 335, 3):
        for r in (10.5, 11.5):
            x = round(cx + r * math.cos(math.radians(a)))
            y = round(cy + (r - 0.5) * math.sin(math.radians(a)))
            if 0 <= x < W and 0 <= y < H:
                img.putpixel((x, y), rgba(d["2" if r < 11 else "o"]))
    stamp(img, ".###.\n#####\n##y##\n#####\n#####\n.###.", g.hx + 1, g.hy + 7, d)
    if not g.back:  # the mic toward the mouth
        flat(img, "oo\n.oo\n..ooo\n...oy", g.hx + 4, g.hy + 13, d)


def draw_headset(img, g):
    if g.back:
        tmp = Image.new("RGBA", (W, H))
        _phones(tmp, g)
        img.alpha_composite(tmp.transpose(Image.FLIP_LEFT_RIGHT))
    else:
        _phones(img, g)


# ---------------------------------------------------------------- extras
def draw_scarf(img, g):
    x, y = g.tx + 2, g.ty - 2
    stamp(img, "############\n############\n.##########.", x, y, R["scarf"])
    flat(img, "2.2.2.2.2.2.\n.2.2.2.2.2.2", x, y, R["scarf2"])
    if not g.back:
        stamp(img, "###\n###\n###\n###\n###\n###\n###", x + 8, y + 3, R["scarf"])
        flat(img, "222\n...\n222\n...\n222", x + 8, y + 4, R["scarf2"])


def draw_lei(img, g):
    pts = [(-6, 0), (-5, 2), (-3, 3), (-1, 4), (1, 4), (3, 3), (5, 2), (6, 0)] if not g.back else [(-6, 0), (-3, 1), (0, 1), (3, 1), (6, 0)]
    colors = "fyow"
    for k, (dx, dy) in enumerate(pts):
        c = colors[k % 4]
        flat(img, f".{c}.\n{c}y{c}\n.{c}.", g.tx + 7 + dx, g.ty - 1 + dy, R["lei"])


PARROT = """
..rr...
.rrrr..
.rwkr..
.rrrKK.
rrrrr..
rRrrr..
.yyyr..
.bbbb..
..bB...
...b...
"""


def draw_parrot(img, g):
    stamp(img, PARROT, g.tx - 9, g.ty - 8, R["parrot"], flip=g.back, shade=False)  # on the shoulder, clear of long hair


JET_TANK = ".###.\n#####\n#####\n#####\n#####\n#####\n#####\n#####\n.###."


def draw_jetpack(img, g):
    m = R["metal"]
    if g.back:
        for x in (g.tx + 2, g.tx + 9):
            stamp(img, JET_TANK, x, g.ty - 1, m)
            flat(img, "rrrrr", x, g.ty - 1, m)
            flat(img, ".f.\nfFf\n.f." if g.n % 2 else ".F.\n.f.", x + 1, g.ty + 8, m)
    else:
        flat(img, "4\n4\n4\n4\n4\n4", g.tx + 4, g.ty + 1, m)
        flat(img, "4\n4\n4\n4\n4\n4", g.tx + 11, g.ty + 1, m)


def jetpack_behind(img, g):
    if not g.back:
        for x in (g.tx - 4, g.tx + 15):
            stamp(img, JET_TANK, x, g.ty - 6, R["metal"])
            flat(img, "rrrrr", x, g.ty - 6, R["metal"])


def _katana(img, g):
    d = R["dark"]
    a, b = (g.tx + 15, g.ty + 13), (g.tx - 7, g.ty - 6)
    for k in range(0, 41):
        t = k / 40
        x, y = round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t)
        img.putpixel((x, y), rgba(d["2"]))
        img.putpixel((x + 1, y), rgba(d["o"]))
        if t > 0.78:
            img.putpixel((x, y), rgba(d["w" if k % 2 else "4"]))
        if 0.74 < t < 0.78:
            img.putpixel((x, y), rgba(d["y"]))
            img.putpixel((x - 1, y), rgba(d["y"]))


def draw_katana(img, g):
    if g.back:
        _katana(img, g)


def katana_behind(img, g):
    if not g.back:
        _katana(img, g)


# ---------------------------------------------------------------- props: what a hand holds
# name: (frames as ASCII, ramp, grip point x, y, anchor: "hand" or "mid")
PROPS = {
    "cup": ([".vvvvv..\n######..\n######oo\n######.o\n######oo\n.####..."], "cup", 5, 3, "hand"),
    "mic": [".#.\n###\n###\n.k.\n.k.\n.k.\n.k.\n.k."],
    "papers": (["..wwwww\n.wwwwww\nwwwww.w\nw333w.w\nwwwwwww\nw333ww.\nwwwwww.\n"], "paper", 3, 4, "mid"),
    "ticket": (["yyyyy\nyY.Yy\nyyyyy\nyY.Yy\nyyyyy"], "paper", 2, 2, "hand"),
    "plate": (["..oog...\n.ogggr..\nwwwwwwwwww\n.wwwwwwww."], "paper", 5, 2, "mid"),
    "tray": (["...ww......yy...\n..wwww....yyyy..\n..wwww....yyyy..\n################\n#33333333333333#\n.##############."], "wood", 8, 4, "mid"),
    "bag": (["..k.k..\n.k...k.\n#######\n#######\n###y###\n#######\n#######\n#######"], "kraft", 3, 0, "hand"),
    "can": (["w3w\nrrr\nrwr\nrrr\nrrr\nw3w"], "paper", 1, 3, "hand"),
    "pint": (["wwww\nyyyy\nyYyy\nyyYy\nyyyy\n.yy."], "paper", 2, 3, "hand"),
    "cocktail": (["....fr\n....f.\nwwwww.\n.cpc..\n..c...\n..c...\n.ccc.."], "paper", 2, 5, "hand"),
    "paddle": ([".rrr.\nrrrrr\nrrrrr\nrrrrr\n.rrr.\n..k..\n..k..\n..k.."], "paper", 2, 6, "hand"),
    "pot": (None, "carafe", 0, 0, "hand"),  # drawn by carafe_frames(): upright, then tilted and pouring
    "book": (["rrrrrrrrrr\nrwwwwwwwwr\nrw33ww33wr\nrwwwwwwwwr\nrw33ww33wr\nrrrrrrrrrr",
              "rrrrrrrrrr\nrwwwwwwwwr\nrw33wwwwwr\nrwwwwww33r\nrw33wwwwwr\nrrrrrrrrrr"], "paper", 5, 3, "mid"),
    "baton": (["......w\n.....w.\n....w..\n...w...\n..w....\n.k.....", "w......\n.w.....\n..w....\n...w...\n...w...\n...k..."], "paper", 1, 5, "hand"),
    "wand": (["....y.\n...yFy\n....y.\n...m..\n..m...\n.m....\nmm....", "......\n....F.\n......\n...m..\n..m...\n.m....\nmm...."], "paper", 1, 5, "hand"),
}
PROPS["mic"] = (PROPS["mic"], "dark", 1, 5, "hand")
PROP_RAMPS = {
    "cup": dict(fixed(["#ffffff", "#f4f5f9", "#dfe3ec", "#b3b9c9", "#80879a", "#3a2a20", "#80879a"]), v="#5a3520"),
    "paper": {"w": "#f7f7f2", "3": "#9aa0b2", "y": "#ffe37a", "Y": "#d8b84a", "o": "#e8902a", "g": "#51cf66",
              "r": "#e8402a", "k": "#3a2a20", "f": "#ff6a8a", "c": "#bfe9ff", "p": "#ff9ad0", "F": "#fff3b0",
              "m": "#6b4128"},
    "kraft": fixed(["#f2d8a8", "#e0be84", "#c89e62", "#a87e46", "#86602e", "#3a2810", "#86602e"], k="#3a2810", y="#fbaa08"),
    "pot": dict(fixed(["#8a8e9a", "#5a5e6a", "#3a3d46", "#2a2c33", "#1c1d22", "#08080a", "#1c1d22"]), v="#c8ced8", o="#08080a",
                b="#6b4128"),
}
PROP_RAMPS["dark"] = dict(R["dark"], k="#1c1c24")
PROP_RAMPS["wood"] = dict(fixed(["#f0c890", "#d8a868", "#b8844a", "#8e5f30", "#6a4018", "#2a1606", "#6a4018"]),
                          w="#ffffff", y="#fbaa08")
PROP_RAMPS["carafe"] = {"c": "#e2f4ff", "C": "#a8cce0", "v": "#6b3e22", "V": "#8e5a34", "k": "#1c1c24", "K": "#3a3a48",
                        "o": "#2a2a36", "O": "#4a5a6a", "4": "#4a5a6a"}
CARAFE = """
...KKKK..
...kkkk..
..cccccc.
kccVvvvcC
k.cvvvvcC
k.cvvvvvC
kkcvvvvcC
..cvvvvC.
...CCCC..
"""
CARAFE_GRIP = (6, 9)   # the handle, in the 22x22 frame (the carafe turns around it)


def carafe_frames():
    """Upright, then tilted 55° toward the cup with the coffee pouring from the spout."""
    up = Image.new("RGBA", (22, 22))
    stamp(up, CARAFE, CARAFE_GRIP[0], CARAFE_GRIP[1] - 4, PROP_RAMPS["carafe"], shade=False)
    tilt = up.rotate(-55, resample=Image.NEAREST, center=CARAFE_GRIP)
    pts = [(x, y) for y in range(22) for x in range(22) if tilt.getpixel((x, y))[3] and x > CARAFE_GRIP[0] + 3]
    sx, sy = max(pts, key=lambda p: (p[1] + p[0] * 0.2))   # the spout: the lowest point on the cup's side
    for k in range(1, 7):
        if sy + k < 22:
            tilt.putpixel((sx, sy + k), rgba("#6b3e22" if k % 3 else "#8e5a34"))
    return [up, tilt]
PROP_RAMPS["paper"].update({"o": "#2a2230", "O": "#4a4256", "4": "#6a6276"})


# ---------------------------------------------------------------- the pack
def top_item(name):
    draw, behind = top(name)
    return (draw, behind) if behind else draw


ITEMS = {
    "top": {n: top_item(n) for n in TOP_DETAILS},
    "bottom": {"pantalon": legs("pantalon"), "jean": legs("jean"), "short": legs("short"), "jupe": draw_skirt},
    "shoes": {"baskets": shoes(SHOE, 0), "bottes": shoes(BOOT, 3)},
    "extra": {"echarpe": draw_scarf, "collier": draw_lei, "perroquet": draw_parrot,
              "jetpack": (draw_jetpack, jetpack_behind), "katana": (draw_katana, katana_behind)},
    "head": {n: head(n) for n in HEADS},
    "face": {n: eyes(n) for n in EYES},
    "mouth": {n: mouth(n) for n in MOUTHS},
    "beard": {n: beard(n) for n in BEARDS},
    "hair": {"court": hair(HAIR_SHORT, HAIR_SHORT_BACK), "herisse": hair(HAIR_SPIKY, HAIR_SPIKY_BACK, dy=3),
             "carre": hair(HAIR_BOB, HAIR_BOB_BACK), "houppe": hair(HAIR_QUIFF, HAIR_QUIFF_BACK, dy=3),
             "raie": hair(HAIR_PART, HAIR_SHORT_BACK), "chauve": draw_bald, "long": hair(HAIR_LONG, HAIR_LONG_BACK),
             "chignon": hair(HAIR_BUN, HAIR_BUN_BACK, dy=6), "crete": draw_mohawk, "afro": draw_afro},
    "glasses": {"carrees": glasses("square"), "rondes": glasses("round"), "soleil": glasses("sun"),
                "bandeau": glasses("patch")},
    "hat": {"casquette": hat(CAP, -1, -3, "hat", CAP_BACK), "bonnet": hat(BEANIE, -2, -6, "hat"),
            "casque_micro": draw_headset, "fete": hat(PARTY, 6, -10, "hat"), "couronne": hat(CROWN, 4, -5, "gold"),
            "paille": hat(STRAW, -4, -6, "straw"), "kasa": hat(KASA, -5, -5, "straw"), "hachimaki": draw_hachimaki,
            "tricorne": hat(TRICORNE, 0, -6, "dark"), "haut_de_forme": hat(TOPHAT, 1, -11, "dark"),
            "feutre": hat(FEDORA, -1, -5, "felt"), "vr": draw_vr, "casque_astronaute": draw_helmet,
            "visiere": draw_visor, "sorcier": hat(WIZARD, -1, -14, "wizard")},
}
# Item ramps and default colours (an item not listed uses its category's ramps, in their source variant)
ITEM_META = {
    "top/hoodie": {"default": {"top": "gris"}},
    "top/chemise": {"default": {"top": "blanc"}},
    "top/tshirt": {"default": {"top": "rouge"}},
    "top/polo": {"default": {"top": "vert"}},
    "top/costume": {"ramps": ["top", "tie"], "default": {"top": "ardoise"}},
    "top/smoking": {"ramps": ["top", "tie"], "default": {"top": "noir"}},
    "top/robe": {"ramps": ["top", "tie"], "default": {"top": "violet", "tie": "or"}},
    "top/pilote": {"default": {"top": "blanc"}},
    "top/vampire": {"default": {"top": "noir"}},
    "top/pirate": {"default": {"top": "nuit"}},
    "top/kimono": {"ramps": ["top", "tie"], "default": {"top": "marine", "tie": "or"}},
    "top/hawaii": {"default": {"top": "cyan"}},
    "bottom/jean": {"default": {"bottom": "jean"}},
    "bottom/jupe": {"default": {"bottom": "marine"}},
    "shoes/bottes": {"default": {"shoes": "marron"}},
    "extra/echarpe": {"ramps": ["scarf", "scarf2"]},
    "hat/casquette": {"ramps": ["hat"], "default": {"hat": "marine"}},
    "hat/bonnet": {"ramps": ["hat"], "default": {"hat": "rouge"}},
    "hat/fete": {"ramps": ["hat"], "default": {"hat": "violet"}},
}
DEFAULT = {"bottom": "pantalon", "shoes": "baskets", "top": "pull", "head": "rond", "face": "ronds", "mouth": "sourire", "hair": "court"}


def poses_frames():
    return [(p, n) for p, _, c in POSES for n in range(c)]


def strip(draw):
    img = Image.new("RGBA", (W * FRAMES, H))
    for i, (p, n) in enumerate(poses_frames()):
        cell = Image.new("RGBA", (W, H))
        draw(cell, Rig(p, n))
        img.alpha_composite(cell, (i * W, 0))
    return img


def piskel_layer(name, img, opacity=1.0, width=W):
    buf = io.BytesIO()
    img.save(buf, "PNG")
    count = img.width // width
    return json.dumps({"name": name, "opacity": opacity, "frameCount": count, "chunks": [{
        "layout": [[i] for i in range(count)],
        "base64PNG": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()}]})


def write_piskel(path, name, layers, width=W, height=H, fps=6):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"modelVersion": 2, "piskel": {
        "name": name, "description": f"agent-office sprite pack: {width}x{height}",
        "fps": fps, "height": height, "width": width, "layers": layers, "hiddenFrames": []}}))


def flatten(strips):
    out = Image.new("RGBA", strips[0].size)
    for s in strips:
        out.alpha_composite(s)
    return out


def build():
    src = ROOT / "src"
    body, shadow = strip(draw_body), strip(draw_shadow)
    outfit = {cat: strip(ITEMS[cat][DEFAULT[cat]] if callable(ITEMS[cat][DEFAULT[cat]]) else ITEMS[cat][DEFAULT[cat]][0])
              for cat in DEFAULT}
    write_piskel(src / "base_character.piskel", "base_character", [
        piskel_layer("shadow", shadow), piskel_layer("body", body),
        *(piskel_layer(cat, outfit[cat]) for cat in ("bottom", "shoes", "top", "head", "face", "mouth", "hair"))])

    count = 0
    for cat, items in ITEMS.items():
        dressed = cat in ("hair", "beard", "glasses", "hat", "extra", "face", "mouth", "head")
        ref = [shadow, body] + ([outfit["bottom"], outfit["shoes"], outfit["top"]] if dressed else []) \
            + ([outfit["head"]] if cat != "head" else []) \
            + [outfit[c] for c in ("face", "mouth") if c != cat and cat != "head"] + ([outfit["hair"]] if cat in ("glasses", "hat") else [])
        ref = flatten(ref)
        write_piskel(src / cat / "template.piskel", f"{cat}_template",
                     [piskel_layer("ref", ref, 0.35), piskel_layer("behind", Image.new("RGBA", ref.size)),
                      piskel_layer("item", Image.new("RGBA", ref.size))])
        for name, draw in items.items():
            main, behind = (draw, None) if callable(draw) else draw
            layers = [piskel_layer("ref", ref, 0.35)]
            if behind:
                layers.append(piskel_layer("behind", strip(behind)))
            layers.append(piskel_layer("item", strip(main)))
            write_piskel(src / cat / f"{name}.piskel", f"{cat}_{name}", layers)
            count += 1

    props = {}
    for name, (frames, rmp, gx, gy, anchor) in PROPS.items():
        if frames is None:  # drawn by code (the carafe): already framed, its grip given
            imgs = carafe_frames()
            pw, ph = imgs[0].size
            sheet = Image.new("RGBA", (pw * len(imgs), ph))
            for k, im in enumerate(imgs):
                sheet.alpha_composite(im, (k * pw, 0))
            write_piskel(src / "props" / f"{name}.piskel", f"prop_{name}", [piskel_layer("item", sheet, width=pw)], pw, ph, 2)
            props[name] = {"grip": list(CARAFE_GRIP), "anchor": anchor}
            continue
        arts = [parse(f) for f in frames]
        pw, ph = max(len(a[0]) for a in arts) + 2, max(len(a) for a in arts) + 2
        sheet = Image.new("RGBA", (pw * len(arts), ph))
        for k, a in enumerate(arts):
            stamp(sheet, a, k * pw + 1, 1, PROP_RAMPS.get(rmp, R.get(rmp)), shade=rmp not in ("paper",))
        write_piskel(src / "props" / f"{name}.piskel", f"prop_{name}", [piskel_layer("item", sheet, width=pw)], pw, ph, 2)
        props[name] = {"grip": [gx + 1, gy + 1], "anchor": anchor}
    (ROOT / "props.json").write_text(json.dumps(props, indent=1) + "\n")

    rig = {"w": W, "h": H, "frames": FRAMES, "feet": 51 + OFF, "hips": 37 + OFF, "poses": {}, "anchors": []}
    start = 0
    for p, back, c in POSES:
        rig["poses"][p] = [start, c, back]
        start += c
    for p, n in poses_frames():
        g = Rig(p, n)
        rig["anchors"].append({**g.anchors(), "head": [g.hx, g.hy]})
    (ROOT / "rig.json").write_text(json.dumps(rig, separators=(",", ":")) + "\n")

    ramps = {name: {"source": source, "variants": VARIANTS[family]} for name, (family, source) in RAMP_SOURCES.items()}
    (ROOT / "palettes.json").write_text(json.dumps({
        "tones": TONES, "ramps": ramps, "categories": CATEGORIES, "items": ITEM_META, "default": DEFAULT},
        indent=1, ensure_ascii=False) + "\n")

    sheet = flatten([shadow, body, *(outfit[c] for c in ("bottom", "shoes", "top", "head", "face", "mouth", "hair"))])
    grid = Image.new("RGBA", (W * 8, H * len(POSES)), (226, 214, 190, 255))
    for i, (p, n) in enumerate(poses_frames()):
        grid.alpha_composite(sheet.crop((i * W, 0, i * W + W, H)), (n * W, [q for q, _, _ in POSES].index(p) * H))
    (ROOT / "build").mkdir(exist_ok=True)
    grid.resize((grid.width * 3, grid.height * 3), Image.NEAREST).save(ROOT / "build" / "preview.png")
    print(f"ok: base + {count} items + {len(PROPS)} props + {len(ITEMS)} templates, {FRAMES} frames")


if __name__ == "__main__":
    sys.exit(build())
