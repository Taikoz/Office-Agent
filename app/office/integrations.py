"""ChiefOS → 🔌 Intégrations: one registry of the external services, whatever the provider.

Three things, kept apart:
  - a CONNECTOR is code that knows a provider (its auth form, its capabilities, its read operations); it exists
    whether the user connected it or not: the catalogue;
  - a CONNECTION is the user's own credentials for one connector, sealed on this machine (vault.py), with its state;
  - an APPLICATION (apps.py) is a view of ChiefOS built on a connection.

A connector does not re-implement its provider: it declares what the page needs to know (fields, scopes, capabilities)
and adapts the provider's module (gitlab.py, sentry.py, slack.py), which keeps its own API client, cache and errors.
Adding a provider = one Connector(...) here and register(); nothing else in the server or in ChiefOS changes.

Security, the same for every connector:
  - the page sends values only for the fields the connector declares (anything else is dropped), and never gets a
    secret back: catalogue() and connections() return the field definitions and the state, not the values;
  - every read operation the page may run is declared in `reads` (op id → function); run() refuses any other one, so a
    generated app cannot reach more than its connector exposes, whatever its saved settings say;
  - nothing here writes to a provider: `writes` is empty for every connector so far, and run() only runs reads.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Callable

from . import gitlab, sentry, slack

# the domains of ChiefOS a capability belongs to (the workspaces of the unified dev environment)
DOMAINS = {
    "code": "Code & versions",
    "quality": "Qualité",
    "delivery": "CI/CD & livraisons",
    "monitoring": "Monitoring & incidents",
    "communication": "Communication",
    "analytics": "Statistiques",
}
# a connection's state, as the page shows it (and what to do about it)
STATES = {
    "connected": "connecté",
    "not_configured": "non relié",
    "invalid": "jeton refusé (invalide ou révoqué)",
    "expired": "jeton expiré",
    "insufficient": "droits insuffisants",
    "unreachable": "service injoignable",
    "error": "erreur de configuration",
}


@dataclass(frozen=True)
class Field:
    """One input of a connector's auth form. kind: url, secret (never sent back), text, list (comma separated)."""

    key: str
    label: str
    kind: str = "text"
    required: bool = False
    placeholder: str = ""
    help: str = ""

    def public(self) -> dict[str, Any]:
        return {"key": self.key, "label": self.label, "kind": self.kind, "required": self.required, "placeholder": self.placeholder, "help": self.help}


@dataclass(frozen=True)
class AuthMethod:
    """How a connector authenticates: pat (personal access token), api_token, bot_token, api_key, oauth2, oauth2_pkce.
    Only the methods a connector really implements are declared; the form is built from `fields`."""

    id: str
    label: str
    fields: tuple[Field, ...]
    scopes: tuple[str, ...] = ()
    create_url: str = ""  # where the user makes the credential ({url} = the instance address)

    def public(self) -> dict[str, Any]:
        return {"id": self.id, "label": self.label, "fields": [f.public() for f in self.fields], "scopes": list(self.scopes), "createUrl": self.create_url}


@dataclass(frozen=True)
class Capability:
    """Something a connector can really do: its domain, a label, read or write, and the read op serving it (if any)."""

    id: str
    domain: str
    label: str
    access: str = "read"
    op: str = ""


