/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import * as d3 from "d3";

import { on_position_changed } from "./lib/jqueryext";
import { WatchedProperty, AllDatasets, DatapointLookup, Datapoint, HiPlotGraphConfig } from "./types";
import { ParamDefMap } from "./infertypes";
//@ts-ignore
import style from "./hiplot.css";
import { HiPlotData } from "./plugin";

export interface DatapointsGraphConfig extends HiPlotData {
  root: HTMLDivElement,
  graph_display_config: HiPlotGraphConfig,
};

export class DatapointsGraph {
  params_def: ParamDefMap;
  svg: any;
  clear_canvas: () => void;
  axis_x = new WatchedProperty('axis_x');
  axis_y = new WatchedProperty('axis_y');
  experiment_provided_config: HiPlotGraphConfig;
  constructor(config: DatapointsGraphConfig) {
    var me = this;
    me.experiment_provided_config = config.experiment.line_display;
    me.params_def = config.params_def;

    // Load default X/Y axis
    function init_line_display_axis(axis, default_value) {
        axis.set(config.url_state.get(axis.name, default_value));
        if (config.params_def[axis.get()] === undefined) {
            axis.set(null);
        }
        axis.on_change(function(v) {
            config.url_state.set(axis.name, v);
        });
    }
    init_line_display_axis(this.axis_x, me.experiment_provided_config.axis_x);
    init_line_display_axis(this.axis_y, me.experiment_provided_config.axis_y);

    config.context_menu_ref.current.addCallback(function(column, cm) {
      var contextmenu = $(cm);
      contextmenu.append($('<div class="dropdown-divider"></div>'));
      contextmenu.append($('<h6 class="dropdown-header">Line display</h6>'));
      [me.axis_x, me.axis_y].forEach(function(dat, index) {
        var label = "Set as " + ['X', 'Y'][index] + ' axis';
        var option = $('<a class="dropdown-item" href="#">').text(label);
        if (dat.get() == column) {
          option.addClass('disabled').css('pointer-events', 'none');
        }
        option.click(function(event) {
          dat.set(column);
          event.preventDefault();
        });
        contextmenu.append(option);
      });
    })

    var div = d3.select(config.root);
    me.svg = div.select("svg");
    var dp_lookup = config.dp_lookup;
    var currently_displayed = [];
    var rerender_all_points = [];
    var zoom_brush;

    var is_enabled = false;

    // Lines
    var graph_lines = (<HTMLCanvasElement>div.select('.checkpoints-graph-lines').node()).getContext('2d');
    graph_lines.globalCompositeOperation = "destination-over";

    // Highlights
    var highlights = (<HTMLCanvasElement>div.select('.checkpoints-graph-highlights').node()).getContext('2d');
    highlights.globalCompositeOperation = "destination-over";

    var width, height, x_scale, y_scale, yAxis, xAxis, margin;
    var x_scale_orig, y_scale_orig;
  
    function redraw_axis_and_rerender() {
      var rerender_all_points_before = rerender_all_points;
      redraw_axis();
      me.clear_canvas();
      $.each(rerender_all_points_before, function(_, fn) {
        fn();
      });
      rerender_all_points = rerender_all_points_before;
    }
    function create_scale(param, range) {
      var scale = me.params_def[param].create_d3_scale()
      scale.range(range);
      return scale;
    }
    function redraw_axis() {
      me.svg.selectAll(".axis_render").remove();
      me.svg.selectAll(".brush").remove();
      me.svg.attr("viewBox", [0, 0, width, height]);
      me.svg.append("g").attr('class', 'axis_render').call(xAxis);
      me.svg.append("g").attr('class', 'axis_render').call(yAxis);
      me.svg.append("g").attr("class", "brush").call(zoom_brush);
    }
    function recompute_scale() {
      if (!is_enabled) {
        return;
      }
      $('.display-when-dp-enabled').removeClass('collapse');
      width = document.body.clientWidth;
      height = d3.min([d3.max([document.body.clientHeight-540, 240]), 500]);
      margin = {top: 20, right: 20, bottom: 50, left: 60};
      x_scale_orig = x_scale = create_scale(me.axis_x.get(), [margin.left, width - margin.right]);
      y_scale_orig = y_scale = create_scale(me.axis_y.get(), [height - margin.bottom, margin.top]);
      zoom_brush = d3.brush().extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]).on("end", brushended);

