"""
Read a program's pool and progress from Python, with genlayer-py 0.19.0rc2.

    python web/examples/read_program.py <program id>

genlayer-py reads through an account even for views, so a throwaway one is
made here; it is never funded and never signs. This file is the Python sample
on the docs page "Start a program", copied in by scripts/gen_docs.py.
"""

import json
import sys

from genlayer_py import create_account, create_client
from genlayer_py.chains import studio_devnet

FAITHFUL = "0x3762367564e2849380A761539E833D0A930D6e8f"
studio_devnet.rpc_urls = {"default": {"http": ["https://studio-next.genlayer.com/api"]}}

reader = create_account()
client = create_client(chain=studio_devnet, account=reader)
program_id = int(sys.argv[1] if len(sys.argv) > 1 else 1)
p = json.loads(client.read_contract(address=FAITHFUL, function_name="get_program", args=[program_id], account=reader))

if not p["found"]:
    raise SystemExit("no such program")
print(json.dumps({
    "name": p["name"],
    "rate_gen": int(p["rate"]) / 10**18,
    "pool_gen": int(p["pool"]) / 10**18,
    "payable_sections": p["payable_sections"],
    "approved": {row["code"]: f'{row["approved"]}/{p["sections"]}' for row in p["langs"]},
}, ensure_ascii=False))
