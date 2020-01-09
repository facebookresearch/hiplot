/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


// Give a div the class "resizable-h" and you'll be able to resize it :)
//@ts-ignore
import style from "./resizable.css";
import $ from "jquery";

const BORDER_SIZE = 4;

export function make_resizable(element: HTMLDivElement) {
    let m_pos: number;
    $(element).addClass(style.resizableH);
    var this_e = $(element);
    function resize(e) {
        const dy = e.clientY - m_pos;
        m_pos = e.clientY;
        this_e.css('height', (parseInt(this_e.css('height')) + dy) + "px");
        if (dy != 0) {
            this_e.trigger('resize');
        }
    }

    $(element).on("mousedown", function(e){
        if (e.offsetY > $(this).height() - BORDER_SIZE) {
            m_pos = e.clientY;
            document.addEventListener("mousemove", resize, false);
        }
    });

    $(element).on("mouseup", function(){
        if (m_pos == null) {
            return;
        }
        m_pos = null;
        document.removeEventListener("mousemove", resize, false);
    });
}