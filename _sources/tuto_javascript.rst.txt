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

.. code-block:: typescript


    import {HiPlot, Experiment} from 'hiplot';


    function HiPlotWithData() {
        const experiment = Experiment.from_iterable([
            {'opt': 'sgd', 'lr': 0.01, 'dropout': 0.1},
            {'opt': 'adam', 'lr': 0.1, 'dropout': 0.2},
            {'opt': 'adam', 'lr': 1., 'dropout': 0.3},
            {'opt': 'sgd', 'lr': 0.001, 'dropout': 0.4},
        ]);
        return <HiPlot experiment={experiment} />;
    }