@dataclass
class Connector:
    id: str
    name: str
    icon: str
    description: str
    auth: tuple[AuthMethod, ...]
    capabilities: tuple[Capability, ...]
    status: Callable[[], dict[str, Any]]                    # the provider's own status (never the token)
    save: Callable[[dict[str, str]], dict[str, Any]]         # values of the declared fields → status; raises error
    forget: Callable[[], dict[str, Any]]
    verify: Callable[[], Any]                                # one cheap authenticated call; raises error
    error: type[Exception]                                   # the provider's readable error
    reads: dict[str, Callable[[dict[str, str]], Any]] = field(default_factory=dict)  # op id → fn(params)
    writes: dict[str, Callable[[dict[str, Any]], Any]] = field(default_factory=dict)  # none yet: everything is read-only
    apps: tuple[str, ...] = ()                               # the built-in ChiefOS apps that use this connection
    account: Callable[[dict[str, Any]], str] = lambda st: ""  # who / where the connection is, from its status

    def fields(self) -> dict[str, Field]:
        return {f.key: f for m in self.auth for f in m.fields}

    def public(self) -> dict[str, Any]:
        return {"id": self.id, "name": self.name, "icon": self.icon, "description": self.description,
                "auth": [m.public() for m in self.auth], "domains": sorted({c.domain for c in self.capabilities}),
                "capabilities": [{"id": c.id, "domain": c.domain, "label": c.label, "access": c.access} for c in self.capabilities],
                "reads": sorted(self.reads), "writes": sorted(self.writes), "apps": list(self.apps)}


_registry: dict[str, Connector] = {}
_checks: dict[str, dict[str, Any]] = {}  # connector id → the last live check (state, detail, at)


def register(c: Connector) -> Connector:
    if c.id in _registry:
        raise ValueError(f"connecteur {c.id} déjà déclaré")
    unknown = {cap.domain for cap in c.capabilities} - DOMAINS.keys()
    if unknown:
        raise ValueError(f"domaine inconnu pour {c.id} : {', '.join(sorted(unknown))}")
    missing = {cap.op for cap in c.capabilities if cap.op} - c.reads.keys()
    if missing:
        raise ValueError(f"opération non implémentée pour {c.id} : {', '.join(sorted(missing))}")
    _registry[c.id] = c
    return c


def get(cid: str) -> Connector:
    try:
        return _registry[cid]
    except KeyError:
        raise LookupError(f"intégration inconnue : {cid}") from None


def all_connectors() -> list[Connector]:
    return list(_registry.values())


def state_of(c: Connector, err: Exception) -> str:
    """The state a provider's error means: from the HTTP code behind it when there is one, else a configuration error."""
    code = getattr(err.__cause__, "code", None)
    text = str(err)
    if code == 401 or "invalide" in text or "révoqué" in text or "refusé" in text and "accès" not in text:
        return "invalid"
    if code == 403 or "droit" in text or "accès refusé" in text:
        return "insufficient"
    if "injoignable" in text:
        return "unreachable"
    return "error"


def expired(st: dict[str, Any]) -> bool:
    try:
        return bool(st.get("expires")) and date.fromisoformat(str(st["expires"])[:10]) < date.today()
    except ValueError:
        return False


def connection(c: Connector) -> dict[str, Any]:
    """The state of the user's connection to c, as the page may see it: never a secret."""
    try:
        st = c.status()
    except c.error as err:
        return {"id": c.id, "state": "error", "detail": str(err), "account": "", "apps": list(c.apps)}
    if not st.get("configured"):
        return {"id": c.id, "state": "not_configured", "detail": STATES["not_configured"], "account": "", "apps": list(c.apps)}
    state, detail = ("expired", STATES["expired"]) if expired(st) else ("connected", STATES["connected"])
    # the saved values of the non-secret fields (an address, an organisation, a channel), to prefill the form
    settings = {k: ", ".join(map(str, st[k])) if isinstance(st[k], list) else str(st[k])
                for k, f in c.fields().items() if f.kind != "secret" and st.get(k) not in (None, "", [])}
    last = _checks.get(c.id)
    if last and state == "connected" and last["state"] != "connected":
        state, detail = last["state"], last["detail"]
    return {"id": c.id, "state": state, "detail": detail, "account": c.account(st), "expires": st.get("expires", ""),
            "scopes": st.get("scopes", []), "checked": last["at"] if last else 0, "apps": list(c.apps), "settings": settings}


