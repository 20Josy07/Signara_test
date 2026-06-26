/*!
 * The Sutton SignWriting Web Components
 */
import { r as registerInstance, h, H as Host, g as getElement } from './_commonjsHelpers-383fba37.js';
import { s as swu } from './swu-f4cee096.js';
import { s as style } from './style-fd531f8d.js';
import { s as swu$1 } from './swu-a03963b7.js';
import { c as cssValues } from './global-4493408c.js';

const sgnwSignCss = ":host{direction:ltr}";

const SgnwSign = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.sgnw = window.sgnw;
  }
  connectedCallback() {
    if (!this.sign) {
      let sign = swu.parse.sign(this.el.innerHTML);
      if (sign.style) {
        this.styling = style.compose(style.merge(style.parse(sign.style), style.parse(this.styling)));
      }
      sign.style = "";
      this.sign = swu.compose.sign(sign);
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
    return (h(Host, { sign: this.sign, styling: this.styling, innerHTML: this.sgnw ? swu$1.signSvg(this.sign + (styleStr)) : '' }, h("slot", null)));
  }
  get el() { return getElement(this); }
};
SgnwSign.style = sgnwSignCss;

const sgnwSymbolCss = "";

const SgnwSymbol = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.sgnw = window.sgnw;
  }
  connectedCallback() {
    if (!this.symbol) {
      let symbol = swu.parse.symbol(this.el.innerHTML);
      if (symbol.style) {
        this.styling = style.compose(style.merge(style.parse(symbol.style), style.parse(this.styling)));
      }
      symbol.style = "";
      this.symbol = swu.compose.symbol(symbol);
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
    return (h(Host, { symbol: this.symbol, styling: this.styling, innerHTML: this.sgnw ? swu$1.symbolSvg(this.symbol + (styleStr)) : '' }, h("slot", null)));
  }
  get el() { return getElement(this); }
};
SgnwSymbol.style = sgnwSymbolCss;

export { SgnwSign as sgnw_sign, SgnwSymbol as sgnw_symbol };
