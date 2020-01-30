# HiPlot - High dimensional Interactive Plotting [![CircleCI](https://circleci.com/gh/facebookresearch/hiplot/tree/master.svg?style=svg&circle-token=c89b6825078e174cf35bdc18e4ad4a16e28876f9)](https://circleci.com/gh/facebookresearch/hiplot/tree/master)


![Logo](hiplot/static/logo.svg)


HiPlot is a lightweight interactive visualization tool to help AI researchers discover correlations and patterns in high-dimensional data using parallel plots and other graphical ways to represent information. [Try a demo now!](https://facebookresearch.github.io/hiplot/_static/demo/ml1.csv.html)

There are 2 modes to HiPlot:
- As a web-server (if your data is a CSV for instance)
- In a jupyter notebook (to visualize python data)

Get started with:
```bash
pip install hiplot
```


## HiPlot as a web-server
```bash
hiplot
```
Run the command above and then access http://127.0.0.1:5005/ (*you need to forward the port 5005 to be able to access it from your machine if running remotely*)


## License
HiPlot is [MIT](LICENSE) licensed, as found in the [LICENSE](LICENSE) file.
