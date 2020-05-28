# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import time
import json
import streamlit as st
import hiplot as hip
from pathlib import Path

hip.register_streamlit()

x1, x2, x3 = st.slider('x1'), st.slider('x2'), st.slider('x3')
data = [{'dropout': 0.1, 'lr': 0.001, 'loss': 10.0, 'optimizer': 'SGD', 'x': x1},
        {'dropout': 0.15, 'lr': 0.01, 'loss': 3.5, 'optimizer': 'Adam', 'x': x2},
        {'dropout': 0.3, 'lr': 0.1, 'loss': 4.5, 'optimizer': 'Adam', 'x': x3}]
xp = hip.Experiment.from_iterable(data)


ret_val = st.hiplot(xp, ret=["filtered_uids"], key="hiplot1")
# st.sidebar.hiplot(xp, key="hpl2")
st.markdown("hiplot returned " + json.dumps(ret_val))
