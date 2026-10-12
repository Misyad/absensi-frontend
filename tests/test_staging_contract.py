from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"


def read(path):
    return path.read_text(encoding="utf-8")


class StagingContractTest(unittest.TestCase):
    def test_staging_config_blocks_mutations(self):
        config = read(SRC / "config.staging.js")
        self.assertIn("window.APP_CONFIG", config)
        self.assertRegex(config, r"STAGING\s*:\s*true")
        self.assertRegex(config, r"ALLOW_SUBMIT\s*:\s*false")

    def test_html_loads_config_before_application(self):
        html = read(SRC / "index.html")
        self.assertLess(html.index('src="config.js"'), html.index('src="app.js"'))

    def test_staging_is_visibly_identified(self):
        html = read(SRC / "index.html")
        app = read(SRC / "app.js")
        self.assertIn('id="environmentBanner"', html)
        self.assertIn("STAGING — pengiriman absensi dinonaktifkan", app)
        self.assertRegex(
            app,
            r"if \(APP_CONFIG\.STAGING\) \{[^}]*btnSubmit\.disabled = true",
        )

    def test_application_checks_submit_permission_before_post(self):
        app = read(SRC / "app.js")
        gate = app.index("if (!APP_CONFIG.ALLOW_SUBMIT)")
        post = app.index("method: 'POST'")
        self.assertLess(gate, post)
        self.assertIn("Mode staging: pengiriman absensi dinonaktifkan.", app)

    def test_images_make_static_assets_world_readable_with_legacy_builder(self):
        production = read(ROOT / "Dockerfile")
        staging = read(ROOT / "Dockerfile.staging")
        for dockerfile in (production, staging):
            self.assertNotIn("COPY --chmod", dockerfile)
            self.assertIn("COPY ./src /usr/share/nginx/html", dockerfile)
            self.assertIn("RUN chmod -R a+rX /usr/share/nginx/html", dockerfile)
        self.assertIn("COPY ./src/config.production.js", production)
        self.assertIn("COPY ./src/config.staging.js", staging)

    def test_staging_image_uses_fail_closed_config(self):
        dockerfile = read(ROOT / "Dockerfile.staging")
        self.assertIn("config.staging.js", dockerfile)
        self.assertIn("/usr/share/nginx/html/config.js", dockerfile)

    def test_staging_pipeline_isolated_from_production(self):
        pipeline = read(ROOT / "Jenkinsfile.staging")
        self.assertIn('DOCKER_IMAGE = "absensi-sppg-staging"', pipeline)
        self.assertIn('CONTAINER_NAME = "web-absensi-sppg-staging"', pipeline)
        self.assertIn('PORT_MAPPING = "127.0.0.1:3004:80"', pipeline)
        self.assertNotIn('CONTAINER_NAME = "web-absensi-sppg"', pipeline)
        self.assertNotIn("3003:80", pipeline)
        self.assertNotIn("curl -fsS http://127.0.0.1:3004/", pipeline)
        self.assertIn(
            "docker exec \"$CONTAINER_NAME\" wget -q -O- http://127.0.0.1/",
            pipeline,
        )
        self.assertNotIn("jenkins_home", pipeline)
        self.assertNotIn("--network host", pipeline)
        self.assertIn('NETWORK_NAME = "absensi-sppg-staging-internal"', pipeline)
        self.assertIn("docker network create --internal", pipeline)
        contract_image = read(ROOT / "Dockerfile.contract-test")
        browser_image = read(ROOT / "Dockerfile.browser-test")
        self.assertIn("Dockerfile.contract-test", pipeline)
        self.assertIn("Dockerfile.browser-test", pipeline)
        self.assertIn("node:22-alpine", contract_image)
        self.assertIn("python:3.12-alpine", contract_image)
        self.assertIn("tests/test_staging_browser.py", browser_image)
        self.assertIn(
            'docker run --rm --network "$NETWORK_NAME"',
            pipeline,
        )

    def test_staging_separates_publish_and_internal_networks(self):
        pipeline = read(ROOT / "Jenkinsfile.staging")
        self.assertIn(
            'PUBLISH_NETWORK_NAME = "absensi-sppg-staging-publish"', pipeline
        )
        self.assertIn('docker network create "$PUBLISH_NETWORK_NAME"', pipeline)
        self.assertIn('--network "$PUBLISH_NETWORK_NAME"', pipeline)
        self.assertIn(
            'docker network connect "$NETWORK_NAME" "$CONTAINER_NAME"', pipeline
        )
        self.assertIn(".NetworkSettings.Ports", pipeline)


if __name__ == "__main__":
    unittest.main()
