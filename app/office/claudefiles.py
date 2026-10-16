"""ChiefOS → Skills & agents: the skills, agents and slash commands already in the global ~/.claude and in the .claude
of the projects worked on recently; read, edit (with a backup and a check that nobody changed the file meanwhile),
duplicate, delete (moved to a trash, never erased). Only those files can be touched: <root>/.claude/skills/<name>/SKILL.md,
<root>/.claude/agents/<name>.md and <root>/.claude/commands/<name>.md."""

from __future__ import annotations

import re
import shutil
import time
from pathlib import Path
from typing import Any

from .blueprints import targets
from .config import STATE_DIR

BACKUPS, TRASH = STATE_DIR / "backups", STATE_DIR / "trash"
CONTENT_MAX = 300_000
NAME = r"[A-Za-z0-9][A-Za-z0-9._-]{0,80}"
PATTERNS = {"skill": re.compile(rf"^skills/{NAME}/SKILL\.md$"), "agent": re.compile(rf"^agents/{NAME}\.md$"), "command": re.compile(rf"^commands/{NAME}\.md$")}


def roots() -> list[tuple[str, Path]]:
    """(label, .claude folder) for the global one and each recent project that has one."""
    out = []
    for t in targets():
        base = Path(t["path"]) / ".claude"
        if base.is_dir():
            out.append(("Global" if t["kind"] == "global" else t["label"], base))
    return out


def frontmatter(text: str) -> dict[str, str]:
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    meta: dict[str, str] = {}
    for line in (m.group(1).splitlines() if m else []):
        k, sep, v = line.partition(":")
        if sep and k.strip() and not k.startswith(" "):
            meta[k.strip()] = v.strip().strip('"')
    return meta


def kind_of(path: Path) -> tuple[str, Path] | None:
    """(kind, its .claude root) when `path` is a file this app may touch, else None."""
    p = path.expanduser().resolve()
    for _, base in roots():
        b = base.resolve()
        if b in p.parents:
            rel = p.relative_to(b).as_posix()
            for kind, pat in PATTERNS.items():
                if pat.match(rel):
                    return kind, b
    return None


def list_files() -> list[dict[str, Any]]:
    out = []
    for label, base in roots():
        for kind, glob in (("skill", "skills/*/SKILL.md"), ("agent", "agents/*.md"), ("command", "commands/*.md")):
            for f in sorted(base.glob(glob)):
                try:
                    text = f.read_text(encoding="utf-8", errors="replace")[:4000]
                    st = f.stat()
                except OSError:
                    continue
                meta = frontmatter(text)
                name = meta.get("name") or (f.parent.name if kind == "skill" else f.stem)
                out.append({"path": str(f), "scope": label, "kind": kind, "name": name, "description": meta.get("description", "")[:300],
                            "mtime": st.st_mtime, "size": st.st_size, "link": f.is_symlink() or f.parent.is_symlink()})
    return out


def read(path: str) -> dict[str, Any]:
    p = Path(path)
    if not kind_of(p) or not p.is_file():
        raise ValueError("fichier non autorisé")
    return {"path": str(p), "content": p.read_text(encoding="utf-8", errors="replace"), "mtime": p.stat().st_mtime}


def _backup(p: Path) -> None:
    BACKUPS.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, BACKUPS / f"{time.strftime('%Y%m%d-%H%M%S')}-{p.parent.name if p.name == 'SKILL.md' else ''}{p.name}")


def save(path: str, content: str, mtime: float | None = None, force: bool = False) -> dict[str, Any]:
    """Writes the file (a new one too, e.g. a duplicate); refuses when it changed since `mtime` unless forced."""
    p = Path(path).expanduser()
    if not kind_of(p):
        raise ValueError("emplacement non autorisé")
    if not content.strip() or len(content) > CONTENT_MAX:
        raise ValueError("contenu vide ou trop long")
    if p.exists():
        if mtime is not None and not force and abs(p.stat().st_mtime - mtime) > 0.001:
            raise FileExistsError("le fichier a changé sur le disque depuis son ouverture")
        _backup(p)
    elif mtime is not None:
        raise FileNotFoundError("le fichier n'existe plus")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return {"path": str(p), "mtime": p.stat().st_mtime}


def delete(path: str) -> dict[str, Any]:
    """Moved to STATE_DIR/trash (a skill: its whole folder), never erased."""
    p = Path(path).expanduser()
    found = kind_of(p)
    if not found or not p.exists():
        raise ValueError("fichier non autorisé")
    kind, _ = found
    src = p.parent if kind == "skill" else p
    TRASH.mkdir(parents=True, exist_ok=True)
    dest = TRASH / f"{time.strftime('%Y%m%d-%H%M%S')}-{src.name}"
    shutil.move(str(src), dest)
    return {"trash": str(dest)}
