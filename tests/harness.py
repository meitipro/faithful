"""
Loads the REAL contract file against the doubles in genvm_double.py.

Nothing is copied or re-implemented here, so a change to contracts/faithful.py
is a change to what these tests exercise. The runner comment on the first lines
of the contract is ignored by CPython, so the file imports as ordinary Python.
"""

from __future__ import annotations

import datetime
import importlib.util
import json
import os
import pathlib
import sys
import types

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
#: FAITHFUL_CONTRACT points the suite at a mutant; scripts/mutate.py sets it.
CONTRACT = pathlib.Path(os.environ.get("FAITHFUL_CONTRACT") or ROOT / "contracts" / "faithful.py")

sys.path.insert(0, str(HERE))

import genvm_double as D  # noqa: E402

GEN = 10**18
HOUR = 3600
RATE = 12 * GEN

#: 2026-10-01T00:00:00Z. Every world starts here.
T0 = 1790812800


def _install(gl: D.GL) -> None:
    """
    Publish a `genlayer` package shaped like py-genlayer:5jycge4q (Studio Next):
    the star import brings Address and the integer types, `import genlayer as gl`
    is the package itself, and the storage names live in genlayer.storage. An
    import the contract left out fails here rather than on chain.
    """
    storage = types.ModuleType("genlayer.storage")
    storage.TreeMap = D.TreeMap
    storage.DynArray = D.DynArray
    storage.allow = D.allow_storage
    module = types.ModuleType("genlayer")
    module.Address = D.Address
    for name in ("u8", "u16", "u32", "u64", "u256"):
        setattr(module, name, getattr(D, name))
    for name in ("contract", "vm", "message", "public", "nondet", "evm"):
        setattr(module, name, getattr(gl, name))
    module.storage = storage
    module.__all__ = ["Address", "u8", "u16", "u32", "u64", "u256"]
    sys.modules["genlayer"] = module
    sys.modules["genlayer.storage"] = storage


