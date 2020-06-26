import glob
import time
import os
import pytest
from pathlib import Path
import selenium
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.remote.webdriver import WebDriver as RemoteWebDriver

DEMO_PAGES_PATH = Path('.circleci/demo_pages')


def create_browser_chrome() -> RemoteWebDriver:
    # enable browser logging
    d = DesiredCapabilities.CHROME
    d['goog:loggingPrefs'] = {'browser': 'ALL'}

    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    driver = webdriver.Chrome(options=chrome_options, desired_capabilities=d)
    driver.set_window_size(1920, 1080, driver.window_handles[0])
    return driver


def create_browser_firefox() -> RemoteWebDriver:
    # enable browser logging
    d = DesiredCapabilities.FIREFOX
    d['loggingPrefs'] = {'browser': 'ALL'}

    options = webdriver.FirefoxOptions()
    options.headless = True

    driver = webdriver.Firefox(options=options, desired_capabilities=d)
    driver.set_window_size(1920, 1080, driver.window_handles[0])
    return driver


BROWSERS_FACTORY = {
    "chrome": create_browser_chrome,
    "firefox": create_browser_firefox,
}

world_size = int(os.environ.get('CIRCLE_NODE_TOTAL', 1))
rank = int(os.environ.get('CIRCLE_NODE_INDEX', 0))
print("\nDistributed settings:")
print("Rank: ", rank)
print("World size:", world_size)


@pytest.mark.parametrize(
    "file, timeout_secs, browser",
    [(Path(f), float(os.environ.get('WAIT_SECS', '2')), os.environ.get("BROWSER", "chrome"))
     for i, f in enumerate(sorted([
         *glob.glob(str(DEMO_PAGES_PATH / '*.html')),
         *glob.glob(str(DEMO_PAGES_PATH / '*/*.html'))
     ]))
     if (i % world_size) == rank
     ],
)
def test_demo_pages(file: Path, timeout_secs: float, browser: str) -> None:
    print(file)
    num_err = 0
    driver = BROWSERS_FACTORY[browser]()
    driver.get(f'file://{file.absolute()}')
    timeout_time = time.time() + timeout_secs
    done = False

    def is_timeout() -> bool:
        return time.time() > timeout_time

    while not is_timeout() and not done:
        time.sleep(1)
        try:
            for l in driver.get_log('browser'):
                print(f'    {str(l)}')
                if l['level'] != 'INFO':
                    num_err += 1
                if "Tests done!" in l['message']:
                    done = True
                    print("(tests finished)")
        except selenium.common.exceptions.WebDriverException as e:
            # Logging interface not supported in Firefox
            # see https://github.com/mozilla/geckodriver/issues/330
            print(f'    !unable to retrieve browser logs: {e}')
    driver.save_screenshot(str(file) + '.png')
    driver.quit()
    assert num_err == 0
