# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.


import uuid
import base64
import json
from typing import Any, Dict
from pathlib import Path


def escapejs(val: Any) -> str:
    return json.dumps(str(val))


def render_jinja_html(template_loc: str, file_name: str) -> str:
    import jinja2
    return jinja2.Environment(loader=jinja2.FileSystemLoader(template_loc + "/")).get_template(file_name).render()


def html_inlinize(html: str, replace_local: bool = True) -> str:
    """
    Includes external CSS, JS and images directly in the HTML
    (only for files with a relative path)
    """
    from bs4 import BeautifulSoup
    SUFFIX_TO_TYPE = {
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
    }
    static_root = str(Path(__file__).parent)
    soup = BeautifulSoup(html, "html.parser")
    for i in soup.find_all("link"):
        href = i["href"]
        if href.startswith("http") or href.startswith("//"):
            continue
        if not replace_local:
            continue

        if i["rel"][0] == "stylesheet":
            if href.startswith("/"):
                href = href[1:]
            file = Path(static_root, href)
            new_tag = soup.new_tag("style")
            new_tag.string = file.read_text(encoding="utf-8")
            i.replace_with(new_tag)
        elif i["rel"][0] == "icon":  # Favicon
            file = Path(static_root, href)
            i["href"] = f"data:{SUFFIX_TO_TYPE[file.suffix]};base64,{base64.b64encode(file.open('rb').read()).decode('ascii')}"
    for i in soup.find_all("script"):
        try:
            src = i["src"]
        except KeyError:
            continue
        if src.startswith("http") or src.startswith("//"):
            continue
        if not replace_local:
            continue

        if src.startswith("/"):
            src = src[1:]
        file = Path(static_root, src)
        new_tag = soup.new_tag("script")
        new_tag.string = file.read_text(encoding="utf-8")
        new_tag["type"] = i["type"]
        i.replace_with(new_tag)
    return str(soup)


def get_index_html_template() -> str:
    return render_jinja_html(str(Path(__file__).parent / "templates"), "index.html")


def make_experiment_standalone_page(options: Dict[str, Any]) -> str:
    hiplot_options = {
        'dataProviderName': 'none'
    }
    hiplot_options.update(options)

    index_html = get_index_html_template()
    index_html = index_html.replace("hiplot_element_id", f"hiplot_{uuid.uuid4().hex}")
    index_html = index_html.replace(
        "/*ON_LOAD_SCRIPT_INJECT*/",
        f"""/*ON_LOAD_SCRIPT_INJECT*/
        Object.assign(options, eval('(' + {escapejs(json.dumps(hiplot_options))} + ')'));
        """)
    return index_html
