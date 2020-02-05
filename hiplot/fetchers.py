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
from typing import Dict, List, Optional, Callable, Any
from pathlib import Path

from . import experiment as hip


class NoFetcherFound(Exception):
    pass


def load_xp_with_fetchers(fetchers: List[hip.ExperimentFetcher], uri: str) -> hip.Experiment:
    for f in fetchers:
        try:
            return f(uri)
        except hip.ExperimentFetcherDoesntApply:
            continue
    raise NoFetcherFound(uri)


class MultipleFetcher:
    MULTI_PREFIX = "multi://"

    def __init__(self, fetchers: List[hip.ExperimentFetcher]) -> None:
        self.fetchers: List[hip.ExperimentFetcher] = fetchers + [self]

    def __call__(self, uri: str) -> hip.Experiment:
        if not uri.startswith(self.MULTI_PREFIX):
            raise hip.ExperimentFetcherDoesntApply()
        defs = json.loads(uri[len(self.MULTI_PREFIX):])
        if isinstance(defs, list):
            return hip.Experiment.merge({v: load_xp_with_fetchers(self.fetchers, v) for v in defs})
        return hip.Experiment.merge({k: load_xp_with_fetchers(self.fetchers, v) for k, v in defs.items()})


# Demos from the README. If one of those is modified, please modify the readme as well
def demo_change_column_properties() -> hip.Experiment:
    data = [{"param": 1, "loss": 10, "hidden_field": "value1", "c": "red"}, {"param": 2, "loss": 5, "hidden_field": "value2", "c": "black"}]
    exp = hip.Experiment.from_iterable(data)
    exp.parameters_definition["c"].colors = {"red": "rgb(255, 0, 0)", "black": "rgb(0, 0, 0)"}
    exp.parameters_definition["loss"].type = hip.ValueType.NUMERIC_LOG
    exp.display_data(hip.Displays.PARALLEL_PLOT).update({
        'hide': ['hidden_field'],   # This column won't appear in the parallel plot
        'order': ['c']              # Column `c` will be displayed first the in parallel plot
    })
    return exp


def demo_basic_usage() -> hip.Experiment:
    data = [{'dropout': 0.1, 'lr': 0.001, 'loss': 10.0, 'optimizer': 'SGD'},
            {'dropout': 0.15, 'lr': 0.01, 'loss': 3.5, 'optimizer': 'Adam'},
            {'dropout': 0.3, 'lr': 0.1, 'loss': 4.5, 'optimizer': 'Adam'}]
    return hip.Experiment.from_iterable(data)


def demo_line_xy() -> hip.Experiment:
    # DEMO_LINE_XY_BEGIN
    exp = hip.Experiment()
    exp.display_data(hip.Displays.XY).update({
        'axis_x': 'generation',
        'axis_y': 'loss',
    })
    for i in range(200):
        dp = hip.Datapoint(
            uid=str(i),
            values={
                'generation': i,
                'param': 10 ** random.uniform(-1, 1),
                'loss': random.uniform(-5, 5)
            })
        if i > 10:
            from_parent = random.choice(exp.datapoints[-10:])
            dp.from_uid = from_parent.uid  # <-- Connect the parent to the child
            dp.values['loss'] += from_parent.values['loss']  # type: ignore
            dp.values['param'] *= from_parent.values['param']  # type: ignore
        exp.datapoints.append(dp)
    # DEMO_LINE_XY_END
    return exp


def demo_bug_uid() -> hip.Experiment:
    return hip.Experiment.from_iterable([{'a': 1, 'b': 2, 'uid': 50.0}, {'a': 2, 'b': 3, 'uid': 49.33}])


