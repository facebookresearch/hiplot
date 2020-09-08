# HiPlot - High dimensional Interactive Plotting [![CircleCI](https://circleci.com/gh/facebookresearch/hiplot/tree/master.svg?style=svg&circle-token=c89b6825078e174cf35bdc18e4ad4a16e28876f9)](https://circleci.com/gh/facebookresearch/hiplot/tree/master)


![Logo](https://raw.githubusercontent.com/facebookresearch/hiplot/master/hiplot/static/logo.png)


HiPlot is a lightweight interactive visualization tool to help AI researchers discover correlations and patterns in high-dimensional data using parallel plots and other graphical ways to represent information.

### [Try a demo now with sweep data](https://facebookresearch.github.io/hiplot/_static/demo/ml1.csv.html) or [upload your CSV](https://facebookresearch.github.io/hiplot/_static/hiplot_upload.html)

There are several modes to HiPlot:
- As a web-server (if your data is a CSV for instance)
- In a jupyter notebook (to visualize python data), or in [Streamlit apps](https://facebookresearch.github.io/hiplot/tuto_streamlit.html)
- In CLI to render standalone HTML


```bash
pip install -U hiplot  # Or for conda users: conda install -c conda-forge hiplot
```

If you have a jupyter notebook, you can get started with something as simple as:

```python
import hiplot as hip
data = [{'dropout':0.1, 'lr': 0.001, 'loss': 10.0, 'optimizer': 'SGD'},
        {'dropout':0.15, 'lr': 0.01, 'loss': 3.5, 'optimizer': 'Adam'},
        {'dropout':0.3, 'lr': 0.1, 'loss': 4.5, 'optimizer': 'Adam'}]
hip.Experiment.from_iterable(data).display()
```

### [See the live result](https://facebookresearch.github.io/hiplot/_static/demo/demo_basic_usage.html)
![Result](https://raw.githubusercontent.com/facebookresearch/hiplot/master/assets/notebook.png)

## Links

* Blog post: https://ai.facebook.com/blog/hiplot-high-dimensional-interactive-plots-made-easy/
* Documentation: https://facebookresearch.github.io/hiplot/index.html
* Pypi package: https://pypi.org/project/hiplot/
* Conda package: https://anaconda.org/conda-forge/hiplot
* NPM package: https://www.npmjs.com/package/hiplot

## Citing

```bibtex
@misc{hiplot,
    author = {Haziza, D. and Rapin, J. and Synnaeve, G.},
    title = {{Hiplot, interactive high-dimensionality plots}},
    year = {2020},
    publisher = {GitHub},
    journal = {GitHub repository},
    howpublished = {\url{https://github.com/facebookresearch/hiplot}},
}
```

## Credits
Inspired by and based on code from [Kai Chang](http://bl.ocks.org/syntagmatic/3150059), [Mike Bostock](http://bl.ocks.org/1341021) and [Jason Davies](http://bl.ocks.org/1341281).

## License
HiPlot is [MIT](LICENSE) licensed, as found in the [LICENSE](LICENSE) file.
