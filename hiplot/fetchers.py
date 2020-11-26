# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import csv
import random
import uuid
import json
import math
import re
import ast
import glob
import os
import importlib
import importlib.util
import typing as tp
from pathlib import Path

from . import experiment as hip
from .fetchers_demo import README_DEMOS


class NoFetcherFound(Exception):
    def __init__(self, uri: str):
        super().__init__(f"Unable to fetch an HiPlot experiment from '{uri}'")


def load_xp_with_fetchers_partial(fetchers: tp.List[hip.ExperimentFetcher], uri: str) -> tp.Tuple[hip.Experiment, int]:
    """
    Attempts to parse an uri.
    Returns a corresponding experiment, and position in uri following the last used character.

    Example:
    /path1
    /path2
    Returns the Experiment for `/path1` and position the substring `\n/path2`
    """
    eol = uri.find("\n")
    if eol == -1:
        eol = len(uri)
    for f in fetchers:
        try:
            endoffetcher = eol
            if hasattr(f, "get_uri_length"):
                endoffetcher = f.get_uri_length(uri)  # type: ignore
            return f(uri[:endoffetcher]), endoffetcher
        except hip.ExperimentFetcherDoesntApply:
            continue
    raise NoFetcherFound(uri)


def load_xps_with_fetchers(fetchers: tp.List[hip.ExperimentFetcher], uri: str) -> tp.List[hip.Experiment]:
    uri = uri.lstrip()
    xps: tp.List[hip.Experiment] = []
    while uri:
        xp, endfetcher = load_xp_with_fetchers_partial(fetchers, uri)
        uri = uri[endfetcher:].lstrip()
        xps.append(xp)
    assert xps, uri  # If URI is empty, we should raise in `load_xp_with_fetchers_partial`
    return xps


def load_xp_with_fetchers(fetchers: tp.List[hip.ExperimentFetcher], uri: str) -> hip.Experiment:
    xps = load_xps_with_fetchers(fetchers, uri)
    return hip.Experiment.merge({
        f"{i}": xp
        for i, xp in enumerate(xps)
    }) if len(xps) > 1 else xps[0]


class MultipleFetcher:
    MULTI_PREFIX = "multi://"

    def __init__(self, fetchers: tp.List[hip.ExperimentFetcher]) -> None:
        self.fetchers: tp.List[hip.ExperimentFetcher] = fetchers + [self]

    def __call__(self, uri: str) -> hip.Experiment:
        if not uri.startswith(self.MULTI_PREFIX):
            raise hip.ExperimentFetcherDoesntApply()
        defs = json.loads(uri[len(self.MULTI_PREFIX):])
        if isinstance(defs, list):
            return hip.Experiment.merge({v: load_xp_with_fetchers(self.fetchers, v) for v in defs})
        return hip.Experiment.merge({k: load_xp_with_fetchers(self.fetchers, v) for k, v in defs.items()})

    def get_uri_length(self, uri: str) -> int:
        """
        Returns the end position of the multi block
        """
        if not uri.startswith(self.MULTI_PREFIX):
            raise hip.ExperimentFetcherDoesntApply()
        decoder = json.JSONDecoder()
        _, current_read_offset = decoder.raw_decode(uri[len(self.MULTI_PREFIX):])
        return len(self.MULTI_PREFIX) + current_read_offset


def load_demo(uri: str) -> hip.Experiment:
    if uri in README_DEMOS:
        return README_DEMOS[uri]()
    raise hip.ExperimentFetcherDoesntApply()


def load_csv(uri: str) -> hip.Experiment:
    if not uri.endswith(".csv"):
        raise hip.ExperimentFetcherDoesntApply(f"Not a CSV file: {uri}")
    try:
        with open(uri, newline="") as csvfile:
            return hip.Experiment.from_iterable(csv.DictReader(csvfile))
    except FileNotFoundError:
        raise hip.ExperimentFetcherDoesntApply(f"No such file: {uri}")


def load_json(uri: str) -> hip.Experiment:
    if not uri.endswith(".json"):
        raise hip.ExperimentFetcherDoesntApply(f"Not a JSON file: {uri}")
    dat = json.load(Path(uri).open())
    if "job_id" in dat[0] and "kwargs" in dat[0] and "results" in dat[0]:
        # Nevergrad JSON
        return hip.Experiment.from_iterable(
            [
                {
                    "id": j["job_id"],
                    **{param_name: str(param_val) for param_name, param_val in j["kwargs"].items()},
                    **{score_name: score_val for score_name, score_val in j["results"]["scores"].items()},
                }
                for j in dat
            ]
        )
    return hip.Experiment.from_iterable(dat)


def _load_fairseq_metrics_inline(l: str) -> tp.Dict[str, tp.Any]:
    l = l.lstrip('| epoch ')
    epoch = int(l[:3])
    values: tp.Dict[str, tp.Any] = {"epoch": epoch}
    # | epoch 002 | loss 8.413 | ...
    # | epoch 002 | valid on 'valid' subset | loss 7.599 | nll_loss 7.599 | ...
    parts = l.split('|')[1:]
    prefix = ''
    for p in parts:
        p = p.strip()
        match_ds = re.match(r"valid on '([a-zA-Z0-9]*)' subset", p)
        if match_ds is not None:
            prefix = match_ds.group(1) + '_'
            continue
        key = prefix + p[::-1].split(' ', 1)[1][::-1].strip()
        value = p[::-1].split(' ', 1)[0][::-1].strip()
        try:
            values[key] = float(value)
        except ValueError:
            values[key] = value
    return values


