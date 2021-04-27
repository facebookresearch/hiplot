# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.


import typing as tp

from .experiment import Datapoint


def _build_columns_list(datapoints: tp.List[Datapoint]) -> tp.List[str]:
    columns: tp.Set[str] = set()
    for dp in datapoints:
        columns = columns.union(dp.values.keys())
    for reserved_col in ['uid', 'from_uid']:
        try:
            columns.remove(reserved_col)
        except KeyError:
            pass
    return list(columns)


def compress(datapoints: tp.List[Datapoint]) -> tp.Dict[str, tp.Any]:
    columns = _build_columns_list(datapoints)
    rows: tp.List[tp.Any] = []
    for dp in datapoints:
        d: tp.List[tp.Any] = [dp.uid, dp.from_uid]
        for c in columns:
            d.append(dp.values.get(c))
        rows.append(d)
    return {
        "columns": columns,
        "rows": rows
    }
