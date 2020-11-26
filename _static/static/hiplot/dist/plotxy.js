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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import $ from "jquery";
import * as d3 from "d3";
import { create_d3_scale } from "./infertypes";
import style from "./hiplot.scss";
import React from "react";
import { ResizableH } from "./lib/resizable";
import _ from "underscore";
import { foCreateAxisLabel, foDynamicSizeFitContent } from "./lib/svghelpers";
import { ContextMenu } from "./contextmenu";
;
;
;
var HIGHLIGHT_PARENT = 'parent';
var HIGHLIGHT_CHILDREN = 'children';
;
var PlotXY = /** @class */ (function (_super) {
    __extends(PlotXY, _super);
    function PlotXY(props) {
        var _this = _super.call(this, props) || this;
        _this.root_ref = React.createRef();
        _this.container_ref = React.createRef();
        _this.canvas_lines_ref = React.createRef();
        _this.canvas_highlighted_ref = React.createRef();
        _this.plotXYcontextMenuRef = React.createRef();
        _this.onResize = _.debounce(function (height, width) {
            if (this.state.height != height || this.state.width != width) {
                this.setState({ height: height, width: width });
            }
        }.bind(_this), 100);
        _this.drawSelected = function () {
            if (this.plot) {
                this.plot.draw_selected_rows();
            }
        }.bind(_this);
        _this.drawSelectedThrottled = _.throttle(_this.drawSelected, 100);
        var height;
        if (props.window_state.height) {
            height = props.window_state.height;
        }
        else if (props.height) {
            height = props.height;
        }
        else {
            height = d3.min([d3.max([document.body.clientHeight - 540, 240]), 500]);
        }
        // Load default X/Y axis
        var plotConfig = _this.props;
        function get_default_axis(axis_name) {
            var value = props.persistentState.get(axis_name, props[axis_name]);
            if (value === undefined) {
                value = null;
            }
            if (value != null && props.params_def[value] === undefined) {
                return null;
            }
            return value;
        }
        var state = __assign(__assign({}, plotConfig), { axis_x: get_default_axis('axis_x'), axis_y: get_default_axis('axis_y'), width: 0, height: height, initialHeight: height });
        _this.state = __assign(__assign({}, state), { hover_uid: null, highlightType: _this.props.persistentState.get("highlightType", HIGHLIGHT_PARENT) });
        return _this;
    }
    PlotXY.prototype.componentDidMount = function () {
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            var me_1 = this;
            this.props.context_menu_ref.current.addCallback(function (column, cm) {
                var contextmenu = $(cm);
                contextmenu.append($('<div class="dropdown-divider"></div>'));
                contextmenu.append($("<h6 class=\"dropdown-header\">" + me_1.props.name + "</h6>"));
                ['axis_x', 'axis_y'].forEach(function (dat, index) {
                    var label = "Set as " + ['X', 'Y'][index] + ' axis';
                    var option = $('<a class="dropdown-item" href="#">').text(label);
                    if (me_1.state[dat] == column) {
                        option.addClass('disabled').css('pointer-events', 'none');
                    }
                    option.click(function (event) {
                        if (index == 0) {
                            me_1.setState({ axis_x: column });
                        }
                        else {
                            me_1.setState({ axis_y: column });
                        }
                        event.preventDefault();
                    });
                    contextmenu.append(option);
                });
            }, this);
        }
    };
    PlotXY.prototype.mountPlotXY = function () {
        var me = this;
        me.plotXYcontextMenuRef.current.removeCallbacks(this);
        me.plotXYcontextMenuRef.current.addCallback(function (column, cm) {
            var contextmenu = $(cm);
            [HIGHLIGHT_PARENT, HIGHLIGHT_CHILDREN].forEach(function (dat) {
                var option = $('<a class="dropdown-item" href="#">').text("Highlight: " + dat);
                if (me.state.highlightType == dat) {
                    option.addClass('disabled').css('pointer-events', 'none');
                }
                option.click(function (event) {
                    me.setState({ highlightType: dat });
                    event.preventDefault();
                });
                contextmenu.append(option);
            });
        }, me);
        var div = d3.select(this.root_ref.current);
        me.svg = div.select("svg");
        var currently_displayed = [];
        var zoom_brush;
        // Lines
        var graph_lines = this.canvas_lines_ref.current.getContext('2d');
        graph_lines.globalCompositeOperation = "destination-over";
        // Highlights
        var highlights = this.canvas_highlighted_ref.current.getContext('2d');
        highlights.globalCompositeOperation = "destination-over";
        var margin = { top: 40, right: 20, bottom: 70, left: 60 };
        var x_scale, y_scale, yAxis, xAxis;
        var x_scale_orig, y_scale_orig;
        function redraw_axis_and_rerender() {
            redraw_axis();
            clear_canvas();
            me.drawSelectedThrottled();
        }
        function create_scale(param, range) {
            var scale = create_d3_scale(me.props.params_def[param]);
            scale.range(range);
            return scale;
        }
        function redraw_axis() {
            me.svg.selectAll(".axis_render").remove();
            me.svg.selectAll(".brush").remove();
            me.svg.attr("viewBox", [0, 0, me.state.width, me.state.height]);
            me.svg.append("g").attr('class', 'axis_render').call(xAxis);
            me.svg.append("g").attr('class', 'axis_render').call(yAxis);
            me.svg.append("g").attr("class", "brush").call(zoom_brush);
        }
        function recompute_scale(force) {
            if (force === void 0) { force = false; }
            if (!force && !me.isEnabled()) {
                return;
            }
            var insideGraphMargin = Math.max(me.props.dots_thickness, me.props.dots_highlighed_thickness, 0);
            x_scale_orig = x_scale = create_scale(me.state.axis_x, [margin.left + insideGraphMargin, me.state.width - margin.right - insideGraphMargin]);
            y_scale_orig = y_scale = create_scale(me.state.axis_y, [me.state.height - margin.bottom - insideGraphMargin, margin.top + insideGraphMargin]);
            zoom_brush = d3.brush().extent([[margin.left, margin.top], [me.state.width - margin.right, me.state.height - margin.bottom]]).on("end", brushended);
            yAxis = function (g) { return g
                .attr("transform", "translate(" + (margin.left - 10) + ",0)")
                .call(d3.axisLeft(y_scale).ticks(1 + me.state.height / 40).tickSizeInner(margin.left + margin.right - me.state.width))
                .call(function (g) { return g.select(".domain").remove(); })
                .call(function (g) { return g.select(".tick:last-of-type").append(function () {
                var label = foCreateAxisLabel(me.props.params_def[me.state.axis_y], me.props.context_menu_ref);
                d3.select(label).attr("y", "" + (-this.transform.baseVal[0].matrix.f + 10));
                return label;
            })
                .attr("x", 3)
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .classed("plotxy-label", true); })
                .attr("font-size", null)
                .call(function (g) { return g.selectAll(".plotxy-label").each(function () { foDynamicSizeFitContent(this); }); }); };
            xAxis = function (g) { return g
                .attr("transform", "translate(0," + (me.state.height - margin.bottom) + ")")
                .call(d3.axisBottom(x_scale).ticks(1 + me.state.width / 80).tickSizeInner(margin.bottom + margin.top - me.state.height))
                .call(function (g) { return g.select(".tick:last-of-type").each(function () {
                var fo = foCreateAxisLabel(me.props.params_def[me.state.axis_x], me.props.context_menu_ref, /* label */ null);
                d3.select(fo)
                    .attr("y", 40)
                    .attr("text-anchor", "end")
                    .attr("font-weight", "bold")
                    .classed("plotxy-label", true);
                var clone = this.cloneNode(false);
                clone.appendChild(fo);
                this.parentElement.appendChild(clone);
            }); })
                // Make odd ticks below (to prevent overlap when very long labels)
                .call(function (g) { return g
                .selectAll(".tick")
                .each(function (d, i) {
                var line = this.children[0];
                if (this.childElementCount == 2 && this.children[1].textLength.baseVal.value && line.nodeName == "line") {
                    this.transform.baseVal.getItem(0).matrix.f += 20 * (i % 2);
                    line.setAttribute("y2", "" + (parseFloat(line.getAttribute("y2")) - 20 * (i % 2)));
                }
            }); })
                .attr("font-size", null)
                .call(function (g) { return g.selectAll(".plotxy-label").each(function () { foDynamicSizeFitContent(this); }); }); };
            div.selectAll("canvas")
                .attr("width", me.state.width - margin.left - margin.right)
                .attr("height", me.state.height - margin.top - margin.bottom);
            div.selectAll("svg")
                .attr("width", me.state.width)
                .attr("height", me.state.height);
            div.style("height", me.state.height + "px");
            div.selectAll('canvas').style('margin', margin.top + 'px ' + margin.right + 'px ' + margin.bottom + 'px ' + margin.left + 'px');
            redraw_axis();
        }
        function on_move() {
            var pos_top = $(me.root_ref.current).position().top;
            var pos_left = $(me.root_ref.current).position().left;
            div.selectAll("canvas").style("top", pos_top + "px").style("left", pos_left + "px");
            me.svg.style("top", pos_top + "px").style("left", pos_left + "px");
        }
        function brushended() {
            var s = d3.event.selection;
            if (!s) {
                if (x_scale === x_scale_orig && y_scale === y_scale_orig) {
                    return;
                }
                x_scale = x_scale_orig;
                y_scale = y_scale_orig;
            }
            else {
                if (x_scale.invert !== undefined) {
                    var xrange = [x_scale.invert(s[0][0]), x_scale.invert(s[1][0])];
                    x_scale = create_scale(me.state.axis_x, [margin.left, me.state.width - margin.right]);
                    x_scale.domain(xrange);
                }
                if (y_scale.invert !== undefined) {
                    var yrange = [y_scale.invert(s[1][1]), y_scale.invert(s[0][1])];
                    y_scale = create_scale(me.state.axis_y, [me.state.height - margin.bottom, margin.top]);
                    y_scale.domain(yrange);
                }
            }
            redraw_axis_and_rerender();
        }
        on_move();
        function hover(svg, path) {
            var dot = me.svg.append("g")
                .attr("display", "none");
            dot.append("circle")
                .attr("r", 2.5);
            dot.append("text")
                .style("font", "10px sans-serif")
                .attr("text-anchor", "middle")
                .attr("y", -8);
            if ("ontouchstart" in document)
                svg
                    .style("-webkit-tap-highlight-color", "transparent")
                    .on("touchmove", moved)
                    .on("touchstart", entered)
                    .on("touchend", left);
            else
                svg
                    .on("mousemove", moved)
                    .on("mouseenter", entered)
                    .on("mouseleave", left);
            function moved() {
                d3.event.preventDefault();
                var closest = null;
                var closest_dist = null;
                $.each(currently_displayed, function (_, dp) {
                    var dist = Math.pow((dp['layerX'] - d3.event.layerX), 2) + Math.pow((dp['layerY'] - d3.event.layerY), 2);
                    if (closest_dist == null || dist < closest_dist) {
                        closest_dist = dist;
                        closest = dp;
                    }
                });
                if (closest === null) {
                    dot.attr("transform", "translate(" + d3.event.layerX + "," + d3.event.layerY + ")");
                    dot.select("text").text("No point found?!");
                    return;
                }
                me.setState({
                    hover_uid: closest['dp'].uid
                });
                dot.attr("transform", "translate(" + closest["layerX"] + "," + closest["layerY"] + ")");
                dot.select("text").text(me.props.render_row_text(closest['dp']));
            }
            function entered() {
                dot.attr("display", null);
            }
            function left() {
                me.setState({
                    hover_uid: null
                });
                dot.attr("display", "none");
            }
        }
        ;
        me.svg.call(hover);
        function render_dp(dp, ctx, c) {
            if (c.lines_color)
                ctx.strokeStyle = c.lines_color;
            if (c.dots_color)
                ctx.fillStyle = c.dots_color;
            if (c.lines_width)
                ctx.lineWidth = c.lines_width;
            var pdx = me.props.params_def[me.state.axis_x];
            var pdy = me.props.params_def[me.state.axis_y];
            function is_err(value, scaled_value, def) {
                return value === undefined || value === null || isNaN(scaled_value) || (def.numeric && (value == 'inf' || value == '-inf'));
            }
            function render_point_position(dp) {
                var x = x_scale(dp[me.state.axis_x]);
                var y = y_scale(dp[me.state.axis_y]);
                x -= margin.left;
                y -= margin.top;
                var err = is_err(dp[me.state.axis_x], x, pdx) || is_err(dp[me.state.axis_y], y, pdy);
                if (err) {
                    return null;
                }
                if (c.remember) {
                    currently_displayed.push({
                        'layerX': x + margin.left,
                        'layerY': y + margin.top,
                        'dp': dp
                    });
                }
                return { x: x, y: y };
            }
            var pos = render_point_position(dp);
            if (pos === null) {
                return;
            }
            if (dp.from_uid && c.lines_width > 0.0) {
                var dp_prev = me.props.dp_lookup[dp.from_uid];
                if (dp_prev) {
                    var prev_pos = render_point_position(dp_prev);
                    if (prev_pos !== null) {
                        ctx.beginPath();
                        ctx.moveTo(prev_pos.x, prev_pos.y);
                        ctx.lineTo(pos.x, pos.y);
                        ctx.stroke();
                    }
                }
                else {
                    console.log('DataPoint with id ' + dp.from_uid + ' not found (dp.from_uid)', dp);
                }
            }
            if (c.dots_thickness > 0) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, c.dots_thickness, 0, 2 * Math.PI, true);
                ctx.fill();
            }
        }
        ;
        function draw_selected_rows() {
            if (!me.isEnabled()) {
                return;
            }
            clear_canvas();
            var xp_config = me.props;
            var area = me.state.height * me.state.width / 400000;
            var lines_opacity = xp_config.lines_opacity !== null ? xp_config.lines_opacity : d3.min([3 * area / Math.pow(me.props.rows_selected.length, 0.3), 1]);
            var dots_opacity = xp_config.dots_opacity !== null ? xp_config.dots_opacity : d3.min([4 * area / Math.pow(me.props.rows_selected.length, 0.3), 1]);
            me.props.rows_selected.forEach(function (dp) {
                render_dp(dp, graph_lines, {
                    'lines_color': me.props.get_color_for_row(dp, lines_opacity),
                    'lines_width': xp_config.lines_thickness,
                    'dots_color': me.props.get_color_for_row(dp, dots_opacity),
                    'dots_thickness': xp_config.dots_thickness,
                    'remember': true
                });
            });
        }
        function clear_canvas() {
            graph_lines.clearRect(0, 0, me.state.width, me.state.height);
            highlights.clearRect(0, 0, me.state.width, me.state.height);
            currently_displayed = [];
        }
        ;
        function lookupParent(dp) {
            if (dp.from_uid === null) {
                return [];
            }
            var nextDp = me.props.dp_lookup[dp.from_uid];
            return nextDp === undefined ? [] : [nextDp];
        }
        ;
        var childrenLookup = {};
        function lookupChildren(dp) {
            var next = childrenLookup[dp.uid];
            return next ? next : [];
        }
        ;
        // Draw highlights
        function draw_highlighted() {
            var _a;
            if (!me.isEnabled()) {
                return;
            }
            var highlighted = me.props.rows_highlighted;
            highlights.clearRect(0, 0, me.state.width, me.state.height);
            d3.select(me.canvas_highlighted_ref.current).style("opacity", "0");
            d3.select(me.canvas_lines_ref.current).style("opacity", "1.0");
            if (!highlighted.length) { // Stop highlight
                return;
            }
            d3.select(me.canvas_highlighted_ref.current).style("opacity", "1.0");
            d3.select(me.canvas_lines_ref.current).style("opacity", "0.5");
            childrenLookup = {};
            if (me.state.highlightType == HIGHLIGHT_CHILDREN) {
                // Pre-compute graph of children - TODO: maybe we could cache that
                me.props.rows_filtered.forEach(function (dp) {
                    if (dp.from_uid !== null) {
                        if (childrenLookup[dp.from_uid] === undefined) {
                            childrenLookup[dp.from_uid] = [dp];
                        }
                        else {
                            childrenLookup[dp.from_uid].push(dp);
                        }
                    }
                });
            }
            var lookupNextDp = (_a = {},
                _a[HIGHLIGHT_CHILDREN] = lookupChildren,
                _a[HIGHLIGHT_PARENT] = lookupParent,
                _a)[me.state.highlightType];
            // Find all runs + parents
            var todo = new Set(highlighted);
            var allHighlighted = new Set();
            while (todo.size) {
                var oldTodo = todo;
                todo = new Set();
                oldTodo.forEach(function (dp) {
                    if (allHighlighted.has(dp)) {
                        return;
                    }
                    allHighlighted.add(dp);
                    lookupNextDp(dp).forEach(function (newDp) { todo.add(newDp); });
                });
            }
            allHighlighted.forEach(function (dp) {
                var color = me.props.get_color_for_row(dp, 1.0).split(',');
                render_dp(dp, highlights, {
                    'lines_color': [color[0], color[1], color[2], 1.0 + ')'].join(','),
                    'lines_width': 4,
                    'dots_color': [color[0], color[1], color[2], 0.8 + ')'].join(','),
                    'dots_thickness': me.props.dots_highlighed_thickness
                });
            });
        }
        // Change axis
        function update_axis() {
            recompute_scale(true);
            clear_canvas();
            me.drawSelectedThrottled();
        }
        ;
        update_axis();
        // Initial lines right now
        draw_selected_rows();
        me.drawSelectedThrottled.cancel();
        return {
            clear_canvas: clear_canvas,
            update_axis: update_axis,
            recompute_scale: recompute_scale,
            draw_selected_rows: draw_selected_rows,
            draw_highlighted: draw_highlighted,
            on_resize: _.debounce(function () {
                if (this.isEnabled()) {
                    recompute_scale();
                    draw_selected_rows();
                }
            }.bind(this), 150)
        };
    };
    PlotXY.prototype.disable = function () {
        this.setState({ axis_x: null, axis_y: null, height: this.state.initialHeight });
    };
    PlotXY.prototype.render = function () {
        if (!this.isEnabled()) {
            return [];
        }
        return (React.createElement(ResizableH, { initialHeight: this.state.height, onResize: this.onResize, onRemove: this.disable.bind(this) },
            React.createElement(ContextMenu, { ref: this.plotXYcontextMenuRef }),
            this.state.width > 0 && React.createElement("div", { onContextMenu: this.plotXYcontextMenuRef.current.onContextMenu, ref: this.root_ref, style: { "height": this.state.height } },
                React.createElement("canvas", { ref: this.canvas_lines_ref, className: style["plotxy-graph-lines"], style: { position: 'absolute' } }),
                React.createElement("canvas", { ref: this.canvas_highlighted_ref, className: style["plotxy-graph-highlights"], style: { position: 'absolute' } }),
                React.createElement("svg", { className: style["plotxy-graph-svg"], style: { position: 'absolute' } }))));
    };
    PlotXY.prototype.componentWillUnmount = function () {
        if (this.plot) {
            this.plot.clear_canvas();
            this.plot.on_resize.cancel();
            this.svg.selectAll("*").remove();
        }
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            this.props.context_menu_ref.current.removeCallbacks(this);
        }
        this.drawSelectedThrottled.cancel();
        this.onResize.cancel();
        if (this.plotXYcontextMenuRef.current) {
            this.plotXYcontextMenuRef.current.removeCallbacks(this);
        }
    };
    ;
    PlotXY.prototype.isEnabled = function () {
        return this.state.axis_x !== null && this.state.axis_y !== null;
    };
    PlotXY.prototype.componentDidUpdate = function (prevProps, prevState) {
        var anyAxisChanged = false;
        ['axis_x', 'axis_y'].forEach(function (d) {
            if (prevState[d] != this.state[d]) {
                this.props.persistentState.set(d, this.state[d]);
                anyAxisChanged = true;
            }
        }.bind(this));
        if (this.state.highlightType != prevState.highlightType) {
            this.props.persistentState.set("highlightType", this.state.highlightType);
        }
        if (this.state.width == 0) {
            return; // Loading...
        }
        if (this.isEnabled() && !this.plot) {
            this.plot = this.mountPlotXY();
        }
        if (prevState.height != this.state.height || prevState.width != this.state.width) {
            if (this.plot) {
                this.plot.on_resize();
            }
        }
        if (!this.isEnabled()) {
            this.plot = null;
            if (this.state.hover_uid !== null) {
                this.setState({
                    hover_uid: null
                });
            }
        }
        else {
            if (anyAxisChanged) {
                this.plot.update_axis();
            }
        }
        if (this.state.hover_uid != prevState.hover_uid) {
            if (this.state.hover_uid === null) {
                this.props.setHighlighted([]);
            }
            else {
                this.props.setHighlighted([this.props.dp_lookup[this.state.hover_uid]]);
            }
        }
        // Check if data changed
        if (this.plot) {
            var scaleRecomputed = false;
            var colorByChange = this.props.params_def[this.props.colorby] != prevProps.params_def[prevProps.colorby];
            if (this.props.params_def[this.state.axis_x] != prevProps.params_def[this.state.axis_x] ||
                this.props.params_def[this.state.axis_y] != prevProps.params_def[this.state.axis_y]) {
                this.plot.recompute_scale();
                scaleRecomputed = true;
            }
            if (this.props.rows_selected != prevProps.rows_selected || scaleRecomputed || colorByChange) {
                this.drawSelectedThrottled();
            }
            if (this.props.rows_highlighted != prevProps.rows_highlighted || scaleRecomputed ||
                colorByChange ||
                this.state.highlightType != prevState.highlightType) {
                this.plot.draw_highlighted();
            }
        }
        this.props.window_state.height = this.state.height;
    };
    PlotXY.defaultProps = {
        axis_x: null,
        axis_y: null,
        lines_thickness: 1.2,
        lines_opacity: null,
        dots_highlighed_thickness: 5.0,
        dots_thickness: 1.4,
        dots_opacity: null,
        data: {}
    };
    return PlotXY;
}(React.Component));
export { PlotXY };
