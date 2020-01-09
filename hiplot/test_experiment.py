# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

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
    xp = Experiment.from_iterable([{"id": 1, "k": "v1"}, {"id": 2, "k": "v2"}])
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
    with pytest.raises(ExperimentValidationMissingParent):
        Experiment(datapoints=[Datapoint(uid="1", from_uid="2", values={})]).validate()