      yAxis = g => g
        .attr("transform", `translate(${margin.left - 10},0)`)
        .call(d3.axisLeft(y_scale).ticks(1+height/40).tickSizeInner(margin.left + margin.right - width))
        .call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 3)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(me.axis_y.get()));
      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x_scale).ticks(1+width / 40).tickSizeInner(margin.bottom + margin.top - height))
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("y", 22)
            .attr("text-anchor", "end")
            .attr("font-weight", "bold")
            .text(me.axis_x.get()));
      div.selectAll("canvas")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom);
      div.selectAll("svg")
        .attr("width", width)
        .attr("height", height);
      div.style("height", height + "px");
      div.selectAll('canvas').style('margin', margin.top + 'px ' + margin.right + 'px ' + margin.bottom + 'px ' + margin.left + 'px');

      redraw_axis();
    }
    function on_move() {
      var pos_top = $(config.root).position().top;
      var pos_left = $(config.root).position().left;
      div.selectAll("canvas").style("top", pos_top + "px").style("left", pos_left + "px");
      me.svg.style("top", pos_top + "px").style("left", pos_left + "px");
    }
    function brushended() {
      var s = d3.event.selection;
      if (!s) {
        x_scale = x_scale_orig;
        y_scale = y_scale_orig;
      } else {
        if (x_scale.invert !== undefined) {
          var xrange = [x_scale.invert(s[0][0]), x_scale.invert(s[1][0])];
          x_scale = create_scale(me.axis_x.get(), [margin.left, width - margin.right]);
          x_scale.domain(xrange);
        }
        if (y_scale.invert !== undefined) {
          var yrange = [y_scale.invert(s[1][1]), y_scale.invert(s[0][1])];
          y_scale = create_scale(me.axis_y.get(), [height - margin.bottom, margin.top]);
          y_scale.domain(yrange);
        }
      }
      redraw_axis_and_rerender();
    }
    on_move();
    on_position_changed($(config.root), on_move);

    function hover(svg, path) {
      var dot = me.svg.append("g")
          .attr("display", "none");

      dot.append("circle")
          .attr("r", 2.5);

      dot.append("text")
          .style("font", "10px sans-serif")
          .attr("text-anchor", "middle")
          .attr("y", -8);

      if ("ontouchstart" in document) svg
          .style("-webkit-tap-highlight-color", "transparent")
          .on("touchmove", moved)
          .on("touchstart", entered)
          .on("touchend", left)
      else svg
          .on("mousemove", moved)
          .on("mouseenter", entered)
          .on("mouseleave", left);

      function moved() {
        d3.event.preventDefault();
        // currently_displayed
        var closest = null;
        var closest_dist = null;
        $.each(currently_displayed, function(_, dp) {
          var dist = (dp['layerX'] - d3.event.layerX) ** 2 + (dp['layerY'] - d3.event.layerY) ** 2;
          if (closest_dist == null || dist < closest_dist) {
            closest_dist = dist;
            closest = dp;
          }
        });
        if (closest === null) {
          dot.attr("transform", `translate(${d3.event.layerX},${d3.event.layerY})`);
          dot.select("text").text("No point found?!");
          return;
        }
        config.rows['highlighted'].set([config.dp_lookup[closest['dp'].uid]]);
        dot.attr("transform", `translate(${closest["layerX"]},${closest["layerY"]})`);
        dot.select("text").text(config.render_row_text(closest['dp']));
      }

      function entered() {
        dot.attr("display", null);
      }

      function left() {
        config.rows['highlighted'].set([]);
        dot.attr("display", "none");
      }
    };

    me.svg.call(hover);

    function render_dp(dp, ctx, c) {
      if (c.lines_color) ctx.strokeStyle = c.lines_color;
      if (c.dots_color) ctx.fillStyle = c.dots_color;
      if (c.lines_width) ctx.lineWidth = c.lines_width;
      var pdx = me.params_def[me.axis_x.get()];
      var pdy = me.params_def[me.axis_y.get()];
      function is_err(value, scaled_value, def) {
        return value === undefined || value === null || isNaN(scaled_value) || (def.numeric && (value == 'inf' || value == '-inf'));
      }
      function render_point_position(dp) {
        var x = x_scale(dp[me.axis_x.get()]);
        var y = y_scale(dp[me.axis_y.get()]);
        x -= margin.left;
        y -= margin.top;

        var err = is_err(dp[me.axis_x.get()], x, pdx) || is_err(dp[me.axis_y.get()], y, pdy);
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
        return {x: x, y: y};
      }
      var pos = render_point_position(dp);
      if (pos === null) {
        return;
      }
      if (dp.from_uid && c.lines_width > 0.0) {
        var dp_prev = dp_lookup[dp.from_uid];
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
    };

    config.rows['all'].on_change(function(new_data) {
        recompute_scale();
    });
    
    // Render at the same pace as parallel plot
    var xp_config = config.experiment.line_display;
    config.rows['rendered'].on_append(function(new_rows) {
      new_rows.forEach(function(dp) {
        var call_render = function() {
          render_dp(dp, graph_lines, {
            'lines_color': config.get_color_for_row(dp, xp_config.lines_opacity),
            'lines_width': xp_config.lines_thickness,
            'dots_color': config.get_color_for_row(dp, xp_config.dots_opacity),
            'dots_thickness': xp_config.dots_thickness,
            'remember': true,
          });
        };
        rerender_all_points.push(call_render);
        if (is_enabled) {
          call_render();
        }
      });
    });

    this.clear_canvas = function() {
      graph_lines.clearRect(0, 0, width, height);
      highlights.clearRect(0, 0, width, height);
      currently_displayed = [];
      rerender_all_points = [];
    };
    // Draw selected
    config.rows['rendered'].on_change(function(new_rows) {
      if (new_rows.length == 0) {
        me.clear_canvas();
      }
    });

    // Draw highlights
    config.rows['highlighted'].on_change(function(highlighted) {
      if (!is_enabled) {
        return;
      }
      highlights.clearRect(0, 0, width, height);
      div.select(".checkpoints-graph-highlights").style("opacity", "0");
      div.select(".checkpoints-graph-lines").style("opacity", "1.0");
      if (!highlighted.length) {  // Stop highlight
        return;
      }
      div.select(".checkpoints-graph-highlights").style("opacity", "1.0");
      div.select(".checkpoints-graph-lines").style("opacity", "0.5");
      // Find all runs + parents
      highlighted.forEach(function(dp) {
        while (dp !== undefined) {
          var color = config.get_color_for_row(dp, 1.0).split(',');
          render_dp(dp, highlights, {
            'lines_color': [color[0], color[1], color[2], config.graph_display_config.lines_opacity + ')'].join(','),
            'lines_width': 4,
            'dots_color': [color[0], color[1], color[2], config.graph_display_config.dots_opacity + ')'].join(','),
            'dots_thickness': 5,
          });
          if (dp.from_uid === null) {
            break;
          }
          dp = dp_lookup[dp.from_uid];
        }
      });
    });

    // Change axis
    function update_axis() {
      var new_x_axis = me.axis_x.get();
      var new_y_axis = me.axis_y.get();
      if (new_x_axis === undefined || new_y_axis === undefined ||
          new_x_axis === null || new_y_axis === null) {
        return;
      }
      is_enabled = true;


      var rerender_all_points_before = rerender_all_points;
      recompute_scale();
      me.clear_canvas();
      $.each(rerender_all_points_before, function(_, fn) {
        fn();
      });
      rerender_all_points = rerender_all_points_before;
    };
    me.axis_x.on_change(update_axis);
    me.axis_y.on_change(update_axis);
    update_axis();
  }
  destroy() {
    this.clear_canvas();
    this.svg.selectAll("*").remove();
  };
}