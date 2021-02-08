#!/usr/bin/env python
# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.


import re
import os
import sys
import importlib.util
from pathlib import Path
from typing import Dict, List

import setuptools
from distutils.core import setup


requirements: Dict[str, List[str]] = {}
for extra in ["dev", "main"]:
    # Skip `package @ git+[repo_url]` because not supported by pypi
    requirements[extra] = [r
                           for r in Path(f"requirements/{extra}.txt").read_text().splitlines()
                           if '@' not in r
                           ]


# Find version number
spec = importlib.util.spec_from_file_location("hiplot.pkginfo", str(Path(__file__).parent / "hiplot" / "pkginfo.py"))
pkginfo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pkginfo)
version = pkginfo.version


def readme() -> str:
    return open("README.md").read()


setup(
    name="hiplot",
    version=version,
    description="High dimensional Interactive Plotting tool",
    long_description=readme(),
    long_description_content_type="text/markdown",
    url='https://github.com/facebookresearch/hiplot',
    author="Facebook AI Research",
    packages=["hiplot"],
    install_requires=requirements["main"],
    extras_require={"dev": requirements["dev"]},
    package_data={"hiplot": ["py.typed", "static/*", "static/built/*", "static/built/streamlit_component/*", "templates/*"]},
    include_package_data=True,
    entry_points={
        'console_scripts': [
            'hiplot = hiplot.server:run_server_main',
            'hiplot-render = hiplot.render:hiplot_render_main',
        ]
    },
    python_requires='>=3.6',
)