def check(cid: str) -> dict[str, Any]:
    """A live call with the saved credentials: connected, or why not (invalid, expired, insufficient, unreachable)."""
    c = get(cid)
    if not c.status().get("configured"):
        _checks.pop(cid, None)
        return connection(c)
    try:
        c.verify()
        _checks[cid] = {"state": "connected", "detail": STATES["connected"], "at": time.time()}
    except c.error as err:
        state = state_of(c, err)
        _checks[cid] = {"state": state, "detail": str(err) or STATES[state], "at": time.time()}
    return connection(c)


def configure(cid: str, values: Any) -> dict[str, Any]:
    """Saves the values of c's declared fields (others dropped, all as short strings) and checks them; raises the
    provider's error with a readable reason."""
    c = get(cid)
    declared = c.fields()
    clean = {k: str(v)[:2000].strip() for k, v in (values if isinstance(values, dict) else {}).items() if k in declared and isinstance(v, (str, int, float))}
    c.save(clean)
    _checks[cid] = {"state": "connected", "detail": STATES["connected"], "at": time.time()}
    return connection(c)


def disconnect(cid: str) -> dict[str, Any]:
    c = get(cid)
    c.forget()
    _checks.pop(cid, None)
    return connection(c)


def run(cid: str, op: str, params: Any = None) -> Any:
    """One declared read operation of a connector (a generated app's data). Anything not declared is refused."""
    c = get(cid)
    fn = c.reads.get(op)
    if fn is None:
        raise PermissionError(f"opération non autorisée pour {c.name} : {op}")
    if not c.status().get("configured"):
        raise PermissionError(f"{c.name} n'est pas relié")
    p = {str(k)[:40]: str(v)[:200] for k, v in (params if isinstance(params, dict) else {}).items() if isinstance(v, (str, int, float))}
    return fn(p)


def catalogue() -> dict[str, Any]:
    return {"domains": DOMAINS, "states": STATES, "connectors": [c.public() for c in _registry.values()]}


def connections() -> dict[str, Any]:
    return {"connections": [connection(c) for c in _registry.values()]}


def safe(fn: Callable[[], Any]) -> tuple[int, Any]:
    """(HTTP code, body) for the routes: a provider's error is a readable message, a refused op a 403."""
    try:
        return 200, fn()
    except PermissionError as err:
        return 403, {"error": str(err)}
    except LookupError as err:
        return 404, {"error": str(err)}
    except (gitlab.GitLabError, sentry.SentryError, slack.SlackError) as err:
        return 400, {"error": str(err)}


# ---------- the first connectors: the providers ChiefOS already reads ----------

def _gitlab_save(v: dict[str, str]) -> dict[str, Any]:
    return gitlab.save(v.get("url", ""), v.get("token", ""))


def _gitlab_verify() -> Any:
    conf = gitlab.load()
    return gitlab.api(conf, "/user")


def _num(p: dict[str, str], key: str) -> int:
    v = p.get(key, "")
    if not v.isdigit():
        raise PermissionError(f"paramètre {key} attendu (nombre)")
    return int(v)


register(Connector(
    id="gitlab", name="GitLab", icon="🦊", description="Merge requests, reviews, pipelines et livraisons, en lecture seule.",
    auth=(AuthMethod("pat", "Jeton d'accès personnel", (
        Field("url", "Adresse", "url", True, "https://gitlab.com ou https://gitlab.mon-entreprise.fr"),
        Field("token", "Jeton personnel", "secret", True, "glpat-…", "Un jeton qui peut écrire est refusé."),
    ), ("read_api",), "{url}/-/user_settings/personal_access_tokens?name=Agent%20Office&scopes=read_api"),),
    capabilities=(
        Capability("code.merge_requests", "code", "Merge requests (les miennes, à relire, assignées)", op="merge_requests"),
        Capability("code.review", "code", "Discussions et diff d'une MR", op="merge_request"),
        Capability("delivery.pipelines", "delivery", "Pipelines rouges et log du job en échec", op="failing_pipelines"),
        Capability("delivery.jobs", "delivery", "Log d'un job", op="job_log"),
        Capability("delivery.deployments", "delivery", "Livraisons : MR fusionnée → tag → environnement"),
    ),
    status=gitlab.status, save=_gitlab_save, forget=gitlab.forget, verify=_gitlab_verify, error=gitlab.GitLabError,
    reads={"merge_requests": lambda p: gitlab.my_mrs(), "failing_pipelines": lambda p: gitlab.failing_pipelines(),
           "merge_request": lambda p: gitlab.mr_detail(_num(p, "project"), _num(p, "iid")),
           "job_log": lambda p: gitlab.job_log(_num(p, "project"), _num(p, "job"))},
    apps=("codehome", "gitlab", "mr", "pipes", "deliveries"),
    account=lambda st: f"@{st.get('user', '')} · {st.get('url', '')}",
))