def demo(n: int = 100) -> hip.Experiment:
    xp = hip.Experiment()
    xp.display_data(hip.Displays.XY).update({
        'axis_x': 'time',
        'axis_y': 'exp_metric',
    })

    # Some fake PBT-ish data
    def fake_params() -> Dict[str, hip.DisplayableType]:
        r = random.random()
        p: Dict[str, hip.DisplayableType] = {
            "lr": 10 ** random.uniform(-5, 0),
            "seed": random.uniform(0, 10),
            "name": uuid.uuid4().hex[:6],
            "optimizer": random.choice(["sgd", "adam", "adamw"]),
            "r": r,
            "c": random.choice(["red", "green", "black"]),
        }
        if r > 0.3:
            p["optionA"] = random.uniform(1, 5)
        else:
            p["optionB"] = random.uniform(1, 5)

        if r < 0.2:
            p["pctile"] = -1.0
        elif r < 0.5:
            p["pctile"] = random.uniform(-1.0, 10.0)
        elif r < 0.8:
            p["pctile"] = 10 ** random.uniform(1, 2)
        else:
            p["pctile"] = random.uniform(100, 101)

        if random.random() > 0.3:
            p["special_values"] = random.uniform(1, 5)
        else:
            p["special_values"] = random.choice([math.inf, -math.inf, math.nan])
        return p

    def fake_metrics(t: float) -> Dict[str, hip.DisplayableType]:
        return {
            "exp_metric": 10 ** random.uniform(-5, 0),
            "pct_success": random.uniform(10, 90),
            "chkpt": uuid.uuid4().hex[:6],
            "time": t + random.uniform(-0.2, 0.2),
            "force_numericlog": random.uniform(1, 100),
        }

    current_pop: List[Dict[str, Any]] = [dict(uid=f"init{i}", params=fake_params(), last_ckpt_uid=None) for i in range(10)]
    continue_num = 0
    for time in range(n):
        # All drop checkpoints
        for p in current_pop:
            ckpt_uid = f"{p['uid']}_{uuid.uuid4().hex[:6]}"
            xp.datapoints.append(hip.Datapoint(uid=ckpt_uid, from_uid=p['last_ckpt_uid'], values={**p['params'], **fake_metrics(time)}))
            p['last_ckpt_uid'] = ckpt_uid

        # Randomly drop some
        current_pop = [p for p in current_pop if random.random() > 0.3]

        # Respawn as needed
        for _ in range(10 - len(current_pop)):
            continue_num += 1
            parent = random.choice(xp.datapoints[-10:])
            current_pop.append(dict(uid=f"continue{continue_num}", params=fake_params(), last_ckpt_uid=parent.uid))
    xp.parameters_definition["c"].colors = {"red": "rgb(255, 0, 0)", "green": "rgb(0, 255, 0)", "black": "rgb(0, 0, 0)"}
    xp.parameters_definition["force_numericlog"].type = hip.ValueType.NUMERIC_LOG
    xp.parameters_definition["pctile"].type = hip.ValueType.NUMERIC_PERCENTILE
    return xp


def demo_force_scale() -> hip.Experiment:
    xp = hip.Experiment()
    for _ in range(100):
        values = [abs(random.gauss(0.0, 1.0)) for _ in range(4)]
        xp.datapoints.append(hip.Datapoint({
            f"value{i}": v / sum(values)
            for i, v in enumerate(values)
        }))
    for i in range(4):
        xp.parameters_definition[f"value{i}"].force_range(0.0, 1.0)
    return xp

README_DEMOS: Dict[str, Callable[[], hip.Experiment]] = {
    "demo": demo,
    "demo_big": lambda: demo(1000),
    "demo_change_column_properties": demo_change_column_properties,
    "demo_basic_usage": demo_basic_usage,
    "demo_line_xy": demo_line_xy,
    "demo_bug_uid": demo_bug_uid,
    "demo_force_scale": demo_force_scale,
}


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


def load_fairseq(uri: str) -> hip.Experiment:
    # pylint:disable=too-many-locals
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

    xp = hip.Experiment()
    epoch_to_dp: Dict[int, hip.Datapoint] = {}
    params: Dict[str, Any] = {}
    for l in lines:
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
        if l.startswith('| epoch'):
            l = l.lstrip('| epoch')
            epoch = int(l[:3])
            if epoch not in epoch_to_dp:
                dp = hip.Datapoint(uid=str(epoch), values={"epoch": epoch, **params},
                                   from_uid=None if epoch - 1 not in epoch_to_dp else str(epoch - 1))
                epoch_to_dp[epoch] = dp
                xp.datapoints.append(dp)
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
                    epoch_to_dp[epoch].values[key] = float(value)
                except ValueError:
                    epoch_to_dp[epoch].values[key] = value
    return xp


class Wav2letterLoader:
    def _parse_metrics(self, file: Path) -> List[Dict[str, Any]]:
        # 001_perf:
        '''
# date\tkey1\tkey2...
2019-09-30\tval1\tval2...
'''
        PERF_PREFIX = 'perf_'
        lines = file.read_text(encoding="utf-8").split('\n')
        metrics: List[Dict[str, Any]] = []
        for _, l in enumerate(lines[1:]):
            if l == '':
                continue
            epoch_metrics: Dict[str, Any] = {}
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

        prev_ckpt_name: Optional[str] = None
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


def _get_module_by_name_in_cwd(name: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, str(Path(os.getcwd()) / f"{name}.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore
    return module


def get_fetchers(add_fetchers: List[str]) -> List[hip.ExperimentFetcher]:
    xp_fetchers: List[hip.ExperimentFetcher] = [load_demo, load_csv, load_json, load_fairseq, load_wav2letter]
    for fetcher_spec in add_fetchers:
        parts = fetcher_spec.split(".")
        try:
            module = importlib.import_module(".".join(parts[:-1]))
        except ModuleNotFoundError:
            if len(parts) != 2:
                raise
            module = _get_module_by_name_in_cwd(parts[0])

        fetcher = getattr(module, parts[-1])
        xp_fetchers.append(fetcher)
    xp_fetchers.append(MultipleFetcher(xp_fetchers))
    return xp_fetchers
