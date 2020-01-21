/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This file is largely inspired from the snippet by Kai Chang
// available in http://bl.ocks.org/syntagmatic/3150059

/// <reference path="./lib/resizable.ts"/>
import $ from "jquery";
import React from "react";
import * as d3 from "d3";
import * as _ from 'underscore';

import { WatchedProperty, AllDatasets, Datapoint, ParamType } from "./types";
import { ParamDefMap } from "./infertypes";
//@ts-ignore
import style from "./hiplot.css";
import { HiPlotData } from "./plugin";


export interface ParallelPlotConfig extends HiPlotData {
  root: HTMLDivElement,
  controls: HTMLDivElement,
};

export interface ParallelPlotInternalState {
  colorby: WatchedProperty,
  rows: AllDatasets,
  params_def: ParamDefMap,
};

export interface StringMapping<V> { [key: string]: V; };


export class ParallelPlot {
  on_resize: () => void;
  m = [75, 0, 10, 0]; // Margins
  // Available space for rendering
  width: number;
  height: number;
  // Available space minus margins
  w: number;
  h: number;

  xscale: any;
  state: ParallelPlotInternalState;
  config: ParallelPlotConfig;

  debounced_brush: any;

  // Rendering
  foreground: CanvasRenderingContext2D;
  background: CanvasRenderingContext2D;
  highlighted: CanvasRenderingContext2D;
  svg: any;
  svgg: any;
  div: any;

