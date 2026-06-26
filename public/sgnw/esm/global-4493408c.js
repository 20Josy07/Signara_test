/*!
 * The Sutton SignWriting Web Components
 */
import { c as createCommonjsModule, a as commonjsGlobal } from './_commonjsHelpers-383fba37.js';

var font = createCommonjsModule(function (module, exports) {
/**
* Sutton SignWriting TrueType Font Module v1.4.2 (https://github.com/sutton-signwriting/font-ttf)
* Author: Steve Slevinski  (https://SteveSlevinski.me)
* font.js is released under the MIT License.
*/

(function (global, factory) {
  factory(exports) ;
})(commonjsGlobal, (function (exports) {
  /**
   * Function that appends font-face CSS for the Sutton SignWriting fonts for system installed fonts, relative directory fonts, or content delivery network
   * @function font.cssAppend
   * @param {string} dir - an optional relative directory for font location
   * @example
   * font.cssAppend('./font/')
   */
  const cssAppend = function (dir = '') {
    const id = "SgnwFontCss";
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.setAttribute("id", "SgnwFontCss");
      style.appendChild(document.createTextNode(`
  @font-face {
    font-family: "SuttonSignWritingLine";
    src: 
      local('SuttonSignWritingLine'),
      ${dir ? `url('${dir}SuttonSignWritingLine.ttf') format('truetype'),` : ""}
      url('https://cdn.jsdelivr.net/npm/@sutton-signwriting/font-ttf@1.0.0/font/SuttonSignWritingLine.ttf') format('truetype');
  }
  @font-face {
    font-family: "SuttonSignWritingFill";
    src: 
      local('SuttonSignWritingFill'),
      ${dir ? `url('${dir}SuttonSignWritingFill.ttf') format('truetype'),` : ""}
      url('https://cdn.jsdelivr.net/npm/@sutton-signwriting/font-ttf@1.0.0/font/SuttonSignWritingFill.ttf') format('truetype');
  }
  @font-face {
    font-family: "SuttonSignWritingOneD";
    src: 
      local('SuttonSignWritingOneD'),
      ${dir ? `url('${dir}SuttonSignWritingOneD.ttf') format('truetype'),` : ""}
      url('https://cdn.jsdelivr.net/npm/@sutton-signwriting/font-ttf@1.0.0/font/SuttonSignWritingOneD.ttf') format('truetype');
  }
    `));
      document.head.appendChild(style);
    }
  };

  let sizes = {};
  const zoom = 2;
  const bound = 76 * zoom;
  let context;

  /**
   * Function that returns the size of a symbol using an id
   * @function font.symbolSize
   * @param {number} id - a 16-bit number of a symbol
   * @returns {number[]} width and height of symbol
   * @example
   * font.symbolSize(1)
   * 
   * return [15,30]
   */
  const symbolSize = function (id) {
    if (id in sizes) {
      return [...sizes[id]];
    }
    if (!context) {
      const canvaser = document.createElement("canvas");
      canvaser.width = bound;
      canvaser.height = bound;
      context = canvaser.getContext("2d");
    }
    context.clearRect(0, 0, bound, bound);
    context.font = 30 * zoom + "px 'SuttonSignWritingLine'";
    context.fillText(String.fromCodePoint(id + 0xF0000), 0, 0);
    const imgData = context.getImageData(0, 0, bound, bound).data;
    let w, h, i, s;
    wloop: for (w = bound - 1; w >= 0; w--) {
      for (h = 0; h < bound; h += 1) {
        for (s = 0; s < 4; s += 1) {
          i = w * 4 + h * 4 * bound + s;
          if (imgData[i]) {
            break wloop;
          }
        }
      }
    }
    var width = w;
    hloop: for (h = bound - 1; h >= 0; h--) {
      for (w = 0; w < width; w += 1) {
        for (s = 0; s < 4; s += 1) {
          i = w * 4 + h * 4 * bound + s;
          if (imgData[i]) {
            break hloop;
          }
        }
      }
    }
    var height = h + 1;
    width = Math.ceil(width / zoom);
    height = Math.ceil(height / zoom);
    // Rounding error in chrome.  Manual fixes.
    if (14394 == id) {
      width = 19;
    }
    if ([10468, 10480, 10496, 10512, 10500, 10532, 10548, 10862, 10878, 10894, 11058, 11074, 11476, 11488, 11492, 11504, 11508, 11520, 10516, 10910, 10926, 11042, 11082, 10942].includes(id)) {
      width = 20;
    }
    if (31921 == id) {
      width = 22;
    }
    if (38460 == id) {
      width = 23;
    }
    if ([20164, 20212].includes(id)) {
      width = 25;
    }
    if (31894 == id) {
      width = 28;
    }
    if (46698 == id) {
      width = 29;
    }
    if (29606 == id) {
      width = 30;
    }
    if (44855 == id) {
      width = 40;
    }
    if (32667 == id) {
      width = 50;
    }
    if ([11088, 11474, 11490, 11506].includes(id)) {
      height = 20;
    }
    if (6285 == id) {
      height = 21;
    }
    if (40804 == id) {
      height = 31;
    }
    if (41475 == id) {
      height = 36;
    }
    // Error in chrome.  Manual fix.
    // if (width==0 && height==0) {
    if (width == 0 && height == 0) {
      const sizefix = {
        9: [15, 30],
        10: [21, 30],
        11: [30, 15],
        12: [30, 21],
        13: [15, 30],
        14: [21, 30]
      };
      if (id in sizefix) {
        width = sizefix[id][0];
        height = sizefix[id][1];
      }
    }
    if (width == 0 && height == 0) {
      return undefined;
    }
    sizes[id] = [width, height];
    return [width, height];
  };

  /**
   * Function that returns a plane 15 character for a symbol line using an id
   * @function font.symbolLine
   * @param {number} id - a 16-bit number of a symbol
   * @returns {string} character for symbol line
   * @example
   * font.symbolLine(1)
   * 
   * return '󰀁'
   */
  const symbolLine = function (id) {
    return String.fromCodePoint(id + 0xF0000);
  };

  /**
   * Function that returns a plane 16 character for a symbol fill using an id
   * @function font.symbolFill
   * @param {number} id - a 16-bit number of a symbol
   * @returns {string} character for symbol fill
   * @example
   * font.symbolFill(1)
   * 
   * return '􀀁'
   */
  const symbolFill = function (id) {
    return String.fromCodePoint(id + 0x100000);
  };

  /**
   * Function that creates two text elements for a symbol using an id
   * @function font.symbolText
   * @param {number} id - a 16-bit number of a symbol
   * @returns {string} SVG segment for line and fill
   * @example
   * font.symbolText(1)
   * 
   * return `    <text class="sym-fill" fill="white" style="pointer-events:none;font-family:'SuttonSignWritingFill';font-size:30px;">􀀁</text>
   *     <text class="sym-line" fill="black" style="pointer-events:none;font-family:'SuttonSignWritingLine';font-size:30px;">󰀁</text>`
   */
  const symbolText = function (id) {
    return `    <text class="sym-fill" fill="white" style="pointer-events:none;font-family:'SuttonSignWritingFill';font-size:30px;">${symbolFill(id)}</text>
    <text class="sym-line" fill="black" style="pointer-events:none;font-family:'SuttonSignWritingLine';font-size:30px;">${symbolLine(id)}</text>`;
  };

  /**
   * Function that executes a callback function once the Sutton SignWriiting Line and Fill fonts are ready to use
   * @function font.cssLoaded
   * @param {function} callback - a callback function to execute when fonts are ready
   * @example
   * const callback = () => {
   *   console.log("Sutton SignWriting Line and Fill fonts are ready to use")
   * }
   * 
   * font.cssLoaded( callback )
   */
  const cssLoaded = function (callback) {
    let lineReady = false;
    let fillReady = false;
    cssLoadedLine(() => {
      lineReady = true;
    });
    cssLoadedFill(() => {
      fillReady = true;
    });
    const cssCheck = setInterval(function () {
      if (lineReady && fillReady) {
        clearInterval(cssCheck);
        callback();
      }
    }, 100);
  };

  /**
   * Function that executes a callback function once the Sutton SignWriiting Line font is ready to use
   * @function font.cssLoadedLine
   * @param {function} callback - a callback function to execute when line font is ready
   * @example
   * const callback = () => {
   *   console.log("Sutton SignWriting Line font is ready to use")
   * }
   * 
   * font.cssLoadedLine( callback )
   */
  const cssLoadedLine = function (callback) {
    if (!symbolSize(1)) {
      const cssCheck = setInterval(function () {
        if (symbolSize(1)) {
          clearInterval(cssCheck);
          callback();
        }
      }, 100);
    } else {
      callback();
    }
  };

  /**
   * Function that executes a callback function once the Sutton SignWriiting Fill font is ready to use
   * @function font.cssLoadedFill
   * @param {function} callback - a callback function to execute when fill font is ready
   * @example
   * const callback = () => {
   *   console.log("Sutton SignWriting Fill font is ready to use")
   * }
   * 
   * font.cssLoadedFill( callback )
   */
  const cssLoadedFill = function (callback) {
    const fillReady = function () {
      const canvaser = document.createElement("canvas");
      canvaser.width = 15;
      canvaser.height = 30;
      const context = canvaser.getContext("2d");
      context.font = "30px 'SuttonSignWritingFill'";
      context.fillText(symbolFill(1), 0, 0);
      const imgData = context.getImageData(0, 0, 15, 30).data;
      return !imgData.every(item => item === 0);
    };
    if (!fillReady()) {
      const cssCheck = setInterval(function () {
        if (fillReady()) {
          clearInterval(cssCheck);
          callback();
        }
      }, 100);
    } else {
      callback();
    }
  };

  exports.cssAppend = cssAppend;
  exports.cssLoaded = cssLoaded;
  exports.cssLoadedFill = cssLoadedFill;
  exports.cssLoadedLine = cssLoadedLine;
  exports.symbolFill = symbolFill;
  exports.symbolLine = symbolLine;
  exports.symbolSize = symbolSize;
  exports.symbolText = symbolText;

  Object.defineProperty(exports, '__esModule', { value: true });

}));

/* support ongoing development on https://patreon.com/signwriting */
});

