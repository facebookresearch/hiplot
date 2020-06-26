.. _tutoJavascript:

NPM library (javascript)
===============================

HiPlot is released as a React component in an `NPM package <https://www.npmjs.com/package/hiplot>`_, and can be embeded in any javascript/React codebase.

.. warning::

    The Javascript library API is very recent, subject to changes, and less used compared to the python API. Please report any bug or suggestion by creating a `github issue <https://github.com/facebookresearch/hiplot/issues/new>`_



Getting started
----------------------------------

Download hiplot in your favorite package manager

>>> npm install hiplot  # if using npm
>>> yarn add hiplot # for yarn users


Creating a HiPlot component
-----------------------------------


.. literalinclude:: ../examples/javascript/src/index.js
    :language: typescript
    :start-after: BEGIN_DOC_BASIC_EXAMPLE
    :end-before: END_DOC_BASIC_EXAMPLE



.. raw:: html

    <iframe src="./_static/examples_javascript/Basic/index.html?hip.PARALLEL_PLOT.height=300" height="700px" width="100%"></iframe>


Customizing HiPlot react component
-----------------------------------

React properties
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. literalinclude:: ../src/component.tsx
    :language: typescript
    :start-after: BEGIN_HIPLOT_PROPS
    :end-before: END_HIPLOT_PROPS

An advanced example
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. literalinclude:: ../examples/javascript/src/index.js
    :language: typescript
    :start-after: BEGIN_DOC_CUSTOM_EXAMPLE
    :end-before: END_DOC_CUSTOM_EXAMPLE


.. raw:: html

    <iframe src="./_static/examples_javascript/Custom/index.html?hip.PARALLEL_PLOT.height=300" height="400px" width="100%"></iframe>
