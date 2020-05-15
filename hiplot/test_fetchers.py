# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from pathlib import Path
import json
import tempfile
import shutil
import pytest
from . import experiment as exp
from .fetchers import load_demo, load_csv, load_json, MultipleFetcher, get_fetchers, load_xps_with_fetchers
from .fetchers_demo import README_DEMOS


def test_fetcher_demo() -> None:
    xp = load_demo("demo")
    xp.validate()
    assert xp.datapoints
    with pytest.raises(exp.ExperimentFetcherDoesntApply):
        load_demo("something_else")


def test_fetcher_csv() -> None:
    xp = load_csv(str(Path(Path(__file__).parent.parent, ".circleci", "nutrients.csv")))
    xp.validate()
    assert xp.datapoints
    assert len(xp.datapoints) == 7637
    with pytest.raises(exp.ExperimentFetcherDoesntApply):
        load_csv("something_else")
    with pytest.raises(exp.ExperimentFetcherDoesntApply):
        load_csv("file_does_not_exist.csv")


def test_fetcher_json() -> None:
    dirpath = tempfile.mkdtemp()
    try:
        json_path = dirpath + "/xp.json"
        with Path(json_path).open("w+", encoding="utf-8") as tmpf:
            json.dump([{"id": 1, "metric": 1.0, "param": "abc"}, {"id": 2, "metric": 1.0, "param": "abc", "option": "def"}], tmpf)
        xp = load_json(json_path)
        xp.validate()
        assert xp.datapoints
        assert len(xp.datapoints) == 2
    finally:
        shutil.rmtree(dirpath)


def test_fetcher_json_doesnt_apply() -> None:
    with pytest.raises(exp.ExperimentFetcherDoesntApply):
        load_json("something_else")


def test_demo_from_readme() -> None:
    for k, v in README_DEMOS.items():
        print(k)
        v().validate()._asdict()


def test_fetcher_multi_get_uri_length() -> None:
    test_string = r"""multi://{
"test1": "test2"
}
xp2"""
    f = MultipleFetcher([])
    eof = f.get_uri_length(test_string)
    assert test_string[eof:] == "\nxp2"


def test_multilines() -> None:
    test_uri = r"""demo
multi://{
"xp1": "demo",
"xp2": "demo"
}
demo
"""
    fetchers = get_fetchers([])
    assert len(load_xps_with_fetchers(fetchers, test_uri)) == 3
