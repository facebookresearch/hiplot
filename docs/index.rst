.. figure:: ../hiplot/static/logo.svg

.. mdinclude:: ../README.md
   :start-line: 6
   :end-line: 8


HiPlot demonstration
====================

Given about 7000 experimental datapoints, we want to understand which parameters influence the metric we want to optimize: :code:`valid ppl`. How can HiPlot help?

* On the parallel plot, each line represents one datapoint. Slicing on the :code:`valid ppl` axis reveals that higher values for :code:`lr` lead to better models.
* We will focus on higher values for the :code:`lr` then. Un-slice the :code:`valid ppl` axis by clicking on the axis, but outside of the current slice. Slice on the :code:`lr` axis values above :code:`1e-2`, then click the :code:`Keep` button.
* Let's see now how the training goes by adding a line plot. Right click the :code:`epoch` axis title and select :code:`Set as X axis`. Similarly, set :code:`valid ppl` as the Y axis. Once you have done both, an XY line plot should appear below the parallel plot.
* Slicing through the :code:`dropout`, :code:`embedding_size` and :code:`lr` axis reveals how they can affect the training dynamics: convergence speed and maximum performance.


.. raw:: html

    <iframe src="./_static/demo/ml1.csv.html?hip.color_by=%22valid+ppl%22&amp;hip.PARALLEL_PLOT.height=300" height="1000px" style="width: 865px; margin-left: -20px"></iframe>


HiPlot documentation
====================


.. toctree::
   :maxdepth: 2
   :caption: Contents:

   getting_started
   experiment_settings
   tuto_webserver
   tuto_notebook
   tuto_streamlit
   tuto_javascript
   py_reference
   plugins_reference
   contributing


Indices and tables
==================

* :ref:`genindex`
* :ref:`search`
