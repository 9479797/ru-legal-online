#!/usr/bin/env python3
"""Check SHA-256 checksums listed in docs/reestr-dokumentov.md.

The registry has two explicit historical checksum formats:
- docs/fas-teksty: SHA-256 of text normalized by sravnit_tekst.py.
- docs/normy-teksty: SHA-256 of the original archived UTF-8 file.

Unlike sravnit_tekst.py --hash, this test FAILS if a referenced source
has disappeared, differs from its registered checksum, or has no checksum.
A matching hash is only an integrity check, NOT a legal-currency check.
"""
from __future__ import annotations

import hashlib
import pathlib
import re
import sys

from sravnit_tekst import chitat, summa

ROOT = pathlib.Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "docs" / "reestr-dokumentov.md"
PATH_RE = re.compile(r"docs/(?:fas-teksty|normy-teksty)/[A-Za-z0-9_.-]+\.txt")
HASH_RE = re.compile(r"(?<![0-9A-Fa-f])[0-9a-fA-F]{64}(?![0-9A-Fa-f])")


def verify(root: pathlib.Path, registry: pathlib.Path) -> tuple[int, list[str]]:
    errors: list[str] = []
    records: dict[str, tuple[str, int]] = {}
    try:
        lines = registry.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        return 0, [f"Не удалось прочитать реестр {registry}: {exc}"]

    for lineno, line in enumerate(lines, start=1):
        # Registered full texts are either Markdown rows with "текст есть",
        # or a reference to a file with inline "sha256: ...".
        if "текст есть" not in line.lower() and "sha256" not in line.lower():
            continue
        paths = PATH_RE.findall(line)
        if not paths:
            if line.lstrip().startswith("|") and "текст есть" in line.lower():
                errors.append(f"{registry.name}:{lineno}: «текст есть» без пути к .txt")
            continue
        hashes = HASH_RE.findall(line)
        if len(hashes) != 1:
            errors.append(f"{registry.name}:{lineno}: ожидается одна сумма SHA-256; найдено {len(hashes)}")
            continue
        for path in paths:
            if path in records:
                errors.append(f"{registry.name}:{lineno}: повтор файла {path}; первое упоминание — строка {records[path][1]}")
            else:
                records[path] = hashes[0].lower(), lineno

    if not records:
        errors.append(f"{registry.name}: нет ни одного полного текста с зарегистрированной суммой")

    for relpath, (expected, lineno) in sorted(records.items()):
        source = root / relpath
        if not source.is_file():
            errors.append(f"{registry.name}:{lineno}: отсутствует {relpath}")
            continue
        try:
            if relpath.startswith("docs/normy-teksty/"):
                # The norms archive recorded raw-file SHA-256; see docs/sverka-norm-2026-11-20.md.
                actual = hashlib.sha256(source.read_bytes()).hexdigest()
            else:
                # FAS register checksums refer to normalized legal text.
                actual = summa(chitat(source))
        except (OSError, UnicodeError, ValueError) as exc:
            errors.append(f"{relpath}: ошибка чтения/нормализации: {exc}")
            continue
        if actual != expected:
            errors.append(f"{relpath}: НЕСОВПАДЕНИЕ на строке {lineno}: реестр={expected}, фактически={actual}")
        else:
            mode = "sha256 файла" if relpath.startswith("docs/normy-teksty/") else "sha256 нормализованного текста"
            print(f"OK {relpath} ({mode}): {actual}")
    return len(records), errors


def main() -> int:
    count, errors = verify(ROOT, REGISTRY)
    if errors:
        print(f"Проверка контрольных сумм: найдено записей {count}, ошибок {len(errors)}", file=sys.stderr)
        for error in errors:
            print(" - " + error, file=sys.stderr)
        return 1
    print(f"Проверка контрольных сумм: {count} зарегистрированных текстов совпадают.")
    print("Это НЕ подтверждает актуальность нормативных актов; она проверяется отдельно.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