def load(gl: D.GL, path: pathlib.Path | None = None, name: str = "faithful_contract") -> types.ModuleType:
    """Import the contract fresh against this gl."""
    _install(gl)
    spec = importlib.util.spec_from_file_location(name, path or CONTRACT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def answer(verdict: str, reason: str = "") -> str:
    """A model answer, as the model would type it."""
    return json.dumps({"verdict": verdict, "reason": reason or f"The translation is {verdict.lower()}."})


WARNING = "Never share your recovery phrase. Anyone who has it can move your funds."
WARNING_FA = "هرگز عبارت بازیابی خود را با کسی به اشتراک نگذارید. هر کسی که آن را داشته باشد می‌تواند دارایی‌های شما را جابه‌جا کند."
WARNING_ES = "Nunca compartas tu frase de recuperación. Cualquiera que la tenga puede mover tus fondos."
FEE = "The fee is 10 GEN."
FEE_DE = "Die Gebühr beträgt 10 GEN."
FEE_DE_WRONG = "Die Gebühr beträgt 100 GEN."
GLOSSARY = {"recovery phrase": {"fa": "عبارت بازیابی", "es": "frase de recuperación"}, "Intelligent Contract": "keep"}


class World:
    """
    One Faithful contract and the accounts around it.

    Time is explicit: `at(seconds)` sets the transaction datetime the contract
    reads, because nothing on chain moves the clock on its own and the 48-hour
    claim is one of the things these tests most need to control.
    """

    MAINTAINER = "0x" + "0e" * 20
    SARA = "0x" + "a1" * 20
    DIEGO = "0x" + "a2" * 20
    LENA = "0x" + "a3" * 20
    OMID = "0x" + "a4" * 20
    SPONSOR = "0x" + "5b" * 20
    STRANGER = "0x" + "d4" * 20

    def __init__(self) -> None:
        self.gl = D.GL()
        self.mod = load(self.gl)
        self.at(T0)
        self.sender(self.MAINTAINER)
        self.c = self.mod.Faithful()

    # -- controls ----------------------------------------------------------

    def at(self, seconds: int) -> "World":
        self.t = int(seconds)
        stamp = datetime.datetime.fromtimestamp(self.t, datetime.timezone.utc)
        self.gl.message.raw["datetime"] = stamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        return self

    def advance(self, seconds: int) -> "World":
        return self.at(self.t + seconds)

    def sender(self, address: str, value: int = 0) -> "World":
        self.gl.message.sender_address = D.Address(address)
        self.gl.message.origin_address = D.Address(address)
        self.gl.message.value = int(value)
        return self

    @property
    def leader(self) -> D.NodeWorld:
        return self.gl.nondet.leader

    @property
    def validators(self) -> list[D.NodeWorld]:
        return self.gl.nondet.validators

    # -- shorthands --------------------------------------------------------

    def create(self, name="GenLayer docs, community translations", src="en", langs=None, glossary=None,
               rate: int = RATE, value: int = 10 * RATE, who=None) -> int:
        self.sender(who or self.MAINTAINER, value)
        try:
            return int(
                self.c.create_program(
                    name,
                    src,
                    list(langs if langs is not None else ["fa", "es", "de"]),
                    glossary if isinstance(glossary, str) else json.dumps(glossary if glossary is not None else GLOSSARY),
                    rate,
                )
            )
        finally:
            self.sender(who or self.MAINTAINER)

    def fund(self, value: int, pid: int = 1, who=None) -> int:
        self.sender(who or self.SPONSOR, value)
        try:
            return int(self.c.fund(pid))
        finally:
            self.sender(who or self.SPONSOR)

    def add(self, texts=None, pid: int = 1, who=None) -> int:
        self.sender(who or self.MAINTAINER)
        payload = texts if texts is not None else [WARNING, FEE]
        return int(self.c.add_sections(pid, payload if isinstance(payload, str) else json.dumps(payload)))

    def claim(self, who: str, section: int = 1, lang: str = "fa") -> int:
        self.sender(who)
        return int(self.c.claim(section, lang))

    def submit(self, who: str, text: str, section: int = 1, lang: str = "fa") -> int:
        self.sender(who)
        return int(self.c.submit(section, lang, text))

    def queue(self, verdict: str, validator_verdict=None, reason: str = "") -> None:
        """One model answer for the leader and one for each validator."""
        self.leader.answers.append(answer(verdict, reason))
        for world in self.validators:
            world.answers.append(answer(validator_verdict or verdict, reason))

    def judge(self, sub: int, verdict: str | None = "FAITHFUL", who=None, validator_verdict=None, reason: str = "") -> str:
        if verdict is not None:
            self.queue(verdict, validator_verdict, reason)
        self.sender(who or self.STRANGER)
        return str(self.c.judge(sub))

    def translate(self, who: str, text: str, verdict: str = "FAITHFUL", section: int = 1, lang: str = "fa") -> int:
        """Claim, submit and judge in one go. Returns the submission id."""
        self.claim(who, section, lang)
        sub = self.submit(who, text, section, lang)
        self.judge(sub, verdict)
        return sub

    def withdraw(self, who: str) -> int:
        self.sender(who)
        return int(self.c.withdraw())

    def close(self, pid: int = 1, who=None) -> int:
        self.sender(who or self.MAINTAINER)
        return int(self.c.close(pid))

    # -- reads -------------------------------------------------------------

    def program(self, pid: int = 1) -> dict:
        return json.loads(self.c.get_program(pid))

    def section(self, sid: int = 1) -> dict:
        return json.loads(self.c.get_section(sid))

    def slot(self, sid: int = 1, lang: str = "fa") -> dict:
        return next(row for row in self.section(sid)["langs"] if row["lang"] == lang)

    def board(self, pid: int = 1, lang: str = "", status: str = "", offset: int = 0, limit: int = 50) -> dict:
        return json.loads(self.c.list_sections(pid, lang, status, offset, limit))

    def export(self, pid: int = 1, lang: str = "fa") -> dict:
        return json.loads(self.c.export(pid, lang))

    def subs(self, translator: str = "", offset: int = 0, limit: int = 50) -> dict:
        return json.loads(self.c.list_submissions(translator, offset, limit))

    def paid_to(self, address: str) -> int:
        return sum(t.value for t in self.gl.bus.transfers if t.to.lower() == address.lower())

    def paid_out(self) -> int:
        return sum(t.value for t in self.gl.bus.transfers)


def refused(prefix: str, fn, *args, **kwargs) -> str:
    """Assert the call is refused, and that the refusal is the sentence it should be."""
    try:
        fn(*args, **kwargs)
    except D.UserError as error:
        message = str(error)
        assert message.startswith("[EXPECTED] "), f"unprefixed refusal: {message}"
        assert prefix in message, f"expected {prefix!r}, got {message!r}"
        return message
    raise AssertionError(f"expected a refusal containing {prefix!r}, nothing was raised")
