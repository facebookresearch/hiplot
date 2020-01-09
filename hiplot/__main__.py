# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import argparse
import importlib
import json
from typing import List, Any
from flask import Flask, render_template, jsonify, request
from flask_compress import Compress

from . import experiment as exp
from .fetchers import load_demo, load_csv, load_json, load_fairseq, load_wav2letter
from .render import get_index_html_template, html_inlinize


class NoFetcherFound(Exception):
    pass


def load_xp_with_fetchers(fetchers: List[exp.ExperimentFetcher], uri: str) -> exp.Experiment:
    for f in fetchers:
        try:
            return f(uri)
        except exp.ExperimentFetcherDoesntApply:
            continue
    raise NoFetcherFound(uri)


class MultipleFetcher:
    MULTI_PREFIX = "multi://"

    def __init__(self, fetchers: List[exp.ExperimentFetcher]) -> None:
        self.fetchers: List[exp.ExperimentFetcher] = fetchers + [self]

    def __call__(self, uri: str) -> exp.Experiment:
        if not uri.startswith(self.MULTI_PREFIX):
            raise exp.ExperimentFetcherDoesntApply()
        defs = json.loads(uri[len(self.MULTI_PREFIX) :])
        if isinstance(defs, list):
            return exp.Experiment.merge({v: load_xp_with_fetchers(self.fetchers, v) for v in defs})
        return exp.Experiment.merge({k: load_xp_with_fetchers(self.fetchers, v) for k, v in defs.items()})


def run_server(add_fetchers: List[str], **kwargs: Any) -> None:
    app = Flask(__name__)
    xp_fetchers: List[exp.ExperimentFetcher] = [load_demo, load_csv, load_json, load_fairseq, load_wav2letter]

    @app.route("/")
    def index() -> Any:  # pylint: disable=unused-variable
        template = get_index_html_template()
        if request.args.get('offline', False):
            template = html_inlinize(template, replace_local=False)
        return template

    @app.route("/data")
    def data() -> Any:  # pylint: disable=unused-variable
        uri = request.args.get("uri", type=str)
        assert uri is not None
        try:
            xp = load_xp_with_fetchers(xp_fetchers, uri)
            xp.validate()
            return jsonify({"query": uri, "experiment": xp._asdict()})
        except NoFetcherFound as e:
            return jsonify({"error": f"No fetcher found for this experiment: {e}"})

    for fetcher_spec in add_fetchers:
        parts = fetcher_spec.split(".")
        module = importlib.import_module(".".join(parts[:-1]))
        fetcher = getattr(module, parts[-1])
        xp_fetchers.append(fetcher)
    xp_fetchers.append(MultipleFetcher(xp_fetchers))
    Compress(app)
    app.run(debug=True, **kwargs)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5005)
    parser.add_argument("fetchers", nargs="*", type=str)
    args = parser.parse_args()
    run_server(add_fetchers=args.fetchers, host=args.host, port=args.port)