var style_min = createCommonjsModule(function (module, exports) {
/* Sutton SignWriting Core Module v1.5.4 (https://github.com/sutton-signwriting/core), author: Steve Slevinski (https://SteveSlevinski.me), license: MIT */
!function(e,o){o(exports);}(commonjsGlobal,(function(e){let o={colorize:"C",colorhex:"(?:[0-9a-fA-F]{3}){1,2}",colorname:"[a-zA-Z]+",padding:"P[0-9]{2}",zoom:"Z(?:[0-9]+(?:\\.[0-9]+)?|x)",classbase:"-?[_a-zA-Z][_a-zA-Z0-9-]{0,100}",id:"[a-zA-Z][_a-zA-Z0-9-]{0,100}"};o.colorbase=`(?:${o.colorhex}|${o.colorname})`,o.color=`_${o.colorbase}_`,o.colors=`_${o.colorbase}(?:,${o.colorbase})?_`,o.background=`G${o.color}`,o.detail=`D${o.colors}`,o.detailsym=`D[0-9]{2}${o.colors}`,o.classes=`${o.classbase}(?: ${o.classbase})*`,o.full=`-(${o.colorize})?(${o.padding})?(${o.background})?(${o.detail})?(${o.zoom})?(?:-((?:${o.detailsym})*))?(?:-(${o.classes})?!(?:(${o.id})!)?)?`;const t=e=>(new RegExp(`^${o.colorhex}$`).test(e)?"#":"")+e,s=e=>"string"!=typeof e?[0,0,0]:e.replace(/rgba?\((.+?)\)/gi,((e,o)=>o)).split(",").map(Number),a=e=>e.slice(0,3).map((e=>e.toString(16).padStart(2,"0"))).join("");e.compose=e=>{if("object"!=typeof e||null===e)return;let t="-";t+=e.colorize?"C":"";const s=parseInt(e.padding);t+=!s||s<=0||s>99?"":"P"+(s>9?s:"0"+s);const a=e.background&&"string"==typeof e.background?e.background.match(o.colorbase)[0]:void 0;t+=a?"G_"+a+"_":"";const i=e.detail&&e.detail[0]&&"string"==typeof e.detail[0]?e.detail[0].match(o.colorbase)[0]:void 0,l=e.detail&&e.detail[1]&&"string"==typeof e.detail[1]?e.detail[1].match(o.colorbase)[0]:void 0;i&&(t+="D_"+i,l&&(t+=","+l),t+="_");const r="x"===e.zoom?"x":parseFloat(e.zoom);t+=!r||r<=0?"":"Z"+r;let c="";const n=e.detailsym&&Array.isArray(e.detailsym)?e.detailsym.map((e=>{const t=parseInt(e.index);if(!t||t<=0||t>99)return "";let s="D"+(t>9?t:"0"+t);const a=e.detail&&e.detail[0]?e.detail[0].match(o.colorbase)[0]:void 0,i=e.detail&&e.detail[1]?e.detail[1].match(o.colorbase)[0]:void 0;return a&&(s+="_"+a,i&&(s+=","+i),s+="_"),s})):[];c+=n.join("");let d="";const p=e.classes&&"string"==typeof e.classes?e.classes.match(o.classes)[0]:void 0;d+=p||"";const m=e.id&&"string"==typeof e.id?e.id.match(o.id)[0]:void 0;return d+=p||m?"!":"",d+=m?m+"!":"",t+(c||d?"-"+c:"")+(d?"-"+d:"")},e.merge=(e,o)=>{"object"!=typeof e&&(e={}),"object"!=typeof o&&(o={});const t="zoom"in e?e.zoom:1,s="zoom"in o?o.zoom:1;return {...e,...o,zoom:t*s}},e.parse=e=>{const s=`^${o.full}`,a=("string"==typeof e?e.match(new RegExp(s)):[])||[];return i={colorize:a[1]?!!a[1]:void 0,padding:a[2]?parseInt(a[2].slice(1)):void 0,background:a[3]?t(a[3].slice(2,-1)):void 0,detail:a[4]?a[4].slice(2,-1).split(",").map(t):void 0,zoom:a[5]?"Zx"===a[5]?"x":parseFloat(a[5].slice(1)):void 0,detailsym:a[6]?a[6].match(new RegExp(o.detailsym,"g")).map((e=>{const o=e.split("_"),s=o[1].split(",").map(t);return {index:parseInt(o[0].slice(1)),detail:s}})):void 0,classes:a[7]?a[7]:void 0,id:a[8]?a[8]:void 0},Object.fromEntries(Object.entries(i).filter((([e,o])=>void 0!==o)));var i;},e.re=o,e.rgb2hex=(e,o=0)=>{const t=s(e);return 4==t.length&&t[3]<=o?"transparent":a(t)},e.rgba2hex=(e,o)=>{const t=s(o),i=s(e),l=4==i.length?i[3]:1;return 0==l?"transparent":a(i.map(((e,o)=>parseInt((1-l)*t[o]+l*e))))},Object.defineProperty(e,"__esModule",{value:!0});}));
});

