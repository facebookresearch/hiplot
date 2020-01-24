#!/usr/bin/env python
# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.


import re
from pathlib import Path
from typing import Dict, List
from setuptools import setup, find_packages



requirements: Dict[str, List[str]] = {}
for extra in ["dev", "main"]:
    requirements[extra] = Path(f"requirements/{extra}.txt").read_text().splitlines()


# Find version number in __init__
init_str = Path("hiplot/__init__.py").read_text()
match = re.search(r"^__version__ = \"(?P<version>[\w\.]+?)\"$", init_str, re.MULTILINE)
assert match is not None, "Could not find version in hiplot/__init__.py"
version = match.group("version")


setup(
    name="hiplot",
    version=version,
    description="High dimensional Interactive Plotting tool",
    author="Facebook AI Research",
    packages=find_packages(),
    install_requires=requirements["main"],
    extras_require={"dev": requirements["dev"]},
    package_data={"hiplot": ["py.typed", "static/*", "static/*/*", "static/*/*/*", "templates/**"]},
    include_package_data=True,
    scripts=['scripts/hiplot']
)
