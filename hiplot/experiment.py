# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import csv
import uuid
import json
import warnings
from abc import ABCMeta, abstractmethod
from enum import Enum
from collections import defaultdict
from pathlib import Path
import typing as tp

if tp.TYPE_CHECKING:
    import pandas as pd
    from .streamlit_helpers import ExperimentStreamlitComponent

DisplayableType = tp.Union[bool, int, float, str]


class ExperimentValidationError(Exception):
    pass


class ExperimentValidationCircularRef(ExperimentValidationError):
    pass


class ExperimentValidationMissingParent(ExperimentValidationError):
    pass


class _DictSerializable:
    """
    All classes that are transmitted to Javascript must subclass this
    """

    def _asdict(self) -> tp.Dict[str, tp.Any]:
        return self.__dict__


class ValueType(Enum):
    """
    Defines how we render a column (scaling, and color scheme)
    """
    CATEGORICAL = 'categorical'                 #: Categorical value
    NUMERIC = 'numeric'                         #: Numeric value on a linear scale. Supports integers, floats, NaNs and inf
    NUMERIC_LOG = 'numericlog'                  #: Same as :attr:`hiplot.ValueType.NUMERIC`, displayed on a logarithmic scale.
    NUMERIC_PERCENTILE = 'numericpercentile'    #: Same as :attr:`hiplot.ValueType.NUMERIC`, displayed on a percentile scale.
    TIMESTAMP = 'timestamp'                     #: Timestamps in seconds (only integers)


class Displays:
    """
    See :meth:`Experiment.display_data` and :ref:`frontendRenderingSettings`
    """
    PARALLEL_PLOT = 'PARALLEL_PLOT'             #: Parallel plot data
    XY = 'XY'                                   #: XY scatter/line plot data
    TABLE = 'TABLE'                             #: Rows table data
    DISTRIBUTION = 'DISTRIBUTION'               #: Distribution plot data


def validate_colormap(cm: tp.Optional[str]) -> None:
    VALID_MODIFIERS = ["inverse"]
    if cm is None:
        return
    cm_modifiers = cm.split('#', 1)
    cm = cm_modifiers[0]
    # We don't want `d3.interpolateTurbo` but just `interpolateTurbo`
    if cm is not None and not cm.startswith("interpolate") and not cm.startswith("scheme"):
        raise ExperimentValidationError(f"""Invalid colormap `{cm}`.
Valid colormaps can be found in https://github.com/d3/d3-scale-chromatic. Their name starts with `interpolate` or `scheme`.
Examples include `interpolateSpectral`, `interpolateViridis`, `interpolateSinebow`, `schemeYlOrRd`
""")
    if len(cm_modifiers) > 1:
        for modifier in cm_modifiers[1].split(","):
            if modifier not in VALID_MODIFIERS:
                raise ExperimentValidationError(f"""Invalid colormap modifier `{modifier}`.
Valid colormaps modifiers: {','.join(VALID_MODIFIERS)}
""")


class ValueDef(_DictSerializable):
    """
    Provides a custom type, color, etc.. for a column.

    :ivar type: See :attr:`hiplot.ValueType` for possible values
    :ivar colors: Categorical scales only: mapping from value to HTML color (either :code:`rgb(R, G, B)` or :code:`#RRGGBB`)
    :ivar colormap: Numerical scales only: `D3 scale <https://github.com/d3/d3-scale-chromatic>`_ to use
        (default scale is `interpolateTurbo <https://github.com/d3/d3-scale-chromatic#interpolateTurbo>`_).
        For example :code:`"interpolateSinebow"`.
        To inverse the colormap, append `#inverse` to the name (eg :code:`"interpolateSinebow#inverse"`)
    :ivar label_css: Space-separated bootstrap CSS classes to apply on the label when supported

    See :attr:`hiplot.Experiment.parameters_definition`
    """

    def __init__(
            self,
            value_type: tp.Optional[ValueType] = None,
            colors: tp.Optional[tp.Dict[tp.Any, str]] = None,
            colormap: tp.Optional[str] = None,
            label_css: tp.Optional[str] = None
    ) -> None:
        self.type = value_type
        self.colors = colors
        self.colormap = colormap
        self.label_css = label_css
        self.force_value_min: tp.Optional[float] = None
        self.force_value_max: tp.Optional[float] = None

    def force_range(self, minimum: float, maximum: float) -> "ValueDef":
        """
        Enforces the range of the column.
        """
        self.force_value_min = minimum
        self.force_value_max = maximum
        return self

    def validate(self) -> None:
        if self.colors is not None:
            for k, v in self.colors.items():
                if not v.startswith("rgb(") and not v.startswith("hsl(") and not v.startswith("#"):
                    raise ExperimentValidationError(
                        f'Invalid color {v} for value {k}. Expected color to start with "rgb(", "hsl(", or "#"'
                    )
        validate_colormap(self.colormap)

    def _asdict(self) -> tp.Dict[str, tp.Any]:
        return {
            "type": self.type.value if self.type is not None else None,
            "colors": self.colors,
            "colormap": self.colormap,
            "force_value_min": self.force_value_min,
            "force_value_max": self.force_value_max,
            "label_css": self.label_css,
        }


