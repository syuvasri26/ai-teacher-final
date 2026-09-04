import json
import urllib.request
import urllib.error


OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"


def ask_ollama(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))

        return result["response"].strip()

    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Could not connect to Ollama at {OLLAMA_URL}: {exc}"
        ) from exc
    except (KeyError, json.JSONDecodeError) as exc:
        raise RuntimeError("Ollama returned an invalid response.") from exc
