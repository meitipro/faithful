#!/usr/bin/env python3
"""
Seed one program from Faithful's own docs, in three languages, with real actions.

    python scripts/seed.py

The sections are passages of the docs in web/content/docs, copied verbatim (a
test checks each one still appears there). The translations into Persian,
Spanish and German were written for this seed by the build agent, the way a
community translator would, and every verdict below is the validators'.

The run walks the demo of section 9 of the build spec, on chain:
  - a Persian translation with a changed number is refused by the exact checks,
    fixed, and judged;
  - a Persian translation that softens a warning is judged, revised, and judged
    again;
  - the other translations are claimed, submitted and judged once;
  - the Persian translator withdraws their balance.
Some sections are left open in some languages on purpose, so a reviewer can
claim one.

Every step is written to docs/seed.studio-next.json before it is printed, and
a second run resumes without sending anything twice. A verdict is recorded as
it came out; nothing is retried except a round that produced no verdict.
"""

from __future__ import annotations

import datetime
import json
import pathlib
import sys

import chain as C

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RECORD = C.ROOT / "docs" / "seed.studio-next.json"
LOG = C.ROOT / "docs" / "seed.studio-next.log"

NAME = "Faithful docs, community translations"
GLOSSARY = {
    "recovery phrase": {"fa": "عبارت بازیابی", "es": "frase de recuperación", "de": "Wiederherstellungsphrase"},
    "claim": {"fa": "رزرو", "es": "reserva", "de": "Reservierung"},
    "Studio Next": "keep",
    "WRONG LANGUAGE": "keep",
}
RATE_GEN = 12
FUNDING_GEN = 240

#: (key, title, docs page it is copied from, source text)
SECTIONS = [
    (
        "claims",
        "Claims",
        "web/content/docs/concepts/programs-sections-and-claims.mdx",
        "## Claims\n\n"
        "- `claim(section_id, lang)` locks one section in one language for 48 hours and reserves one rate from the pool.\n"
        "- A translator holds at most three live claims at once.\n"
        "- A claim that is not submitted in time reopens the section. The contract has no clock of its own, so an expired\n"
        "  claim is released by the next claim or close that touches it; the site already shows it as open.\n"
        "- A submission waiting for the judge never expires. Anyone can call `judge` on it, so a translator who stops after\n"
        "  submitting cannot block the maintainer from closing.",
    ),
    (
        "warning",
        "Never paste a private key into a translation",
        "web/content/docs/quickstart.mdx",
        "Never paste a private key or recovery phrase into a translation. Everything you submit is stored on chain, where anyone can read it.",
    ),
    (
        "network",
        "Which network?",
        "web/content/docs/more/faq.mdx",
        "### Which network?\n\nGenLayer Studio Next, chain 61997. See [Addresses and network](/docs/reference/addresses).",
    ),
    (
        "wrong",
        "WRONG LANGUAGE",
        "web/content/docs/concepts/verdicts-and-revisions.mdx",
        "## WRONG LANGUAGE\n\nThe text is not in the target language, or is not a translation of the source. The claim is released at once.",
    ),
]

FA_CLAIMS = (
    "## رزروها\n\n"
    "- `claim(section_id, lang)` یک بخش را در یک زبان به مدت ۴۸ ساعت قفل می‌کند و نرخ یک بخش را از صندوق کنار می‌گذارد.\n"
    "- هر مترجم در هر لحظه حداکثر سه رزرو فعال دارد.\n"
    "- رزروی که به‌موقع ارسال نشود، بخش را دوباره باز می‌کند. قرارداد ساعت مستقلی ندارد، بنابراین رزرو منقضی‌شده با نخستین رزرو یا بستنی که به آن برسد آزاد می‌شود؛ سایت آن را از همان لحظه باز نشان می‌دهد.\n"
    "- ارسالی که منتظر داور است هرگز منقضی نمی‌شود. هر کسی می‌تواند `judge` را برای آن فراخوانی کند، بنابراین مترجمی که پس از ارسال کنار بکشد نمی‌تواند مانع بستن برنامه توسط نگهدارنده شود."
)
ES_CLAIMS = (
    "## Reservas\n\n"
    "- `claim(section_id, lang)` bloquea una sección en un idioma durante 48 horas y reserva una tarifa del fondo.\n"
    "- Cada traductor tiene como máximo tres reservas activas a la vez.\n"
    "- Una reserva que no se envía a tiempo vuelve a abrir la sección. El contrato no tiene reloj propio, así que una reserva vencida se libera con la siguiente reserva o cierre que la toque; el sitio ya la muestra como abierta.\n"
    "- Un envío que espera al juez nunca vence. Cualquiera puede llamar a `judge` sobre él, así que un traductor que se detiene después de enviar no puede impedir que el mantenedor cierre el programa."
)

