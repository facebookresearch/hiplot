/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import React from "react";
import * as d3 from "d3";
import style from "../hiplot.scss";
import { create_d3_scale_without_outliers } from "../infertypes";
import { foCreateAxisLabel, foDynamicSizeFitContent } from "../lib/svghelpers";
import { ParamType } from "../types";
var margin = { top: 20, right: 20, bottom: 50, left: 60 };
;
;
;
// Inspired by https://www.d3-graph-gallery.com/graph/histogram_binSize.html
var DistributionPlot = /** @class */ (function (_super) {
    __extends(DistributionPlot, _super);
    function DistributionPlot() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /**
         * Supports both vertical and horizontal bar plots.
         * Will switch to vertical if we are plotting categorical data with too many distinct values.
         */
        _this.axisBottom = React.createRef();
        _this.axisLeft = React.createRef();
        _this.axisRight = React.createRef();
        _this.axisBottomName = React.createRef();
        _this.svgContainer = React.createRef();
        _this.histAll = React.createRef();
        _this.histSelected = React.createRef();
        return _this;
    }
    DistributionPlot.prototype.isVertical = function () {
        /*
        Vertical:
        |     --
        | __  ||
        | ||  || ...
        +--------------

        Horizontal:
        | =========
        | ======
        | ==
        +--------------

        */
        return (this.props.param_def.type != ParamType.CATEGORICAL || this.props.param_def.distinct_values.length < 3);
    };
    DistributionPlot.prototype.figureWidth = function () {
        return this.props.width - margin.left - margin.right;
    };
    DistributionPlot.prototype.figureHeight = function () {
        return this.props.height - margin.top - margin.bottom;
    };
    DistributionPlot.prototype.createDataAxis = function (dataScale, animate) {
        if (this.isVertical()) {
            dataScale.range([0, this.figureWidth()]);
            d3.select(this.axisBottom.current).call(d3.axisBottom(dataScale).ticks(1 + this.props.width / 50));
            d3.select(this.axisBottomName.current).html(null).append(function () {
                return foCreateAxisLabel(this.props.param_def, null, null);
            }.bind(this))
                .classed("distrplot_axislabel", true)
                .attr("x", -4)
                .attr("text-anchor", "end");
            d3.select(this.axisBottomName.current).select(".distrplot_axislabel")
                .each(function () {
                foDynamicSizeFitContent(this);
            });
            this.axisRight.current.innerHTML = '';
        }
        else {
            dataScale.range([this.figureHeight(), 0]);
            d3.select(this.axisRight.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisRight(dataScale).ticks(1 + this.props.height / 50))
                .attr("text-anchor", "end");
            d3.select(this.axisLeft.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisLeft(dataScale).ticks(1 + this.props.height / 50));
        }
    };
    DistributionPlot.prototype.createDataScaleAndAxis = function () {
        this.dataScale = create_d3_scale_without_outliers(this.props.param_def);
        this.createDataAxis(this.dataScale, false);
    };
    DistributionPlot.prototype.createHistogram = function () {
        var me = this;
        var scaleCopy = this.dataScale.copy().range([0, 1]);
        var thresholds = [];
        if (this.props.param_def.type == ParamType.CATEGORICAL) {
            thresholds = this.props.param_def.distinct_values.map(function (v) { return scaleCopy(v); });
            thresholds = thresholds.map(function (value, index) { return index == 0 ? value : (value + thresholds[index - 1]) / 2; });
        }
        else {
            for (var i = 1; i < this.props.nbins; ++i) {
                thresholds.push(i / this.props.nbins);
            }
        }
        var histogram = d3.histogram()
            .value(function (d) { return scaleCopy(d[me.props.axis]); })
            .domain([0, 1])
            .thresholds(thresholds);
        return histogram;
    };
    DistributionPlot.prototype.drawAllHistograms = function (animate) {
        var histogram = this.createHistogram();
        var allHist = {
            selected: {
                bins: histogram(this.props.histData.selected),
                g: this.histAll.current,
                draw_fn: this.drawHistogramRects.bind(this)
            },
            all: {
                bins: histogram(this.props.histData.all),
                g: this.histSelected.current,
                draw_fn: this.drawHistogramLines.bind(this)
            }
        };
        // Density axis: set max based on maximum in histogram
        var maxDensityHistogram = d3.max(Object.values(allHist), function (hist) {
            var total = d3.sum(hist.bins, function (d) { return d.length; });
            if (!total) {
                return 0;
            }
            return d3.max(hist.bins, function (d) { return d.length / total; });
        });
        var densityScale = d3.scaleLinear()
            .domain([0, maxDensityHistogram]);
        var binsOrdering = allHist.all.bins.map(function (_, i) { return i; });
        if (this.isVertical()) {
            densityScale = densityScale.range([this.figureHeight(), 0]);
            d3.select(this.axisLeft.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisLeft(densityScale)
                .ticks(1 + this.props.height / 50)
                .tickSizeInner(-(this.props.width - margin.left - margin.right)));
        }
        else {
            densityScale = densityScale.range([0, this.figureWidth()]);
            d3.select(this.axisBottom.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisBottom(densityScale).ticks(1 + this.props.width / 50));
            // Compute reordering of the bins - we want to display higher densities first.
            var ordered1 = Array.from(binsOrdering).sort(function (a, b) { return allHist.selected.bins[a].length - allHist.selected.bins[b].length; });
            ordered1.forEach(function (value, idx) {
                binsOrdering[value] = idx;
            });
            // Update ticks/axis as well
            var domain = this.dataScale.domain();
            var domainsOrdered = domain.map(function (v, idx) {
                return domain[ordered1[idx]];
            });
            this.createDataAxis(d3.scalePoint().domain(domainsOrdered).range(this.dataScale.range()), true);
        }
        // Draw all the histograms
        Object.values(allHist).forEach(function (v) {
            v.draw_fn(v, densityScale, animate, binsOrdering);
        }.bind(this));
    };
    DistributionPlot.prototype.drawHistogramLines = function (hist, densityScale, animate, binsOrdering) {
        var total = d3.sum(hist.bins, function (d) { return d.length; });
        var densityScaleFromLength = function (d) { return densityScale(total ? d.length / total : 0); };
        var dataScale = d3.scaleLinear().range(this.dataScale.range());
        var u = d3.select(hist.g).selectAll("line")
            .data(hist.bins);
        var dataCoord = this.isVertical() ? "x" : "y";
        var densityCoord = this.isVertical() ? "y" : "x";
        u
            .enter()
            .append("line") // Add a new rect for each new elements
            .merge(u) // get the already existing elements as well
            .transition() // and apply changes to all of them
            .duration(animate ? this.props.animateMs : 0)
            .attr(dataCoord + "1", function (d, i) { return dataScale(hist.bins[binsOrdering[i]].x0) + 1; })
            .attr(densityCoord + "1", function (d, i) { return densityScaleFromLength(d); })
            .attr(dataCoord + "2", function (d, i) { return dataScale(hist.bins[binsOrdering[i]].x1); })
            .attr(densityCoord + "2", function (d, i) { return densityScaleFromLength(d); });
        u
            .exit()
            .remove();
    };
    DistributionPlot.prototype.drawHistogramRects = function (hist, densityScale, animate, binsOrdering) {
        var total = d3.sum(hist.bins, function (d) { return d.length; });
        var densityScaleFromLength = function (d) { return densityScale(total ? d.length / total : 0); };
        var dataScale = d3.scaleLinear().range(this.dataScale.range());
        var u = d3.select(hist.g).selectAll("rect")
            .data(hist.bins);
        var ut = u
            .enter()
            .append("rect") // Add a new rect for each new elements
            .merge(u) // get the already existing elements as well
            .attr("data-value-sample", function (d, i) { return d.length ? d[0][this.props.axis] : "empty"; }.bind(this))
            .on('mouseover', function (d, i) {
            d3.select(this).transition()
                .duration(150)
                .attr('opacity', '.5');
        })
            .on('mouseout', function (d, i) {
            d3.select(this).transition()
                .duration(150)
                .attr('opacity', '1');
        })
            .transition() // and apply changes to all of them
            .duration(animate ? this.props.animateMs : 0);
        if (this.isVertical()) {
            ut
                .attr("x", 1)
                .attr("transform", function (d) { return "translate(" + dataScale(d.x0) + "," + densityScaleFromLength(d) + ")"; })
                .attr("width", function (d) { return dataScale(d.x1) - dataScale(d.x0) - 1; })
                .attr("height", function (d) {
                return this.figureHeight() - densityScaleFromLength(d);
            }.bind(this));
        }
        else {
            ut
                //.attr("y", 1)
                .attr("transform", function (d, i) { return "translate(0," + dataScale(hist.bins[binsOrdering[i]].x1) + ")"; })
                .attr("width", function (d) { return densityScaleFromLength(d); })
                .attr("height", function (d, i) {
                var delta = Math.abs(dataScale(hist.bins[binsOrdering[i]].x1) - dataScale(hist.bins[binsOrdering[i]].x0));
                return delta > 2 ? delta - 1 : delta;
            }.bind(this));
        }
        u
            .exit()
            .remove();
    };
    DistributionPlot.prototype.componentDidMount = function () {
        this.createDataScaleAndAxis();
        this.drawAllHistograms(false);
    };
    DistributionPlot.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevProps.axis != this.props.axis ||
            prevProps.param_def != this.props.param_def ||
            prevProps.width != this.props.width ||
            prevProps.height != this.props.height) {
            this.createDataScaleAndAxis();
        }
        if (prevProps.axis != this.props.axis ||
            prevProps.param_def != this.props.param_def ||
            prevProps.nbins != this.props.nbins ||
            prevProps.histData != this.props.histData ||
            prevProps.width != this.props.width ||
            prevProps.height != this.props.height) {
            var animate = prevProps.nbins != this.props.nbins ||
                prevProps.histData != this.props.histData;
            this.drawAllHistograms(animate);
        }
    };
    DistributionPlot.prototype.render = function () {
        var leftAxisLabel = this.isVertical() ? "Density" : this.props.axis;
        return (React.createElement("div", null,
            React.createElement("svg", { width: this.props.width, height: this.props.height },
                React.createElement("g", { transform: "translate(" + margin.left + ", 15)", textAnchor: "start", fontWeight: "bold" },
                    React.createElement("text", { style: { stroke: "white", strokeWidth: "0.2em" } }, leftAxisLabel),
                    React.createElement("text", null, leftAxisLabel)),
                React.createElement("g", { ref: this.svgContainer, className: style['distr-graph-svg'], transform: "translate(" + margin.left + ", " + margin.top + ")" },
                    React.createElement("g", { className: style.histAll, ref: this.histAll }),
                    React.createElement("g", { className: style.histSelected, ref: this.histSelected }),
                    React.createElement("g", { className: "axisLeft", ref: this.axisLeft }),
                    React.createElement("g", { className: "axisRight", ref: this.axisRight, transform: "translate(" + this.figureWidth() + ", 0)" }),
                    React.createElement("g", { className: "axisBottom", ref: this.axisBottom, transform: "translate(0, " + this.figureHeight() + ")" }),
                    React.createElement("g", { ref: this.axisBottomName, transform: "translate(" + this.figureWidth() + ", " + (this.props.height - margin.top - 30) + ")", textAnchor: "end", fontWeight: "bold" })))));
    };
    return DistributionPlot;
}(React.Component));
export { DistributionPlot };
;
