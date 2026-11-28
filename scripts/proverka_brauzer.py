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
    # One unified page; the old risk URL redirects to it.
    pg.goto((SITE / "risk.html").as_uri())
    pg.wait_for_url("**/index.html")
    pg.evaluate("localStorage.clear()")
    pg.reload()
    assert pg.locator("#route-mode").count() == 0, "There must be only one view"
    def sorted_risk(level):
        values = pg.locator(f'#step-{level} .opt').evaluate_all(
            "els=>els.map(e=>e.classList.contains('r')?0:e.classList.contains('y')?1:2)"
        )
        assert values == sorted(values), f"Incorrect risk order at stage {level}: {values}"
    sorted_risk(1)
    pg.select_option("#goal", "book")
    pg.select_option("#format", "file")
    pg.check("#sample")
    pg.select_option("#scope", "promotion")
    pg.locator('[data-pick="0"][data-id="instagram"]').click()
    sorted_risk(2)
    # Destination cards in third column must also be sorted, even for an informational route.
    pg.locator('[data-pick="1"][data-id="ig-info"]').click()
    sorted_risk(3)
    pg.locator('[data-pick="1"][data-id="word"]').click()
    assert pg.locator(".ig-codeword-flow").is_visible(), "Risk chain must be visible in column 3"
    assert pg.locator(".ig-flow-node").count() == 4, "Four distinct stages required"
    assert pg.locator('[data-ig-flow-dest="site"]').get_attribute("aria-pressed") == "true"
    pg.locator('[data-ig-flow-dest="tg"]').click()
    assert pg.locator('[data-ig-flow-dest="tg"]').get_attribute("aria-pressed") == "true"
    assert "Telegram" in pg.locator(".ig-flow-node").last.inner_text()
    pg.reload()
    assert pg.locator('[data-ig-flow-dest="tg"]').get_attribute("aria-pressed") == "true", "Chosen destination must persist"
    pg.evaluate("window.print=()=>{}")
    pg.locator('#step-3 [data-save="print"]').click()
    assert "Telegram" in pg.locator("#print").inner_text(), "Export must retain chosen destination"
    assert "Instagram" in pg.locator("#print").inner_text(), "Export must retain originating platform"
    # TikTok: all nine goals keep their original routes, examples and risk-first order.
    for goal_id in ["consult", "club", "marathon", "event", "adsell", "presale", "course", "doula", "book"]:
        pg.select_option("#goal", goal_id)
        pg.locator('[data-pick="0"][data-id="tiktok"]').click()
        assert pg.locator('#step-2 [data-pick="1"]').count() >= 6, f"Missing TikTok variants: {goal_id}"
        colors = pg.locator('#step-2 .opt').evaluate_all(
            "els=>els.map(e=>e.classList.contains('r')?0:e.classList.contains('y')?1:2)"
        )
        assert colors == sorted(colors), f"Risk order on TikTok: {goal_id}"
        if goal_id == "book":
            pg.locator('[data-more="1"][data-id="tt-video"]').click()
            assert pg.locator("dialog[open] .guide-example").count() == 2, "TikTok video: paired examples"
            assert "цена и ссылка" in pg.locator("dialog[open]").inner_text()
            pg.locator("dialog[open] .x").click()
            pg.locator('[data-pick="1"][data-id="tt-video"]').click()
            assert pg.locator('#step-3 [data-pick="2"]').count() >= 1
    b.close()
print("Ошибок в браузере нет." if not errs else "Ошибки:\n- " + "\n- ".join(errs))
sys.exit(1 if errs else 0)
