.. _tutoNotebook:

Advanced uses: notebooks
===============================


.. _tutoNotebookState:

Remembering state between runs
----------------------------------

While it's possible to change the visualization settings in python using :meth:`hiplot.Experiment.display_data` and :class:`hiplot.ValueDef`, it is more convenient to
define XY plots, change column types or coloring in the user interface directly. However, all of this is reset when executing the cell a second time.

If you set ``store_state_key`` to a unique identifier in :meth:`hiplot.Experiment.display`, HiPlot's state will be stored in the URL,
and restored when :meth:`hiplot.Experiment.display` is called a second time later with the same parameter.

.. code-block:: python

    # This visualization's state will be recovered when the cell is re-run
    import hiplot as hip
    data = [{'dropout':0.1, 'lr': 0.001, 'loss': 10.0, 'optimizer': 'SGD'},
            {'dropout':0.15, 'lr': 0.01, 'loss': 3.5, 'optimizer': 'Adam'},
            {'dropout':0.3, 'lr': 0.1, 'loss': 4.5, 'optimizer': 'Adam'}]
    hip.Experiment.from_iterable(data).display(store_state_key="cell1")



.. _tutoNotebookDisplayedExperiment:

Interactions with displayed visualization
-----------------------------------------

.. note::
    This feature is currently supported for Jupyter Notebooks only. In particular, it does **not** work with Jupyter Lab.


HiPlot visualizations are highly interactive, allowing the user to filter and slice through the data. When running in Jupyter Notebooks, it is possible to
retrieve some information about the state of the visualization.


When calling :meth:`hiplot.Experiment.display`, a :class:`hiplot.ExperimentDisplayed` object is returned.
Behind the hood, a Javascript-Python communication channel is established with the python notebook kernel, that HiPlot's javascript frontend uses to send information
about selected datapoints, filtering, ...


.. code-block:: python

    # A Jupyter Notebook cell
    import hiplot as hip
    data = [{'dropout':0.1, 'lr': 0.001, 'loss': 10.0, 'optimizer': 'SGD'},
            {'dropout':0.15, 'lr': 0.01, 'loss': 3.5, 'optimizer': 'Adam'},
            {'dropout':0.3, 'lr': 0.1, 'loss': 4.5, 'optimizer': 'Adam'}]
    displayed_exp = hip.Experiment.from_iterable(data).display()


.. figure:: ../assets/displayed_experiment.png
   :width: 800


After the visualization has loaded, and in another cell, python code can query information from HiPlot

>>> displayed_exp.get_selected()  # Return all the datapoints currently selected
 [<hiplot.experiment.Datapoint at 0x10b32dc10>]

>>> displayed_exp.get_brush_extents()  # Retrieve current brush extents in the parallel plot
 {'dropout': {'type': 'numeric',
  'brush_extents_normalized': [1, 0.6015169902912622],
  'range': [0.3, 0.22030339805825244]},
 'lr': {'type': 'numeric',
  'brush_extents_normalized': [1, 0.5918082524271845],
  'range': [0.1, 0.05958901699029127]},
 'optimizer': {'type': 'categorical',
  'brush_extents_normalized': [1, 0],
  'values': ['Adam', 'SGD']}}

.. note::

    While all columns will have a :code:`type` and a brush extent (:code:`brush_extents_normalized`), only numeric columns have a :code:`range` field. Categorical fields have a list of selected values instead


.. warning::

    The user can modify the data type of variables - so the data type returned by :meth:`hiplot.ExperimentDisplayed.get_brush_extents` does not always match the one provided in Python.
