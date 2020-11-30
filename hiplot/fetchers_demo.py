# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import uuid
import random
import math
import time
import typing as t

from . import experiment as hip

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
                'loss': random.uniform(-5, 5),
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
    def fake_params() -> t.Dict[str, hip.DisplayableType]:
        r = random.random()
        p: t.Dict[str, hip.DisplayableType] = {
            "lr": 10 ** random.uniform(-5, 0),
            "seed": random.uniform(0, 10),
            "name": uuid.uuid4().hex[:6],
            "optimizer": random.choice(["sgd", "adam", "adamw"]),
            "r": r,
            "c": random.choice(["red", "green", "black"]),
        }
        if r < 0.1:
            del p['optimizer']
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

    def fake_metrics(tm: float) -> t.Dict[str, hip.DisplayableType]:
        return {
            "exp_metric": 10 ** random.uniform(-5, 0),
            "pct_success": random.uniform(10, 90),
            "chkpt": uuid.uuid4().hex[:6],
            "time": tm + random.uniform(-0.2, 0.2),
            "force_numericlog": random.uniform(1, 100),
            'timestamp': int(time.time() + (task_idx * 2000)),
        }

    current_pop: t.List[t.Dict[str, t.Any]] = [dict(uid=f"init{i}", params=fake_params(), last_ckpt_uid=None) for i in range(10)]
    continue_num = 0
    for task_idx in range(n):
        # All drop checkpoints
        for p in current_pop:
            ckpt_uid = f"{p['uid']}_{uuid.uuid4().hex[:6]}"
            xp.datapoints.append(hip.Datapoint(uid=ckpt_uid, from_uid=p['last_ckpt_uid'], values={**p['params'], **fake_metrics(task_idx)}))
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
    xp.parameters_definition["timestamp"].type = hip.ValueType.TIMESTAMP
    return xp


def demo_customize() -> hip.Experiment:
    exp = demo()
    # EXPERIMENT_SETTINGS_SNIPPET2_BEGIN
    # Provide configuration for the parallel plot
    exp.display_data(hip.Displays.PARALLEL_PLOT).update({
        # Hide some columns in the parallel plot
        'hide': ['optionB'],
        # Specify the order for others
        'order': ['time'],  # Put column time first on the left
    })

    # Provide configuration for the table with all the rows
    exp.display_data(hip.Displays.TABLE).update({
        # Don't display `uid` and `from_uid` columns to the user
        'hide': ['uid', 'from_uid'],
        # In the table, order rows by default
        'order_by': [['pct_success', 'desc']]
    })

    # Provide configuration for the XY graph
    exp.display_data(hip.Displays.XY).update({
        # Default X axis for the XY plot
        'axis_x': 'time',
        # Default Y axis
        'axis_y': 'lr',
        # Configure lines
        'lines_thickness': 1.0,
        'lines_opacity': 0.1,
        # Configure dots
        'dots_thickness': 2.0,
        'dots_opacity': 0.3,
    })
    # EXPERIMENT_SETTINGS_SNIPPET2_END
    return exp


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


def demo_distribution(**kwargs: t.Any) -> hip.Experiment:
    xp = hip.Experiment.from_iterable([{
        'cat': random.choice(["a", "b", "c", "d", "e", "f", "g", "h"]),
        'numeric': random.uniform(0.0, 1.0),
    } for i in range(1000)])
    xp.display_data(hip.Displays.DISTRIBUTION).update(kwargs)
    return xp


def demo_bool() -> hip.Experiment:
    return hip.Experiment.from_iterable([
        {"bool": True},
        {"bool": False}
    ])


def demo_color_interpolate() -> hip.Experiment:
    exp = demo()
    exp.parameters_definition["exp_metric"].colormap = "interpolateSinebow"
    return exp


def demo_color_scheme_ylrd() -> hip.Experiment:
    exp = demo()
    exp.parameters_definition["exp_metric"].colormap = "schemeYlOrRd"
    return exp


def demo_color_scheme_accent() -> hip.Experiment:
    exp = demo()
    exp.parameters_definition["exp_metric"].colormap = "schemeAccent"
    return exp


def demo_axis_style() -> hip.Experiment:
    data: t.List[t.Dict[str, t.Any]] = []
    for _ in range(100):
        data.append({
            **{
                f'param{i}': random.uniform(0, 1)
                for i in range(6)
            },
            'loss': random.uniform(0, 100),
            'metric': 10 ** random.uniform(0, 10)
        })
    xp = hip.Experiment.from_iterable(data)
    for i in range(6):
        xp.parameters_definition[f"param{i}"].label_css = "badge badge-pill badge-secondary"
    xp.parameters_definition["loss"].label_css = "badge badge-pill badge-primary"
    xp.parameters_definition["metric"].label_css = "badge badge-pill badge-info"
    return xp


def demo_categorical() -> hip.Experiment:
    data: t.List[t.Dict[str, t.Any]] = []
    for _ in range(100):
        data.append({
            'cat_num_05': random.randint(0, 5),
            'cat_num_15': random.randint(0, 10),
            'cat_num_25': random.randint(0, 25),
            'cat_str_05': f's{random.randint(0, 5)}',
            'cat_str_15': f's{random.randint(0, 15)}',
            'cat_str_25': f's{random.randint(0, 25)}',
        })
    xp = hip.Experiment.from_iterable(data)
    for param in ["cat_num_05", "cat_num_15", "cat_num_25"]:
        xp.parameters_definition[param].type = hip.ValueType.CATEGORICAL
    xp.colorby = 'cat_num_25'
    return xp


def demo_long_names() -> hip.Experiment:
    return hip.Experiment.from_iterable([
        {
            'some very very long name for a field': random.randint(0, 5),
            'this one is also very long': random.randint(0, 10),
            'another.long.one.but.with.dots': random.randint(0, 25),
        }
        for _ in range(100)
    ])


def demo_force_constant_pplot() -> hip.Experiment:
    exp = hip.Experiment.from_iterable([
        {'uid': 123, 'a': 1, 'b': 3},
        {'uid': 345, 'a': 2, 'b': 3}
    ])
    exp.parameters_definition["b"].force_range(0, 100)
    return exp


README_DEMOS: t.Dict[str, t.Callable[[], hip.Experiment]] = {
    "demo": demo,
    "demo_big": lambda: demo(1000),
    "demo_change_column_properties": demo_change_column_properties,
    "demo_basic_usage": demo_basic_usage,
    "demo_line_xy": demo_line_xy,
    "demo_bug_uid": demo_bug_uid,
    "demo_force_scale": demo_force_scale,
    "demo_distribution_cat": lambda: demo_distribution(axis="cat"),
    "demo_distribution_num": lambda: demo_distribution(axis="numeric"),
    "demo_distribution_num_100bins": lambda: demo_distribution(axis="numeric", nbins=100),
    "demo_bool": demo_bool,
    "demo_color_interpolate": demo_color_interpolate,
    "demo_color_scheme_ylrd": demo_color_scheme_ylrd,
    "demo_color_scheme_accent": demo_color_scheme_accent,
    "demo_axis_style": demo_axis_style,
    "demo_categorical": demo_categorical,
    "demo_customize": demo_customize,
    "demo_long_names": demo_long_names,
    "demo_force_constant_pplot": demo_force_constant_pplot,
}