def load_fairseq(uri: str) -> hip.Experiment:
    # pylint:disable=too-many-locals
    # pylint:disable=too-many-branches
    # pylint:disable=too-many-statements
    PREFIX = 'fairseq://'
    if not uri.startswith(PREFIX):
        raise hip.ExperimentFetcherDoesntApply()
    uri = uri[len(PREFIX):]
    train_log = Path(uri)
    if train_log.is_dir():
        found = False
        try_files = [train_log / f for f in ["train.log", "process.out", "process_0.out"]] + \
            [Path(f) for f in glob.glob(str(train_log / "*.log")) + glob.glob(str(train_log / "slurm_logs" / "*.log"))]
        for try_log_file in try_files:
            if try_log_file.is_file():
                found = True
                train_log = try_log_file
                break
        if not found:
            raise hip.ExperimentFetcherDoesntApply("No log file found")
    lines = train_log.read_text(encoding="utf-8").split('\n')

    datapoints: tp.List[tp.Dict[str, tp.Any]] = []
    params: tp.Dict[str, tp.Any] = {}
    logs_prefix_re = r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| [A-Z]* \| )"
    for l in lines:
        # Strip log prefix
        # eg "2020-03-08 16:48:16 | INFO | "
        m = re.match(logs_prefix_re, l)
        if m is not None:
            l = l[m.span()[1]:]
        # Arguments: Namespace(...)
        if l.startswith('Namespace('):
            # format: Namespace(activation_dropout=0.1, activation_fn='relu', ...)
            # Ideally we want to do: `eval("dict(activation_dropout=0.1, activation_fn='relu', ...)")`
            # But as it's user input, we want to have something safe.
            # (it's still possible to crash the python interpreter with a too complex string due to stack depth limitations)
            node = ast.parse(l)
            params = {
                kw.arg: ast.literal_eval(kw.value)
                for kw in node.body[0].value.keywords  # type: ignore
            }
            continue
        # Results in JSON format
        # valid | {"epoch": 33, "valid_loss": "0.723", "valid_ppl": "1.65", ...}
        if l.startswith("valid | {"):
            json_string = l.split('|', 1)[-1].lstrip()
            valid_metrics = json.loads(json_string)
            datapoints.append(valid_metrics)
        # For older version of fairseq
        if l.startswith('| epoch '):
            values = _load_fairseq_metrics_inline(l)
            if datapoints and datapoints[-1]['epoch'] == values['epoch']:
                datapoints[-1].update(values)
            else:
                datapoints.append(values)
    datapoints = [{
        **params,
        **values,  # overrides 'learning rate' for instance
    } for values in datapoints]
    datapoints.sort(key=lambda d: float(d["epoch"]))
    xp = hip.Experiment.from_iterable(datapoints)
    for dp, next_dp in zip(xp.datapoints, xp.datapoints[1:]):
        next_dp.from_uid = dp.uid
    return xp


class Wav2letterLoader:
    def _parse_metrics(self, file: Path) -> tp.List[tp.Dict[str, tp.Any]]:
        # 001_perf:
        '''
# date\tkey1\tkey2...
2019-09-30\tval1\tval2...
'''
        PERF_PREFIX = 'perf_'
        lines = file.read_text(encoding="utf-8").split('\n')
        metrics: tp.List[tp.Dict[str, tp.Any]] = []
        for _, l in enumerate(lines[1:]):
            if l == '':
                continue
            epoch_metrics: tp.Dict[str, tp.Any] = {}
            for name, val in zip(lines[0].split()[1:], l.split()):
                try:
                    epoch_metrics[PERF_PREFIX + name] = float(val)
                except ValueError:
                    epoch_metrics[PERF_PREFIX + name] = val
            metrics.append(epoch_metrics)
        return metrics

    def __call__(self, uri: str) -> hip.Experiment:
        PREFIX = 'w2l://'
        if not uri.startswith(PREFIX):
            raise hip.ExperimentFetcherDoesntApply()
        uri = uri[len(PREFIX):]
        perfs = list(glob.glob(str(Path(uri) / '*_perf')))
        perfs.sort()

        prev_ckpt_name: tp.Optional[str] = None
        xp = hip.Experiment()
        for p in perfs:
            mtrics = self._parse_metrics(Path(p))
            for m in mtrics:
                ckpt_name = uri[-5:] + "_" + str(len(xp.datapoints))
                xp.datapoints.append(hip.Datapoint(
                    uid=ckpt_name,
                    from_uid=prev_ckpt_name,
                    values=m))
                prev_ckpt_name = ckpt_name
        return xp


load_wav2letter = Wav2letterLoader()


def _get_module_by_name_in_cwd(name: str) -> tp.Any:
    spec = importlib.util.spec_from_file_location(name, str(Path(os.getcwd()) / f"{name}.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore
    return module


def get_fetcher(fetcher_spec: str) -> hip.ExperimentFetcher:
    parts = fetcher_spec.split(".")
    try:
        module = importlib.import_module(".".join(parts[:-1]))
    except ModuleNotFoundError:
        if len(parts) != 2:
            raise
        module = _get_module_by_name_in_cwd(parts[0])

    return getattr(module, parts[-1])  # type: ignore


def get_fetchers(add_fetchers: tp.List[str]) -> tp.List[hip.ExperimentFetcher]:
    xp_fetchers: tp.List[hip.ExperimentFetcher] = [load_demo, load_csv, load_json, load_fairseq, load_wav2letter]
    for fetcher_spec in add_fetchers:
        xp_fetchers.append(get_fetcher(fetcher_spec))
    xp_fetchers.append(MultipleFetcher(xp_fetchers))
    return xp_fetchers
