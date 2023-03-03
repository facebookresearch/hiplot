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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
// This file is largely inspired from the snippet by Kai Chang
// available in http://bl.ocks.org/syntagmatic/3150059
import $ from "jquery";
import React from "react";
import * as d3 from "d3";
import _ from 'underscore';
import { ParamType } from "../types";
import { create_d3_scale, scale_pixels_range } from "../infertypes";
import style from "../hiplot.scss";
import { ResizableH } from "../lib/resizable";
import { FilterType, apply_filters } from "../filters";
import { foDynamicSizeFitContent, foCreateAxisLabel } from "../lib/svghelpers";
import { IS_SAFARI, redrawAllForeignObjectsIfSafari } from "../lib/browsercompat";
;
;
;
;
var TOP_MARGIN_PIXELS = 80;
var ParallelPlot = /** @class */ (function (_super) {
    __extends(ParallelPlot, _super);
    function ParallelPlot(props) {
        var _this = _super.call(this, props) || this;
        _this.on_resize = null;
        _this.m = [
            TOP_MARGIN_PIXELS,
            TOP_MARGIN_PIXELS * 0.5,
            10,
            10 // left
        ]; // Margins
        _this.dimensions_dom = null;
        _this.render_speed = 10;
        _this.animloop = null;
        // Rendering
        _this.root_ref = React.createRef();
        _this.foreground_ref = React.createRef();
        _this.highlighted_ref = React.createRef();
        _this.svg_ref = React.createRef();
        _this.svgg_ref = React.createRef();
        // Dimensions, scaling and axis
        _this.yscale = {}; // d3.scale
        _this.d3brush = d3.brushY();
        _this.onBrushChange = _.throttle(function () {
            this.sendBrushExtents();
            this.pplot.brush();
        }.bind(_this), 75);
        _this.get_axis = function (d) {
            var fmt = this.props.params_def[d].ticks_format;
            var axis = this.axis.scale(this.yscale[d]).ticks(1 + this.state.height / 50, fmt);
            return axis;
        }.bind(_this);
        _this.sendBrushExtents = _.debounce(function () {
            this.props.sendMessage("brush_extents", function () {
                var yscales = this.yscale;
                var colToScale = {};
                this.dimensions_dom.selectAll("." + style.brush).each(function (dim) {
                    var sel = d3.brushSelection(this);
                    if (sel === null) {
                        return;
                    }
                    colToScale[dim] = scale_pixels_range(yscales[dim], sel);
                });
                return colToScale;
            }.bind(this));
        }.bind(_this), 400);
        _this.forceHideColumn = function (pd) {
            return pd === undefined ||
                pd.distinct_values.length <= 1 ||
                (pd.type == ParamType.CATEGORICAL && pd.distinct_values.length > this.props.categoricalMaximumValues);
        }.bind(_this);
        _this.position = function (d) {
            if (this.state.dragging && d == this.state.dragging.col) {
                return this.state.dragging.pos;
            }
            return this.xscale(d);
        }.bind(_this);
        // transition ticks for reordering, rescaling and inverting
        _this.update_ticks = function (d, extent) {
            var div = d3.select(this.root_ref.current);
            var me = this;
            // update brushes
            if (d) {
                var brush_el = d3.select(this.svg_ref.current).selectAll("." + style.brush)
                    .filter(function (key) { return key == d; });
                this.d3brush.move(brush_el, extent);
            }
            else {
                // all ticks
                d3.select(this.svg_ref.current).selectAll("." + style.brush)
                    .each(function (d) { d3.select(this).call(me.d3brush); });
            }
            // show ticks
            div.selectAll("." + style.axis + " g").style("display", null);
            div.selectAll(".background").style("visibility", null);
            // update axes
            div.selectAll("." + style.axis)
                .each(function (d, i) {
                // hide lines for better performance
                d3.select(this).selectAll('line').style("display", "none");
                // transition axis numbers
                d3.select(this)
                    .transition()
                    .duration(720)
                    .call(me.get_axis(d));
                // bring lines back
                d3.select(this).selectAll('line').transition().delay(800).style("display", null);
                d3.select(this)
                    .selectAll('text')
                    .style('font-weight', null)
                    .style('font-size', null)
                    .style('display', null);
            });
            me.setState(function (prevState) { return { brush_count: prevState.brush_count + 1 }; });
        }.bind(_this);
        // render a set of polylines on a canvas
        _this.paths = function (selected, ctx, count) {
            var me = this;
            var n = selected.length, i = 0, opacity = d3.min([2 / Math.pow(n, 0.3), 1]), timer = (new Date()).getTime();
            var shuffled_data = _.shuffle(selected);
            ctx.clearRect(0, 0, this.w + 1, this.h + 1);
            // Adjusts rendering speed
            function optimize(timer) {
                var delta = (new Date()).getTime() - timer;
                me.render_speed = Math.max(Math.ceil(me.render_speed * 30 / delta), 8);
                me.render_speed = Math.min(me.render_speed, 300);
                return (new Date()).getTime();
            }
            // render a batch of polylines
            function render_range(selection, i, max, opacity) {
                var s = selection.slice(i, max);
                s.forEach(function (d) {
                    me.path(d, ctx, me.props.get_color_for_row(d, opacity));
                });
            }
            ;
            // render all lines until finished or a new brush event
            function animloop() {
                if (i >= n || count < me.state.brush_count)
                    return true;
                var max = d3.min([i + me.render_speed, n]);
                render_range(shuffled_data, i, max, opacity);
                i = max;
                timer = optimize(timer); // adjusts render_speed
            }
            ;
            if (this.animloop) {
                this.animloop.stop();
            }
            if (n > 0) {
                this.animloop = d3.timer(animloop);
            }
        }.bind(_this);
        _this.path = function (d, ctx, color) {
            if (color)
                ctx.strokeStyle = color;
            var has_started = false;
            var x0, y0;
            this.state.dimensions.map(function (p) {
                var err = d[p] === undefined;
                if (!err && (d[p] == 'inf' || d[p] == '-inf') && this.props.params_def[p].numeric) {
                    err = true;
                }
                var x = this.xscale(p), y = this.yscale[p](d[p]);
                if (isNaN(y)) {
                    err = true;
                }
                if (err) {
                    // Skip this one
                    if (has_started) {
                        ctx.lineTo(x0 + 15, y0); // right edge
                        ctx.stroke();
                    }
                    has_started = false;
                    return;
                }
                if (!has_started) {
                    x0 = x - 15;
                    y0 = y;
                    ctx.moveTo(x0, y0);
                    ctx.beginPath();
                    has_started = true;
                }
                var cp1x = x - 0.88 * (x - x0);
                var cp1y = y0;
                var cp2x = x - 0.12 * (x - x0);
                var cp2y = y;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
                x0 = x;
                y0 = y;
            }.bind(this));
            if (has_started) {
                ctx.lineTo(x0 + 15, y0); // right edge
                ctx.stroke();
            }
        }.bind(_this);
        _this.state = {
            height: props.persistentState.get('height', props.window_state.height ? props.window_state.height : 600),
            width: 0,
            order: props.persistentState.get('order', props.order ? props.order : []),
            hide: new Set(props.persistentState.get('hide', props.hide ? props.hide : [])),
            invert: new Set(props.persistentState.get('invert', props.invert ? props.invert : [])),
            dimensions: [],
            brush_count: 0,
            dragging: null
        };
        return _this;
    }
    ParallelPlot.prototype.componentWillUnmount = function () {
        d3.select(this.svgg_ref.current).selectAll("*").remove();
        if (this.animloop) {
            this.animloop.stop();
        }
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            this.props.context_menu_ref.current.removeCallbacks(this);
        }
        this.onBrushChange.cancel();
        this.sendBrushExtents.cancel();
    };
    ;
    ParallelPlot.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevState.height != this.state.height || prevState.width != this.state.width) {
            if (this.on_resize != null) {
                this.on_resize();
            }
        }
        if (prevState.invert != this.state.invert) {
            this.props.persistentState.set('invert', Array.from(this.state.invert));
        }
        if (prevState.hide != this.state.hide) {
            this.props.persistentState.set('hide', Array.from(this.state.hide));
        }
        if (prevState.order != this.state.order) {
            this.props.persistentState.set('order', this.state.order);
        }
        if (prevState.dimensions != this.state.dimensions && this.xscale !== undefined) {
            var g = d3.select(this.svgg_ref.current).selectAll(".dimension");
            this.xscale.domain(this.state.dimensions);
            this.dimensions_dom.filter(function (p) { return this.state.dimensions.indexOf(p) == -1; }.bind(this)).remove();
            this.dimensions_dom = this.dimensions_dom.filter(function (p) { return this.state.dimensions.indexOf(p) !== -1; }.bind(this));
            if (!this.state.dragging && !IS_SAFARI) {
                g = g.transition();
            }
            g.attr("transform", function (p) { return "translate(" + this.position(p) + ")"; }.bind(this));
            redrawAllForeignObjectsIfSafari();
            this.update_ticks();
            this.updateAxisTitlesAnglesAndFontSize();
        }
        // Highlight polylines
        if (prevProps.rows_highlighted != this.props.rows_highlighted) {
            this.highlighted.clearRect(0, 0, this.w, this.h);
            if (this.props.rows_highlighted.length == 0) {
                d3.select(this.foreground_ref.current).style("opacity", null);
            }
            else {
                d3.select(this.foreground_ref.current).style("opacity", "0.25");
                this.props.rows_highlighted.forEach(function (dp) {
                    this.path(dp, this.highlighted, this.props.get_color_for_row(dp, 1));
                }.bind(this));
            }
        }
        // Recompute scales - when dimensions got removed, or scaling changed for one
        if (this.pplot && (this.state.dimensions != prevState.dimensions || prevProps.params_def != this.props.params_def)) {
            var drop_scales = [];
            this.state.dimensions.forEach(function (d) {
                var new_scale = this.createScale(d);
                if (new_scale === null) {
                    drop_scales.push(d);
                    return;
                }
                this.yscale[d] = new_scale;
            }.bind(this));
            drop_scales.forEach(function (d) {
                this.remove_axis(d);
            }.bind(this));
        }
        // Dimension added - redraw missing axis
        var oldDimsSet = new Set(prevState.dimensions);
        if (this.pplot && !__spreadArrays(this.state.dimensions).every(function (value) { return oldDimsSet.has(value); })) {
            this.pplot.redraw_axis();
        }
        // Rescale to new dataset domain
        if (this.pplot && prevProps.params_def != this.props.params_def) {
            this.brush_clear_all();
            this.update_ticks();
            if (this.animloop) {
                this.animloop.stop();
            }
        }
        // When we need to redraw lines
        if (prevProps.rows_selected != this.props.rows_selected || prevProps.colorby != this.props.colorby || prevState.height != this.state.height || prevState.width != this.state.width) {
            this.setState(function (prevState) { return { brush_count: prevState.brush_count + 1 }; });
        }
        else if (prevState.brush_count != this.state.brush_count) {
            this.paths(this.props.rows_selected, this.foreground, this.state.brush_count);
        }
        this.props.window_state.height = this.state.height;
    };
    ParallelPlot.prototype.onResize = function (height, width) {
        if (this.state.height != height || this.state.width != width) {
            this.setState({ height: height, width: width });
        }
    };
    ParallelPlot.prototype.render = function () {
        return (React.createElement(ResizableH, { initialHeight: this.state.height, onResize: this.onResize.bind(this) },
            React.createElement("div", { ref: this.root_ref, className: style["parallel-plot-chart"] + " pplot-root", style: { "height": this.state.height } },
                React.createElement("canvas", { ref: this.foreground_ref, className: style["background-canvas"] }),
                React.createElement("canvas", { ref: this.highlighted_ref, className: style["highlight-canvas"] }),
                React.createElement("svg", { ref: this.svg_ref, width: this.state.width, height: this.state.height },
                    React.createElement("g", { ref: this.svgg_ref, transform: "translate(" + this.m[3] + ", " + this.m[0] + ")" })))));
    };
    ParallelPlot.prototype.componentDidMount = function () {
        var dimensions = Object.keys(this.props.params_def).filter(function (k) {
            if (this.forceHideColumn(this.props.params_def_unfiltered[k]) || this.state.hide.has(k)) {
                return false;
            }
            this.yscale[k] = this.createScale(k);
            return true;
        }.bind(this)).reverse().sort(function (a, b) {
            var pda = this.state.order.findIndex(function (e) { return e == a; });
            var pdb = this.state.order.findIndex(function (e) { return e == b; });
            return (pdb == -1 ? this.state.order.length : pdb) - (pda == -1 ? this.state.order.length : pda);
        }.bind(this));
        this.setState({
            width: this.state.width == 0 ? this.root_ref.current.offsetWidth : this.state.width,
            dimensions: dimensions,
            order: Array.from(dimensions)
        }, this.initParallelPlot.bind(this));
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            this.props.context_menu_ref.current.addCallback(this.columnContextMenu.bind(this), this);
        }
    };
    ParallelPlot.prototype.columnContextMenu = function (column, cm) {
        if (!this.can_restore_axis(column)) {
            return;
        }
        var restore_btn = $("<a class=\"dropdown-item\" href=\"#\">Restore in Parallel Plot</a>");
        restore_btn.on("click", function (event) {
            this.restore_axis(column);
            event.preventDefault();
        }.bind(this));
        $(cm).append(restore_btn);
    };
    ParallelPlot.prototype.initParallelPlot = function () {
        var me = this;
        var div = this.div = d3.select(me.root_ref.current);
        var svg = d3.select(me.svg_ref.current);
        // Foreground canvas for primary view
        me.foreground = this.foreground_ref.current.getContext('2d');
        me.foreground.globalCompositeOperation = "destination-over";
        // Highlight canvas for temporary interactions
        me.highlighted = this.highlighted_ref.current.getContext('2d');
        // SVG for ticks, labels, and interactions
        // Load the data and visualization
        function redraw_axis() {
            // Extract the list of numerical dimensions and create a scale for each.
            me.xscale.domain(me.state.dimensions);
            // Add a group element for each dimension.
            function create_drag_beh() {
                return d3.drag()
                    .container(function () { return this.parentElement.parentElement.parentElement; })
                    .on("start", function (event, d) {
                    me.setState({
                        dragging: {
                            col: d,
                            pos: me.xscale(d),
                            origin: me.xscale(d),
                            dragging: false
                        }
                    });
                    d3.select(me.foreground_ref.current).style("opacity", "0.35");
                })
                    .on("drag", function (event, d) {
                    var eventdx = event.dx;
                    var brushEl = d3.select(this).select("." + style.brush);
                    me.setState(function (prevState, _) {
                        return {
                            dragging: {
                                col: d,
                                pos: Math.min(me.w, Math.max(0, prevState.dragging.pos + eventdx)),
                                origin: prevState.dragging.origin,
                                dragging: true
                            }
                        };
                    }, function () {
                        // Feedback for axis deletion if dropped
                        if (me.state.dragging.pos < 12 || me.state.dragging.pos > me.w - 12) {
                            brushEl.style('fill', 'red');
                        }
                        else {
                            brushEl.style('fill', null);
                        }
                    });
                    var new_dimensions = Array.from(me.state.dimensions);
                    new_dimensions.sort(function (a, b) { return me.position(a) - me.position(b); });
                    if (!new_dimensions.every(function (val, idx) { return val == me.state.dimensions[idx]; })) {
                        me.setState({ dimensions: new_dimensions });
                    }
                    me.dimensions_dom.attr("transform", function (d) { return "translate(" + me.position(d) + ")"; });
                    redrawAllForeignObjectsIfSafari();
                })
                    .on("end", function (event, d) {
                    if (!me.state.dragging.dragging) {
                        // no movement, invert axis
                        var extent = invert_axis(d);
                        me.update_ticks(d, extent);
                    }
                    else {
                        // remove axis if dragged all the way left
                        if (me.state.dragging.pos < 12 || me.state.dragging.pos > me.w - 12) {
                            me.remove_axis(d);
                        }
                        else {
                            var element_1 = this;
                            me.setState({ order: Array.from(me.state.dimensions), dragging: null }, function () {
                                // reorder axes
                                var drag = d3.select(this);
                                if (!IS_SAFARI) {
                                    drag = drag.transition();
                                }
                                d3.select(element_1.parentElement.parentElement).attr("transform", "translate(" + me.xscale(d) + ")");
                                var extents = brush_extends();
                                extent = extents[d];
                                me.update_ticks(d, extent);
                            });
                        }
                    }
                    // rerender
                    d3.select(me.foreground_ref.current).style("opacity", null);
                    me.setState({ dragging: null });
                });
            }
            if (me.dimensions_dom) {
                me.dimensions_dom.remove();
            }
            me.dimensions_dom = d3.select(me.svgg_ref.current).selectAll(".dimension")
                // reverse the order so that the tooltips appear on top of the axis ticks
                .data(me.state.dimensions.slice().reverse())
                .enter().append("svg:g")
                .attr("class", "dimension")
                .attr("transform", function (d) { return "translate(" + me.xscale(d) + ")"; });
            // Add an axis and title.
            me.dimensions_dom.append("svg:g")
                .attr("class", style.axis)
                .attr("transform", "translate(0,0)")
                .each(function (d) {
                console.assert(me.yscale[d], d, me.yscale, this);
                // @ts-ignore
                d3.select(this).call(me.get_axis(d));
            })
                .append(function (dim) { return foCreateAxisLabel(me.props.params_def[dim], me.props.context_menu_ref, "Drag to move, right click for options"); })
                .attr("y", -20)
                .attr("text-anchor", "left")
                .classed("pplot-label", true)
                .classed(style.pplotLabel, true);
            me.dimensions_dom.selectAll(".label-name").style("font-size", "20px");
            me.dimensions_dom.selectAll(".pplot-label").each(function (d) {
                foDynamicSizeFitContent(this, [-me.xscale(d) + 5, -me.xscale(d) + me.state.width - 5]);
            }).attr("x", 0).style("width", "1px");
            me.updateAxisTitlesAnglesAndFontSize();
            me.dimensions_dom.selectAll("foreignObject").call(create_drag_beh());
            // Add and store a brush for each axis.
            me.dimensions_dom.append("svg:g")
                .classed(style.brush, true)
                .classed("pplot-brush", true)
                .each(function (d) { d3.select(this).call(me.d3brush); })
                .selectAll("rect")
                .style("visibility", null)
                .append("title")
                .text("Drag up or down to brush along this axis");
            me.dimensions_dom.selectAll(".extent")
                .append("title")
                .text("Drag or resize this filter");
        }
        ;
        function invert_axis(d) {
            // save extent before inverting
            var extents = brush_extends();
            var extent = extents[d] !== null ? [me.h - extents[d][1], me.h - extents[d][0]] : null;
            if (me.state.invert.has(d)) {
                me.setState(function (prevState, props) {
                    var newInvert = new Set(prevState.invert);
                    newInvert["delete"](d);
                    return {
                        invert: newInvert
                    };
                });
                me.setScaleRange(d);
                div.selectAll("." + style.label)
                    .filter(function (p) { return p == d; })
                    .style("text-decoration", null);
            }
            else {
                me.setState(function (prevState, props) {
                    var newInvert = new Set(prevState.invert);
                    newInvert.add(d);
                    return {
                        invert: newInvert
                    };
                });
                me.setScaleRange(d);
                div.selectAll("." + style.label)
                    .filter(function (p) { return p == d; })
                    .style("text-decoration", "underline");
            }
            return extent;
        }
        function brush_extends() {
            var extents = {};
            me.dimensions_dom.selectAll("." + style.brush).each(function (dim) {
                extents[dim] = d3.brushSelection(this);
            });
            return extents;
        }
        function brush() {
            /**
             * Called whenever a brush happens. Recomputes which points are selected.
             */
            if (me.props.context_menu_ref !== undefined) {
                me.props.context_menu_ref.current.hide();
            }
            var extents = brush_extends();
            var actives = me.state.dimensions.filter(function (p) { return extents[p] !== null && extents[p] !== undefined; });
            // hack to hide ticks beyond extent
            me.dimensions_dom
                .each(function (dimension) {
                if (_.include(actives, dimension)) {
                    var scale = me.yscale[dimension];
                    var extent = extents[dimension];
                    d3.select(this)
                        .selectAll('text')
                        .classed(style.tickSelected, true)
                        .style('display', function () {
                        if (d3.select(this).classed(style.label)) {
                            return null;
                        }
                        var value = d3.select(this).data();
                        return extent[0] <= scale(value) && scale(value) <= extent[1] ? null : "none";
                    });
                }
                else {
                    d3.select(this)
                        .selectAll('text')
                        .classed(style.tickSelected, false)
                        .style('display', null);
                }
                d3.select(this)
                    .selectAll("." + style.label)
                    .style('display', null);
            });
            ;
            // bold dimensions with label
            div.selectAll("." + style.label)
                .style("font-weight", function (dimension) {
                if (_.include(actives, dimension))
                    return "bold";
                return null;
            });
            // Get lines within extents
            var filters = actives.map(function (dimension) {
                var scale = me.yscale[dimension];
                var extent = extents[dimension];
                var range = scale_pixels_range(scale, extent);
                if (range.type == ParamType.CATEGORICAL && !range.values) {
                    // Select nothing
                    return {
                        type: FilterType.Not,
                        data: {
                            type: FilterType.All,
                            data: []
                        }
                    };
                }
                var min, max;
                if (range.type == ParamType.CATEGORICAL) {
                    if (range.values.length == 0) {
                        return {
                            type: FilterType.None,
                            data: {}
                        };
                    }
                    min = range.values[0];
                    max = range.values[range.values.length - 1];
                    console.assert(typeof min == typeof max, min, max);
                }
                else {
                    min = Math.min.apply(Math, range.range);
                    max = Math.max.apply(Math, range.range);
                }
                return {
                    type: FilterType.Range,
                    data: {
                        col: dimension,
                        type: range.type,
                        min: min,
                        max: max,
                        include_infnans: range.include_infnans
                    }
                };
            });
            var selected = apply_filters(me.props.rows_filtered, filters);
            if (me.props.asserts) {
                // Check that pixel-based selected rows
                // match filters-based selected rows
                // But relax the verification a bit - math errors can happen
                // and we only require a 1 pixel precision
                var selected_pixels_minset = [];
                var selected_pixels_maxset = [];
                me.props.rows_filtered
                    .forEach(function (d) {
                    if (actives.every(function (dimension) {
                        var scale = me.yscale[dimension];
                        var extent = extents[dimension];
                        var value = d[dimension];
                        return extent[0] + 1 <= scale(value) && scale(value) <= extent[1] - 1;
                    })) {
                        selected_pixels_minset.push(d);
                    }
                    if (actives.every(function (dimension) {
                        var scale = me.yscale[dimension];
                        var extent = extents[dimension];
                        var value = d[dimension];
                        return extent[0] - 1 <= scale(value) && scale(value) <= extent[1] + 1;
                    })) {
                        selected_pixels_maxset.push(d);
                    }
                });
                var missed = _.difference(selected_pixels_minset, selected);
                var overselected = _.difference(selected, selected_pixels_maxset);
                if (overselected.length || missed.length) {
                    console.error("Warning! Filter on " + actives.join(" ") + " (", filters, ") does not match actually selected rows", " Computed rows with filter:", selected, " Missed:", missed, " Falsely selected:", overselected);
                    console.error("filters", filters, JSON.stringify(filters));
                    if (missed.length) {
                        console.error("first missed", JSON.stringify(missed[0]));
                    }
                    if (overselected.length) {
                        console.error("first falsely selected", JSON.stringify(overselected[0]));
                    }
                }
            }
            me.props.setSelected(selected, {
                type: FilterType.All,
                data: filters
            });
        }
        // scale to window size
        this.on_resize = _.debounce(function () {
            me.compute_dimensions();
            div.selectAll(".dimension")
                .attr("transform", function (d) {
                return "translate(" + me.xscale(d) + ")";
            });
            // update brush placement
            svg.selectAll("." + style.brush)
                .each(function (d) { d3.select(this).call(me.d3brush); });
            // update axis placement
            div.selectAll("." + style.axis)
                .each(function (d) {
                // @ts-ignore
                d3.select(this).call(me.get_axis(d));
            });
            me.updateAxisTitlesAnglesAndFontSize();
            // render data
            this.setState(function (prevState) { return { brush_count: prevState.brush_count + 1 }; });
            this.props.sendMessage("height_changed", function () { return null; });
        }, 100);
        me.compute_dimensions();
        redraw_axis();
        // Render full foreground
        brush();
        me.sendBrushExtents();
        // Trigger initial brush
        me.setState(function (prevState) { return { brush_count: prevState.brush_count + 1 }; });
        me.pplot = {
            'redraw_axis': redraw_axis,
            'brush': brush
        };
    };
    ParallelPlot.prototype.setScaleRange = function (k) {
        var range = [this.h, 0];
        if (this.state.invert.has(k)) {
            range = [0, this.h];
        }
        this.yscale[k].range(range);
    };
    ParallelPlot.prototype.createScale = function (k) {
        var pd = this.props.params_def[k];
        if (pd === undefined) {
            return null;
        }
        var range = [this.h, 0];
        if (this.state.invert.has(k)) {
            range = [0, this.h];
        }
        var scale = create_d3_scale(pd);
        scale.range(range);
        scale.parallel_plot_axis = k;
        return scale;
    };
    ParallelPlot.prototype.updateAxisTitlesAnglesAndFontSize = function () {
        // Set optimal rotation angle and scale fonts so that everything fits on screen
        var MIN_ROTATION_ANGLE = 20;
        var MAX_ROTATION_ANGLE = 70;
        var MAX_FONT_SIZE = 16;
        var MIN_FONT_SIZE = 6;
        var MAX_X = this.dimensions_dom.node().parentElement.parentElement.getBoundingClientRect().right;
        var ROTATION_ANGLE_RADS = Math.max(MIN_ROTATION_ANGLE * Math.PI / 180, Math.min(MAX_ROTATION_ANGLE * Math.PI / 180, Math.atan(24 * this.state.dimensions.length / this.state.width)));
        var maxWidthForTop = TOP_MARGIN_PIXELS / Math.sin(ROTATION_ANGLE_RADS) - MAX_FONT_SIZE;
        this.dimensions_dom.selectAll(".label-name").each(function () {
            // Scale the font-size up or down depending on the text-length
            var beginX = this.getBoundingClientRect().left;
            var maxWidth = Math.min(
            // Should not go outside of the svg (top)
            maxWidthForTop, 
            // Should not go outside of the svg (right)
            (MAX_X - beginX) / Math.cos(ROTATION_ANGLE_RADS));
            var newFontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, maxWidth / this.clientWidth * parseFloat(this.style.fontSize)));
            this.style.fontSize = newFontSize + "px";
            this.style.transform = "rotate(" + (360 - ROTATION_ANGLE_RADS * 180 / Math.PI) + "deg)";
            if (IS_SAFARI) {
                this.parentElement.style.position = "fixed";
            }
            var fo = this.parentElement.parentElement;
            fo.setAttribute("y", -newFontSize + "");
        });
    };
    ParallelPlot.prototype.compute_dimensions = function () {
        this.w = this.state.width - this.m[1] - this.m[3];
        this.h = this.state.height - this.m[0] - this.m[2];
        //@ts-ignore
        this.axis = d3.axisLeft(d3.scaleLinear() /* placeholder */);
        this.d3brush.extent([[-23, 0], [15, this.h]]).on("brush", this.onBrushChange).on("end", this.onBrushChange);
        // Scale chart and canvas height
        this.div.style("height", (this.state.height) + "px");
        this.div.selectAll("canvas")
            .attr("width", this.w)
            .attr("height", this.h)
            .style("padding", this.m.join("px ") + "px");
        this.xscale = d3.scalePoint().range([40, this.w - 40]).domain(this.state.dimensions);
        var me = this;
        this.state.dimensions.forEach(function (d) {
            me.setScaleRange(d);
        });
        this.highlighted.lineWidth = 4;
    };
    ParallelPlot.prototype.brush_clear_all = function () {
        // Reset brushes - but only trigger call to "brush" once
        this.d3brush.on("brush", null).on("end", null);
        this.d3brush.move(this.dimensions_dom.selectAll("." + style.brush), null);
        this.d3brush.on("brush", this.onBrushChange).on("end", this.onBrushChange);
        this.onBrushChange();
    };
    ParallelPlot.prototype.remove_axis = function (d) {
        var pd = this.props.params_def[d];
        if (pd !== undefined) {
            this.setState(function (prevState, props) {
                var newHide = new Set(prevState.hide);
                newHide.add(d);
                return {
                    hide: newHide
                };
            });
        }
        this.setState(function (ps, __) {
            return {
                dimensions: _.difference(ps.dimensions, [d])
            };
        });
    };
    ParallelPlot.prototype.can_restore_axis = function (d) {
        var pd = this.props.params_def_unfiltered[d];
        return pd !== undefined && this.state.dimensions.indexOf(d) === -1 && !this.forceHideColumn(pd);
    };
    ParallelPlot.prototype.restore_axis = function (d) {
        // Already displayed or not hidden
        if (!this.can_restore_axis(d)) {
            return;
        }
        this.setState(function (prevState) {
            var newHide = new Set(prevState.hide);
            newHide["delete"](d);
            return {
                hide: newHide,
                dimensions: prevState.dimensions.concat([d])
            };
        });
    };
    ParallelPlot.defaultProps = {
        categoricalMaximumValues: 200,
        data: {}
    };
    return ParallelPlot;
}(React.Component));
export { ParallelPlot };
