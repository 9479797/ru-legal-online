"""Быстрая проверка страниц в браузере: python3 scripts/proverka_brauzer.py

Открывает схему и проходит по одной связке в каждой цели, окна «Календарь», «Сравнить статусы»,
все пояснения и страницу «Маркировка по шагам» для каждого статуса. Ловит ошибки JavaScript.
Полную проверку всех связок делает scripts/proverka_skhemy.js без браузера.
Нужны playwright и Chrome (/usr/bin/google-chrome) или Chromium из playwright.
"""
import pathlib, shutil, sys
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"
errs = []
with sync_playwright() as p:
    exe = shutil.which("google-chrome")
    b = p.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe else p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.route("**/fonts.g*/**", lambda r: r.abort())
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto((SITE / "index.html").as_uri()); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    pg.evaluate("window.__printCount=0; window.print=()=>{window.__printCount++}")
    for goal in pg.eval_on_selector_all("#goal option", "e=>e.map(x=>x.value)"):
        pg.select_option("#goal", goal)
        pg.click('[data-pick="0"]')
        kids = pg.query_selector_all('[data-pick="1"]')
        if kids:
            kids[0].click()
            d = pg.query_selector('[data-pick="2"]')
            if d: d.click()
        result = pg.locator('[data-open-result]:visible')
        if result.count():
            result.click()
            assert pg.locator('dialog[open]').count() == 1
            before = pg.evaluate("window.__printCount")
            pg.click('dialog[open] [data-save="print"]')
            pg.wait_for_function("window.__printCount > " + str(before))
            pg.click('dialog[open] .x')
    for form in pg.eval_on_selector_all("#form option", "e=>e.map(x=>x.value)"):
        pg.select_option("#form", form)
        for tool in ["calendar", "compare"]:
            pg.click(f'[data-tool="{tool}"]'); pg.click("dialog .x")
    for x in pg.eval_on_selector_all("[data-explain]", "e=>e.map(x=>x.dataset.explain)"):
        pg.click(f'[data-explain="{x}"]'); pg.click("dialog .x")
    pg.goto((SITE / "markirovka.html").as_uri()); pg.wait_for_timeout(200)
    for form in pg.eval_on_selector_all("#form option", "e=>e.map(x=>x.value)"):
        pg.select_option("#form", form)
    b.close()
print("Ошибок в браузере нет." if not errs else "Ошибки:\n- " + "\n- ".join(errs))
sys.exit(1 if errs else 0)
