#!/usr/bin/env python3
"""Проверка навыков перед коммитом.

Проверяет каждый skills/<имя>/SKILL.md:
- есть фронтматтер с name и description;
- name совпадает с именем папки;
- description не длиннее 1024 символов;
- нет запрещённых оборотов из AGENTS.md.
Печатает число пунктов [ПРОВЕРЯТЬ] по навыкам.
Код выхода 1, если есть ошибки.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKILLS = ROOT / "skills"

ZAPRETY = [
    "разница здесь принципиальная",
    "это не признак того",
    "не тот рычаг",
    "терпеть молча",
    "важно понимать, что",
    "стоит отметить, что",
    "давайте разберёмся",
    "давайте разберемся",
]


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    data = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            data[key.strip()] = val.strip().strip('"')
    return data


def main():
    oshibki = []
    print(f"{'навык':32} [ПРОВЕРЯТЬ]")
    for path in sorted(SKILLS.glob("*/SKILL.md")):
        papka = path.parent.name
        text = path.read_text(encoding="utf-8")
        fm = frontmatter(text)
        if fm is None:
            oshibki.append(f"{papka}: нет фронтматтера")
            continue
        if fm.get("name") != papka:
            oshibki.append(f"{papka}: name «{fm.get('name')}» не совпадает с папкой")
        opis = fm.get("description", "")
        if not opis:
            oshibki.append(f"{papka}: пустое description")
        elif len(opis) > 1024:
            oshibki.append(f"{papka}: description длиннее 1024 символов")
        nizhn = text.lower()
        for z in ZAPRETY:
            if z in nizhn:
                oshibki.append(f"{papka}: запрещённый оборот «{z}»")
        print(f"{papka:32} {text.count('[ПРОВЕРЯТЬ')}")
    if oshibki:
        print("\nОшибки:")
        for o in oshibki:
            print(" -", o)
        return 1
    print("\nОшибок нет.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
