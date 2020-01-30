import glob
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities


DEMO_PAGES_PATH = Path('.circleci/demo_pages')


def create_browser() -> webdriver.Chrome:
    # enable browser logging
    d = DesiredCapabilities.CHROME
    d['goog:loggingPrefs'] = {'browser': 'ALL'}

    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    driver = webdriver.Chrome(options=chrome_options, desired_capabilities=d)
    driver.set_window_size(1920, 1080, driver.window_handles[0])
    return driver


def test_demo_pages() -> None:
    num_err = 0
    for f in glob.glob(str(DEMO_PAGES_PATH / '*.html')):
        print(f'Loading {f}')
        file = Path(f)
        driver = create_browser()
        driver.get(f'file://{file.absolute()}')
        driver.save_screenshot(f + '.png')
        print(f'  title: {driver.title}')
        print(f'  log messages:')
        for l in driver.get_log('browser'):
            print(f'    {str(l)}')
            if l['level'] != 'INFO':
                num_err += 1
        driver.quit()
    assert num_err == 0