class Datapoint(_DictSerializable):
    """
    A datapoint represents a single measurement of metrics - for instance a model checkpoint that is evaluated.
    It can have a parent if it originates from another one (offspring).


    :ivar uid: A unique identifier for this datapoint
    :ivar values: A dictionary with arbitrary metrics/values
    :ivar from_uid: The uid of the parent :class:`Datapoint` (tp.Optional)

    :Example:

    .. code-block:: python

        import hiplot as hip
        dp1 = hip.Datapoint(uid="parent", values={"loss": 0.0})
        dp2 = hip.Datapoint(uid="child", from_uid="parent", values={
            "loss": 1.0,
            "another_metric": 0.0  # Different datapoints can have different metrics
        })
        hip.Experiment(datapoints=[dp1, dp2]).display()  # Render in an ipython notebook
    """

    def __init__(self, values: tp.Dict[str, DisplayableType], *, uid: tp.Optional[str] = None, from_uid: tp.Optional[str] = None) -> None:
        self.uid = uid if uid is not None else str(uuid.uuid4())
        self.values = values
        self.from_uid = from_uid

    def validate(self) -> None:
        """
        Makes sure this object is valid - throws an :class:`hiplot.ExperimentValidationError` exception otherwise.
        """
        for reserved_kw in ["uid", "from_uid"]:
            if reserved_kw in self.values:
                raise ExperimentValidationError(f'Datapoint {self.uid} contains a value for "{reserved_kw}"')


def _is_running_ipython() -> bool:
    try:
        get_ipython()  # type: ignore
        return True
    except NameError:
        return False


