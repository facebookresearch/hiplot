import glob
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities


DEMO_PAGES_PATH = Path('.circleci/demo_pages')


def create_browser() -> webdriver.Chrome:
    # enable browser logging
    d = DesiredCapabilities.CHROME
    d['goog:loggingPrefs'] = { 'browser':'ALL' }

    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    driver = webdriver.Chrome(options=chrome_options, desired_capabilities=d)
    driver.set_window_size(1920, 1080, driver.window_handles[0])
    return driver

def test_demo_pages() -> None:
    num_err = 0
    for f in glob.glob(str(DEMO_PAGES_PATH / '*.html')):
        network_error = True
        attempt = 0
        while network_error:
            network_error = False
            attempt += 1
            if attempt > 10:
                print(f'Network errors: abandonned after retry #5')
                num_err += 1
                break
            print(f'Loading {f} (attempt {attempt})')
            file = Path(f)
            driver = create_browser()
            driver.get(f'file://{file.absolute()}')
            time.sleep(4)
            driver.save_screenshot(f + '.png')
            print(f'  title: {driver.title}')
            print(f'  log messages:')
            for l in driver.get_log('browser'):
                print(f'    {str(l)}')
                if l['level'] != 'INFO':
                    if l['source'] == 'network':
                        network_error = True
                    else:
                        num_err += 1
        driver.quit()
    assert num_err == 0