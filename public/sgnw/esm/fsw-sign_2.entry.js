/*!
 * The Sutton SignWriting Web Components
 */
import { r as registerInstance, h, H as Host, g as getElement } from './_commonjsHelpers-383fba37.js';
import { f as fsw } from './fsw-74700325.js';
import { s as style } from './style-fd531f8d.js';
import { f as fsw$1 } from './fsw-bd4c9f61.js';
import { c as cssValues } from './global-4493408c.js';

const fswSignCss = ":host{direction:ltr}";

const FswSign = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.sgnw = window.sgnw;
  }
  connectedCallback() {
    if (!this.sign) {
      let sign = fsw.parse.sign(this.el.innerHTML);
      if (sign.style) {
        this.styling = style.compose(style.merge(style.parse(sign.style), style.parse(this.styling)));
      }
      sign.style = "";
      this.sign = fsw.compose.sign(sign);
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
    const styleStr = style.compose(style.merge(cssValues(this.el), style.parse(this.styling)));
    return (h(Host, { sign: this.sign, styling: this.styling, innerHTML: this.sgnw ? fsw$1.signSvg(this.sign + (styleStr)) : '' }, h("slot", null)));
  }
  get el() { return getElement(this); }
};
FswSign.style = fswSignCss;

const fswSymbolCss = "";

const FswSymbol = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.sgnw = window.sgnw;
  }
  connectedCallback() {
    if (!this.symbol) {
      let symbol = fsw.parse.symbol(this.el.innerHTML);
      if (symbol.style) {
        this.styling = style.compose(style.merge(style.parse(symbol.style), style.parse(this.styling)));
      }
      this.symbol = symbol.symbol;
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
    const styleStr = style.compose(style.merge(cssValues(this.el), style.parse(this.styling)));
    return (h(Host, { symbol: this.symbol, styling: this.styling, innerHTML: this.sgnw ? fsw$1.symbolSvg(this.symbol + (styleStr)) : '' }, h("slot", null)));
  }
  get el() { return getElement(this); }
};
FswSymbol.style = fswSymbolCss;

export { FswSign as fsw_sign, FswSymbol as fsw_symbol };