def _sentry_save(v: dict[str, str]) -> dict[str, Any]:
    return sentry.save(v.get("url", ""), v.get("token", ""), v.get("org", ""), v.get("environments", ""), v.get("grafana", ""))


def _sentry_verify() -> Any:
    return sentry.api(sentry.load(), "/organizations/")


register(Connector(
    id="sentry", name="Sentry", icon="🐞", description="Erreurs de production par projet et environnement, pics et régressions après une mise en prod.",
    auth=(AuthMethod("api_token", "Jeton d'API", (
        Field("url", "Adresse", "url", False, "https://sentry.io"),
        Field("token", "Jeton", "secret", True, "sntrys_…"),
        Field("org", "Organisation", "text", False, "trouvée seule s'il n'y en a qu'une"),
        Field("environments", "Environnements suivis", "list", False, "production, staging"),
        Field("grafana", "Grafana (optionnel)", "url", False, "https://grafana.mon-entreprise.fr",
              "Avant une analyse, si tu coches la case dans 🐞 Erreurs, une session Claude Haiku lit Grafana en lecture seule dans ton Chrome "
              "(déjà connecté) : n'active la case que si tu acceptes qu'un agent lise ces pages pour toi."),
    ), ("org:read", "project:read", "event:read"), "{url}/settings/account/api/auth-tokens/"),),
    capabilities=(
        Capability("monitoring.issues", "monitoring", "Erreurs non résolues du jour, par projet et environnement", op="dashboard"),
        Capability("monitoring.alerts", "monitoring", "Alertes : pic, nouvelle erreur, erreurs après une mise en prod", op="alerts"),
        Capability("analytics.errors", "analytics", "Évolution des erreurs heure par heure"),
    ),
    status=sentry.status, save=_sentry_save, forget=sentry.forget, verify=_sentry_verify, error=sentry.SentryError,
    reads={"dashboard": lambda p: sentry.dashboard(), "alerts": lambda p: sentry.check()},
    apps=("errors",),
    account=lambda st: f"{st.get('org', '')} · {st.get('url', '')}",
))


def _slack_save(v: dict[str, str]) -> dict[str, Any]:
    return slack.save(v.get("token", ""), v.get("channel", ""))


def _slack_verify() -> Any:
    return slack.api(slack.load().get("token", ""), "auth.test")


register(Connector(
    id="slack", name="Slack", icon="💬", description="Les messages d'un channel (support), leurs fils et réactions, en lecture seule.",
    auth=(AuthMethod("bot_token", "Token de bot", (
        Field("token", "Token du bot", "secret", True, "xoxb-…"),
        Field("channel", "Channel", "text", True, "#support ou C0123…"),
    ), ("channels:history", "channels:read", "users:read"), "https://api.slack.com/apps"),),
    capabilities=(Capability("communication.channel", "communication", "Derniers messages d'un channel, fils et réactions", op="messages"),),
    status=slack.status, save=_slack_save, forget=slack.forget, verify=_slack_verify, error=slack.SlackError,
    reads={"messages": lambda p: slack.messages()},
    apps=("support",),
    account=lambda st: f"#{st.get('channel', '')} · {st.get('team', '')}",
))
