/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import * as d3 from "d3";
import { DistributionPlotData } from "./distributionplot";
import { create_d3_scale_without_outliers } from "../infertypes";

const margin = {top: 10, right: 20, bottom: 50, left: 60};

interface DistributionNumericPlotState {
};

// Ref: https://www.d3-graph-gallery.com/graph/histogram_binSize.html

export class DistributionNumericPlot extends React.Component<DistributionPlotData, DistributionNumericPlotState> {
    axisBottom = React.createRef<SVGSVGElement>();
    axisLeft = React.createRef<SVGSVGElement>();
    svgContainer = React.createRef<SVGSVGElement>();

    xScale: any;

    createXScaleAndAxis(): void {
        const pd = this.props.param_def;
        this.xScale = create_d3_scale_without_outliers(pd).range([0, this.props.width - margin.left - margin.right]);
        d3.select(this.axisBottom.current).call(d3.axisBottom(this.xScale).ticks(1 + this.props.height/50));
    }

    createHistogram(): d3.HistogramGeneratorNumber<any, any> {
        const me = this;
        const prevRange = this.xScale.range();
        this.xScale.range([0, 1]);
        var thresholds = [];
        for (var i = 1; i < this.props.nbins; ++i) {
            thresholds.push(this.xScale.invert(i / this.props.nbins));
        }
        var histogram = d3.histogram()
            .value(function(d) { return d[me.props.axis]; })   // I need to give the vector of value
            .domain(this.xScale.domain())  // scale.domain()
            .thresholds(thresholds);
        this.xScale.range(prevRange);
        return histogram;
    }

    drawHistogram(animate: boolean) {
        const xScale = this.xScale;
        const histogram = this.createHistogram();
        var bins = histogram(this.props.histData);

        // Y axis: set max based on maximum in histogram
        const maxValueHistogram = d3.max(bins, function(d) { return d.length; });
        const totalValuesHistogram = d3.sum(bins.map(function(d) { return d.length; }));
        var yScale = d3.scaleLinear()
            .range([this.props.height - margin.top - margin.bottom, 0])
            .domain([0, maxValueHistogram / totalValuesHistogram]);
        const yScaleToDensity = (x) => yScale(x / totalValuesHistogram);
        d3.select(this.axisLeft.current)
            .transition()
            .duration(animate ? 1000 : 0)
            .call(d3.axisLeft(yScale));

        // Join the rect with the bins data
        var u = d3.select(this.svgContainer.current).selectAll<SVGRectElement, any>("rect")
            .data(bins);

        // Manage the existing bars and eventually the new ones:
        u
            .enter()
            .append("rect") // Add a new rect for each new elements
            .merge(u) // get the already existing elements as well
            .transition() // and apply changes to all of them
            .duration(animate ? 1000 : 0)
                .attr("x", 1)
                .attr("transform", function(d) { return "translate(" + xScale(d.x0) + "," + yScaleToDensity(d.length) + ")"; })
                .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0) -1 ; })
                .attr("height", function(d) { return this.props.height - margin.top - margin.bottom - yScaleToDensity(d.length); }.bind(this))
                .style("fill", "#69b3a2");


        // If less bar in the new histogram, I delete the ones not in use anymore
        u
        .exit()
        .remove();
    }

    componentDidMount() {
        this.createXScaleAndAxis();
        this.drawHistogram(false);
    }

    componentDidUpdate(prevProps: DistributionPlotData, prevState: DistributionNumericPlotState) {
        if (prevProps.axis != this.props.axis ||
            prevProps.param_def != this.props.param_def ||
            prevProps.width != this.props.width ||
            prevProps.height != this.props.height) {
            this.createXScaleAndAxis();
        }
        if (prevProps.axis != this.props.axis ||
            prevProps.nbins != this.props.nbins ||
            prevProps.histData != this.props.histData ||
            prevProps.width != this.props.width ||
            prevProps.height != this.props.height) {
            const animate = prevProps.nbins != this.props.nbins ||
                prevProps.histData != this.props.histData;
            this.drawHistogram(animate);
        }
    }

    render() {
        return (<div>
            <svg width={this.props.width} height={this.props.height}>
                <g ref={this.svgContainer} transform={`translate(${margin.left}, ${margin.top})`}>
                    <g ref={this.axisLeft}></g>
                    <g ref={this.axisBottom} transform={`translate(0, ${this.props.height - margin.top - margin.bottom})`}></g>
                    <g transform={`translate(${this.props.width - margin.left - margin.right}, ${this.props.height - margin.top - 20})`} textAnchor="end" fontWeight="bold"><text>{this.props.axis}</text></g>
                </g>
            </svg>
        </div>);
    }
};