  // Dimensions, scaling and axis
  dimensions: Array<string> = [];
  yscale: StringMapping<any> = {}; // d3.scale
  axis: any; // d3.scale
  d3brush = d3.brushY();
  constructor(config: ParallelPlotConfig) {
    var me = this;

    this.config = config;
    var state = this.state = {
      'colorby': config.colorby,
      'rows': config.rows,
      'params_def': config.params_def,
    };

    var dragging: {[dim: string]: number} = {},
        axis,
        dimensions_dom = null,
        render_speed = 10,
        brush_count = 0;

    var controls = d3.select(config.controls);
    var div = this.div = d3.select(config.root);
    var svg = this.svg = div.select('svg');
    var svgg = this.svgg = svg.append("svg:g");

    // Foreground canvas for primary view
    me.foreground = (<HTMLCanvasElement>div.select('.foreground-canvas').node()).getContext('2d');
    me.foreground.globalCompositeOperation = "destination-over";

    // Highlight canvas for temporary interactions
    me.highlighted = (<HTMLCanvasElement>div.select('.highlight-canvas').node()).getContext('2d');

    // Background canvas
    me.background = (<HTMLCanvasElement>div.select('.background-canvas').node()).getContext('2d');

    // SVG for ticks, labels, and interactions

    // Load the data and visualization
    function _loadWithProvidedData() {
      function save_dimension_order() {
        me.dimensions.forEach(function(k, idx) {
          state.params_def[k].parallel_plot_order = idx;
          state.params_def[k].__url_state__.set('order', idx);
        });
      }

      // Extract the list of numerical dimensions and create a scale for each.
      me.xscale.domain(me.dimensions = d3.keys(state.params_def).filter(function(k) {
        var pd = state.params_def[k];
        if (pd.parallel_plot_order < 0) {
          return false;
        }
        me.yscale[k] = me.createScale(k);
        return true;
      }).sort(function(a, b) {
        var pda = state.params_def[a];
        var pdb = state.params_def[b];
        return pda.parallel_plot_order - pdb.parallel_plot_order;
      }));
      save_dimension_order();

      // Add a group element for each dimension.
      function create_drag_beh() {
        var drag_origin: {[dim: string]: number} = {};
        var is_dragged: {[dim: string]: boolean} = {};
        return d3.drag().on("start", function(d: string) {
          dragging[d] = drag_origin[d] = me.xscale(d);
          is_dragged[d] = false;
          div.select(".foreground-canvas").style("opacity", "0.35");
        })
        .on("drag", function(d: string) {
          dragging[d] = Math.min(me.w, Math.max(0, drag_origin[d] += d3.event.dx));
          me.dimensions.sort(function(a, b) { return position(a) - position(b); });
          me.xscale.domain(me.dimensions);
          dimensions_dom.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
          brush_count++;
          is_dragged[d] = true;
  
          // Feedback for axis deletion if dropped
          if (dragging[d] < 12 || dragging[d] > me.w-12) {
            d3.select(this).select("." + style.brush).style('fill', 'red');
          } else {
            d3.select(this).select("." + style.brush).style('fill', null);
          }
        })
        .on("end", function(d: string) {
          if (!is_dragged[d]) {
            // no movement, invert axis
            var extent = invert_axis(d);
  
          } else {
            // reorder axes
            d3.select(this).transition().attr("transform", "translate(" + me.xscale(d) + ")");
  
            var extents = brush_extends();
            extent = extents[d];
          }
  
          // remove axis if dragged all the way left
          if (dragging[d] < 12 || dragging[d] > me.w-12) {
            remove_axis(d);
          }
          save_dimension_order();
  
          // TODO required to avoid a bug
          me.xscale.domain(me.dimensions);
          update_ticks(d, extent);
  
          // rerender
          div.select(".foreground-canvas").style("opacity", null);
          brush();
          delete is_dragged[d];
          delete drag_origin[d];
          delete dragging[d];
        });
      }
      dimensions_dom = svgg.selectAll(".dimension")
          .data(me.dimensions)
        .enter().append("svg:g")
          .attr("class", "dimension")
          .attr("transform", function(d) { return "translate(" + me.xscale(d) + ")"; })
          .call(<any>create_drag_beh());

      // Add an axis and title.
      dimensions_dom.append("svg:g")
          .attr("class", style.axis)
          .attr("transform", "translate(0,0)")
          .each(function(d) { d3.select(this).call(me.axis.scale(me.yscale[d])); })
        .append("svg:text")
          .attr("text-anchor", "middle")
          .attr("y", function(d,i) { return -14 - 16 * (i%3); } )
          .attr("x", 0)
          .attr("class", style.label)
          .text(String)
          .on("contextmenu", function(d) {
            me.config.context_menu_ref.current.show(d3.event.pageX, d3.event.pageY, d);
            d3.event.preventDefault();
          })
          .append("title")
            .text("Click to invert. Drag to reorder");

      // Add and store a brush for each axis.
      dimensions_dom.append("svg:g")
          .attr("class", style.brush)
          .each(function(d) { d3.select(this).call(me.d3brush); })
        .selectAll("rect")
          .style("visibility", null)
          .append("title")
            .text("Drag up or down to brush along this axis");

      dimensions_dom.selectAll(".extent")
          .append("title")
            .text("Drag or resize this filter");

      // Render full foreground
      brush();
    };

    // render polylines i to i+render_speed
    function render_range(selection: Array<Datapoint>, i: number, max: number, opacity: number) {
      var s = selection.slice(i,max);
      config.rows['rendered'].append(s);
      s.forEach(function(d) {
        path(d, me.foreground, config.get_color_for_row(d, opacity));
      });
    };

    // Adjusts rendering speed
    function optimize(timer) {
      var delta = (new Date()).getTime() - timer;
      render_speed = Math.max(Math.ceil(render_speed * 30 / delta), 8);
      render_speed = Math.min(render_speed, 300);
      return (new Date()).getTime();
    }

    // Feedback on rendering progress
    function render_stats(i,n,render_speed) {
      controls.select(".rendered-count").text(i);
      controls.select(".render-speed").text(render_speed);
    }

    // Feedback on selection
    function selection_stats(opacity, n, total) {
      controls.select(".data-count").text(total);
      controls.select(".selected-count").text(n);
      controls.select(".opacity").text((""+(opacity*100)).slice(0,4) + "%");
    }

    // Highlight polylines
    config.rows['highlighted'].on_change(function(highlighted_rows) {
      me.highlighted.clearRect(0, 0, me.w, me.h);
      if (highlighted_rows.length == 0) {
        div.select(".foreground-canvas").style("opacity", null);
        return;
      }
      div.select(".foreground-canvas").style("opacity", "0.25");
      highlighted_rows.forEach(function(dp) {
        path(dp, me.highlighted, config.get_color_for_row(dp, 1));
      })
    });

    function invert_axis(d: string) {
      // save extent before inverting
      var extents = brush_extends();
      var extent = extents[d] !== null ? [me.h - extents[d][1], me.h - extents[d][0]] : null;

      var pd = state.params_def[d];
      if (pd.parallel_plot_inverted) {
        pd.parallel_plot_inverted = false;
        me.setScaleRange(d);
        div.selectAll("." + style.label)
          .filter(function(p) { return p == d; })
          .style("text-decoration", null);
      } else {
        pd.parallel_plot_inverted = true;
        me.setScaleRange(d);
        div.selectAll("." + style.label)
          .filter(function(p) { return p == d; })
          .style("text-decoration", "underline");
      }
      return extent;
    }

    function path(d: Datapoint, ctx: CanvasRenderingContext2D, color?: string) {
      if (color) ctx.strokeStyle = color;
      var has_started = false;
      var x0: number, y0: number;
      me.dimensions.map(function(p,i) {
        var err = d[p] === undefined;
        if (!err && (d[p] == 'inf' || d[p] == '-inf') && state.params_def[p].numeric) {
          err = true;
        }
        var x = me.xscale(p),
            y = me.yscale[p](d[p]);
        if (isNaN(y)) {
          err = true;
        }
        if (err) {
          // Skip this one
          if (has_started) {
            ctx.lineTo(x0+15, y0);                               // right edge
            ctx.stroke();
          }
          has_started = false;
          return;
        }
        if (!has_started) {
          x0 = x-15;
          y0 = y;
          ctx.moveTo(x0,y0);
          ctx.beginPath();
          has_started = true;
        }
        var cp1x = x - 0.88*(x-x0);
        var cp1y = y0;
        var cp2x = x - 0.12*(x-x0);
        var cp2y = y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        x0 = x;
        y0 = y;
      });
      if (has_started) {
        ctx.lineTo(x0+15, y0);                               // right edge
        ctx.stroke();
      }
    };

    function position(d) {
      var v = dragging[d];
      return v == null ? me.xscale(d) : v;
    }

    function brush_extends() {
      var extents = {};
      dimensions_dom.selectAll("." + style.brush).each(function(dim) {
        extents[dim] = d3.brushSelection(this);
      });
      return extents;
    }

    function brush_clear_all() {
      // Reset brushes - but only trigger call to "brush" once
      me.d3brush.on("brush", null).on("end", null);
      me.d3brush.move(dimensions_dom.selectAll("." + style.brush), null);
      me.d3brush.on("brush", me.debounced_brush).on("end", me.debounced_brush);
      me.debounced_brush();
    }

    // Handles a brush event, toggling the display of foreground lines.
    // TODO refactor
    function brush() {
      me.config.context_menu_ref.current.hide();
      brush_count++;
      var extents = brush_extends();
      var actives = me.dimensions.filter(function(p) { return extents[p] !== null; });

      // hack to hide ticks beyond extent
      var b = dimensions_dom
        .each(function(dimension) {
          if (_.include(actives, dimension)) {
            var scale = me.yscale[dimension];
            var extent = extents[dimension];
            d3.select(this)
              .selectAll('text')
              .style('font-weight', 'bold')
              .style('font-size', '13px')
              .style('display', function() {
                if (d3.select(this).classed(style.label)) {
                  return null;
                }
                var value = d3.select(this).data();
                return extent[0] <= scale(value) && scale(value) <= extent[1] ? null : "none";
              });
          } else {
            d3.select(this)
              .selectAll('text')
              .style('font-size', null)
              .style('font-weight', null)
              .style('display', null);
          }
          d3.select(this)
            .selectAll("." + style.label)
            .style('display', null);
        });
        ;

      // bold dimensions with label
      div.selectAll("." + style.label)
        .style("font-weight", function(dimension) {
          if (_.include(actives, dimension)) return "bold";
          return null;
        });

      // Get lines within extents
      var selected = [];
      var all_data = config.rows['all'].get();
      all_data
        .map(function(d) {
          return actives.every(function(dimension) {
            var scale = me.yscale[dimension];
            var extent = extents[dimension];
            var value = d[dimension];
            return extent[0] <= scale(value) && scale(value) <= extent[1];
          }) ? selected.push(d) : null;
        });

      config.rows['selected'].set(selected);
    }
    this.debounced_brush = _.throttle(brush, 75);

    config.rows['selected'].on_change(function(selected) {
      // Render selected lines
      paths(selected, me.foreground, brush_count);
    })

    // render a set of polylines on a canvas
    function paths(selected: Array<Datapoint>, ctx: CanvasRenderingContext2D, count: number) {
      var n = selected.length,
          i = 0,
          opacity = d3.min([2/Math.pow(n,0.3),1]),
          timer = (new Date()).getTime();

      selection_stats(opacity, n, config.rows['all'].get().length)

      var shuffled_data: Array<Datapoint> = _.shuffle(selected);

      config.rows['rendered'].set([]);
      ctx.clearRect(0,0,me.w+1,me.h+1);

      // render all lines until finished or a new brush event
      function animloop(){
        if (i >= n || count < brush_count) return true;
        var max = d3.min([i+render_speed, n]);
        render_range(shuffled_data, i, max, opacity);
        render_stats(max,n,render_speed);
        i = max;
        timer = optimize(timer);  // adjusts render_speed
      };

      d3.timer(animloop);
    }

    // transition ticks for reordering, rescaling and inverting
    function update_ticks(d?, extent?) {
      // update brushes
      if (d) {
        var brush_el = svg.selectAll("." + style.brush)
            .filter(function(key) { return key == d; });
        me.d3brush.move(<any>brush_el, extent);
      } else {
        // all ticks
        svg.selectAll("." + style.brush)
          .each(function(d) { d3.select(this).call(me.d3brush); })
      }

      brush_count++;

      show_ticks();

      // update axes
      div.selectAll("." + style.axis)
        .each(function(d: string,i) {
          // hide lines for better performance
          d3.select(this).selectAll('line').style("display", "none");

          // transition axis numbers
          d3.select(this)
            .transition()
            .duration(720)
            .call(me.axis.scale(me.yscale[d]));

          // bring lines back
          d3.select(this).selectAll('line').transition().delay(800).style("display", null);

          d3.select(this)
            .selectAll('text')
            .style('font-weight', null)
            .style('font-size', null)
            .style('display', null);
        });
    }

    // Rescale to new dataset domain
    config.rows['all'].on_change(function(new_data) {
      brush_clear_all();

      // reset yscales, preserving inverted state
      // TODO: When removing data, some columns might no longer exist
      // and we want to remove those
      var drop_scales = [];
      me.dimensions.forEach(function(d) {
        var new_scale = me.createScale(d);
        if (new_scale === null) {
          drop_scales.push(d);
          return;
        }
        me.yscale[d] = new_scale;
      });
      drop_scales.forEach(function(d, i) {
        remove_axis(d);
      });

      update_ticks();

      // Render selected data
      paths(new_data, me.foreground, brush_count);
    });

    // scale to window size
    this.on_resize = _.debounce(function() {

      var new_width = document.body.clientWidth;
      var new_height = parseInt($(config.root).css('height'));
      if (me.width == new_width && me.height == new_height) {
        return;
      }

      me.compute_dimensions();

      div.selectAll(".dimension")
        .attr("transform", function(d: string) {
          return "translate(" + me.xscale(d) + ")";
      })
      // update brush placement
      svg.selectAll("." + style.brush)
        .each(function(d) { d3.select(this).call(me.d3brush); })
      brush_count++;

      // update axis placement
      me.axis = me.axis.ticks(1+me.height/50);
      div.selectAll("." + style.axis)
        .each(function(d: string) {
          d3.select(this).call(me.axis.scale(me.yscale[d]));
      });

      // render data
      brush();
    }, 100);
    $(config.root).on("resize", this.on_resize);
    $(window).on("resize", this.on_resize);

    function remove_axis(d) {
      var pd = state.params_def[d];
      if (pd !== undefined) {
        pd.parallel_plot_order = -1;
        pd.__url_state__.set('order', -1);
      }
      var g = svgg.selectAll(".dimension");
      me.dimensions = _.difference(me.dimensions, [d]);
      me.xscale.domain(me.dimensions);
      g.attr("transform", function(p) { return "translate(" + position(p) + ")"; });
      dimensions_dom.filter(function(p) { return p == d; }).remove();
      update_ticks();
    }

    // Appearance toggles
    controls.select(".hide-ticks").on("click", hide_ticks);
    controls.select(".show-ticks").on("click", show_ticks);
    controls.select(".dark-theme").on("click", dark_theme);
    controls.select(".light-theme").on("click", light_theme);

    function hide_ticks() {
      div.selectAll("." + style.axis + " g").style("display", "none");
      //div.selectAll(".axis path").style("display", "none");
      div.selectAll(".background").style("visibility", "hidden");
      controls.selectAll(".hide-ticks").attr("disabled", "disabled");
      controls.selectAll(".show-ticks").attr("disabled", null);
    };

    function show_ticks() {
      div.selectAll("." + style.axis + " g").style("display", null);
      //div.selectAll(".axis path").style("display", null);
      div.selectAll(".background").style("visibility", null);
      controls.selectAll(".show-ticks").attr("disabled", "disabled");
      controls.selectAll(".hide-ticks").attr("disabled", null);
    };

    function dark_theme() {
      div.classed(style.dark, true);
      controls.selectAll(".dark-theme").attr("disabled", "disabled");
      controls.selectAll(".light-theme").attr("disabled", null);
    }

    function light_theme() {
      div.classed(style.dark, false);
      controls.selectAll(".light-theme").attr("disabled", "disabled");
      controls.selectAll(".dark-theme").attr("disabled", null);
    }

    me.compute_dimensions();
    _loadWithProvidedData();

    config.colorby.on_change(brush);
  }

