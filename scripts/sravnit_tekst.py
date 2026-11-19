#!/usr/bin/env python3
"""Сравнение сохранённого текста документа с новой выгрузкой.

Использование:
    python3 scripts/sravnit_tekst.py docs/fas-teksty/prikaz-821-23.txt новый_файл.docx
    python3 scripts/sravnit_tekst.py --hash docs/fas-teksty/*.txt

Новый файл может быть .docx (выгрузка из КонсультантПлюс кнопкой «Сохранить в Word»)
или .txt. Служебные строки КонсультантПлюс и шапка файла проекта не учитываются.
Печатает различия по абзацам и контрольную сумму нормализованного текста.
Код выхода: 0 — текст совпадает, 2 — есть различия.
"""
import difflib
import hashlib
import pathlib
import re
import sys
import zipfile
from xml.etree import ElementTree

SLUZHEBNOE = (
    "консультантплюс",
    "consultant.ru",
    "дата сохранения",
    "документ предоставлен",
    "текст приложен для сверки",
    "источник: консультантплюс",
    "при расхождении верен текст",
)

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def chitat_docx(path):
    with zipfile.ZipFile(path) as z:
        root = ElementTree.fromstring(z.read("word/document.xml"))
    abzacy = []
    for p in root.iter(W + "p"):
        abzacy.append("".join(t.text or "" for t in p.iter(W + "t")))
    return abzacy


def chitat(path):
    path = pathlib.Path(path)
    if path.suffix.lower() == ".docx":
        stroki = chitat_docx(path)
    else:
        stroki = path.read_text(encoding="utf-8").splitlines()
    return normalizovat(stroki)


def normalizovat(stroki):
    tekst = "\n".join(stroki)
    # Тело документа начинается с наименования органа.
    for nachalo in ("ФЕДЕРАЛЬНАЯ АНТИМОНОПОЛЬНАЯ СЛУЖБА", "ПРАВИТЕЛЬСТВО РОССИЙСКОЙ ФЕДЕРАЦИИ",
                    "ФЕДЕРАЛЬНАЯ СЛУЖБА", "МИНИСТЕРСТВО"):
        i = tekst.find(nachalo)
        if i != -1:
            tekst = tekst[i:]
            break
    abzacy = []
    for s in tekst.splitlines():
        s = re.sub(r"\s+", " ", s.replace(" ", " ")).strip()
        if not s or set(s) <= set("-_= "):
            continue
        if any(m in s.lower() for m in SLUZHEBNOE):
            continue
        abzacy.append(s)
    return abzacy


def summa(abzacy):
    return hashlib.sha256("\n".join(abzacy).encode("utf-8")).hexdigest()


def main(argv):
    if len(argv) >= 2 and argv[0] == "--hash":
        for p in argv[1:]:
            print(f"{summa(chitat(p))}  {p}")
        return 0
    if len(argv) != 2:
        print(__doc__)
        return 1
    staryi, novyi = chitat(argv[0]), chitat(argv[1])
    print(f"сохранённый: {summa(staryi)}  {argv[0]}")
    print(f"новый:       {summa(novyi)}  {argv[1]}")
    if staryi == novyi:
        print("Текст не изменился.")
        return 0
    diff = list(difflib.unified_diff(staryi, novyi, "сохранённый", "новый", lineterm="", n=1))
    izm = sum(1 for d in diff if d[:1] in "+-" and not d.startswith(("+++", "---")))
    print(f"Есть различия: {izm} изменённых абзацев.\n")
    print("\n".join(diff))
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
