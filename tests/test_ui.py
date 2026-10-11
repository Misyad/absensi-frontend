from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs
import json
import os
import re

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parents[1] / "src"
DIVISIONS = {
    "PENGOLAHAN": ["AHMAD HASANUDIN", "NURHAYATI"],
    "KEBERSIHAN": ["FATONI ABADI"],
}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        del format, args


def serve():
    previous = Path.cwd()
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    Thread(target=server.serve_forever, daemon=True).start()
    return server, previous


def install_api_mock(page, posts):
    def route_api(route, request):
        if request.method == "POST":
            posts.append({key: values[0] for key, values in parse_qs(request.post_data or "").items()})
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"status": "success", "pesan": "Absensi uji berhasil"}),
            )
            return

        if "action=divisi" in request.url:
            body = json.dumps(list(DIVISIONS))
        elif "action=relawan" in request.url:
            division = request.url.split("divisi=", 1)[-1]
            body = json.dumps(DIVISIONS.get(division, []))
        else:
            body = json.dumps({"status": True})
        route.fulfill(status=200, content_type="application/json", body=body)

    page.route("**://script.google.com/macros/s/**", route_api)


def assert_visual_contract(page, width):
    page.set_viewport_size({"width": width, "height": 900})
    page.reload(wait_until="networkidle")
    page.wait_for_function("document.querySelectorAll('#nama option').length === 4")

    assert page.locator("h1").inner_text() == "Absensi Relawan"
    assert page.locator(".app-subtitle").inner_text() == "SPPG Pakiskembar 2"
    assert page.locator("select").count() == 1
    page.wait_for_function("document.body.dataset.timeSource === 'server'")
    assert page.locator("#workStatus").inner_text() == "Sinkron dengan waktu server"
    assert page.locator("input").count() == 0
    assert page.locator("text=PIN").count() == 0
    assert page.locator("#nama").get_attribute("aria-label") == "Pilih nama relawan"
    assert page.locator("#btnSubmit").inner_text().startswith("Ambil Selfie & Absen")
    assert page.locator("#btnSubmit").bounding_box()["height"] >= 82
    assert page.locator("#locationTitle").inner_text() == "Pemeriksaan lokasi"
    assert page.evaluate("document.documentElement.scrollWidth === document.documentElement.clientWidth")
    assert page.evaluate("document.querySelector('.app-shell').getBoundingClientRect().width <= 520")


def run():
    server, previous = serve()
    url = f"http://127.0.0.1:{server.server_port}/"
    evidence = {"viewports": {}, "posts": []}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
            )

            context = browser.new_context(
                viewport={"width": 375, "height": 900},
                geolocation={"latitude": -7.98391, "longitude": 112.62139},
                permissions=["geolocation", "camera"],
                locale="id-ID",
                timezone_id="Asia/Jakarta",
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
            install_api_mock(page, evidence["posts"])
            page.goto(url, wait_until="networkidle")

            for width in (320, 375, 430, 1024):
                assert_visual_contract(page, width)
                evidence["viewports"][str(width)] = "PASS"

            page.set_viewport_size({"width": 375, "height": 900})
            page.wait_for_function("document.body.dataset.timeSource === 'server'")
            assert re.fullmatch(r"\d{2}:\d{2}:\d{2}", page.locator("#currentTime").inner_text())
            page.wait_for_function("document.body.dataset.locationState === 'ready'")
            assert "GPS siap" in page.locator("#locationText").inner_text()

            page.select_option("#nama", "AHMAD HASANUDIN")
            page.locator("#btnSubmit").click()
            page.wait_for_function("document.querySelector('#cameraDialog').open")
            assert page.locator("#cameraVideo").is_visible()
            page.locator("#captureButton").click()
            page.wait_for_function("document.querySelector('#pesan').textContent.includes('Absensi uji berhasil')")

            assert len(evidence["posts"]) == 1
            payload = evidence["posts"][0]
            assert payload["nama"] == "AHMAD HASANUDIN"
            assert payload["divisi"] == "PENGOLAHAN"
            assert payload["jenis"] == "Masuk"
            assert payload["statusLokasi"].startswith("-7.98391,112.62139")
            assert payload["foto"].startswith("data:image/jpeg;base64,")
            assert page.locator("#nama").input_value() == ""
            assert not errors, errors
            page.screenshot(path="/tmp/absensi-ui-375.png", full_page=True)
            context.close()

            denied_posts = []
            denied_context = browser.new_context(viewport={"width": 320, "height": 900})
            denied_page = denied_context.new_page()
            install_api_mock(denied_page, denied_posts)
            denied_page.goto(url, wait_until="networkidle")
            denied_page.wait_for_function("document.body.dataset.locationState === 'error'")
            denied_page.select_option("#nama", "FATONI ABADI")
            denied_page.locator("#btnSubmit").click()
            assert "GPS" in denied_page.locator("#pesan").inner_text()
            assert not denied_page.locator("#cameraDialog").evaluate("dialog => dialog.open")
            assert denied_posts == []
            assert "is-ready" not in (denied_page.locator(".location-status").get_attribute("class") or "")
            denied_context.close()
            browser.close()

        evidence.update({
            "status": "PASS",
            "server_time": "PASS",
            "direct_camera": "PASS",
            "gps_fail_closed": "PASS",
            "payload_contract": sorted(key for key in evidence["posts"][0] if key != "foto"),
            "production_post": 0,
            "screenshot": "/tmp/absensi-ui-375.png",
        })
        evidence["posts"][0]["foto"] = "[REDACTED JPEG DATA URL]"
        print(json.dumps(evidence, indent=2))
    finally:
        server.shutdown()
        os.chdir(previous)


if __name__ == "__main__":
    run()
