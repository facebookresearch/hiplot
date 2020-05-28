# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import warnings
from pathlib import Path
import typing as tp
from .experiment import ExperimentDisplayed, Experiment, Datapoint


class HiPlotStreamlitRegisterError(Exception):
    pass


def register_streamlit() -> None:
    import streamlit as st
    if not hasattr(st, 'declare_component'):
        raise HiPlotStreamlitRegisterError('Incompatible streamlit version')
    if not st._is_running_with_streamlit:
        return

    built_path = (Path(__file__).parent / "static" / "built" / "streamlit_component").resolve()
    assert (built_path / "index.html").is_file(), f"""HiPlot component does not appear to exist in {built_path}
If you did not install hiplot using official channels (pip, conda...), maybe you forgot to build javascript files?
See https://facebookresearch.github.io/hiplot/contributing.html#building-javascript-bundle
"""
    HiPlotComponent = st.declare_component(path=str(built_path))

    def create_instance_wrapper(
            f: tp.Any,
            exp: Experiment,
            ret: tp.Union[str, tp.List[str], None] = None,
            key: tp.Optional[str] = None
    ) -> tp.Any:
        possible_returns = ['selected_uids', 'filtered_uids', 'brush_extents']
        if key is None:
            warnings.warn(f"""Creating a HiPlot component with key=None will make refreshes slower.
Please use `st.hiplot(..., key=\"some_unique_key\")`""")
        ret_type_for_js = ret if isinstance(ret, list) else []
        if isinstance(ret, str):
            ret_type_for_js = [ret]
        for r in ret_type_for_js:
            assert r in possible_returns, f"Unknown return type {r}. Possible values: {','.join(possible_returns)}"
        js_ret = f(experiment=exp._asdict(), ret=ret_type_for_js, key=key)

        if js_ret is None:
            js_ret = [None] * len(ret)

        for idx, r in enumerate(ret):
            if js_ret[idx] is not None:
                continue
            # Use default value
            if r in ['selected_uids', 'filtered_uids']:
                js_ret[idx] = [dp.uid for dp in exp.datapoints]
            if r == 'brush_extents':
                js_ret[idx] = []

        if ret is None:
            return None
        if isinstance(ret, str):
            return js_ret[0]
        return js_ret
    HiPlotComponent(create_instance_wrapper)

    st.register_component("hiplot", HiPlotComponent)
