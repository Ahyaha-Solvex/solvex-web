"""Run a Python file inside the live Blender session through the Blender Lab add-on.

Usage: python blender/mcp_run.py blender/build_box.py
The script must assign a dict to `result` to report anything back.
"""
import json
import socket
import sys
from pathlib import Path

HOST, PORT = "localhost", 9876


def run(code: str, timeout: float = 280.0) -> dict:
    request = json.dumps({"type": "execute", "code": code, "strict_json": False}) + "\0"
    with socket.create_connection((HOST, PORT), timeout=10) as sock:
        sock.settimeout(timeout)
        sock.sendall(request.encode("utf-8"))
        buf = bytearray()
        while b"\0" not in buf:
            chunk = sock.recv(65536)
            if not chunk:
                break
            buf.extend(chunk)
    return json.loads(bytes(buf).split(b"\0")[0].decode("utf-8"))


if __name__ == "__main__":
    response = run(Path(sys.argv[1]).read_text(encoding="utf-8"))
    print(json.dumps(response, indent=2)[:6000])
    sys.exit(0 if response.get("status") == "ok" else 1)
