# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import argparse
import importlib
import json
from typing import List, Any, Dict

from . import experiment as exp
from .fetchers import load_demo, load_csv, load_json, load_fairseq, load_wav2letter, MultipleFetcher, NoFetcherFound, load_xp_with_fetchers
from .render import get_index_html_template, html_inlinize


def run_server(add_fetchers: List[str], host: str = '127.0.0.1', port: int = 5005, debug: bool = False) -> None:
    """
    Runs the HiPlot server
    """
    from flask import Flask, render_template, jsonify, request
    from flask_compress import Compress

    app = Flask(__name__)
    xp_fetchers: List[exp.ExperimentFetcher] = [load_demo, load_csv, load_json, load_fairseq, load_wav2letter]

    @app.route("/")
    def index() -> Any:  # pylint: disable=unused-variable
        template = get_index_html_template()
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
    app.run(debug=debug, host=host, port=port)


def run_server_main() -> int:
    parser = argparse.ArgumentParser(prog="HiPlot", description="Start HiPlot webserver")
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5005)
    parser.add_argument("--dev", action='store_true', help="Enable Flask Debug mode (watches for files modifications, etc..)")
    parser.add_argument("fetchers", nargs="*", type=str)
    args = parser.parse_args()
    run_server(add_fetchers=args.fetchers, host=args.host, port=args.port, debug=args.dev)
    return 0

