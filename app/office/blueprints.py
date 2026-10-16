"""ChiefOS → Blueprints: where a skill or an agent designed in the page can go, and its publication.

Destinations are the global ~/.claude or the .claude of a project worked on recently (from the transcripts' cwd), or
any folder of the home typed by the user. Publishing either writes the compiled draft there, or opens an interactive
`claude` in that folder that reads the blueprint and writes the skill / agent in the right place and format.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

from .config import PROJECTS, STATE_DIR
from .launcher import launch_claude_in

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
CONTENT_MAX = 200_000
DRAFTS = STATE_DIR / "blueprints"


def _cwd_of(transcript: Path) -> str | None:
    try:
        with transcript.open("rb") as fh:
            for _, line in zip(range(40), fh):
                try:
                    cwd = json.loads(line).get("cwd")
                except ValueError:
                    continue
                if cwd:
                    return str(cwd)
    except OSError:
        return None
    return None


def targets() -> list[dict[str, Any]]:
    """The global ~/.claude, then the projects worked on recently (newest first)."""
    home = Path.home()
    out = [{"path": str(home), "label": "Global — ~/.claude (tous tes projets)", "kind": "global", "claude": (home / ".claude").is_dir()}]
    seen = {str(home)}
    dirs = sorted((d for d in PROJECTS.iterdir() if d.is_dir()), key=lambda d: d.stat().st_mtime, reverse=True)[:60] if PROJECTS.exists() else []
    for d in dirs:
        newest = max(d.glob("*.jsonl"), key=lambda f: f.stat().st_mtime, default=None)
        cwd = _cwd_of(newest) if newest else None
        if not cwd or cwd in seen or not Path(cwd).is_dir():
            continue
        seen.add(cwd)
        p = Path(cwd)
        label = f"~/{p.relative_to(home)}" if home in p.parents else cwd
        out.append({"path": cwd, "label": label, "kind": "repo", "claude": (p / ".claude").is_dir(), "git": (p / ".git").exists()})
        if len(out) > 25:
            break
    return out


def destination(target: str, kind: str, name: str) -> Path:
    """target/.claude/skills/<name>/SKILL.md or target/.claude/agents/<name>.md, checked: a folder of the home, a safe name."""
    if kind not in ("skill", "agent"):
        raise ValueError("type inconnu")
    if not NAME_RE.match(name or ""):
        raise ValueError("nom invalide (minuscules, chiffres et tirets)")
    home = Path.home().resolve()
    root = Path(target).expanduser().resolve()
    if not root.is_dir():
        raise ValueError("dossier introuvable")
    if root != home and home not in root.parents:
        raise ValueError("le dossier doit être dans ton dossier personnel")
    base = root / ".claude"
    return base / "skills" / name / "SKILL.md" if kind == "skill" else base / "agents" / f"{name}.md"


def publish(data: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    """mode "write": the compiled draft written at its place (409 if the file exists, unless overwrite);
    mode "claude": the blueprint saved as a draft, and an interactive claude opened in the target folder to write it."""
    try:
        kind, name, target = str(data.get("kind", "")), str(data.get("name", "")), str(data.get("target", ""))
        dest = destination(target, kind, name)
        content = str(data.get("content", ""))
        if not content.strip() or len(content) > CONTENT_MAX:
            raise ValueError("contenu vide ou trop long")
    except ValueError as err:
        return 400, {"ok": False, "error": str(err)}
    root = Path(target).expanduser().resolve()
    rel = dest.relative_to(root)
    if data.get("mode") == "write":
        if dest.exists() and not data.get("overwrite"):
            return 409, {"ok": False, "error": f"{rel} existe déjà", "exists": True, "path": str(dest)}
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        return 200, {"ok": True, "output": f"Écrit : {dest}", "path": str(dest)}
    DRAFTS.mkdir(parents=True, exist_ok=True)
    draft = DRAFTS / f"{name}-{time.strftime('%Y%m%d-%H%M%S')}.md"
    draft.write_text(content + ("\n\n<!-- blueprint (JSON) -->\n```json\n" + json.dumps(data.get("blueprint") or {}, ensure_ascii=False, indent=1) + "\n```\n" if data.get("blueprint") else ""), encoding="utf-8")
    what = "le skill" if kind == "skill" else "l'agent"
    fmt = ("skill Claude Code : un dossier skills/<nom>/ avec SKILL.md, frontmatter name et description (quand l'utiliser), puis les instructions"
           if kind == "skill" else "agent Claude Code : un fichier agents/<nom>.md, frontmatter name, description (quand l'utiliser), tools et model, puis le prompt système")
    prompt = (f"Crée {what} « {name} » à partir du blueprint dessiné dans Agent Office : {draft}. "
              f"Écris-le dans {rel} (dossier {root}), au format {fmt}. "
              f"Garde toute la logique du blueprint (entrées, étapes, conditions, boucles, fonctions, règles, résultat), reformule-la clairement pour un modèle, "
              f"vérifie que le fichier est valide{' et que ' + str(rel) + ' existe déjà ou non (demande avant d écraser)' if dest.exists() else ''}, puis résume ce que tu as créé.")
    ok, out = launch_claude_in(root, prompt)
    return (200 if ok else 409), {"ok": ok, "output": out, "draft": str(draft), "path": str(dest)}
