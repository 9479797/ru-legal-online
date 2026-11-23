#!/usr/bin/env python3
"""Regression tests for checksum comparison against the registered baseline."""
import hashlib
import pathlib
import tempfile
import unittest

from proverka_kontrolnyh_summ import verify
from sravnit_tekst import chitat, summa


class RegistryChecksumTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.source = self.root / "docs/fas-teksty/example.txt"
        self.source.parent.mkdir(parents=True)
        self.source.write_text(
            "ФЕДЕРАЛЬНАЯ АНТИМОНОПОЛЬНАЯ СЛУЖБА\nПравило одно.\n",
            encoding="utf-8",
        )
        self.registry = self.root / "docs/reestr-dokumentov.md"
        self.relpath = "docs/fas-teksty/example.txt"
        self.hash = summa(chitat(self.source))
        self.write_entry(self.hash)

    def write_entry(self, hash_value):
        self.registry.write_text(
            f"| Приказ | проверка | текст есть | {self.relpath} | {hash_value} |\n",
            encoding="utf-8",
        )

    def test_matching_hash_passes(self):
        count, errors = verify(self.root, self.registry)
        self.assertEqual(count, 1)
        self.assertEqual(errors, [])

    def test_modified_source_fails(self):
        self.source.write_text(
            "ФЕДЕРАЛЬНАЯ АНТИМОНОПОЛЬНАЯ СЛУЖБА\nПравило изменено.\n",
            encoding="utf-8",
        )
        count, errors = verify(self.root, self.registry)
        self.assertEqual(count, 1)
        self.assertTrue(any("НЕСОВПАДЕНИЕ" in e for e in errors), errors)

    def test_missing_hash_fails(self):
        self.write_entry("нет суммы")
        _, errors = verify(self.root, self.registry)
        self.assertTrue(any("ожидается одна сумма" in e for e in errors), errors)

    def test_missing_source_fails(self):
        self.source.unlink()
        _, errors = verify(self.root, self.registry)
        self.assertTrue(any("отсутствует" in e for e in errors), errors)

    def test_duplicate_entry_fails(self):
        self.registry.write_text(
            self.registry.read_text(encoding="utf-8") * 2,
            encoding="utf-8",
        )
        _, errors = verify(self.root, self.registry)
        self.assertTrue(any("повтор файла" in e for e in errors), errors)

    def test_raw_archived_norms_checksum_passes(self):
        archive = self.root / "docs/normy-teksty/example.txt"
        archive.parent.mkdir(parents=True)
        archive.write_text("Первый абзац.\nВторой абзац.\n", encoding="utf-8")
        raw_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
        self.registry.write_text(
            f"| Постановление | документы | текст есть: docs/normy-teksty/example.txt, sha256 файла {raw_hash} |\n",
            encoding="utf-8",
        )
        count, errors = verify(self.root, self.registry)
        self.assertEqual(count, 1)
        self.assertEqual(errors, [])

    def test_raw_archived_norms_modified_fails(self):
        archive = self.root / "docs/normy-teksty/example.txt"
        archive.parent.mkdir(parents=True)
        archive.write_text("Первый абзац.\n", encoding="utf-8")
        old_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
        self.registry.write_text(
            f"| Постановление | документы | текст есть: docs/normy-teksty/example.txt, sha256 файла {old_hash} |\n",
            encoding="utf-8",
        )
        archive.write_text("Второй абзац.\n", encoding="utf-8")
        _, errors = verify(self.root, self.registry)
        self.assertTrue(any("НЕСОВПАДЕНИЕ" in e for e in errors), errors)


if __name__ == "__main__":
    unittest.main()