class Experiment(_DictSerializable):
    """
    Object that can be rendered by HiPlot. It essential contains a list of metrics, but also some options on how to render it.

    See :meth:`Experiment.display` to display an :class:`Experiment` in an ipython notebook.

    :ivar datapoints: All the measurements we have. One datapoint corresponds to one line in the parallel plot and to one line in the table.
    :ivar parameters_definition: Characteristics of the columns (ordering, type, etc...)

    :Example:

    .. code-block:: python

        import hiplot as hip
        data = [{'param': 1, 'loss': 10, 'hidden_field': 'value1', 'c': 'red'},
            {'param': 2, 'loss': 5, 'hidden_field': 'value2', 'c': 'black'}]
        exp = hip.Experiment.from_iterable(data)

    """

    def __init__(self,
                 datapoints: tp.Optional[tp.List[Datapoint]] = None,
                 parameters_definition: tp.Optional[tp.Dict[str, ValueDef]] = None,
                 colormap: tp.Optional[str] = None,
                 ) -> None:
        self.datapoints = datapoints if datapoints is not None else []
        self.parameters_definition = parameters_definition if parameters_definition is not None else defaultdict(ValueDef)
        self.colormap = colormap if colormap is not None else "interpolateTurbo"
        self.colorby: tp.Optional[str] = None
        self._display_data: tp.Dict[str, tp.Dict[str, tp.Any]] = {}
        self._compress: bool = False

    def validate(self) -> "Experiment":
        """
        Makes sure that this object is valid. Raises a :class:`hiplot.ExperimentValidationError` otherwise.
        Experiments with circular references, non-existent parents, or without datapoints are invalid.
        """
        seen: tp.Set[str] = set()
        dp_lookup: tp.Dict[str, Datapoint] = {dp.uid: dp for dp in self.datapoints}
        for p in self.datapoints:
            if p.uid not in seen:
                seen_now: tp.Set[str] = {p.uid}
                dp = p
                while dp.from_uid is not None and dp.from_uid not in seen:
                    if dp.from_uid in seen_now:
                        raise ExperimentValidationCircularRef(f"Circular reference in {p} parents ({len(seen_now)}-th parent)")
                    seen_now.add(dp.from_uid)
                    if dp.from_uid not in dp_lookup:
                        raise ExperimentValidationMissingParent(f"Datapoint ({dp.uid}) parent ({dp.from_uid}) not found")
                    dp = dp_lookup[dp.from_uid]
                seen |= seen_now
            p.validate()
        if not self.datapoints:
            raise ExperimentValidationError('Not a single datapoint')
        validate_colormap(self.colormap)
        return self

    def display(self, force_full_width: bool = False, store_state_key: tp.Optional[str] = None, **kwargs: tp.Any) -> "ExperimentDisplayed":
        """
        Displays an experiment in an ipython notebook.

        :param force_full_width: allows to force to have 100% width on Jupyter Notebooks only.
        :param store_state_key: a string identifier for the HiPlot instance.
            If not ``None``, HiPlot will store dynamic modifications (removing/reordering columns...)
            in the URL, and restore them when calling ``display`` with the same value for ``store_state_key`` - see :ref:`tutoNotebookState`
        :returns: An :class:`ExperimentDisplayed` object that can be used to interact with the visualization
            - only implemented for Jupyter notebook.
            See :ref:`tutonotebookdisplayedexperiment`
        """
        from .streamlit_helpers import _StreamlitHelpers  # pylint: disable=cyclic-import
        if not _is_running_ipython():
            if _StreamlitHelpers.is_running_within_streamlit():
                raise RuntimeError(r"""`experiment.display` can only be called with ipython.
It appears that you are trying to create a HiPlot visualization in Streamlit: you should use `display_st`""")
            raise RuntimeError(r"""`display` can only be called on an ipython context. Are you in a notebook?
- To render an experiment to HTML, use `experiment.to_html(file_name)` or `html_page = experiment.to_html()`
- To render an experiment in Streamlit, use `experiment.display_st`""")
        from .ipython import display_exp  # pylint: disable=cyclic-import
        self.validate()
        return display_exp(self, force_full_width=force_full_width, store_state_url=store_state_key, **kwargs)

    # pylint: disable=function-redefined
    @tp.overload
    def display_st(self, *, ret: str, key: tp.Optional[str] = None) -> tp.Any:
        pass

    @tp.overload
    def display_st(self, *, ret: tp.List[str], key: tp.Optional[str] = None) -> tp.List[tp.Any]:
        pass

    @tp.overload
    def display_st(self, *, key: tp.Optional[str] = None) -> None:
        pass

    def display_st(self, *, ret: tp.Union[str, tp.List[str], None] = None, key: tp.Optional[str] = None) -> tp.Any:
        """
        Displays an experiment in a Streamlit app - see :ref:`tutoStreamlit`

        This function can be pretty slow, see :ref:`tutoStreamlitCache` to learn how to make it faster.

        :param key: Unique key for the streamlit component. It is strongly recommended to give some unique string.
        :param ret: Specify what HiPlot should return.
        :returns: Return value depends on ``ret``

        :Example:

        .. code-block:: python

            exp.display_st(key="hiplot1")
            brush_extents = exp.display_st(key="hiplot2", ret="brush_extents")
            brush_extents, selected_uids = exp.display_st(key="hiplot3", ret=["brush_extents", "selected_uids"])

        """
        return self.to_streamlit(ret=ret, key=key).display()

    # pylint: enable=function-redefined

    def to_streamlit(self, key: tp.Optional[str] = None, ret: tp.Union[str, tp.List[str], None] = None) -> "ExperimentStreamlitComponent":
        """
        Streamlit only:
        creates a copy of the Experiment that you can cache,
        which only exposes the `display_st` method - see :ref:`tutoStreamlitCache`

        :param key: Unique key for the streamlit component.
        :param ret: Specify what HiPlot should return.
        :returns: A `component` object that be rendered with `component.display()`

        :Example:

        .. code-block:: python

            import streamlit as st
            import hiplot as hip

            @st.cache
            def get_experiment():
                # Create your hiplot experiment as usual
                big_exp = hip.Experiment.from_iterable(...)
                # ... and cache the component
                return big_exp.to_streamlit(key="hipl", ret=["brush_extents", "selected_uids"])

            exp = get_experiment() # This will be cached the second time
            brush_extents, selected_uids = exp.display()

        """

        from . import streamlit_helpers  # pylint: disable=cyclic-import

        if not streamlit_helpers._StreamlitHelpers.is_running_within_streamlit():
            if _is_running_ipython():
                raise RuntimeError(r"""`experiment.to_streamlit` can only be called in a streamlit script.
It appears that you are trying to create a HiPlot visualization in ipython: you should use `display` instead of `to_streamlit`""")
            raise RuntimeError(r"""`experiment.to_streamlit` can only be called in a streamlit script.
To render an experiment to HTML, use `experiment.to_html(file_name)` or `html_page = experiment.to_html()`""")
        return streamlit_helpers.ExperimentStreamlitComponent(self, key=key, ret=ret)

    def to_html(self, file: tp.Optional[tp.Union[Path, str, tp.IO[str]]] = None, **kwargs: tp.Any) -> str:
        """
        Returns the content of a standalone .html file that displays this experiment
        without any dependency to HiPlot server or static files.

        :param file: Path/handle to a file to write (optional)
        :returns: A standalone HTML code to display this Experiment.
        """
        from .render import make_experiment_standalone_page, html_inlinize

        self.validate()
        html = make_experiment_standalone_page(options={
            **kwargs,
            'experiment': self._asdict()
        })
        html = html_inlinize(html)
        if file is not None:
            if isinstance(file, (Path, str)):
                Path(file).write_text(html, encoding="utf-8")
            else:
                file.write(html)
        return html

    def to_csv(self, file: tp.Union[Path, str, tp.IO[str]]) -> None:
        """
        Dumps this Experiment as a .csv file.
        Information about display_data, parameters definition will be lost.

        :param file: Path/handle to a file to write
        """
        if isinstance(file, (Path, str)):
            with Path(file).open("w", encoding="utf-8") as csvfile:
                return self._to_csv(csvfile)
        else:
            return self._to_csv(file)

    def _to_csv(self, fh: tp.IO[str]) -> None:
        fieldnames: tp.Set[str] = set()
        for dp in self.datapoints:
            for f in dp.values.keys():
                fieldnames.add(f)
        writer = csv.DictWriter(fh, fieldnames=["uid", "from_uid"] + sorted(list(fieldnames)))
        writer.writeheader()
        for dp in self.datapoints:
            writer.writerow({
                **dp.values,
                "uid": dp.uid,
                "from_uid": dp.from_uid,
            })

    def _asdict(self) -> tp.Dict[str, tp.Any]:
        data: tp.Dict[str, tp.Any] = {
            "parameters_definition": {k: v._asdict() for k, v in self.parameters_definition.items()},
            "colormap": self.colormap,
            "colorby": self.colorby,
            "display_data": self._display_data,
        }
        if self._compress:
            from .compress import compress
            data["datapoints_compressed"] = compress(self.datapoints)
        else:
            data["datapoints"] = [d._asdict() for d in self.datapoints]
        return data

    def remove_missing_parents(self) -> "Experiment":
        """
        Sets :attr:`hiplot.Datapoint.from_uid` to None when set to a non-existing Datapoint.
        """
        existing_dp: tp.Set[str] = set((dp.uid for dp in self.datapoints))
        for dp in self.datapoints:
            if dp.from_uid not in existing_dp:
                dp.from_uid = None
        return self

    def display_data(self, plugin: str) -> tp.Dict[str, tp.Any]:
        """
        Retrieve data dictionary for a plugin, which can be modified.

        :param plugin: Name of the plugin

        :Example:

        .. code-block:: python

            exp.display_data(hip.Displays.XY).update({
                "axis_x": "time",
                "axis_y": "loss"
            })

        """
        return self._display_data.setdefault(plugin, {})

    @staticmethod
    def from_iterable(it: tp.Iterable[tp.Dict[str, tp.Any]]) -> "Experiment":
        """
        Creates a HiPlot experiment from an iterable/list of dictionnaries.
        This is the easiest way to generate an `hiplot.Experiment` object.

        :param it: A list (or iterable) of dictionnaries

        :Example:

        >>> import hiplot as hip
        >>> hip.Experiment.from_iterable([{"p": "a"}, {"p": "b"}])
        <hiplot.experiment.Experiment object at 0x7f0f2e13c590>

        """
        return Experiment(
            datapoints=[
                Datapoint(
                    uid=str(row.get("uid", k)),
                    from_uid=row.get("from_uid") if row.get("from_uid") != '' else None,
                    values={mk: mv for mk, mv in row.items() if mk not in ["uid", "from_uid"]}) for k, row in enumerate(it)
            ]
        )

    @staticmethod
    def from_csv(file: tp.Union[Path, str, tp.IO[str]]) -> "Experiment":
        """
        Creates a HiPlot experiment from a CSV file.

        :param file: CSV file path
        """
        if isinstance(file, (Path, str)):
            with Path(file).open(encoding="utf-8") as csvfile:
                return Experiment.from_iterable(csv.DictReader(csvfile))
        else:
            return Experiment.from_iterable(csv.DictReader(file))

    @staticmethod
    def from_dataframe(dataframe: "pd.DataFrame") -> "Experiment":  # No type hint to avoid having pandas as an additional dependency
        """
        Creates a HiPlot experiment from a pandas DataFrame.

        :param dataframe: Pandas DataFrame
        """
        # Check if from_uid and uid is both in columns
        if {'from_uid', 'uid'}.issubset(dataframe.columns):
            # Check if there are any NaN values to handle
            if dataframe['from_uid'].isnull().values.any():

                # NaN values forces integer columns to become float, if uid is integer and from_uid is float, it crashes.
                # The line below changes uid to match from_uid type (either float or string), since NaN cannot be integer.
                dataframe['uid'] = dataframe['uid'].astype(dataframe['from_uid'].dtypes)
                dataframe = dataframe.fillna({'from_uid': '', 'uid': ''})

                # Replaces their dtypes accordingly to str, which is handled better with lesser errors with no change to functionality
                dataframe['uid'] = dataframe['uid'].astype(str)
                dataframe['from_uid'] = dataframe['from_uid'].astype(str)

        experiment = Experiment.from_iterable(dataframe.to_dict(orient='records'))

        # Restore columns order
        experiment.display_data(Displays.PARALLEL_PLOT)['order'] = list(dataframe.columns)
        experiment.display_data(Displays.TABLE)['order'] = list(dataframe.columns)

        return experiment

    @staticmethod
    def merge(xp_dict: tp.Dict[str, "Experiment"]) -> "Experiment":
        """
        Merge several experiments into a single one
        """
        xp = Experiment(datapoints=[])
        assert xp.parameters_definition is not None  # for mypy
        for k, subxp in xp_dict.items():
            assert subxp is not None, k
            xp.datapoints += [
                Datapoint(
                    uid=f"{k}_{d.uid}", from_uid=f"{k}_{d.from_uid}" if d.from_uid is not None else None, values={**d.values, "exp": k}
                )
                for d in subxp.datapoints
            ]
            if subxp.parameters_definition is not None:
                xp.parameters_definition.update(subxp.parameters_definition)
            for d, v in subxp._display_data.items():
                xp.display_data(d).update(v)
        return xp


class ExperimentFetcherDoesntApply(Exception):
    pass


ExperimentFetcher = tp.Callable[[str], Experiment]


class ExperimentDisplayed(metaclass=ABCMeta):
    """
    Class that allows to communicate with a displayed HiPlot visualization in a Jupyter notebook.
    Read more in :ref:`tutoNotebookDisplayedExperiment`
    """
    @abstractmethod
    def get_selected(self) -> tp.List[Datapoint]:
        """
        Returns a list of currently rendered datapoints in the parallel plot
        """

    @abstractmethod
    def get_brush_extents(self) -> tp.Dict[str, tp.Dict[str, tp.Any]]:
        """
        Returns a dictionary, where keys corresponds to columns currently brushed in parallel plot,
        and values contain information about the current brush.
        """
