.. _customizeXp:

Customizing Experiments
==========================

It is possible to customize how the data is rendered:

* Either globally by attributing a :class:`hiplot.ValueType` to columns

.. literalinclude:: ../hiplot/test_experiment.py
    :start-after: EXPERIMENT_SETTINGS_SNIPPET1_BEGIN
    :end-before: EXPERIMENT_SETTINGS_SNIPPET1_END

* Or in the invididual components with :meth:`hiplot.Experiment.display_data`

.. literalinclude:: ../hiplot/test_experiment.py
    :start-after: EXPERIMENT_SETTINGS_SNIPPET2_BEGIN
    :end-before: EXPERIMENT_SETTINGS_SNIPPET2_END


.. figure:: ../assets/customized_demo.png
   :width: 800

Rendering of the experiment.