.. _tutoStreamlit:

HiPlot component for Streamlit
===============================

`Streamlit <https://www.streamlit.io/>`_ is an open-source app framework. It allows data scientists and machine learning engineers to create beautiful, performant apps in pure Python.


Getting started
----------------------------------

You'll need both Streamlit and HiPlot

>>> pip install -U streamlit hiplot


Creating a HiPlot component
-----------------------------------

Displaying an HiPlot experiment in Streamlit is very similar to how you would do it in a Jupyter notebook, with a few differences:

- Call :meth:`hiplot.Experiment.display_st` instead of :meth:`hiplot.Experiment.display`
- Provide a unique ``key`` for your component
- If you want to retrieve information from the component (for instance selected rows), you have to use the parameter ``ret`` to specify that (see :ref:`tutoStreamlitRetValues`)

.. literalinclude:: ../demo_streamlit.py
    :start-after: DEMO_STREAMLIT_BEGIN

.. figure:: ../assets/streamlit.png


.. _tutoStreamlitRetValues:

HiPlot component return values
-----------------------------------

HiPlot is highly interactive, and there are multiple values/information that can be returned, depending on what the user provides for the parameter ``ret`` in :meth:`hiplot.Experiment.display_st`

- ``ret="filtered_uids"``: returns a list of uid for filtered datapoints. Filtered datapoints change when the user clicks on *Keep* or *Exclude* buttons.
- ``ret="selected_uids"``: returns a list of uid for selected datapoints. Selected datapoints correspond to currently visible points (for example when slicing in the parallel plot) - it's a subset of filtered datapoints.
- ``ret="brush_extents"``: returns information about current brush extents in the parallel plot
- or a list containing several values above. In that case, HiPlot will return a list with the return values
