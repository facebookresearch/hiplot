# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import tempfile
import shutil
from contextlib import contextmanager
from unittest.mock import patch
import typing as tp

import pytest
import pandas as pd
import optuna

import hiplot as hip


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


def test_from_dataframe() -> None:
    df = pd.DataFrame([{"uid": 1, "k": "v1"}, {"uid": 2, "k": "v2"}])
    xp = hip.Experiment.from_dataframe(df)
    assert len(xp.datapoints) == 2
    xp.validate()
    xp._asdict()

def test_from_optuna() -> None:

    def objective(trial: "optuna.trial.Trial") -> float:
        x = trial.suggest_float("x", -1, 1)
        return x ** 2

    study = optuna.create_study()
    study.optimize(objective, n_trials=3)

    # Create a dataframe from the study.
    df = study.trials_dataframe()
    assert isinstance(df, pd.DataFrame)
    assert df.shape[0] == 3  # n_trials.
    xp = hip.Experiment.from_optuna(study)
    assert len(xp.datapoints) == 3
    xp.validate()
    xp._asdict()


def test_from_optuna_multi_objective() -> None:

    def objective(trial: "optuna.trial.Trial") -> tp.Tuple[float, float]:
        x = trial.suggest_float("x", -1, 1)
        y = trial.suggest_float("y", -1, 1)
        return x ** 2, y

    study = optuna.create_study(directions=["minimize", "minimize"])
    study.optimize(objective, n_trials=3)

    # Create a dataframe from the study.
    df = study.trials_dataframe()
    assert isinstance(df, pd.DataFrame)
    assert df.shape[0] == 3  # n_trials.
    xp = hip.Experiment.from_optuna(study)
    assert len(xp.datapoints) == 3
    xp.validate()
    xp._asdict()


def test_from_dataframe_nan_values() -> None:
    # Pandas automatically convert numeric-based columns None to NaN in dataframes
    # Pandas will also automatically convert columns with NaN from integer to floats, since NaN is considered a float
    # https://pandas.pydata.org/pandas-docs/stable/user_guide/integer_na.html

    df = pd.DataFrame(data={'uid': [1, 2, 3, 4], 'from_uid': [None, 1, 2, 3], 'a': [1, 2, 3, None], 'b': [4, 5, None, 6]})
    xp = hip.Experiment.from_dataframe(df)
    assert len(xp.datapoints) == 4
    xp.validate()
    xp._asdict()


def test_from_dataframe_none_values() -> None:
    # Pandas will keep None values in string columns
    df = pd.DataFrame(data={'uid': ["1", "2", "3", "4"], 'from_uid': [None, "1", "2", "3"],
                            'a': [23, 43, 5, None], 'b': [33, 45, None, 23]})
    xp = hip.Experiment.from_dataframe(df)
    assert len(xp.datapoints) == 4
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
    with tempfile.NamedTemporaryFile(mode="w+", encoding="utf-8") as tmpfile:
        xp = hip.Experiment.from_iterable([{"uid": 1, "k": "v"}, {"uid": 2, "k": "vk", "k2": "vk2"}])
        xp.to_csv(tmpfile)
        xp.validate()

        tmpfile.seek(0)
        xp2 = hip.Experiment.from_csv(tmpfile)
        assert len(xp2.datapoints) == 2
        xp2.validate()


def test_to_html() -> None:
    xp = hip.Experiment.from_iterable([{"uid": 1, "k": "v"}, {"uid": 2, "k": "vk", "k2": "vk2"}])
    xp.to_html(tempfile.TemporaryFile(mode="w", encoding="utf-8"))


def test_to_filename() -> None:
    dirpath = tempfile.mkdtemp()
    try:
        xp = hip.Experiment.from_iterable([{"uid": 1, "k": "v"}, {"uid": 2, "k": "vk", "k2": "vk2"}])
        xp.to_html(dirpath + "/xp.html")
        csv_path = dirpath + "/xp.csv"
        xp.to_csv(csv_path)
        hip.Experiment.from_csv(csv_path).validate()
    finally:
        shutil.rmtree(dirpath)


def test_doc() -> None:
    # EXPERIMENT_SETTINGS_SNIPPET1_BEGIN
    exp = hip.fetchers.load_demo("demo")  # Let's create a dummy experiment

    # Change column type
    exp.parameters_definition["optionA"].type = hip.ValueType.NUMERIC_LOG
    # Force a column minimum/maximum values
    exp.parameters_definition["pct_success"].force_range(0, 100)
    # Change d3 colormap (https://github.com/d3/d3-scale-chromatic) for non-categorical columns
    exp.parameters_definition["exp_metric"].colormap = "interpolateSinebow"
    # EXPERIMENT_SETTINGS_SNIPPET1_END
    exp.validate()


@contextmanager
def patch_streamlit() -> tp.Iterator[None]:
    with patch("hiplot.streamlit_helpers._StreamlitHelpers.is_running_within_streamlit", lambda: True):
        with patch("hiplot.streamlit_helpers._StreamlitHelpers.create_component", lambda: (lambda experiment, ret, key: None)):
            with patch("hiplot.streamlit_helpers._StreamlitHelpers.component"):
                yield


def test_to_streamlit() -> None:
    exp = hip.fetchers.load_demo("demo")
    with patch_streamlit():
        exp_st = exp.to_streamlit(key="k")
        ret = exp_st.display()
        assert ret is None

        exp_st = exp.to_streamlit(key="k2", ret="selected_uids")
        selected_uids = exp_st.display()
        assert selected_uids
        assert isinstance(selected_uids[0], str)

        exp_st = exp.to_streamlit(key="k3", ret=["selected_uids", "filtered_uids"])
        selected_uids, filtered_uids = exp_st.display()
        assert selected_uids
        assert filtered_uids
        assert isinstance(selected_uids[0], str)
        assert isinstance(filtered_uids[0], str)
