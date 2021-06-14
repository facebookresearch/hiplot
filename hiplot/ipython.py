# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import uuid
import html
import typing as t
import json
from pathlib import Path

import IPython.display
from ipykernel.comm import Comm
from . import experiment as exp
from .render import escapejs, make_experiment_standalone_page


class GetSelectedFailure(Exception):
    pass


class NotebookJSBundleInjector:
    """
    TODO: Maybe we should do something smart here. Like inject only once?
    But how to be robust to the user clearing the output of the cell where we injected the bundle?
        If he then refreshes the page, HiPlot bundle is no longer injected...
    """

    @classmethod
    def ensure_injected(cls) -> None:
        bundle = Path(__file__).parent / "static" / "built" / "hiplot.bundle.js"
        IPython.display.display(IPython.display.Javascript(f"""
{bundle.read_text("utf-8")}
// Local variables can't be accessed in other cells, so let's
// manually create a global variable
Object.assign(window, {{'hiplot': hiplot}});
"""))


def jupyter_make_full_width(content: str) -> str:
    w_id = f"wrap_html_{uuid.uuid4().hex[:6]}"
    return f"""
<div id="{w_id}">{content}</div>
<script type="text/javascript">
(function() {{
    const elem = document.getElementById({json.dumps(w_id)});
    try {{
        Jupyter.notebook.kernel; // `Jupyter` is not defined on Labs
    }} catch(err) {{
        console.warn('Option "force_full_width" is only supported on Jupyter Notebooks (Labs is not supported as the display area is larger)');
        return;
    }}
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
        self._last_data_per_type: t.Dict[str, t.Any] = {}

        def target_func(comm: Comm, open_msg: t.Dict[str, t.Any]) -> None:  # pylint: disable=unused-argument
            # comm is the kernel Comm instance
            # msg is the comm_open message

            # Register handler for later messages
            @comm.on_msg  # type: ignore
            def _recv(msg: t.Dict[str, t.Any]) -> None:
                self._num_recv += 1
                msg_data = msg["content"]["data"]
                print(msg_data)
                self._last_data_per_type[msg_data["type"]] = msg_data["data"]

        try:
            ip: Any = get_ipython()  # type: ignore  # pylint: disable=undefined-variable
            ip.kernel.comm_manager.register_target(comm_name, target_func)
        except NameError:  # NameError: name 'get_ipython' is not defined
            # We are not in an ipython environment - for example in testing
            pass

    no_data_received_error = GetSelectedFailure(
        """No data received from the front-end. Please make sure that:
    1. You don't call "get_selected" on the same cell
    2. The interface has loaded
    3. You are in a Jupyter notebook (Jupyter lab is *not* supported)"""
    )

    def get_selected(self) -> t.List[exp.Datapoint]:
        last_selected_uids = self._last_data_per_type.get("selected_uids")
        if last_selected_uids is None:
            raise self.no_data_received_error
        selected_set = set(last_selected_uids)
        datapoints = [i for i in self._exp.datapoints if i.uid in selected_set]
        assert len(datapoints) == len(selected_set)
        return datapoints

    def get_brush_extents(self) -> t.Dict[str, t.Dict[str, t.Any]]:
        last_msg = self._last_data_per_type.get("brush_extents")
        if last_msg is None:
            raise self.no_data_received_error
        return last_msg  # type: ignore


def display_exp(
        xp: exp.Experiment,
        force_full_width: bool = False,
        store_state_url: t.Optional[str] = None,
        **kwargs: t.Any
) -> IPythonExperimentDisplayed:
    comm_id = f"comm_{uuid.uuid4().hex[:6]}"
    displayed_xp = IPythonExperimentDisplayed(xp, comm_id)
    options: t.Dict[str, t.Any] = {
        **kwargs,
        'experiment': xp._asdict()
    }
    if store_state_url is not None:
        options.update({"persistentStateUrlPrefix": store_state_url})
    else:
        options.update({"persistentState": None})
    index_html = make_experiment_standalone_page(options=options)
    # Remove line that references the script bundle - prevents an HTTP error in the notebook
    index_html = index_html.replace('src="static/built/hiplot.bundle.js"', '')
    index_html = index_html.replace(
        "/*ON_LOAD_SCRIPT_INJECT*/",
        f"""/*ON_LOAD_SCRIPT_INJECT*/
const comm_id = {escapejs(comm_id)};
try {{
    console.log("Setting up communication channel with Jupyter: ", comm_id);
    const comm = Jupyter.notebook.kernel.comm_manager.new_comm(comm_id, {{'type': 'hello'}});
    var comm_message_id = 0;
    function send_data_change(type, data) {{
        comm.send({{
            'type': type,
            'message_id': comm_message_id,
            'data': data,
        }});
        comm_message_id += 1;
    }};
    Object.assign(options, {{"on_change": {{
        "selected_uids": send_data_change,
        "brush_extents": send_data_change,
    }}}});
}}
catch(err) {{
    console.warn('Unable to create Javascript <-> Python communication channel' +
        ' (are you in a Jupyter notebook? Jupyter labs is *not* supported!)');
}}
        """)

    if force_full_width:
        index_html = jupyter_make_full_width(index_html)
    NotebookJSBundleInjector.ensure_injected()
    IPython.display.display(IPython.display.HTML(index_html))
    return displayed_xp
