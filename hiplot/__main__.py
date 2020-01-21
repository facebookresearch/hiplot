# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import argparse
from .server import run_server


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5005)
    parser.add_argument("fetchers", nargs="*", type=str)
    args = parser.parse_args()
    run_server(add_fetchers=args.fetchers, host=args.host, port=args.port)
