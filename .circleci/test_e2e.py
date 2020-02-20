import glob
import time
import os
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


def test_demo_pages() -> None:
    BROWSERS_FACTORY = {
        "chrome": create_browser_chrome,
        "firefox": create_browser_firefox,
    }
    num_err = 0
    for f in glob.glob(str(DEMO_PAGES_PATH / '*.html')):
        print(f'Loading {f}')
        file = Path(f)
        driver = BROWSERS_FACTORY[os.environ.get("BROWSER", "chrome")]()
        driver.get(f'file://{file.absolute()}')
        time.sleep(2)  # Wait for enough data to be loaded
        driver.save_screenshot(f + '.png')
        print(f'  title: {driver.title}')
        print(f'  log messages:')
        try:
            for l in driver.get_log('browser'):
                print(f'    {str(l)}')
                if l['level'] != 'INFO':
                    num_err += 1
        except selenium.common.exceptions.WebDriverException as e:
            # Logging interface not supported in Firefox
            # see https://github.com/mozilla/geckodriver/issues/330
            print(f'    !unable to retrieve browser logs: {e}')
        driver.quit()
    assert num_err == 0
