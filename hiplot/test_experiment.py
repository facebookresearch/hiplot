# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import tempfile
import pytest
from .experiment import Experiment, Datapoint, ExperimentValidationError, ExperimentValidationCircularRef, ExperimentValidationMissingParent


def test_merge() -> None:
    merged = Experiment.merge(
        {
            "xp1": Experiment(datapoints=[Datapoint(uid="1", values={"a": "b"})]),
            "xp2": Experiment(datapoints=[Datapoint(uid="1", values={"a": "c"})]),
        }
    )
    assert len(merged.datapoints) == 2, merged
    merged.validate()


def test_from_iterable() -> None:
    xp = Experiment.from_iterable([{"uid": 1, "k": "v1"}, {"uid": 2, "k": "v2"}])
    assert len(xp.datapoints) == 2
    xp.validate()
    xp._asdict()


def test_validation() -> None:
    with pytest.raises(ExperimentValidationError):
        Datapoint(uid="x", values={"uid": "y"}).validate()


def test_validation_circular_ref() -> None:
    with pytest.raises(ExperimentValidationCircularRef):
        Experiment(
            datapoints=[
                Datapoint(uid="1", from_uid="2", values={}),
                Datapoint(uid="2", from_uid="3", values={}),
                Datapoint(uid="3", from_uid="4", values={}),
                Datapoint(uid="4", from_uid="2", values={}),
            ]
        ).validate()


def test_validation_missing_parent() -> None:
    xp = Experiment(datapoints=[Datapoint(uid="1", from_uid="2", values={})])
    with pytest.raises(ExperimentValidationMissingParent):
        xp.validate()
    xp.remove_missing_parents()
    assert xp.datapoints[0].from_uid is None
    xp.validate()

def test_export_csv() -> None:
    tmpfile = tempfile.NamedTemporaryFile().name

    xp = Experiment.from_iterable([{"uid": 1, "k": "v"}, {"uid": 2, "k": "vk", "k2": "vk2"}])
    xp.to_csv(tmpfile)
    xp.validate()
    xp2 = Experiment.from_csv(tmpfile)
    xp2.validate()

def test_to_html() -> None:
    xp = Experiment.from_iterable([{"uid": 1, "k": "v"}, {"uid": 2, "k": "vk", "k2": "vk2"}])
    xp.to_html(tempfile.NamedTemporaryFile().name)