"""Build the agent-office sprite atlas from the .piskel sources.

  python3 -I app/sprites/tools/build_sprites.py

Reads app/sprites/src/base_character.piskel (layers 'shadow' and 'body'), every src/<category>/<item>.piskel
(layer 'item', and 'behind' for what is drawn behind the body; 'ref' and template.piskel are ignored) and every
src/props/<prop>.piskel (what a hand holds), checks them, then writes:
  web/sprites/atlas.png    one row per item (and per 'behind' layer) of the frames of rig.json, source colours
  web/sprites/props.png    the props, side by side
  web/sprites/atlas.json   frame grid, poses, hand anchors, items (row, category, ramps, default colours), props, ramps
  app/sprites/build/catalog.png  every item worn by the base character, in its default colours

Recolouring is done by the page (source ramp → chosen variant), so the atlas holds each item once.
Exit code 1 when a source is unusable; warnings (stray colours…) do not fail the build.
"""
import base64
import hashlib
import io
import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT.parent / "web" / "sprites"
RIG = json.loads((ROOT / "rig.json").read_text())
W, H, FRAMES = RIG["w"], RIG["h"], RIG["frames"]
ORDER = ["body", "bottom", "shoes", "top", "extra", "head", "face", "mouth", "beard", "hair", "glasses", "hat"]


def frames_of(layer, width, height):
    """Decode a Piskel layer into its list of frames."""
    count = layer["frameCount"]
    out = [Image.new("RGBA", (width, height)) for _ in range(count)]
    for chunk in layer["chunks"]:
        png = Image.open(io.BytesIO(base64.b64decode(chunk["base64PNG"].split(",", 1)[1]))).convert("RGBA")
        for col, cells in enumerate(chunk["layout"]):
            for row, index in enumerate(cells):
                out[index] = png.crop((col * width, row * height, (col + 1) * width, (row + 1) * height))
    return out


def layers_of(path, size=(W, H)):
    doc = json.loads(path.read_text())["piskel"]
    if size and (doc["width"], doc["height"]) != size:
        raise ValueError(f"taille {doc['width']}x{doc['height']}, attendu {size[0]}x{size[1]}")
    layers = {}
    for raw in doc["layers"]:
        l = json.loads(raw) if isinstance(raw, str) else raw
        layers[l["name"]] = frames_of(l, doc["width"], doc["height"])
    return layers, (doc["width"], doc["height"])


def expand(frames, cat):
    """4 frames (standing only) → every frame: the head moves with each pose, back poses mirrored."""
    if len(frames) == FRAMES:
        return frames, None
    if len(frames) != 4:
        raise ValueError(f"{len(frames)} images, attendu {FRAMES} (ou 4 : debout seulement)")
    out, base_y = [], RIG["anchors"][0]["head"][1]
    for i, a in enumerate(RIG["anchors"]):
        f = Image.new("RGBA", (W, H))
        if not (a["back"] and cat in ("face", "beard", "glasses")):
            src = frames[i] if i < 4 else frames[0]
            f.alpha_composite(src.transpose(Image.FLIP_LEFT_RIGHT) if a["back"] else src, (0, a["head"][1] - base_y))
        out.append(f)
    return out, "4 images : recopiées sur les autres poses (dos = miroir)"


def palette_of(frames):
    return {f"#{r:02x}{g:02x}{b:02x}" for f in frames for (r, g, b, a) in f.getdata() if a == 255}