window['sgnw'] = false;
const event = new Event('sgnw');
const cssValues = function (el) {
  let css = window.getComputedStyle(el, null);
  let styleObj = {
    "background": style_min.rgb2hex(css.getPropertyValue("background-color")),
    "detail": [
      style_min.rgb2hex(css.getPropertyValue("color")),
      style_min.rgb2hex(css.getPropertyValue("background-color"))
    ],
    "zoom": parseInt(css.getPropertyValue("font-size").slice(0, -2)) / 30
  };
  let elem = el;
  while (styleObj.detail[1] == "transparent") {
    elem = elem.parentElement;
    if (elem == null) {
      elem = document.body;
    }
    css = window.getComputedStyle(elem, null);
    styleObj.detail[1] = style_min.rgb2hex(css.getPropertyValue("background-color"));
  }
  return styleObj;
};
const padArray = function (arr, len) {
  if (len < arr.length) {
    len = len * 2;
  }
  return arr.concat(Array(len - arr.length).fill(null));
};
const padArrayInner = function (arr, segment, len) {
  let padded = [];
  let slice;
  const chunks = Math.ceil(arr.length / segment);
  for (let i = 0; i < chunks; i += 1) {
    slice = arr.slice(i * segment, (i + 1) * segment);
    padded = padArray(padded.concat(slice), len * (i + 1));
  }
  return padded;
};
const hasSize = function (symbolId) {
  const size = font.symbolSize(symbolId);
  return size != undefined;
};
const getOffset = function (el) {
  const offset = el ? el.getBoundingClientRect() : { top: 0, left: 0 };
  return { top: offset.top + (window.pageYOffset || window.document.documentElement.scrollTop), left: offset.left + (window.pageXOffset || window.document.documentElement.scrollLeft) };
};
const overlap = function (el1, el2) {
  if (!el2)
    return false;
  const el1a = el1.firstElementChild;
  const box = el1a.getBoundingClientRect();
  const offset1 = getOffset(el1);
  const width1 = box.width;
  const height1 = box.height;
  const offset2 = getOffset(el2);
  const width2 = el2.offsetWidth;
  const height2 = el2.offsetHeight;
  if (!(offset2.left > offset1.left + width1 - width1 / 2 || offset2.left + width2 < offset1.left + width1 / 2 || offset2.top > offset1.top + height1 - height1 / 2 || offset2.top + height2 < offset1.top + height1 / 2)) {
    return true;
  }
  else {
    return false;
  }
};
const iswa2010FSW = {
  "S10000": ["S10000", "S10110", "S10210", "S10310", "S10410", "S10510", "S10610", "S10710", "S10810", "S10910", "S10a10", "S10b10", "S10c10", "S10d10"],
  "S10e00": ["S10e00", "S10f10", "S11010", "S11110", "S11210", "S11310", "S11410", "S11510", "S11610", "S11710", "S11810", "S11910", "S11a10", "S11b10", "S11c10", "S11d10"],
  "S11e00": ["S11e00", "S11f10", "S12010", "S12110", "S12210", "S12310", "S12410", "S12510", "S12610", "S12710", "S12810", "S12910", "S12a10", "S12b10", "S12c10", "S12d10", "S12e10", "S12f10", "S13010", "S13110", "S13210", "S13310", "S13410", "S13510", "S13610", "S13710", "S13810", "S13910", "S13a10", "S13b10", "S13c10", "S13d10", "S13e10", "S13f10", "S14010", "S14110", "S14210", "S14310"],
  "S14400": ["S14400", "S14510", "S14610", "S14710", "S14810", "S14910", "S14a10", "S14b10"],
  "S14c00": ["S14c00", "S14d10", "S14e10", "S14f10", "S15010", "S15110", "S15210", "S15310", "S15410", "S15510", "S15610", "S15710", "S15810", "S15910", "S15a10", "S15b10", "S15c10", "S15d10", "S15e10", "S15f10", "S16010", "S16110", "S16210", "S16310", "S16410", "S16510", "S16610", "S16710", "S16810", "S16910", "S16a10", "S16b10", "S16c10", "S16d10", "S16e10", "S16f10", "S17010", "S17110", "S17210", "S17310", "S17410", "S17510", "S17610", "S17710", "S17810", "S17910", "S17a10", "S17b10", "S17c10", "S17d10", "S17e10", "S17f10", "S18010", "S18110", "S18210", "S18310", "S18410", "S18510"],
  "S18600": ["S18600", "S18710", "S18810", "S18910", "S18a10", "S18b10", "S18c10", "S18d10", "S18e10", "S18f10", "S19010", "S19110", "S19210", "S19310", "S19410", "S19510", "S19610", "S19710", "S19810", "S19910", "S19a10", "S19b10", "S19c10", "S19d10", "S19e10", "S19f10", "S1a010", "S1a110", "S1a210", "S1a310"],
  "S1a400": ["S1a400", "S1a510", "S1a610", "S1a710", "S1a810", "S1a910", "S1aa10", "S1ab10", "S1ac10", "S1ad10", "S1ae10", "S1af10", "S1b010", "S1b110", "S1b210", "S1b310", "S1b410", "S1b510", "S1b610", "S1b710", "S1b810", "S1b910"],
  "S1ba00": ["S1ba00", "S1bb10", "S1bc10", "S1bd10", "S1be10", "S1bf10", "S1c010", "S1c110", "S1c210", "S1c310", "S1c410", "S1c510", "S1c610", "S1c710", "S1c810", "S1c910", "S1ca10", "S1cb10", "S1cc10"],
  "S1cd00": ["S1cd00", "S1ce10", "S1cf10", "S1d010", "S1d110", "S1d210", "S1d310", "S1d410", "S1d510", "S1d610", "S1d710", "S1d810", "S1d910", "S1da10", "S1db10", "S1dc10", "S1dd10", "S1de10", "S1df10", "S1e010", "S1e110", "S1e200", "S1e310", "S1e410", "S1e510", "S1e610", "S1e710", "S1e810", "S1e910", "S1ea10", "S1eb10", "S1ec10", "S1ed10", "S1ee10", "S1ef10", "S1f010", "S1f110", "S1f210", "S1f310", "S1f410"],
  "S1f500": ["S1f500", "S1f610", "S1f710", "S1f810", "S1f910", "S1fa10", "S1fb10", "S1fc10", "S1fd10", "S1fe10", "S1ff10", "S20010", "S20110", "S20210", "S20310", "S20410"],
  "S20500": ["S20500", "S20600", "S20700", "S20800", "S20900", "S20a00", "S20b00", "S20c00", "S20d00", "S20e00", "S20f00", "S21000", "S21100", "S21200", "S21300", "S21400", "S21500"],
  "S21600": ["S21600", "S21700", "S21800", "S21900", "S21a00", "S21b00", "S21c00", "S21d00", "S21e00", "S21f00", "S22000", "S22100", "S22200", "S22300", "S22400", "S22500", "S22600", "S22700", "S22800", "S22900"],
  "S22a00": ["S22a00", "S22b00", "S22c00", "S22d00", "S22e00", "S22f00", "S23000", "S23100", "S23200", "S23300", "S23400", "S23500", "S23600", "S23700", "S23800", "S23900", "S23a00", "S23b00", "S23c00", "S23d00", "S23e00", "S23f00", "S24000", "S24100", "S24200", "S24300", "S24400", "S24500", "S24600", "S24700", "S24800", "S24900", "S24a00", "S24b00", "S24c00", "S24d00", "S24e00", "S24f00", "S25000", "S25100", "S25200", "S25300", "S25400"],
  "S25500": ["S25500", "S25600", "S25700", "S25800", "S25900", "S25a00", "S25b00", "S25c00", "S25d00", "S25e00", "S25f00", "S26000", "S26100", "S26200", "S26300", "S26400"],
  "S26500": ["S26500", "S26600", "S26700", "S26800", "S26900", "S26a00", "S26b00", "S26c00", "S26d00", "S26e00", "S26f00", "S27000", "S27100", "S27200", "S27300", "S27400", "S27500", "S27600", "S27700", "S27800", "S27900", "S27a00", "S27b00", "S27c00", "S27d00", "S27e00", "S27f00", "S28000", "S28100", "S28200", "S28300", "S28400", "S28500", "S28600", "S28700"],
  "S28800": ["S28800", "S28900", "S28a00", "S28b00", "S28c00", "S28d00", "S28e00", "S28f00", "S29000", "S29100", "S29200", "S29300", "S29400", "S29500", "S29600", "S29700", "S29800", "S29900", "S29a00", "S29b00", "S29c00", "S29d00", "S29e00", "S29f00", "S2a000", "S2a100", "S2a200", "S2a300", "S2a400", "S2a500"],
  "S2a600": ["S2a600", "S2a700", "S2a800", "S2a900", "S2aa00", "S2ab00", "S2ac00", "S2ad00", "S2ae00", "S2af00", "S2b000", "S2b100", "S2b200", "S2b300", "S2b400", "S2b500", "S2b600"],
  "S2b700": ["S2b700", "S2b800", "S2b900", "S2ba00", "S2bb00", "S2bc00", "S2bd00", "S2be00", "S2bf00", "S2c000", "S2c100", "S2c200", "S2c300", "S2c400", "S2c500", "S2c600", "S2c700", "S2c800", "S2c900", "S2ca00", "S2cb00", "S2cc00", "S2cd00", "S2ce00", "S2cf00", "S2d000", "S2d100", "S2d200", "S2d300", "S2d400"],
  "S2d500": ["S2d500", "S2d600", "S2d700", "S2d800", "S2d900", "S2da00", "S2db00", "S2dc00", "S2dd00", "S2de00", "S2df00", "S2e000", "S2e100", "S2e200"],
  "S2e300": ["S2e300", "S2e400", "S2e500", "S2e600", "S2e700", "S2e800", "S2e900", "S2ea00", "S2eb00", "S2ec00", "S2ed00", "S2ee00", "S2ef00", "S2f000", "S2f100", "S2f200", "S2f300", "S2f400", "S2f500", "S2f600"],
  "S2f700": ["S2f700", "S2f800", "S2f900", "S2fa00", "S2fb00", "S2fc00", "S2fd00", "S2fe00"],
  "S2ff00": ["S2ff00", "S30000", "S30100", "S30200", "S30300", "S30400", "S30500", "S30600", "S30700", "S30800", "S30900"],
  "S30a00": ["S30a00", "S30b00", "S30c00", "S30d00", "S30e00", "S30f00", "S31000", "S31100", "S31200", "S31300", "S31400", "S31500", "S31600", "S31700", "S31800", "S31900", "S31a00", "S31b00", "S31c00", "S31d00", "S31e00", "S31f00", "S32000", "S32100", "S32200", "S32300", "S32400", "S32500", "S32600", "S32700", "S32800", "S32900"],
  "S32a00": ["S32a00", "S32b00", "S32c00", "S32d00", "S32e00", "S32f00", "S33000", "S33100", "S33200", "S33300", "S33400", "S33500", "S33600", "S33700", "S33800", "S33900", "S33a00"],
  "S33b00": ["S33b00", "S33c00", "S33d00", "S33e00", "S33f00", "S34000", "S34100", "S34200", "S34300", "S34400", "S34500", "S34600", "S34700", "S34800", "S34900", "S34a00", "S34b00", "S34c00", "S34d00", "S34e00", "S34f00", "S35000", "S35100", "S35200", "S35300", "S35400", "S35500", "S35600", "S35700", "S35800"],
  "S35900": ["S35900", "S35a00", "S35b00", "S35c00", "S35d00", "S35e00", "S35f00", "S36000", "S36100", "S36200", "S36300", "S36400", "S36500", "S36600", "S36700", "S36800", "S36900", "S36a00", "S36b00", "S36c00"],
  "S36d00": ["S36d00", "S36e00", "S36f00", "S37000", "S37100", "S37200", "S37300", "S37400", "S37500"],
  "S37600": ["S37600", "S37700", "S37800", "S37900", "S37a00", "S37b00", "S37c00", "S37d00", "S37e00"],
  "S37f00": ["S37f00", "S38000", "S38100", "S38200", "S38300", "S38400", "S38500", "S38600"],
  "S38700": ["S38700", "S38800", "S38900", "S38a00", "S38b00"]
};
const iswa2010SWU = {
  "񀀁": ["񀀁", "񀁱", "񀃑", "񀄱", "񀆑", "񀇱", "񀉑", "񀊱", "񀌑", "񀍱", "񀏑", "񀐱", "񀒑", "񀓱"],
  "񀕁": ["񀕁", "񀖱", "񀘑", "񀙱", "񀛑", "񀜱", "񀞑", "񀟱", "񀡑", "񀢱", "񀤑", "񀥱", "񀧑", "񀨱", "񀪑", "񀫱"],
  "񀭁": ["񀭁", "񀮱", "񀰑", "񀱱", "񀳑", "񀴱", "񀶑", "񀷱", "񀹑", "񀺱", "񀼑", "񀽱", "񀿑", "񁀱", "񁂑", "񁃱", "񁅑", "񁆱", "񁈑", "񁉱", "񁋑", "񁌱", "񁎑", "񁏱", "񁑑", "񁒱", "񁔑", "񁕱", "񁗑", "񁘱", "񁚑", "񁛱", "񁝑", "񁞱", "񁠑", "񁡱", "񁣑", "񁤱"],
  "񁦁": ["񁦁", "񁧱", "񁩑", "񁪱", "񁬑", "񁭱", "񁯑", "񁰱"],
  "񁲁": ["񁲁", "񁳱", "񁵑", "񁶱", "񁸑", "񁹱", "񁻑", "񁼱", "񁾑", "񁿱", "񂁑", "񂂱", "񂄑", "񂅱", "񂇑", "񂈱", "񂊑", "񂋱", "񂍑", "񂎱", "񂐑", "񂑱", "񂓑", "񂔱", "񂖑", "񂗱", "񂙑", "񂚱", "񂜑", "񂝱", "񂟑", "񂠱", "񂢑", "񂣱", "񂥑", "񂦱", "񂨑", "񂩱", "񂫑", "񂬱", "񂮑", "񂯱", "񂱑", "񂲱", "񂴑", "񂵱", "񂷑", "񂸱", "񂺑", "񂻱", "񂽑", "񂾱", "񃀑", "񃁱", "񃃑", "񃄱", "񃆑", "񃇱"],
  "񃉁": ["񃉁", "񃊱", "񃌑", "񃍱", "񃏑", "񃐱", "񃒑", "񃓱", "񃕑", "񃖱", "񃘑", "񃙱", "񃛑", "񃜱", "񃞑", "񃟱", "񃡑", "񃢱", "񃤑", "񃥱", "񃧑", "񃨱", "񃪑", "񃫱", "񃭑", "񃮱", "񃰑", "񃱱", "񃳑", "񃴱"],
  "񃶁": ["񃶁", "񃷱", "񃹑", "񃺱", "񃼑", "񃽱", "񃿑", "񄀱", "񄂑", "񄃱", "񄅑", "񄆱", "񄈑", "񄉱", "񄋑", "񄌱", "񄎑", "񄏱", "񄑑", "񄒱", "񄔑", "񄕱"],
  "񄗁": ["񄗁", "񄘱", "񄚑", "񄛱", "񄝑", "񄞱", "񄠑", "񄡱", "񄣑", "񄤱", "񄦑", "񄧱", "񄩑", "񄪱", "񄬑", "񄭱", "񄯑", "񄰱", "񄲑"],
  "񄳡": ["񄳡", "񄵑", "񄶱", "񄸑", "񄹱", "񄻑", "񄼱", "񄾑", "񄿱", "񅁑", "񅂱", "񅄑", "񅅱", "񅇑", "񅈱", "񅊑", "񅋱", "񅍑", "񅎱", "񅐑", "񅑱", "񅓁", "񅔱", "񅖑", "񅗱", "񅙑", "񅚱", "񅜑", "񅝱", "񅟑", "񅠱", "񅢑", "񅣱", "񅥑", "񅦱", "񅨑", "񅩱", "񅫑", "񅬱", "񅮑"],
  "񅯡": ["񅯡", "񅱑", "񅲱", "񅴑", "񅵱", "񅷑", "񅸱", "񅺑", "񅻱", "񅽑", "񅾱", "񆀑", "񆁱", "񆃑", "񆄱", "񆆑"],
  "񆇡": ["񆇡", "񆉁", "񆊡", "񆌁", "񆍡", "񆏁", "񆐡", "񆒁", "񆓡", "񆕁", "񆖡", "񆘁", "񆙡", "񆛁", "񆜡", "񆞁", "񆟡"],
  "񆡁": ["񆡁", "񆢡", "񆤁", "񆥡", "񆧁", "񆨡", "񆪁", "񆫡", "񆭁", "񆮡", "񆰁", "񆱡", "񆳁", "񆴡", "񆶁", "񆷡", "񆹁", "񆺡", "񆼁", "񆽡"],
  "񆿁": ["񆿁", "񇀡", "񇂁", "񇃡", "񇅁", "񇆡", "񇈁", "񇉡", "񇋁", "񇌡", "񇎁", "񇏡", "񇑁", "񇒡", "񇔁", "񇕡", "񇗁", "񇘡", "񇚁", "񇛡", "񇝁", "񇞡", "񇠁", "񇡡", "񇣁", "񇤡", "񇦁", "񇧡", "񇩁", "񇪡", "񇬁", "񇭡", "񇯁", "񇰡", "񇲁", "񇳡", "񇵁", "񇶡", "񇸁", "񇹡", "񇻁", "񇼡", "񇾁"],
  "񇿡": ["񇿡", "񈁁", "񈂡", "񈄁", "񈅡", "񈇁", "񈈡", "񈊁", "񈋡", "񈍁", "񈎡", "񈐁", "񈑡", "񈓁", "񈔡", "񈖁"],
  "񈗡": ["񈗡", "񈙁", "񈚡", "񈜁", "񈝡", "񈟁", "񈠡", "񈢁", "񈣡", "񈥁", "񈦡", "񈨁", "񈩡", "񈫁", "񈬡", "񈮁", "񈯡", "񈱁", "񈲡", "񈴁", "񈵡", "񈷁", "񈸡", "񈺁", "񈻡", "񈽁", "񈾡", "񉀁", "񉁡", "񉃁", "񉄡", "񉆁", "񉇡", "񉉁", "񉊡"],
  "񉌁": ["񉌁", "񉍡", "񉏁", "񉐡", "񉒁", "񉓡", "񉕁", "񉖡", "񉘁", "񉙡", "񉛁", "񉜡", "񉞁", "񉟡", "񉡁", "񉢡", "񉤁", "񉥡", "񉧁", "񉨡", "񉪁", "񉫡", "񉭁", "񉮡", "񉰁", "񉱡", "񉳁", "񉴡", "񉶁", "񉷡"],
  "񉹁": ["񉹁", "񉺡", "񉼁", "񉽡", "񉿁", "񊀡", "񊂁", "񊃡", "񊅁", "񊆡", "񊈁", "񊉡", "񊋁", "񊌡", "񊎁", "񊏡", "񊑁"],
  "񊒡": ["񊒡", "񊔁", "񊕡", "񊗁", "񊘡", "񊚁", "񊛡", "񊝁", "񊞡", "񊠁", "񊡡", "񊣁", "񊤡", "񊦁", "񊧡", "񊩁", "񊪡", "񊬁", "񊭡", "񊯁", "񊰡", "񊲁", "񊳡", "񊵁", "񊶡", "񊸁", "񊹡", "񊻁", "񊼡", "񊾁"],
  "񊿡": ["񊿡", "񋁁", "񋂡", "񋄁", "񋅡", "񋇁", "񋈡", "񋊁", "񋋡", "񋍁", "񋎡", "񋐁", "񋑡", "񋓁"],
  "񋔡": ["񋔡", "񋖁", "񋗡", "񋙁", "񋚡", "񋜁", "񋝡", "񋟁", "񋠡", "񋢁", "񋣡", "񋥁", "񋦡", "񋨁", "񋩡", "񋫁", "񋬡", "񋮁", "񋯡", "񋱁"],
  "񋲡": ["񋲡", "񋴁", "񋵡", "񋷁", "񋸡", "񋺁", "񋻡", "񋽁"],
  "񋾡": ["񋾡", "񌀁", "񌁡", "񌃁", "񌄡", "񌆁", "񌇡", "񌉁", "񌊡", "񌌁", "񌍡"],
  "񌏁": ["񌏁", "񌐡", "񌒁", "񌓡", "񌕁", "񌖡", "񌘁", "񌙡", "񌛁", "񌜡", "񌞁", "񌟡", "񌡁", "񌢡", "񌤁", "񌥡", "񌧁", "񌨡", "񌪁", "񌫡", "񌭁", "񌮡", "񌰁", "񌱡", "񌳁", "񌴡", "񌶁", "񌷡", "񌹁", "񌺡", "񌼁", "񌽡"],
  "񌿁": ["񌿁", "񍀡", "񍂁", "񍃡", "񍅁", "񍆡", "񍈁", "񍉡", "񍋁", "񍌡", "񍎁", "񍏡", "񍑁", "񍒡", "񍔁", "񍕡", "񍗁"],
  "񍘡": ["񍘡", "񍚁", "񍛡", "񍝁", "񍞡", "񍠁", "񍡡", "񍣁", "񍤡", "񍦁", "񍧡", "񍩁", "񍪡", "񍬁", "񍭡", "񍯁", "񍰡", "񍲁", "񍳡", "񍵁", "񍶡", "񍸁", "񍹡", "񍻁", "񍼡", "񍾁", "񍿡", "񎁁", "񎂡", "񎄁"],
  "񎅡": ["񎅡", "񎇁", "񎈡", "񎊁", "񎋡", "񎍁", "񎎡", "񎐁", "񎑡", "񎓁", "񎔡", "񎖁", "񎗡", "񎙁", "񎚡", "񎜁", "񎝡", "񎟁", "񎠡", "񎢁"],
  "񎣡": ["񎣡", "񎥁", "񎦡", "񎨁", "񎩡", "񎫁", "񎬡", "񎮁", "񎯡"],
  "񎱁": ["񎱁", "񎲡", "񎴁", "񎵡", "񎷁", "񎸡", "񎺁", "񎻡", "񎽁"],
  "񎾡": ["񎾡", "񏀁", "񏁡", "񏃁", "񏄡", "񏆁", "񏇡", "񏉁"],
  "񏊡": ["񏊡", "񏌁", "񏍡", "񏏁", "񏐡"]
};
function appGlobalScript () {
  font.cssAppend();
  font.cssLoaded(() => {
    window['sgnw'] = true;
    window.dispatchEvent(event);
  });
}

export { appGlobalScript as a, padArray as b, cssValues as c, iswa2010SWU as d, hasSize as h, iswa2010FSW as i, overlap as o, padArrayInner as p };
