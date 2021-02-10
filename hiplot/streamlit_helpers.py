# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import typing as tp
import json
import uuid
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
    def create_component(cls) -> tp.Optional[tp.Callable[..., tp.Any]]:
        if cls.component is not None:
            return cls.component
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
        return cls.component


class ExperimentStreamlitComponent:
    def __init__(self, experiment: Experiment, key: tp.Optional[str], ret: tp.Union[str, tp.List[str], None]) -> None:
        if key is None:
            warnings.warn(r"""Creating a HiPlot component with key=None will make refreshes slower.
Please use `experiment.to_streamlit(..., key=\"some_unique_key\")`""")
            key = f"hiplot_autogen_{str(uuid.uuid4())}"
        self._exp_json = json.dumps(experiment._asdict())
        self._key = key
        self._ret = ret
        self._js_default_ret = tuple(self.get_default_return_for(experiment, ret=r) for r in self.js_ret_spec)

    @property
    def js_ret_spec(self) -> tp.List[str]:
        if self._ret is None:
            return []
        elif isinstance(self._ret, str):
            return [self._ret]
        assert isinstance(self._ret, (tuple, list)), \
            "HiPlot: Invalid return type specification. Should be `None`, a string, a list or a tuple."
        return list(self._ret)

    @classmethod
    def get_default_return(cls, experiment: Experiment, ret: tp.Union[str, tp.List[str], None]) -> tp.Any:
        if ret is None:
            return None
        elif isinstance(ret, str):
            return cls.get_default_return_for(experiment, ret)
        assert isinstance(ret, (tuple, list)), "HiPlot: Invalid return type specification. Should be `None`, a string, a list or a tuple."
        return tuple(
            cls.get_default_return(experiment, r) for r in ret
        )

    @staticmethod
    def get_default_return_for(experiment: Experiment, ret: str) -> tp.Any:
        if ret == 'brush_extents':
            return ()
        elif ret in ['selected_uids', 'filtered_uids']:
            return tuple(dp.uid for dp in experiment.datapoints)
        else:
            raise RuntimeError(f"HiPlot: Unknown return type \"{ret}\"")

    def display(self) -> tp.Any:
        if not _StreamlitHelpers.is_running_within_streamlit():
            if _is_running_ipython():
                raise RuntimeError(r"""`experiment.display_st` can only be called in a streamlit script.
It appears that you are trying to create a HiPlot visualization in ipython: you should use `display` instead of `display_st`""")
            raise RuntimeError(r"""`experiment.display_st` can only be called in a streamlit script.
To render an experiment to HTML, use `experiment.to_html(file_name)` or `html_page = experiment.to_html()`""")

        component = _StreamlitHelpers.create_component()

        js_ret = component(experiment=self._exp_json, ret=self.js_ret_spec, key=self._key)  # type: ignore

        if js_ret is None:
            js_ret = self._js_default_ret
        assert len(self._js_default_ret) == len(
            js_ret), f"JS returned {len(js_ret)} fields, expected {len(self._js_default_ret)} (ret={self._ret})"

        for idx in range(len(self.js_ret_spec)):
            if js_ret[idx] is not None:
                continue
            # Use default value
            js_ret = self._js_default_ret[idx]

        if not js_ret:
            return None
        if isinstance(self._ret, str):
            return js_ret[0]
        return js_ret
