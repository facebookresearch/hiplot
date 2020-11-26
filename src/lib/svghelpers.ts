/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import * as d3 from "d3";
import { ParamDef } from "../infertypes";
import style from "../hiplot.scss";
import { ContextMenu } from "../contextmenu";

function leftPos(anchor: string, w: number, minmax?: [number, number]): number {
    var left = {
        end: -w,
        start: 0,
        middle: -w / 2,
    }[anchor];
    if (minmax) {
        if (left < minmax[0]) {
            left = minmax[0];
        } else if (left + w > minmax[1]) {
            left = minmax[1] - w;
        }
    }
    return left;
}
export function foDynamicSizeFitContent(fo: SVGForeignObjectElement, minmax?: [number, number]) {
    const TOOLTIP_WIDTH_PX = 80;
    const w = Math.floor(fo.children[0].children[0].clientWidth + 2); // borders 2 px
    const h = Math.floor(fo.children[0].children[0].clientHeight + 2);
    const anchor = fo.getAttribute("text-anchor");
    const tooltip = fo.children[0].children[1] as HTMLSpanElement;
    const anchor_x = leftPos(anchor, w, minmax);
    fo.setAttribute("x", `${anchor_x}`);
    // Set tooltip
    if (tooltip) {
        const tooltip_anchor_x = leftPos(anchor, TOOLTIP_WIDTH_PX, minmax) - anchor_x;
        const tooltip_width = Math.min(TOOLTIP_WIDTH_PX, TOOLTIP_WIDTH_PX - tooltip_anchor_x);
        tooltip.style.marginLeft = `${tooltip_anchor_x}px`;
        tooltip.style.width = `${tooltip_width}px`;
    }
    fo.style.width = `${w}px`;
    fo.style.height = `${h}px`;
    fo.style.overflow = "visible";
}

export function foCreateAxisLabel(pd: ParamDef, cm?: React.RefObject<ContextMenu>, tooltip: string = "Right click for options"): SVGForeignObjectElement {
    var fo = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
    const span = d3.select(fo).append("xhtml:div")
        .classed(style.tooltipContainer, true)
        .classed(style.label, true);
    span.append("xhtml:span")
        .attr("class", pd.label_css)
        .classed(style.axisLabelText, true)
        .classed("d-inline-block", true)
        .html(pd.name)
        .on("contextmenu", function() {
            if (cm) {
                cm.current.show(d3.event.pageX, d3.event.pageY, pd.name);
                d3.event.preventDefault();
                d3.event.stopPropagation();
            }
        });
    if (tooltip) {
        span.append("span")
            .classed(style.tooltiptext, true)
            .classed(style.tooltipBot, true)
            .classed("d-inline-block", true)
            .text(tooltip);
    }
    return fo;
}