#: (step key, translator, section key, lang, text, what the step demonstrates)
STEPS = [
    ("network-fa-1", "seed_translator_fa", "network", "fa",
     "### کدام شبکه؟\n\nGenLayer Studio Next، زنجیره‌ی ۶۱۹۹۸. [نشانی‌ها و شبکه](/docs/reference/addresses) را ببینید.",
     "a changed number, refused by the exact checks"),
    ("network-fa-2", "seed_translator_fa", "network", "fa",
     "### کدام شبکه؟\n\nGenLayer Studio Next، زنجیره‌ی ۶۱۹۹۷. [نشانی‌ها و شبکه](/docs/reference/addresses) را ببینید.",
     "the number fixed, in Persian digits"),
    ("warning-fa-1", "seed_translator_fa", "warning", "fa",
     "بهتر است کلید خصوصی یا عبارت بازیابی را در ترجمه قرار ندهید. هر چیزی که ارسال می‌کنید روی زنجیره ذخیره می‌شود.",
     "a softened warning with its last clause dropped"),
    ("warning-fa-2", "seed_translator_fa", "warning", "fa",
     "هرگز کلید خصوصی یا عبارت بازیابی را در ترجمه قرار ندهید. هر چیزی که ارسال می‌کنید روی زنجیره ذخیره می‌شود، جایی که همه می‌توانند آن را بخوانند.",
     "the revision"),
    ("claims-fa", "seed_translator_fa", "claims", "fa", FA_CLAIMS, "a list with inline code and a number"),
    # Added after claims-fa came back FLAWED on its first run: the judge's reason
    # named "the rate of one section" and the word for the pool. The one revision
    # the claim allows, written from that reason.
    ("claims-fa-2", "seed_translator_fa", "claims", "fa",
     FA_CLAIMS.replace("و نرخ یک بخش را از صندوق کنار می‌گذارد", "و یک نرخ را از استخر (pool) کنار می‌گذارد"),
     "the revision the judge's reason asked for"),
    ("wrong-fa", "seed_translator_fa", "wrong", "fa",
     "## WRONG LANGUAGE\n\nمتن به زبان مقصد نیست، یا ترجمه‌ی متن مبدأ نیست. رزرو بی‌درنگ آزاد می‌شود.",
     "a kept term"),
    ("claims-es", "seed_translator_es", "claims", "es", ES_CLAIMS, "a list with inline code and a number"),
    # Added after claims-es came back FLAWED on its first run: the judge named the
    # added words "el programa". The one revision, without them.
    ("claims-es-2", "seed_translator_es", "claims", "es",
     ES_CLAIMS.replace("impedir que el mantenedor cierre el programa.", "impedir que el mantenedor cierre."),
     "the revision the judge's reason asked for"),
    ("warning-es", "seed_translator_es", "warning", "es",
     "Nunca pegues una clave privada ni una frase de recuperación en una traducción. Todo lo que envías se guarda en la cadena, donde cualquiera puede leerlo.",
     "the warning"),
    ("wrong-es", "seed_translator_es", "wrong", "es",
     "## WRONG LANGUAGE\n\nEl texto no está en el idioma de destino, o no es una traducción del original. La reserva se libera de inmediato.",
     "a kept term"),
    ("network-de", "seed_translator_de", "network", "de",
     "### Welches Netzwerk?\n\nGenLayer Studio Next, Chain 61997. Siehe [Adressen und Netzwerk](/docs/reference/addresses).",
     "a link kept"),
]

PEOPLE = ["seed_maintainer", "seed_translator_fa", "seed_translator_es", "seed_translator_de"]


def now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load() -> dict:
    return json.loads(RECORD.read_text(encoding="utf-8")) if RECORD.exists() else {"steps": {}}


def save(record: dict) -> None:
    RECORD.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def say(line: str) -> None:
    with LOG.open("a", encoding="utf-8", newline="\n") as f:
        f.write(line + "\n")
    print(line)


def must(outcome: dict, what: str) -> dict:
    if not outcome["ok"]:
        raise SystemExit(f"{what} failed: {outcome['detail']}  {C.EXPLORER}/tx/{outcome['hash']}")
    return outcome


