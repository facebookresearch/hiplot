/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import * as d3 from "d3";
import style from "../hiplot.scss";
import { create_d3_scale_without_outliers, ParamDef } from "../infertypes";
import { foCreateAxisLabel, foDynamicSizeFitContent } from "../lib/svghelpers";
import { ParamType, Datapoint } from "../types";

const margin = {top: 20, right: 20, bottom: 50, left: 60};

interface BinsDrawData {
    bins: d3.Bin<any, any>[];
    g: SVGSVGElement;
    draw_fn: any;
};

export interface HistogramData {
    all: Datapoint[];
    selected: Datapoint[];
};

export interface DistributionPlotData {
    height: number,
    width: number,
    nbins: number,
    axis: string,
    histData: HistogramData;
    param_def: ParamDef;
    animateMs: number;
};


// Inspired by https://www.d3-graph-gallery.com/graph/histogram_binSize.html
export class DistributionPlot extends React.Component<DistributionPlotData, {}> {
    /**
     * Supports both vertical and horizontal bar plots.
     * Will switch to vertical if we are plotting categorical data with too many distinct values.
     */
    axisBottom = React.createRef<SVGSVGElement>();
    axisLeft = React.createRef<SVGSVGElement>();
    axisRight = React.createRef<SVGSVGElement>();
    axisBottomName = React.createRef<SVGGElement>();

    svgContainer = React.createRef<SVGSVGElement>();
    histAll = React.createRef<SVGSVGElement>();
    histSelected = React.createRef<SVGSVGElement>();

    dataScale: any;

    isVertical() {
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
    }
    figureWidth() {
        return this.props.width - margin.left - margin.right;
    }
    figureHeight() {
        return this.props.height - margin.top - margin.bottom;
    }
    createDataAxis(dataScale: any, animate: boolean): void {
        if (this.isVertical()) {
            dataScale.range([0, this.figureWidth()]);
            d3.select(this.axisBottom.current).call(d3.axisBottom(dataScale).ticks(1 + this.props.width/50));
            d3.select(this.axisBottomName.current).html(null).append(function() {
                    return foCreateAxisLabel(this.props.param_def, null, null);
                }.bind(this))
                    .classed("distrplot_axislabel", true)
                    .attr("x", -4)
                    .attr("text-anchor", "end");
            d3.select(this.axisBottomName.current).select(".distrplot_axislabel")
                .each(function(this: SVGForeignObjectElement) {
                    foDynamicSizeFitContent(this);
                });
            this.axisRight.current.innerHTML = '';
        } else {
            dataScale.range([this.figureHeight(), 0]);
            d3.select(this.axisRight.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisRight(dataScale).ticks(1 + this.props.height/50))
                    .attr("text-anchor", "end");
            d3.select(this.axisLeft.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisLeft(dataScale).ticks(1 + this.props.height/50));
        }

    }
    createDataScaleAndAxis(): void {
        this.dataScale = create_d3_scale_without_outliers(this.props.param_def);
        this.createDataAxis(this.dataScale, false);
    }

    createHistogram(): d3.HistogramGeneratorNumber<any, any> {
        const me = this;
        const scaleCopy = this.dataScale.copy().range([0, 1]);
        var thresholds = [];
        if (this.props.param_def.type == ParamType.CATEGORICAL) {
            thresholds = this.props.param_def.distinct_values.map((v) => scaleCopy(v));
            thresholds = thresholds.map((value, index) => index == 0 ? value : (value + thresholds[index - 1]) / 2);
        } else {
            for (var i = 1; i < this.props.nbins; ++i) {
                thresholds.push(i / this.props.nbins);
            }
        }
        var histogram = d3.histogram()
            .value(function(d) { return scaleCopy(d[me.props.axis]); })
            .domain([0, 1])
            .thresholds(thresholds);
        return histogram;
    }

    drawAllHistograms(animate: boolean) {
        const histogram = this.createHistogram();
        var allHist: {selected: BinsDrawData, all: BinsDrawData} = {
            selected: {
                bins: histogram(this.props.histData.selected),
                g: this.histAll.current,
                draw_fn: this.drawHistogramRects.bind(this),
            },
            all: {
                bins: histogram(this.props.histData.all),
                g: this.histSelected.current,
                draw_fn: this.drawHistogramLines.bind(this),
            }
        };

        // Density axis: set max based on maximum in histogram
        const maxDensityHistogram = d3.max(Object.values(allHist), function(hist) {
            const total = d3.sum(hist.bins, (d) => d.length);
            if (!total) {
                return 0;
            }
            return d3.max(hist.bins, (d) => d.length / total);
        });
        var densityScale = d3.scaleLinear()
            .domain([0, maxDensityHistogram]);
        var binsOrdering = allHist.all.bins.map((_, i) => i);
        if (this.isVertical()) {
            densityScale = densityScale.range([this.figureHeight(), 0])
            d3.select(this.axisLeft.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisLeft(densityScale)
                    .ticks(1 + this.props.height/50)
                    .tickSizeInner(-(this.props.width - margin.left - margin.right))
                );
        } else {
            densityScale = densityScale.range([0, this.figureWidth()])
            d3.select(this.axisBottom.current)
                .transition()
                .duration(animate ? this.props.animateMs : 0)
                .call(d3.axisBottom(densityScale).ticks(1 + this.props.width/50));
            // Compute reordering of the bins - we want to display higher densities first.
            var ordered1 = Array.from(binsOrdering).sort((a, b) => allHist.selected.bins[a].length - allHist.selected.bins[b].length);
            ordered1.forEach(function(value, idx) {
                binsOrdering[value] = idx;
            });
            // Update ticks/axis as well
            var domain: string[] = this.dataScale.domain();
            var domainsOrdered = domain.map(function(v, idx) {
                return domain[ordered1[idx]];
            });
            this.createDataAxis(d3.scalePoint().domain(domainsOrdered).range(this.dataScale.range()), true);
        }

        // Draw all the histograms
        Object.values(allHist).forEach(function(v) {
            v.draw_fn(v, densityScale, animate, binsOrdering);
        }.bind(this))
    }