def build():
    pal = json.loads((ROOT / "palettes.json").read_text())
    grips = json.loads((ROOT / "props.json").read_text())
    errors, warnings, rows = [], [], []  # rows: (id, category, frames, behind frames or None)
    try:
        base, _ = layers_of(ROOT / "src" / "base_character.piskel")
        rows.append(("body", "body", base["body"], None))
        shadow = base["shadow"]
    except (ValueError, KeyError, OSError) as e:
        print(f"ERREUR base_character.piskel : {e}")
        return 1
    for cat in ORDER[1:]:
        for path in sorted((ROOT / "src" / cat).glob("*.piskel")):
            if path.stem == "template":
                continue
            item = f"{cat}/{path.stem}"
            try:
                layers, _ = layers_of(path)
                main = layers.get("item") or layers.get(cat) or next(v for k, v in layers.items() if k not in ("ref", "behind"))
                frames, note = expand(main, cat)
                behind = expand(layers["behind"], cat)[0] if "behind" in layers else None
            except (ValueError, KeyError, StopIteration, json.JSONDecodeError) as e:
                errors.append(f"{item} : {e}")
                continue
            if note:
                warnings.append(f"{item} : {note}")
            if behind is not None and not any(f.getbbox() for f in behind):
                behind = None
            if not any(f.getbbox() for f in frames) and behind is None:
                warnings.append(f"{item} : vide")
            rows.append((item, cat, frames, behind))

    for item, cat, frames, _ in rows:  # stray colours: they will not follow the recolouring (fine for details)
        ramps = pal["items"].get(item, {}).get("ramps", pal["categories"][cat])
        known = {c for r in ramps for c in pal["ramps"][r]["variants"][pal["ramps"][r]["source"]]}
        stray = palette_of(frames) - known
        if ramps and len(stray) > 16:
            warnings.append(f"{item} : {len(stray)} couleurs hors rampe {'/'.join(ramps)}")

    strips = [("shadow", shadow)]
    meta = {}
    for item, cat, frames, behind in rows:
        info = pal["items"].get(item, {})
        meta[item] = {"row": len(strips), "cat": cat, "ramps": info.get("ramps", pal["categories"].get(cat, [])),
                      "default": info.get("default", {})}
        strips.append((item, frames))
        if behind is not None:
            meta[item]["behind"] = len(strips)
            strips.append((item + "@behind", behind))
    atlas = Image.new("RGBA", (W * FRAMES, H * len(strips)))
    for r, (_, frames) in enumerate(strips):
        for i, f in enumerate(frames):
            atlas.alpha_composite(f, (i * W, r * H))

    # props: each sheet side by side in props.png
    props, sheets, x = {}, [], 0
    for path in sorted((ROOT / "src" / "props").glob("*.piskel")):
        try:
            layers, (pw, ph) = layers_of(path, size=None)
            frames = layers.get("item") or next(iter(layers.values()))
        except (ValueError, KeyError, StopIteration, json.JSONDecodeError) as e:
            errors.append(f"props/{path.stem} : {e}")
            continue
        g = grips.get(path.stem, {"grip": [pw // 2, ph // 2], "anchor": "hand"})
        props[path.stem] = {"x": x, "w": pw, "h": ph, "frames": len(frames), **g}
        sheets.append((x, frames))
        x += pw * len(frames)
    prop_png = Image.new("RGBA", (max(1, x), max([1] + [p["h"] for p in props.values()])))
    for x0, frames in sheets:
        for k, f in enumerate(frames):
            prop_png.alpha_composite(f, (x0 + k * f.width, 0))

    WEB.mkdir(parents=True, exist_ok=True)
    atlas.save(WEB / "atlas.png", optimize=True)
    prop_png.save(WEB / "props.png", optimize=True)
    version = hashlib.sha1((WEB / "atlas.png").read_bytes() + (WEB / "props.png").read_bytes()).hexdigest()[:10]
    (WEB / "atlas.json").write_text(json.dumps({
        "version": version, "w": W, "h": H, "frames": FRAMES, "fps": 6, "feet": RIG["feet"], "hips": RIG["hips"], "poses": RIG["poses"], "anchors": RIG["anchors"], "order": ORDER,
        "items": meta, "props": props, "ramps": pal["ramps"], "default": pal["default"]}, ensure_ascii=False, separators=(",", ":")))

    catalog(rows, shadow, pal, meta)
    for w in warnings:
        print(f"attention  {w}")
    for e in errors:
        print(f"ERREUR     {e}")
    size = (WEB / "atlas.png").stat().st_size + (WEB / "props.png").stat().st_size
    print(f"{len(rows)} objets, {len(props)} accessoires → web/sprites/ ({atlas.width}x{atlas.height}, {size // 1024} Ko)")
    return 1 if errors else 0


def recolor(img, ramps, chosen, pal):
    table = {}
    for r in ramps:
        ramp = pal["ramps"][r]
        target = chosen.get(r, ramp["source"])
        for a, b in zip(ramp["variants"][ramp["source"]], ramp["variants"][target]):
            table.setdefault(tuple(int(a[i:i + 2], 16) for i in (1, 3, 5)), tuple(int(b[i:i + 2], 16) for i in (1, 3, 5)))
    out = img.copy()
    out.putdata([table.get(p[:3], p[:3]) + (p[3],) for p in img.getdata()])
    return out


def catalog(rows, shadow, pal, meta):
    """Each item on the default character, from the front (frame 0) and from behind (frame 8)."""
    by = {item: (frames, behind) for item, _, frames, behind in rows}
    base = {cat: f"{cat}/{name}" for cat, name in pal["default"].items()}
    cells = [item for item, cat, _, _ in rows if cat != "body"]
    cols = 8
    sheet = Image.new("RGBA", (cols * W * 2, ((len(cells) + cols - 1) // cols) * H), (226, 214, 190, 255))
    for k, item in enumerate(cells):
        cat = meta[item]["cat"]
        wear = dict(base, **{cat: item})
        if cat == "hat" and wear.get("hair") is None:
            wear["hair"] = base["hair"]
        for j, fi in enumerate((0, 8)):
            cell = Image.new("RGBA", (W, H))
            cell.alpha_composite(shadow[fi])
            worn = [i for i in ["body"] + [wear.get(c) for c in ORDER[1:]] if i]
            for it in worn:
                if by[it][1]:
                    cell.alpha_composite(recolor(by[it][1][fi], meta[it]["ramps"], meta[it]["default"], pal))
            for it in worn:
                m = meta.get(it, {"ramps": ["skin"], "default": {}})
                cell.alpha_composite(recolor(by[it][0][fi], m["ramps"], m["default"], pal))
            sheet.alpha_composite(cell, (((k % cols) * 2 + j) * W, (k // cols) * H))
    (ROOT / "build").mkdir(exist_ok=True)
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(ROOT / "build" / "catalog.png")


if __name__ == "__main__":
    sys.exit(build())
