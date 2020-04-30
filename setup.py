#!/usr/bin/env python
# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.


import re
import os
import sys
from pathlib import Path
from typing import Dict, List
from setuptools import setup, find_packages
from setuptools.command.install import install


requirements: Dict[str, List[str]] = {}
for extra in ["dev", "main"]:
    # Skip `package @ git+[repo_url]` because not supported by pypi
    requirements[extra] = [r
                           for r in Path(f"requirements/{extra}.txt").read_text().splitlines()
                           if '@' not in r
                           ]


# Find version number in __init__
init_str = Path("hiplot/__init__.py").read_text()
match = re.search(r"^__version__ = \"(?P<version>[\w\.]+?)\"", init_str, re.MULTILINE)
assert match is not None, "Could not find version in hiplot/__init__.py"
version = match.group("version")


def readme() -> str:
    return open("README.md").read()


setup(
    name="hiplot",  # CI_PACKAGE_NAME: replaced by ci for hiplot-master
    version=version,
    description="High dimensional Interactive Plotting tool",
    long_description=readme(),
    long_description_content_type="text/markdown",
    url='https://github.com/facebookresearch/hiplot',
    author="Facebook AI Research",
    packages=find_packages(),
    install_requires=requirements["main"],
    extras_require={"dev": requirements["dev"]},
    package_data={"hiplot": ["py.typed", "static/*", "static/built/*", "templates/*"]},
    include_package_data=True,
    scripts=['scripts/hiplot', 'scripts/hiplot-render'],
    python_requires='>=3.6',
)