def main() -> int:
    address = C.address()
    people = C.accounts(*PEOPLE)
    chains = {name: C.Chain(people[name]) for name in PEOPLE}
    record = load()
    record.update({"contract": address, "network": C.NETWORK, "explorer": C.EXPLORER, "accounts": {n: people[n].address for n in PEOPLE}})
    save(record)
    maintainer = chains["seed_maintainer"]
    maintainer.ensure(people["seed_maintainer"].address, minimum_gen=FUNDING_GEN + 50, top_up_gen=1000)
    for name in PEOPLE[1:]:
        chains[name].ensure(people[name].address, minimum_gen=20)

    if "program_id" not in record:
        before = maintainer.read_json(address, "get_program", [0])["programs"]
        args = [NAME, "en", ["fa", "es", "de"], json.dumps(GLOSSARY, ensure_ascii=False), RATE_GEN * C.GEN]
        out = must(maintainer.send(address, "create_program", args, value=FUNDING_GEN * C.GEN), "create_program")
        pid = out["result"] if isinstance(out["result"], int) else maintainer.read_json(address, "get_program", [0])["programs"]
        if pid <= before:
            raise SystemExit("create_program returned no new program")
        record.update({"program_id": int(pid), "create_tx": out["hash"], "created_at": now()})
        save(record)
        say(f"opened program {pid} with {FUNDING_GEN} GEN at {RATE_GEN} GEN a section  {C.EXPLORER}/tx/{out['hash']}")
    pid = record["program_id"]
    if "sections" not in record:
        texts = [{"title": title, "text": text} for _, title, _, text in SECTIONS]
        out = must(maintainer.send(address, "add_sections", [pid, json.dumps(texts, ensure_ascii=False)]), "add_sections")
        first = int(out["result"])
        record.update({"sections": {key: first + i for i, (key, *_rest) in enumerate(SECTIONS)}, "sections_tx": out["hash"]})
        save(record)
        say(f"added {len(texts)} sections from {first}  {C.EXPLORER}/tx/{out['hash']}")

    for key, who, section_key, lang, text, why in STEPS:
        step = record["steps"].setdefault(key, {"translator": people[who].address, "section": section_key, "lang": lang, "why": why})
        if step.get("verdict") and step["verdict"] != "PENDING":
            continue
        sid = record["sections"][section_key]
        chain = chains[who]
        view = chain.read_json(address, "get_section", [sid])
        slot = next(row for row in view["langs"] if row["lang"] == lang)
        holder = slot["translator"].lower() == people[who].address.lower() and slot["state"] in ("CLAIMED", "JUDGING")
        if not holder and "submission_id" not in step:
            out = must(chain.send(address, "claim", [sid, lang]), f"claim {key}")
            step["claim_tx"] = out["hash"]
            save(record)
            say(f"{key}: claimed section {sid} in {lang}  {C.EXPLORER}/tx/{out['hash']}")
        if "submission_id" not in step:
            out = must(chain.send(address, "submit", [sid, lang, text]), f"submit {key}")
            sub = next(s for s in chain.read_json(address, "get_section", [sid])["submissions"] if s["id"] == int(out["result"]))
            step.update({"submit_tx": out["hash"], "submission_id": sub["id"], "verdict": sub["verdict"], "problems": sub["problems"]})
            save(record)
            say(f"{key}: submitted as {sub['id']}: {sub['verdict']} {'; '.join(sub['problems'])}  {C.EXPLORER}/tx/{out['hash']}")
        if step["verdict"] == "PRECHECK_FAILED":
            continue
        out = maintainer.send(address, "judge", [step["submission_id"]])
        step.setdefault("judge_attempts", []).append({"tx": out["hash"], "ok": out["ok"], "detail": out["detail"]})
        sub = next(s for s in maintainer.read_json(address, "get_section", [sid])["submissions"] if s["id"] == step["submission_id"])
        step.update({"verdict": sub["verdict"], "reason": sub["reason"], "credited": sub["credited"]})
        if out["ok"]:
            step["judge_tx"] = out["hash"]
        save(record)
        say(f"{key}: {sub['verdict']}  {sub['reason']}  {C.EXPLORER}/tx/{out['hash']}")

    if "withdraw_tx" not in record:
        fa = chains["seed_translator_fa"]
        page = fa.read_json(address, "list_submissions", [people["seed_translator_fa"].address, 0, 1])
        if int(page["balance"]) > 0:
            out = must(fa.send(address, "withdraw", [], until="finalized"), "withdraw")
            record.update({"withdraw_tx": out["hash"], "withdrawn": page["balance"]})
            save(record)
            say(f"seed_translator_fa withdrew {int(page['balance']) / C.GEN} GEN  {C.EXPLORER}/tx/{out['hash']}")

    p = maintainer.read_json(address, "get_program", [pid])
    record["program_after"] = {k: p[k] for k in ("pool", "reserved", "paid", "funded", "payable_sections", "live_claims")} | {"approved": {r["code"]: r["approved"] for r in p["langs"]}}
    save(record)
    say(f"program {pid}: pool {int(p['pool']) / C.GEN} GEN, paid {int(p['paid']) / C.GEN} GEN, approved {record['program_after']['approved']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
