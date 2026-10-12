import json
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3004/"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(
        geolocation={"latitude": -7.98, "longitude": 112.63},
        permissions=["geolocation"],
    )
    posts = []
    page.on("request", lambda request: posts.append(request.url) if request.method == "POST" else None)
    page.route(
        "https://script.google.com/**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(["Divisi Uji"]),
        ),
    )
    response = page.goto(url, wait_until="networkidle")
    if response is None:
        raise RuntimeError(f"No HTTP response from {url}")
    page.locator("#formAbsen").evaluate(
        "form => form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))"
    )
    page.wait_for_timeout(500)
    banner = page.locator("#environmentBanner")
    result = {
        "http": response.status,
        "banner_visible": banner.is_visible(),
        "banner": banner.inner_text(),
        "submit_disabled": page.locator("#btnSubmit").is_disabled(),
        "message": page.locator("#pesan").inner_text(),
        "post_count": len(posts),
        "post_urls": posts,
        "overflow": page.evaluate(
            "document.documentElement.scrollWidth > document.documentElement.clientWidth"
        ),
        "divisions": page.locator("#divisi option").count(),
    }
    print(json.dumps(result, ensure_ascii=False))
    assert result["http"] == 200
    assert result["banner_visible"]
    assert result["banner"] == "STAGING — pengiriman absensi dinonaktifkan"
    assert result["submit_disabled"]
    assert result["message"] == "Mode staging: pengiriman absensi dinonaktifkan."
    assert result["post_count"] == 0
    assert not result["overflow"]
    assert result["divisions"] >= 2
    browser.close()
