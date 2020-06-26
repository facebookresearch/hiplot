.. _tutoWebserver:

Advanced uses: Webserver
==========================

This section assumes you already have a hiplot webserver running (otherwise, see :ref:`getStartedWebserver`)


.. _tutoWebserverExperimentURI:

Experiments URI
---------------------------

In HiPlot server, experiments are loaded by entering a string in the textarea. It can be the path to a CSV file, or really anything that can uniquely specify which experiment we are trying to load.
This string is the *Experiment Universal Resource Identifier* (or in short :code:`Experiment URI`).
HiPlot translates those URIs into :code:`hiplot.Experiment` using experiment fetchers. We will see later how to write our own one (:ref:`tutoWebserverCustomFetcher`).


.. _tutoWebserverCompareXp:

Compare multiple experiments
----------------------------


Multiple experiments can be combined together in the interface using the special :code:`multi` fetcher. It allows 2 syntaxes:

Dictionary of named experiments
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block::

    multi://{
        "exp1_name": "exp1_uri",
        "exp2_name": "exp2_uri"
    }

List of experiments
^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block::

    multi://[
        "exp1_uri",
        "exp2_uri"
    ]


.. _tutoWebserverCustomFetcher:

Make HiPlot server render your own experiments
--------------------------------------------------------


About experiment fetchers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
When we request an experiment in HiPlot, the server will call the experiment fetchers it has iteratively.
Each fetcher can either:

* Return a :class:`hiplot.Experiment`, that will be sent to the client
* Raise an :class:`hiplot.ExperimentFetcherDoesntApply` exception, in which case the server moves on and tries the next fetcher

In order to avoid conflicts, it is good practice to use a prefix to determine which fetcher we want to call. Here we use :code:`myxp://`


How we will do that
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


We are going to write our own experiment fetcher, to translate custom :ref:`tutoWebserverExperimentURI` into :code:`hiplot.Experiment`. We will do that in several steps:

1. First we will write a file ``my_fetcher.py`` that contains our fetcher function `fetch_my_experiment`
2. Then, we will restart HiPlot server with this additional fetcher: ``hiplot my_fetcher.fetch_my_experiment``


Step 1: Create an experiment fetcher
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
An experiment fetcher transforms a string (that the user enters, a path for instance) into a proper :class:`hiplot.Experiment`.
Let's write a dummy one that takes a folder, and returns the content of :code:`data.csv` inside if the file exists.

.. code-block:: python

    # my_fetcher.py
    from pathlib import Path
    import hiplot as hip
    def fetch_my_experiment(uri):
        # Only apply this fetcher if the URI starts with myxp://
        PREFIX="myxp://"
        if not uri.startswith(PREFIX):
            # Let other fetchers handle this one
            raise hip.ExperimentFetcherDoesntApply()
        uri = uri[len(PREFIX):]  # Remove the prefix

        return hip.Experiment.from_csv(uri + '/data.csv')




Step 2: Run HiPlot server with the new fetcher
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Our fetcher is ready, let's simulate a dummy experiment that we can load later

.. code-block:: bash

    # Some dummy data for the demo
    mkdir xp_folder
    echo -e "col1, col2, col3\n1,2,3\n2,2,3\n4,4,2" > xp_folder/data.csv



>>> hiplot my_fetcher.fetch_my_experiment

In the interface, you can load the string :code:`myxp://xp_folder`


.. _tutoHiPlotRender:

Dump your experiments to CSV or HTML with :code:`hiplot-render`
----------------------------------------------------------------

HiPlot also provides a script to generate CSV or a standalone HTML file for an experiment from the command line.
Like the webserver, it can take additional fetchers to render custom experiments (see also :ref:`tutoWebserverCustomFetcher` above).
You can get started with:

>>> hiplot-render --help