    drawHistogramLines(hist: BinsDrawData, densityScale: d3.ScaleLinear<number, number>, animate: boolean, binsOrdering: number[]) {
        const total = d3.sum(hist.bins, (d) => d.length);
        const densityScaleFromLength = (d) => densityScale(total ? d.length / total : 0);
        const dataScale = d3.scaleLinear().range(this.dataScale.range());

        var u = d3.select(hist.g).selectAll<SVGLineElement, any>("line")
            .data(hist.bins);

        const dataCoord = this.isVertical() ? "x" : "y";
        const densityCoord = this.isVertical() ? "y" : "x";
        u
            .enter()
            .append("line") // Add a new rect for each new elements
            .merge(u) // get the already existing elements as well
            .transition() // and apply changes to all of them
            .duration(animate ? this.props.animateMs : 0)
                .attr(`${dataCoord}1`, (d, i) => dataScale(hist.bins[binsOrdering[i]].x0) + 1)
                .attr(`${densityCoord}1`, (d, i) => densityScaleFromLength(d))
                .attr(`${dataCoord}2`, (d, i) => dataScale(hist.bins[binsOrdering[i]].x1))
                .attr(`${densityCoord}2`, (d, i) => densityScaleFromLength(d));

        u
            .exit()
            .remove();
    }

    drawHistogramRects(hist: BinsDrawData, densityScale: d3.ScaleLinear<number, number>, animate: boolean, binsOrdering: number[]) {
        const total = d3.sum(hist.bins, (d) => d.length);
        const densityScaleFromLength = (d) => densityScale(total ? d.length / total : 0);
        const dataScale = d3.scaleLinear().range(this.dataScale.range());
        var u = d3.select(hist.g).selectAll<SVGRectElement, any>("rect")
            .data(hist.bins);

        var ut = u
            .enter()
            .append("rect") // Add a new rect for each new elements
            .merge(u) // get the already existing elements as well
            .attr("data-value-sample", function(d, i) { return d.length ? d[0][this.props.axis] : "empty"}.bind(this))
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
                .attr("transform", function(d) { return "translate(" + dataScale(d.x0) + "," + densityScaleFromLength(d) + ")"; })
                .attr("width", function(d) { return dataScale(d.x1) - dataScale(d.x0) -1 ; })
                .attr("height", function(d) {
                    return this.figureHeight() - densityScaleFromLength(d);
                }.bind(this));
        } else {
            ut
                //.attr("y", 1)
                .attr("transform", function(d, i) { return "translate(0," + dataScale(hist.bins[binsOrdering[i]].x1) + ")"; })
                .attr("width", function(d) { return densityScaleFromLength(d); })
                .attr("height", function(d, i) {
                    const delta = Math.abs(dataScale(hist.bins[binsOrdering[i]].x1) - dataScale(hist.bins[binsOrdering[i]].x0));
                    return delta > 2 ? delta - 1 : delta;
                }.bind(this));
        }

        u
            .exit()
            .remove();
    }
    componentDidMount() {
        this.createDataScaleAndAxis();
        this.drawAllHistograms(false);
    }

    componentDidUpdate(prevProps: DistributionPlotData, prevState: {}) {
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
            const animate = prevProps.nbins != this.props.nbins ||
                prevProps.histData != this.props.histData;
            this.drawAllHistograms(animate);
        }
    }

    render() {
        const leftAxisLabel = this.isVertical() ? "Density" : this.props.axis;
        return (<div>
            <svg width={this.props.width} height={this.props.height}>
                <g transform={`translate(${margin.left}, 15)`} textAnchor="start" fontWeight="bold">
                    <text style={{stroke: "white", strokeWidth: "0.2em"}}>{leftAxisLabel}</text>
                    <text>{leftAxisLabel}</text>
                </g>
                <g ref={this.svgContainer} className={style['distr-graph-svg']} transform={`translate(${margin.left}, ${margin.top})`}>
                    <g className={style.histAll} ref={this.histAll}></g>
                    <g className={style.histSelected} ref={this.histSelected}></g>
                    <g className="axisLeft" ref={this.axisLeft}></g>
                    <g className="axisRight" ref={this.axisRight} transform={`translate(${this.figureWidth()}, 0)`}></g>
                    <g className="axisBottom" ref={this.axisBottom} transform={`translate(0, ${this.figureHeight()})`}></g>
                    <g ref={this.axisBottomName} transform={`translate(${this.figureWidth()}, ${this.props.height - margin.top - 30})`} textAnchor="end" fontWeight="bold">
                    </g>
                </g>
            </svg>
        </div>);
    }
};
