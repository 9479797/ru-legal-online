# CLAUDE.md

Правила работы с репозиторием описаны в [AGENTS.md](AGENTS.md); они действуют и для Claude Code.

Коротко:
- навыки лежат в `skills/<имя>/SKILL.md`;
- пункты `[ПРОВЕРЯТЬ]` сверяются поиском по `docs/istochniki.md` перед каждым ответом;
- любая правка нормы идёт с источником и записью в `CHANGELOG.md`;
- перед коммитом запускается `python3 scripts/proverka.py`;
- изменения в `main` только через pull request.
