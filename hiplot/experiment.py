# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from abc import ABCMeta, abstractmethod
from collections import defaultdict
from typing import Optional, List, Dict, Any, Iterable, Union, Callable, Set

from .render import make_experiment_standalone_page


DisplayableType = Union[bool, int, float, str]


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
    def _asdict(self) -> Dict[str, Any]:
        return self.__dict__

class ValueDef(_DictSerializable):
    CATEGORICAL = 'categorical'
    NUMERIC = 'numeric'
    NUMERIC_LOG = 'numericlog'
    NUMERIC_PERCENTILE = 'numericpercentile'

    def __init__(self, type: Optional[str] = None, colors: Optional[Dict[Any, str]] = None, parallel_plot_order: Optional[int] = None, parallel_plot_inverted: Optional[bool] = None) -> None:
        """
        Overwrite the generated values for a column:
            - type: Possible values: ValueDef.CATEGORICAL, ValueDef.NUMERIC, ...
            - colors: mapping from value to color in the format "rgb(R, G, B)" or "hsl(H, S, L)"
            - parallel_plot_order: column ordering if >= 0.
                If < 0, the column is hidden
            - parallel_plot_inverted: invert the column values
        """
        self.type = type
        self.colors = colors
        self.parallel_plot_order = parallel_plot_order
        self.parallel_plot_inverted = parallel_plot_inverted

    def validate(self) -> None:
        if self.type is not None and not hasattr(type(self), self.type):
            raise ExperimentValidationError(f"Invalid value type: {self.type}")
        if self.colors is not None:
            for k, v in self.colors.items():
                if not v.startswith("rgb(") and not v.startswith("hsl("):
                    raise ExperimentValidationError(
                        f'Invalid color {v} for value {k}. Expected color to start with either "rgb(" or "hsl("'
                    )


class Datapoint(_DictSerializable):
    """
    A datapoint represents a single measurement of metrics - for instance a model checkpoint that is evaluated.
    It can have a parent `from_uid` if this `Datapoint` originates from another one (offspring).
    """
    def __init__(self, uid: str, values: Dict[str, DisplayableType], from_uid: Optional[str] = None) -> None:
        self.uid = uid
        self.values = values
        self.from_uid = from_uid

    def validate(self) -> None:
        for reserved_kw in ["uid", "from_uid"]:
            if reserved_kw in self.values:
                raise ExperimentValidationError(f'Datapoint {self.uid} contains a value for "{reserved_kw}"')


class LineDisplay(_DictSerializable):
    """
    Settings for the XY graph (optional)
    """
    def __init__(self,
        axis_x: Optional[str] = None,
        axis_y: Optional[str] = None,
        lines_thickness: float = 1.2,
        lines_opacity: float = 0.8,
        dots_thickness: float = 1.4,
        dots_opacity: float = 0.8,
    ) -> None:
        self.axis_x = axis_x
        self.axis_y = axis_y
        self.lines_thickness = lines_thickness
        self.lines_opacity = lines_opacity
        self.dots_thickness = dots_thickness
        self.dots_opacity = dots_opacity


