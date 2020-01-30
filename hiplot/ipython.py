# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import uuid
import html
from typing import Any, Dict, List, Optional, Tuple
import json

import IPython.display
from ipykernel.comm import Comm
from . import experiment as exp
from .render import escapejs, make_experiment_standalone_page


class GetSelectedFailure(Exception):
    pass


def jupyter_render_iframe(page_html: str, on_load_js: str, wait_for_js_object: str, force_full_width: bool = False) -> str:
    iframe_id = "ifr_" + uuid.uuid4().hex[:6]
    container_id = "ifrcontainer_" + uuid.uuid4().hex[:6]
    js = f"""
// We assume that we have jQuery in the iframe
// but it's not necessarily the case in the notebook (jupyter lab doesnt have it :()
var is_notebook = document.body.attributes.hasOwnProperty('data-notebook-name');
var ifr = document.querySelector("#{iframe_id}");
var ifr_container = document.querySelector("#{container_id}");
var force_full_width = {json.dumps(force_full_width)};
var load_when_ready = function() {{
    var ready = false;
    try {{
        ready = ifr.contentWindow.{wait_for_js_object} !== undefined;
    }}
    catch(err) {{
    }}
    if (!ready) {{
        console.log('Not ready yet...');
        setTimeout(load_when_ready, 400);
        return;
    }}
    try {{
        {on_load_js}();
    }} finally {{
        if (!force_full_width) {{
            return;
        }}
        var currentFrameHeight = 0;
        var set_scale_dynamic = function() {{
            if (ifr.contentWindow) {{
                if(ifr.contentWindow.document.body){{
                    var frameWindowSize = ifr.contentWindow.document.body.offsetHeight;
                    if (document.all && !window.opera) {{
                        frameWindowSize = ifr.contentWindow.document.body.scrollHeight;
                    }}
                    console.log('currentFrameHeight:', currentFrameHeight, 'frameWindowSize:', frameWindowSize);
                    if (frameWindowSize < currentFrameHeight - 400 || frameWindowSize > currentFrameHeight) {{
                        console.log("Resize frame -> ", frameWindowSize);
                        ifr_container.style.height = frameWindowSize + "px";
                        ifr.style.height = frameWindowSize + 'px';
                        currentFrameHeight = frameWindowSize;
                    }}
                }}
            }}
        }};
        ifr.style.height = 'auto';
        window.setInterval(set_scale_dynamic, 1000);
    }}
}};
if (force_full_width) {{
    // Make some space
    const remove_class_names = ['prompt' /* jupyter notebook */];
    remove_class_names.forEach(function(class_name) {{
        [...ifr_container.parentNode.parentNode.getElementsByClassName(class_name)].forEach(function(e) {{
            e.remove();
        }});
    }});

    // Increase the iframe width (only for Notebook)
    if (is_notebook) {{
        var scale_to_100pct_screen = function() {{
            console.log("on resize");
            ifr_container.style.marginLeft = '0px';
            ifr_container.style.marginLeft = (- ifr_container.getBoundingClientRect().x) + 'px';
        }};
        window.addEventListener('resize', function() {{
            scale_to_100pct_screen();
        }});
        scale_to_100pct_screen();
        ifr_container.style.width = '100vw';
        ifr_container.parentNode.style.overflowX = 'visible';
    }}
}}

load_when_ready();
"""

    if not force_full_width:
        IPython.display.display(IPython.display.HTML(
            f'''<div />
        <iframe id="{iframe_id}" style="width: 100%; height: 100vh; border: 0px" srcdoc="{html.escape(page_html)}"></iframe>'''))
        IPython.display.display(IPython.display.Javascript(js))
        return iframe_id

    IPython.display.display(IPython.display.HTML(f"""<style>
        #{container_id} {{
            overflow: hidden;
            padding-top: 0px;
            position: relative;
            height: 100%;
        }}

        #{iframe_id} {{
            border: 0;
            height: 0px;
            left: 0;
            position: absolute;
            top: 0;
            width: 100%;
        }}
    </style>"""))
    IPython.display.display(IPython.display.HTML(f'''
        <div id="{container_id}">
            <iframe id="{iframe_id}" scrolling="no" srcdoc="{html.escape(page_html)}"></iframe>
        </div>'''))
    IPython.display.display(IPython.display.Javascript(js))
    return iframe_id


class IPythonExperimentDisplayed(exp.ExperimentDisplayed):
    def __init__(self, xp: exp.Experiment, comm_name: str) -> None:
        self._exp = xp
        self._num_recv = 0
        self._selected_ids: List[int] = []
        self._last_selection_id = -2
        self._last_msg: Optional[Dict[str, Any]] = None  # For debugging

        def target_func(comm: Comm, open_msg: Dict[str, Any]) -> None:  # pylint: disable=unused-argument
            # comm is the kernel Comm instance
            # msg is the comm_open message

            # Register handler for later messages
            @comm.on_msg  # type: ignore
            def _recv(msg: Dict[str, Any]) -> None:
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

    def get_selected(self) -> List[exp.Datapoint]:
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


def display_exp(xp: exp.Experiment, force_full_width: bool = False) -> IPythonExperimentDisplayed:
    comm_id = f"comm_{uuid.uuid4().hex[:6]}"
    displayed_xp = IPythonExperimentDisplayed(xp, comm_id)
    index_html = make_experiment_standalone_page(options={
        'experiment': xp._asdict(),
    })
    jupyter_render_iframe(
        page_html=index_html,
        on_load_js=f"""
(function () {{
const comm_id = {escapejs(comm_id)};
try {{
    console.log("Setting up communication channel with Jupyter: ", comm_id);
    var comm = Jupyter.notebook.kernel.comm_manager.new_comm(comm_id, {{'type': 'hello'}});
    ifr.contentWindow.globalHiPlot.setup_comm(comm);
}}
catch(err) {{
    console.warn('Unable to create Javascript <-> Python communication channel (are you in a Jupyter notebook? Jupyter labs is *not* supported!)');
}}
}})""",
        wait_for_js_object="globalHiPlot",
        force_full_width=force_full_width,
    )
    return displayed_xp