  clear() {
    this.svg.selectAll("*").remove();
    $(this.config.root).off("resize", this.on_resize);
    $(window).off("resize", this.on_resize);
  };

  setScaleRange(k: string) {
    var pd = this.state.params_def[k];
    var range = [this.h, 0];
    if (pd.parallel_plot_inverted) {
      range = [0, this.h];
    }
    this.yscale[k].range(range);
  }

  createScale(k: string) {
    var pd = this.state.params_def[k];
    if (pd === undefined) {
      return null;
    }
    var range = [this.h, 0];
    if (pd.parallel_plot_inverted) {
      range = [0, this.h];
    }
    var scale = pd.create_d3_scale();
    scale.range(range);
    scale.parallel_plot_axis = k;
    return scale;
  }

  compute_dimensions() {
    this.width = document.body.clientWidth;
    this.height = parseInt($(this.config.root).css('height'));
    this.w = this.width - this.m[1] - this.m[3];
    this.h = this.height - this.m[0] - this.m[2];
    this.axis = d3.axisLeft(d3.scaleLinear() /* placeholder */).ticks(1+this.height/50);
    this.d3brush.extent([[-23, 0], [15, this.h]]).on("brush", this.debounced_brush).on("end", this.debounced_brush);
    // Scale chart and canvas height
    this.div.style("height", (this.height) + "px")

    this.div.selectAll("canvas")
        .attr("width", this.w)
        .attr("height", this.h)
        .style("padding", this.m.join("px ") + "px");
    this.svg.attr("width", this.width)
      .attr("height", this.height)
      .select("g")
     .attr("transform", "translate(" + this.m[3] + "," + this.m[0] + ")");
    this.xscale = d3.scalePoint().range([40, this.w - 40]).domain(this.dimensions);
    var me = this;
    this.dimensions.forEach(function(d: string) {
      me.setScaleRange(d);
    });
    this.highlighted.lineWidth = 4;
  }
}
