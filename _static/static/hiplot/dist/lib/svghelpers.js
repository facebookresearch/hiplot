/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as d3 from "d3";
import style from "../hiplot.scss";
export function foDynamicSizeFitContent(fo) {
    var w = Math.floor(fo.children[0].clientWidth + 2); // borders 2 px
    var h = Math.floor(fo.children[0].clientHeight + 2);
    var anchor = fo.getAttribute("text-anchor");
    if (anchor == "end") {
        fo.setAttribute("x", "" + -w);
    }
    else if (anchor == "start") {
        fo.setAttribute("x", "0");
    }
    else if (anchor == "middle") {
        fo.setAttribute("x", "" + -w / 2);
    }
    fo.style.width = w + "px";
    fo.style.height = h + "px";
    fo.style.overflow = "visible";
}
export function foCreateAxisLabel(pd, cm, tooltip) {
    if (tooltip === void 0) { tooltip = "Right click for options"; }
    var fo = document.createElementNS('http://www.w3.org/2000/svg', "foreignObject");
    var sel = d3.select(fo).append("xhtml:span")
        .attr("class", pd.label_css)
        .classed(style.tooltipContainer, true)
        .classed("d-inline-block", true)
        .classed(style.label, true)
        .html(pd.name)
        .on("contextmenu", function () {
        if (cm) {
            cm.current.show(d3.event.pageX, d3.event.pageY, pd.name);
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
    });
    if (tooltip) {
        sel.append("span")
            .classed(style.tooltiptext, true)
            .classed(style.tooltipBot, true)
            .text(tooltip);
    }
    return fo;
}
