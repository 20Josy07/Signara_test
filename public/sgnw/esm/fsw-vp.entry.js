/*!
 * The Sutton SignWriting Web Components
 */
import { r as registerInstance, h, H as Host, g as getElement } from './_commonjsHelpers-383fba37.js';
import { f as fsw } from './fsw-74700325.js';
import { s as style } from './style-fd531f8d.js';
import { c as cssValues } from './global-4493408c.js';

const fswVpCss = ":host{writing-mode:vertical-lr;border-right:1px solid blue;height:100%}:host svg{display:block}:host span.outside{font-size:0%;line-height:0%;border-left:1px solid blue;vertical-align:top}:host span.middle{vertical-align:bottom}:host span.inside{border-left:1px dashed red}fsw-sign,fsw-symbol{writing-mode:horizontal-tb;display:inline-block;vertical-align:middle;box-sizing:content-box}";

const FswVp = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.sgnw = window.sgnw;
    this.items = [];
  }
  parseText(newValue) {
    this.items = fsw.parse.text(newValue).map(val => {
      let i = fsw.info(val);
      i['text'] = val;
      return i;
    });
  }
  connectedCallback() {
    if (!this.vp) {
      this.vp = this.el.innerHTML;
    }
    else {
      this.parseText(this.vp);
    }
    if (!this.sgnw) {
      let self = this;
      function handleSgnw() {
        self.sgnw = window.sgnw;
        window.removeEventListener("sgnw", handleSgnw, false);
      }
      window.addEventListener('sgnw', handleSgnw, false);
    }
  }
  render() {
    const values = cssValues(this.el);
    const styling = style.compose({
      colorize: this.colorize,
      detail: values.detail
    });
    const offset = 150;
    return (h(Host, { vp: this.vp }, h("span", { class: "outside" }, h("span", { class: "middle" }, h("span", { class: "inside" }, this.items.map((item) => {
      let zoom, pad, width, height, right, padding;
      if (item['segment'] == 'sign') {
        zoom = values.zoom * item['zoom'];
        pad = item['padding'] * zoom;
        width = item['width'] * zoom + pad * 2;
        height = item['height'] * zoom + pad * 2;
        right = (1000 - (item["minX"] * 2) - item['width']) * zoom - (offset * values.zoom * item['lane']);
        padding = Math.max(0, (20 * zoom) - pad);
        return h("fsw-sign", { styling: styling, style: { "font-size": (values.zoom * 30) + "px", "width": width + "px", "height": height + "px", "margin-right": ((right > 0) ? right : 0) + "px", "border-left": ((right < 0) ? (-right) : 0) + "px solid transparent", "padding": padding + "px" } }, item['text']);
      }
      else if (item['segment'] == 'symbol') {
        zoom = values.zoom * item['zoom'];
        pad = item['padding'] * zoom;
        width = item['width'] * zoom + pad * 2;
        height = item['height'] * zoom + pad * 2;
        padding = Math.max(0, (20 * zoom) - pad);
        return h("fsw-symbol", { styling: styling, style: { "font-size": (values.zoom * 30) + "px", "width": width + "px", "height": height + "px", "padding-bottom": padding + "px" } }, item['text']);
      }
      else {
        console.log("other");
        return h("div", null, item['text']);
      }
    }))))));
  }
  get el() { return getElement(this); }
  static get watchers() { return {
    "vp": ["parseText"]
  }; }
};
FswVp.style = fswVpCss;

export { FswVp as fsw_vp };
