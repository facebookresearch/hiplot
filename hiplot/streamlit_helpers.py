# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import typing as tp
import json
import warnings
from pathlib import Path

from .experiment import Experiment, _is_running_ipython


class _StreamlitHelpers:
    component: tp.Optional[tp.Callable[..., tp.Any]] = None

    @staticmethod
    def is_running_within_streamlit() -> bool:
        try:
            import streamlit as st
        except:  # pylint: disable=bare-except
            return False
        return bool(st._is_running_with_streamlit)

    @classmethod
    def create_component(cls) -> None:
        if cls.component is not None:
            return
        import streamlit as st
        try:
            import streamlit.components.v1 as components
        except ModuleNotFoundError as e:
            raise RuntimeError(f"""Your streamlit version ({st.__version__}) is too old and does not support components.
Please update streamlit with `pip install -U streamlit`""") from e
        assert st._is_running_with_streamlit

        built_path = (Path(__file__).parent / "static" / "built" / "streamlit_component").resolve()
        assert (built_path / "index.html").is_file(), f"""HiPlot component does not appear to exist in {built_path}
If you did not install hiplot using official channels (pip, conda...), maybe you forgot to build javascript files?
See https://facebookresearch.github.io/hiplot/contributing.html#building-javascript-bundle
"""
        cls.component = components.declare_component("hiplot", path=str(built_path))

    @classmethod
    def create_instance_wrapper(
            cls,
            exp: tp.Union[Experiment, str],
            ret: tp.Union[str, tp.List[str], None] = None,
            key: tp.Optional[str] = None
    ) -> tp.Any:
        cls.create_component()
        possible_returns = ['selected_uids', 'filtered_uids', 'brush_extents']
        if key is None:
            warnings.warn(r"""Creating a HiPlot component with key=None will make refreshes slower.
Please use `experiment.display_st(..., key=\"some_unique_key\")`""")
        ret_type_for_js = ret if isinstance(ret, list) else []
        if isinstance(ret, str):
            ret_type_for_js = [ret]
        for r in ret_type_for_js:
            assert r in possible_returns, f"Unknown return type {r}. Possible values: {','.join(possible_returns)}"
        assert cls.component is not None
        exp_str = exp if isinstance(exp, str) else json.dumps(exp._asdict())
        js_ret = cls.component(experiment=exp_str, ret=ret_type_for_js, key=key)  # pylint: disable=not-callable

        if js_ret is None:
            js_ret = [None] * len(ret_type_for_js)

        for idx, r in enumerate(ret_type_for_js):
            if js_ret[idx] is not None:
                continue
            # Use default value
            if r in ['selected_uids', 'filtered_uids']:
                assert not isinstance(exp, str)
                js_ret[idx] = [dp.uid for dp in exp.datapoints]
            if r == 'brush_extents':
                js_ret[idx] = []

        if ret is None:
            return None
        if isinstance(ret, str):
            return js_ret[0]
        return js_ret


class ExperimentFrozenCopy:
    def __init__(self, exp_json: str, key: str) -> None:
        self._exp_json = exp_json
        self._key = key

    def display_st(self, *, ret: tp.Union[str, tp.List[str], None] = None, key: tp.Optional[str] = None) -> None:
        if ret is not None:
            raise RuntimeError(f"""Return values (requested "{ret}") are not implemented for frozen Experiment""")
        if key is not None and key != self._key:
            raise RuntimeError(f"""Provided key "{key}" differs from the one given in the "frozen_copy" call ({self._key}).
You don't need to provide the key argument to "display_st" in a frozen Experiment, because you specified it already.""")
        if not _StreamlitHelpers.is_running_within_streamlit():
            if _is_running_ipython():
                raise RuntimeError(r"""`experiment.display_st` can only be called in a streamlit script.
It appears that you are trying to create a HiPlot visualization in ipython: you should use `display` instead of `display_st`""")
            raise RuntimeError(r"""`experiment.display_st` can only be called in a streamlit script.
To render an experiment to HTML, use `experiment.to_html(file_name)` or `html_page = experiment.to_html()`""")
        return _StreamlitHelpers.create_instance_wrapper(exp=self._exp_json, key=self._key)  # type: ignore

    def __getattr__(self, attr: str) -> None:
        raise AttributeError(
            f"""Can't access attribute "{attr}" in frozen copy of `Experiment`. The only method available is "display_st".""")

    def __setattr__(self, attr: str, val: tp.Any) -> None:
        if attr in ["_exp_json", "_key"]:
            return super().__setattr__(attr, val)
        raise AttributeError(f"""Can't set attribute "{attr}" in frozen copy of `Experiment`. The only method available is "display_st".""")
