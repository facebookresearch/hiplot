.. _tutoWebserver:

Advanced uses: Webserver
==========================

This section assumes you already have a hiplot webserver running (otherwise, see :ref:`getStartedWebserver`)


.. _tutoWebserverCompareXp:

Compare multiple experiments
----------------------------


Multiple experiments can be combined together in the interface using the special "multi" fetcher. It allows 2 syntaxes:

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

Use HiPlot server to render your own experiments
--------------------------------------------------------


Step 1: Create an experiment fetcher
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
An experiment fetcher transforms a string (that the user enters, a path for instance) into a proper :class:`hiplot.Experiment`.
Let's write a dummy one that takes a folder, and returns the content of `data.csv` inside if the file exists.

.. code-block:: python

    # my_fetcher.py
    from pathlib import Path
    import hiplot as hip
    def fetch_my_experiment(uri):
        # Only apply this fetcher if the URI starts with myxp://
        PREFIX="myxp://"
        if not uri.startswith(PREFIX):
            # Lets other fetchers handle this one
            raise hip.ExperimentFetcherDoesntApply()
        uri = uri[len(PREFIX):]
    
        return hip.Experiment.from_csv(uri + '/data.csv')



Step 2: Prepare the data
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    # Some dummy data for the demo
    mkdir xp_folder
    echo -e "col1, col2, col3\n1,2,3\n2,2,3\n4,4,2" > xp_folder/data.csv


Step 3: Run HiPlot server with the new fetcher
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

>>> hiplot my_fetcher.fetch_my_experiment

In the interface, you can load the string "myxp://xp_folder"