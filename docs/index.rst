.. HiPlot documentation master file, created by
   sphinx-quickstart on Thu Jan 16 05:20:17 2020.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

HiPlot documentation
====================

.. mdinclude:: ../README.md
   :start-line: 6
   :end-line: 12

Getting started
====================


>>> pip install hiplot

Option 1: In an ipython notebook
--------------------------------

.. code-block:: python

    import hiplot as hip
    data = [{'dropout':0.1, 'lr': 0.001, 'loss': 10.0, 'optimizer': 'SGD'},
        {'dropout':0.15, 'lr': 0.01, 'loss': 3.5, 'optimizer': 'Adam'},
        {'dropout':0.3, 'lr': 0.1, 'loss': 4.5, 'optimizer': 'Adam'}]
    hip.Experiment.from_iterable(data).display()

Option 2: HiPlot webserver
--------------------------

>>> python -m hiplot



.. toctree::
   :maxdepth: 2
   :caption: Contents:

   readme

.. autoclass:: hiplot.Experiment
   :members:

.. autoclass:: hiplot.ExperimentDisplayed
   :members:

.. autofunction:: hiplot.run_server

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
