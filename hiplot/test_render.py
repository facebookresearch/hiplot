# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest.mock
from html.parser import HTMLParser
import typing as tp
from bs4 import BeautifulSoup
from .fetchers_demo import README_DEMOS
from .render import get_index_html_template


@unittest.mock.patch('hiplot.experiment._is_running_ipython', new=lambda: True)
def test_demos_ipython() -> None:
    for k, v in README_DEMOS.items():
        print(k)
        v().display()

@unittest.mock.patch('streamlit._is_running_with_streamlit', new=True, create=True)
def test_demos_streamlit() -> None:
    for k, v in README_DEMOS.items():
        print(k)
        v().display_st(ret='selected_uids', key=f'hiplot{k}')

def test_index_html_valid() -> None:
    """
    Make sure that parsing the HTML with BeautifulSoup goes without error,
    because errors are silently discarded and the page content is altered
    """
    html_template = get_index_html_template()
    html_soup = str(BeautifulSoup(html_template, "html.parser"))

    class MyHTMLParser(HTMLParser):
        def __init__(self, data: str) -> None:
            super().__init__()
            self.content: tp.List[str] = []
            self.feed(data)

        def handle_starttag(self, tag: str, attrs: tp.List[tp.Tuple[str, tp.Optional[str]]]) -> None:
            attrs.sort(key=lambda x: x[0])
            attrs_rendered = " ".join([a[0] + '=' + a[1] if a[1] is not None else a[0] for a in attrs])
            self.content.append(f'<{tag} {attrs_rendered}>')

        def handle_endtag(self, tag: str) -> None:
            self.content.append(f'</{tag}>')

        def handle_data(self, data: str) -> None:
            self.content.append(data.strip())

        def error(self, message: str) -> None:
            assert False

    parser_actual = MyHTMLParser(html_soup)
    parser_expected = MyHTMLParser(html_template)
    assert parser_actual.content == parser_expected.content
