.. _displaysReference:

Displays reference
========================

HiPlot consists of multiple independant displays. Each of those can be configured using :meth:`hiplot.Experiment.display_data` (see also :ref:`frontendRenderingSettings` for an example).

Parallel Plot
-------------------

.. literalinclude:: ../src/parallel/parallel.tsx
    :language: typescript
    :start-after: DISPLAYS_DATA_DOC_BEGIN
    :end-before: DISPLAYS_DATA_DOC_END


PlotXY
-------------------

.. literalinclude:: ../src/plotxy.tsx
    :language: typescript
    :start-after: DISPLAYS_DATA_DOC_BEGIN
    :end-before: DISPLAYS_DATA_DOC_END


Table
-------------------

.. literalinclude:: ../src/rowsdisplaytable.tsx
    :language: typescript
    :start-after: DISPLAYS_DATA_DOC_BEGIN
    :end-before: DISPLAYS_DATA_DOC_END


Distribution
-------------------

.. literalinclude:: ../src/distribution/plugin.tsx
    :language: typescript
    :start-after: DISPLAYS_DATA_DOC_BEGIN
    :end-before: DISPLAYS_DATA_DOC_END
