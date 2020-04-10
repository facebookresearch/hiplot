# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import uuid
import html
import typing as t
import json

import IPython.display
from ipykernel.comm import Comm
from . import experiment as exp
from .render import escapejs, make_experiment_standalone_page


class GetSelectedFailure(Exception):
    pass


def jupyter_make_full_width(content: str) -> str:
    w_id = f"wrap_html_{uuid.uuid4().hex[:6]}"
    return f"""
<div id="{w_id}">{content}</div>
<script type="text/javascript">
(function() {{
    const elem = document.getElementById({json.dumps(w_id)});
    elem.style.width = "100vw";
    const removeElems = elem.parentElement.parentElement.getElementsByClassName("prompt");
    for (var i = 0; i < removeElems.length; ++i) {{
        removeElems[i].remove();
    }}
    elem.parentElement.style.overflowX = "visible";

    const scale_to_100pct_screen = function() {{
        elem.style.marginLeft = '0px';
        elem.style.marginLeft = (- elem.getBoundingClientRect().x) + 'px';
    }};
    window.addEventListener('resize', function() {{
        scale_to_100pct_screen();
    }});
    scale_to_100pct_screen();
}})();
</script>
"""


class IPythonExperimentDisplayed(exp.ExperimentDisplayed):
    def __init__(self, xp: exp.Experiment, comm_name: str) -> None:
        self._exp = xp
        self._num_recv = 0
        self._selected_ids: t.List[str] = []
        self._last_selection_id = -2
        self._last_msg: t.Optional[t.Dict[str, t.Any]] = None  # For debugging

        def target_func(comm: Comm, open_msg: t.Dict[str, t.Any]) -> None:  # pylint: disable=unused-argument
            # comm is the kernel Comm instance
            # msg is the comm_open message

            # Register handler for later messages
            @comm.on_msg  # type: ignore
            def _recv(msg: t.Dict[str, t.Any]) -> None:
                self._num_recv += 1
                self._last_msg = msg
                self._selected_ids = msg["content"]["data"]["selected"]
                self._last_selection_id = msg["content"]["data"]["selection_id"]

        try:
            ip: Any = get_ipython()  # type: ignore  # pylint: disable=undefined-variable
            ip.kernel.comm_manager.register_target(comm_name, target_func)
        except NameError:  # NameError: name 'get_ipython' is not defined
            # We are not in an ipython environment - for example in testing
            pass

    def get_selected(self) -> t.List[exp.Datapoint]:
        if self._num_recv == 0:
            raise GetSelectedFailure(
                """No data received from the front-end. Please make sure that:
    1. You don't call "get_selected" on the same cell
    2. The interface has loaded
    3. You are in a Jupyter notebook (Jupyter lab is *not* supported)"""
            )
        selected_set = set(self._selected_ids)
        datapoints = [i for i in self._exp.datapoints if i.uid in selected_set]
        assert len(datapoints) == len(selected_set)
        return datapoints


def display_exp(
        xp: exp.Experiment,
        force_full_width: bool = False,
        store_state_url: t.Optional[str] = None
) -> IPythonExperimentDisplayed:
    comm_id = f"comm_{uuid.uuid4().hex[:6]}"
    displayed_xp = IPythonExperimentDisplayed(xp, comm_id)
    index_html = make_experiment_standalone_page(options={
        'experiment': xp._asdict(),
        **({"persistent_state_url_prefix": store_state_url} if store_state_url is not None else {"persistent_state": None})
    })
    index_html = index_html.replace(
        "/*AFTER_SETUP_SCRIPT_INJECT*/",
        f"""/*AFTER_SETUP_SCRIPT_INJECT*/
(function () {{
const comm_id = {escapejs(comm_id)};
try {{
    console.log("Setting up communication channel with Jupyter: ", comm_id);
    var comm = Jupyter.notebook.kernel.comm_manager.new_comm(comm_id, {{'type': 'hello'}});
    hiplot_instance.setup_comm(comm);
}}
catch(err) {{
    console.warn('Unable to create Javascript <-> Python communication channel' +
        ' (are you in a Jupyter notebook? Jupyter labs is *not* supported!)');
}}
}})()
        """)

    if force_full_width:
        index_html = jupyter_make_full_width(index_html)
    IPython.display.display(IPython.display.HTML(index_html))
    return displayed_xp
