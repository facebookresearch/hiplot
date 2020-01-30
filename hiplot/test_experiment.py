# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import tempfile
import pytest
from . import init as hip


def test_merge() -> None:
    merged = hip.Experiment.merge(
        {
            "xp1": hip.Experiment(datapoints=[hip.Datapoint(uid="1", values={"a": "b"})]),
            "xp2": hip.Experiment(datapoints=[hip.Datapoint(uid="1", values={"a": "c"})]),
        }
    )
    assert len(merged.datapoints) == 2, merged
    merged.validate()


def test_from_iterable() -> None:
    xp = hip.Experiment.from_iterable([{"uid": 1, "k": "v1"}, {"uid": 2, "k": "v2"}])
    assert len(xp.datapoints) == 2
    xp.validate()
    xp._asdict()


def test_validation() -> None:
    with pytest.raises(hip.ExperimentValidationError):
        hip.Datapoint(uid="x", values={"uid": "y"}).validate()


def test_validation_circular_ref() -> None:
    with pytest.raises(hip.ExperimentValidationCircularRef):
        hip.Experiment(
            datapoints=[
                hip.Datapoint(uid="1", from_uid="2", values={}),
                hip.Datapoint(uid="2", from_uid="3", values={}),
                hip.Datapoint(uid="3", from_uid="4", values={}),
                hip.Datapoint(uid="4", from_uid="2", values={}),
            ]
        ).validate()


def test_validation_missing_parent() -> None:
    xp = hip.Experiment(datapoints=[hip.Datapoint(uid="1", from_uid="2", values={})])
    with pytest.raises(hip.ExperimentValidationMissingParent):
        xp.validate()
    xp.remove_missing_parents()
    assert xp.datapoints[0].from_uid is None
    xp.validate()


def test_export_csv() -> None:
    tmpfile = tempfile.NamedTemporaryFile().name

    xp = hip.Experiment.from_iterable([{"uid": 1, "k": "v"}, {"uid": 2, "k": "vk", "k2": "vk2"}])
    xp.to_csv(tmpfile)
    xp.validate()
    xp2 = hip.Experiment.from_csv(tmpfile)
    xp2.validate()


def test_to_html() -> None:
    xp = hip.Experiment.from_iterable([{"uid": 1, "k": "v"}, {"uid": 2, "k": "vk", "k2": "vk2"}])
    xp.to_html(tempfile.NamedTemporaryFile().name)


def test_doc() -> None:
    # EXPERIMENT_SETTINGS_SNIPPET1_BEGIN
    exp = hip.fetchers.load_demo("demo")  # Let's create a dummy experiment

    # Change column type
    exp.parameters_definition["optionA"].type = hip.ValueType.NUMERIC_LOG
    # EXPERIMENT_SETTINGS_SNIPPET1_END
    # EXPERIMENT_SETTINGS_SNIPPET2_BEGIN
    # Provide configuration for the parallel plot
    exp.display_data(hip.Displays.PARALLEL_PLOT).update({
        # Hide some columns
        'hide': ['optionB'],
        # Specify the order for others
        'order': ['time'],  # Put column time first on the left
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
    exp.validate()
