/*!
 * The Sutton SignWriting Web Components
 */
import { r as registerInstance, h, H as Host, g as getElement } from './_commonjsHelpers-383fba37.js';
import { o as overlap } from './global-4493408c.js';

const fswSignboxCss = ".sc-fsw-signbox-h{width:100%;height:100%;border-radius:10px;display:block}";

const FswSignbox = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
  }
  paletteSymbolDropHandler(event) {
    const target = event.target;
    if (overlap(target, this.el)) {
      console.log(event.detail);
    }
  }
  render() {
    return (h(Host, null, h("slot", null)));
  }
  get el() { return getElement(this); }
};
FswSignbox.style = fswSignboxCss;

export { FswSignbox as fsw_signbox };
