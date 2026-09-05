import hashlib
import math
import re


EMBEDDING_DIMENSION = 384


def embed_text(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSION

    words = re.findall(r"\b\w+\b", text.lower())

    if not words:
        return vector

    for word in words:
        digest = hashlib.sha256(word.encode("utf-8")).digest()

        index = int.from_bytes(digest[:4], "little") % EMBEDDING_DIMENSION
        sign = 1.0 if digest[4] % 2 == 0 else -1.0

        vector[index] += sign

    magnitude = math.sqrt(sum(value * value for value in vector))

    if magnitude > 0:
        vector = [value / magnitude for value in vector]

    return vector