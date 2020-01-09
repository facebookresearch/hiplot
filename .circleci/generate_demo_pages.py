from pathlib import Path
from hiplot.fetchers import README_DEMOS

TO_PATH = Path('.circleci/demo_pages')
TO_PATH.mkdir(parents=True, exist_ok=True)

for k, v in README_DEMOS.items():
    print(k)
    with (TO_PATH / f'{k}.html').open('w+') as f:
        f.write(v().to_html())