class Experiment(_DictSerializable):
    """
    Object that can be rendered by HiPlot.
    See `Experiment.display` for ipython notebook case, or `ExperimentFetcher` for the web-server case.

    :ivar datapoints: All the measurements we have. One datapoint corresponds to one line in the parallel plot and to one line in the table.
    :ivar parameters_definition: Characteristics of the columns (ordering, type, etc...)
    :ivar line_display: Characteristics of the XY graph (lines thickness, initial x/y axis...)

    :Example:

    >>> import hiplot as hip
    >>> data = [{'param': 1, 'loss': 10, 'hidden_field': 'value1', 'c': 'red'},
        {'param': 2, 'loss': 5, 'hidden_field': 'value2', 'c': 'black'}]
    >>> exp = hip.Experiment.from_iterable(data)
    """
    def __init__(self,
        datapoints: Optional[List[Datapoint]] = None,
        parameters_definition: Optional[Dict[str, ValueDef]] = None,
        line_display: Optional[LineDisplay] = None
    ) -> None:
        self.datapoints = datapoints if datapoints is not None else []
        self.parameters_definition = parameters_definition if parameters_definition is not None else defaultdict(ValueDef)
        self.line_display = line_display if line_display is not None else LineDisplay()


    def set_line_xy(self, x: str, y: str) -> "Experiment":
        self.line_display.axis_x = x
        self.line_display.axis_y = y
        return self

    def validate(self) -> "Experiment":
        """
        Makes sure that this object is valid. Raises a `hip.ExperimentValidationError` otherwise.
        Experiments with circular references, non-existent parents, or without datapoints are invalid.
        """
        seen: Set[str] = set()
        dp_lookup: Dict[str, Datapoint] = {dp.uid: dp for dp in self.datapoints}
        for p in self.datapoints:
            if p.uid not in seen:
                seen_now: Set[str] = {p.uid}
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
        if self.line_display.axis_x is not None:
            if self.line_display.axis_x not in ['uid', 'from_uid'] and all((self.line_display.axis_x not in dp.values for dp in self.datapoints)):
                raise ExperimentValidationError(f'No datapoint has a value for line X axis {self.line_display.axis_x}')
        if self.line_display.axis_y is not None:
            if self.line_display.axis_y not in ['uid', 'from_uid'] and all((self.line_display.axis_y not in dp.values for dp in self.datapoints)):
                raise ExperimentValidationError(f'No datapoint has a value for line Y axis {self.line_display.axis_y}')
        return self

    def display(self, force_full_width: bool = False) -> "ExperimentDisplayed":
        """
        Displays an experiment in an ipython notebook.

        :param force_full_width: allows to force to have 100% width on Jupyter Notebooks only.
        :returns: An `ExperimentDisplayed` object that can be used to fetch a list of `Datapoint` - only implemented for Jupyter notebook.
        """
        from .ipython import display_exp  # pylint: disable=cyclic-import

        self.validate()
        return display_exp(self, force_full_width=force_full_width)

    def to_html(self) -> str:
        """
        Returns the content of a standalone .html file that displays this experiment
        without any dependency to HiPlot server or static files.
        """
        self.validate()
        return make_experiment_standalone_page(options={
            'experiment': self._asdict()
        })

    def _asdict(self) -> Dict[str, Any]:
        return {
            "datapoints": [d._asdict() for d in self.datapoints],
            "parameters_definition": {k: v._asdict() for k, v in self.parameters_definition.items()},
            "line_display": self.line_display._asdict(),
        }

    @staticmethod
    def from_iterable(it: Iterable[Dict[str, Any]]) -> "Experiment":
        """
        Creates a HiPlot experiment from an iterable/list of dictionnaries.
        This is the easiest way to generate an `hiplot.Experiment` object.

        :Example:

        >>> import hiplot as hip
        >>> hip.Experiment.from_iterable([{"p": "a"}, {"p": "b"}])
        <hiplot.experiment.Experiment object at 0x7f0f2e13c590>

        """
        return Experiment(
            datapoints=[
                Datapoint(uid=str(row.get("uid", k)), values={mk: mv for mk, mv in row.items() if mk != "uid"}) for k, row in enumerate(it)
            ]
        )

    @staticmethod
    def merge(xp_dict: Dict[str, "Experiment"]) -> "Experiment":
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
            if xp.line_display.axis_x is None and subxp.line_display.axis_x is not None and subxp.line_display.axis_y is not None:
                xp.line_display.axis_x = subxp.line_display.axis_x
                xp.line_display.axis_y = subxp.line_display.axis_y
            if subxp.parameters_definition is not None:
                xp.parameters_definition.update(subxp.parameters_definition)
        return xp


class ExperimentFetcherDoesntApply(Exception):
    pass


ExperimentFetcher = Callable[[str], Experiment]


class ExperimentDisplayed(metaclass=ABCMeta):
    @abstractmethod
    def get_selected(self) -> List[Datapoint]:
        """
        Returns a list of currently rendered datapoints in the parallel plot
        """
