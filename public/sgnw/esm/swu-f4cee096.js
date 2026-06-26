/*!
 * The Sutton SignWriting Web Components
 */
import { c as createCommonjsModule, a as commonjsGlobal } from './_commonjsHelpers-383fba37.js';

var swu = createCommonjsModule(function (module, exports) {
/**
* Sutton SignWriting Core Module v1.5.4 (https://github.com/sutton-signwriting/core)
* Author: Steve Slevinski  (https://SteveSlevinski.me)
* swu.js is released under the MIT License.
*/

(function (global, factory) {
  factory(exports) ;
})(commonjsGlobal, (function (exports) {
  /**
   * Object of regular expressions for SWU strings in UTF-16
   * 
   * @alias swu.re
   * @property {string} symbol - regular expressions for a symbol
   * @property {string} coord - regular expressions for a coordinate
   * @property {string} sort - regular expressions for the sorting marker
   * @property {string} box - regular expression for a signbox marker
   * @property {string} prefix - regular expression for a sorting marker followed by one or more symbols
   * @property {string} spatial - regular expression for a symbol followed by a coordinate
   * @property {string} signbox - regular expression for a signbox marker, max coordinate and zero or more spatial symbols
   * @property {string} sign - regular expression for an optional prefix followed by a signbox
   * @property {string} sortable - regular expression for a mandatory prefix followed by a signbox
   */
  let re$1 = {
    'symbol': '(?:(?:\uD8C0[\uDC01-\uDFFF])|(?:[\uD8C1-\uD8FC][\uDC00-\uDFFF])|(?:\uD8FD[\uDC00-\uDC80]))',
    'coord': '(?:\uD836[\uDC0C-\uDDFF]){2}',
    'sort': '\uD836\uDC00',
    'box': '\uD836[\uDC01-\uDC04]'
  };
  re$1.prefix = `(?:${re$1.sort}(?:${re$1.symbol})+)`;
  re$1.spatial = `${re$1.symbol}${re$1.coord}`;
  re$1.signbox = `${re$1.box}${re$1.coord}(?:${re$1.spatial})*`;
  re$1.sign = `${re$1.prefix}?${re$1.signbox}`;
  re$1.sortable = `${re$1.prefix}${re$1.signbox}`;

  /**
   * Object of regular expressions for style strings
   * 
   * @alias style.re
   * @type {object}
   * @property {string} colorize - regular expression for colorize section
   * @property {string} colorhex - regular expression for color hex values with 3 or 6 characters
   * @property {string} colorname - regular expression for css color name
   * @property {string} padding - regular expression for padding section
   * @property {string} zoom - regular expression for zoom section
   * @property {string} classbase - regular expression for class name definition
   * @property {string} id - regular expression for id definition
   * @property {string} colorbase - regular expression for color hex or color name
   * @property {string} color - regular expression for single color entry
   * @property {string} colors - regular expression for double color entry
   * @property {string} background - regular expression for background section
   * @property {string} detail - regular expression for color details for line and optional fill
   * @property {string} detailsym - regular expression for color details for individual symbols
   * @property {string} classes - regular expression for one or more class names
   * @property {string} full - full regular expression for style string
   */
  let re = {
    'colorize': 'C',
    'colorhex': '(?:[0-9a-fA-F]{3}){1,2}',
    'colorname': '[a-zA-Z]+',
    'padding': 'P[0-9]{2}',
    'zoom': 'Z(?:[0-9]+(?:\\.[0-9]+)?|x)',
    'classbase': '-?[_a-zA-Z][_a-zA-Z0-9-]{0,100}',
    'id': '[a-zA-Z][_a-zA-Z0-9-]{0,100}'
  };
  re.colorbase = `(?:${re.colorhex}|${re.colorname})`;
  re.color = `_${re.colorbase}_`;
  re.colors = `_${re.colorbase}(?:,${re.colorbase})?_`;
  re.background = `G${re.color}`;
  re.detail = `D${re.colors}`;
  re.detailsym = `D[0-9]{2}${re.colors}`;
  re.classes = `${re.classbase}(?: ${re.classbase})*`;
  re.full = `-(${re.colorize})?(${re.padding})?(${re.background})?(${re.detail})?(${re.zoom})?(?:-((?:${re.detailsym})*))?(?:-(${re.classes})?!(?:(${re.id})!)?)?`;

  const prefixColor = color => {
    const regex = new RegExp(`^${re.colorhex}$`);
    return (regex.test(color) ? '#' : '') + color;
  };

  const definedProps = obj => Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined));
  /**
   * Function to parse style string to object
   * @function style.parse
   * @param {string} styleString - a style string
   * @returns {StyleObject} elements of style string
   * @example
   * style.parse('-CP10G_blue_D_red,Cyan_')
   * 
   * return {
   *  'colorize': true,
   *  'padding': 10,
   *  'background': 'blue',
   *  'detail': ['red', 'Cyan']
   * }
   */


  const parse$1 = styleString => {
    const regex = `^${re.full}`;
    const m = (typeof styleString === 'string' ? styleString.match(new RegExp(regex)) : []) || [];
    return definedProps({
      'colorize': !m[1] ? undefined : !!m[1],
      'padding': !m[2] ? undefined : parseInt(m[2].slice(1)),
      'background': !m[3] ? undefined : prefixColor(m[3].slice(2, -1)),
      'detail': !m[4] ? undefined : m[4].slice(2, -1).split(',').map(prefixColor),
      'zoom': !m[5] ? undefined : m[5] === 'Zx' ? 'x' : parseFloat(m[5].slice(1)),
      'detailsym': !m[6] ? undefined : m[6].match(new RegExp(re.detailsym, 'g')).map(val => {
        const parts = val.split('_');
        const detail = parts[1].split(',').map(prefixColor);
        return {
          'index': parseInt(parts[0].slice(1)),
          'detail': detail
        };
      }),
      'classes': !m[7] ? undefined : m[7],
      'id': !m[8] ? undefined : m[8]
    });
  };

  /** The convert module contains functions to convert between Formal SignWriitng in ASCII (FSW) and SignWriting in Unicode (SWU) characters, along with other types of data.
   * [Characters set definitions](https://tools.ietf.org/id/draft-slevinski-formal-signwriting-09.html#name-characters)
   * @module convert
   */
  /**
   * Function to convert an SWU number character to an integer
   * @function convert.swu2num
   * @param {string} swuNum - SWU number character
   * @returns {number} Integer value for number
   * @example
   * convert.swu2num('𝤆')
   * 
   * return 500
   */


  const swu2num = swuNum => parseInt(swuNum.codePointAt(0)) - 0x1D80C + 250;
  /**
   * Function to convert a number to an SWU number character
   * @function convert.num2swu
   * @param {number} num - Integer value for number
   * @returns {string} SWU number character
   * @example
   * convert.num2swu(500)
   * 
   * return '𝤆'
   */


  const num2swu = num => String.fromCodePoint(0x1D80C + parseInt(num) - 250);
  /**
   * Function to convert two SWU number characters to an array of x,y integers
   * @function convert.swu2coord
   * @param {string} swuCoord - Two SWU number character
   * @returns {number[]} Array of x,y integers
   * @example
   * convert.swu2coord('𝤆𝤆')
   * 
   * return [500, 500]
   */


  const swu2coord = swuCoord => [swu2num(swuCoord.slice(0, 2)), swu2num(swuCoord.slice(2, 4))];
  /**
   * Function to convert an array of x,y integers to two SWU number characters
   * @function convert.coord2swu
   * @param {number[]} coord - Array of x,y integers
   * @returns {string} Two SWU number character
   * @example
   * convert.coord2swu([500, 500])
   * 
   * return '𝤆𝤆'
   */


  const coord2swu = coord => coord.map(num => num2swu(num)).join('');
  /**
   * Function to convert an SWU symbol character to a code point on plane 4
   * @function convert.swu2code
   * @param {string} swuSym - SWU symbol character
   * @returns {number} Code point on plane 4
   * @example
   * convert.swu2code('񀀁')
   * 
   * return 0x40001
   */


  const swu2code = swuSym => parseInt(swuSym.codePointAt(0));

  const parse = {
    /**
     * Function to parse an swu symbol with optional coordinate and style string
     * @function swu.parse.symbol
     * @param {string} swuSym - an swu symbol
     * @returns {SymbolObject} elements of swu symbol
     * @example
     * swu.parse.symbol('񀀁𝤆𝤆-C')
     * 
     * return {
     *  'symbol': '񀀁',
     *  'coord': [500, 500],
     *  'style': '-C'
     * }
     */
    symbol: swuSym => {
      const regex = `^(${re$1.symbol})(${re$1.coord})?(${re.full})?`;
      const symbol = typeof swuSym === 'string' ? swuSym.match(new RegExp(regex)) : undefined;
      return {
        'symbol': symbol ? symbol[1] : undefined,
        'coord': symbol && symbol[2] ? swu2coord(symbol[2]) : undefined,
        'style': symbol ? symbol[3] : undefined
      };
    },

    /**
      * Function to parse an swu sign with style string
      * @function swu.parse.sign
      * @param {string} swuSign - an swu sign
      * @returns {SignObject} elements of swu sign
      * @example
      * swu.parse.sign('𝠀񀀒񀀚񋚥񋛩𝠃𝤟𝤩񋛩𝣵𝤐񀀒𝤇𝣤񋚥𝤐𝤆񀀚𝣮𝣭-C')
      * 
      * return {
      *  sequence: ['񀀒','񀀚','񋚥','񋛩'],
      *  box: '𝠃',
      *  max: [525, 535],
      *  spatials: [
      *    {
      *      symbol: '񋛩',
      *      coord: [483, 510]
      *    },
      *    {
      *      symbol: '񀀒',
      *      coord: [501, 466]
      *    },
      *    {
      *      symbol: '񋚥',
      *      coord: [510, 500]
      *    },
      *    {
      *      symbol: '񀀚',
      *      coord: [476, 475]
      *    }
      *  ],
      *  style: '-C'
      * }
      */
    sign: swuSign => {
      const regex = `^(${re$1.prefix})?(${re$1.signbox})(${re.full})?`;
      const sign = typeof swuSign === 'string' ? swuSign.match(new RegExp(regex)) : undefined;

      if (sign) {
        return {
          'sequence': sign[1] ? sign[1].slice(2).match(/.{2}/g) : undefined,
          'box': sign[2].slice(0, 2),
          'max': swu2coord(sign[2].slice(2, 6)),
          'spatials': sign[2].length < 7 ? undefined : sign[2].slice(6).match(/(.{6})/g).map(m => {
            return {
              symbol: m.slice(0, 2),
              coord: swu2coord(m.slice(2))
            };
          }),
          'style': sign[3]
        };
      } else {
        return {};
      }
    },

    /**
     * Function to parse an swu text
     * @function swu.parse.text
     * @param {string} swuText - an swu text
     * @returns {string[]} swu signs and punctuations
     * @example
     * swu.parse.text('𝠀񁲡񈩧𝠃𝤘𝤣񁲡𝣳𝣩񈩧𝤉𝣻 𝠀񃊢񃊫񋛕񆇡𝠃𝤘𝤧񃊫𝣻𝤕񃊢𝣴𝣼񆇡𝤎𝤂񋛕𝤆𝣦 񏌁𝣢𝤂')
     * 
     * return [
     *  '𝠀񁲡񈩧𝠃𝤘𝤣񁲡𝣳𝣩񈩧𝤉𝣻',
     *  '𝠀񃊢񃊫񋛕񆇡𝠃𝤘𝤧񃊫𝣻𝤕񃊢𝣴𝣼񆇡𝤎𝤂񋛕𝤆𝣦',
     *  '񏌁𝣢𝤂'
     * ]
     */
    text: swuText => {
      if (typeof swuText !== 'string') return [];
      const regex = `(${re$1.sign}(${re.full})?|${re$1.spatial}(${re.full})?)`;
      const matches = swuText.match(new RegExp(regex, 'g'));
      return matches ? [...matches] : [];
    }
  };
  /**
   * Function to encode SWU characters using the UTF-16 escape format.
   * @function swu.encode
   * @param {string} swu - SWU characters
   * @returns {string} UTF-16 escape format
   * @example
   * swu.encode('񀀁𝤆𝤆')
   * 
   * return '\\uD8C0\\uDC01\\uD836\\uDD06\\uD836\\uDD06'
   */

  const encode = swu => swu.replace(/[\u007F-\uFFFF]/g, function (chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4).toUpperCase();
  });
  /**
   * Function to decode UTF-16 escape format to SWU characters.
   * @function swu.decode
   * @param {string} encoded - UTF-16 escape format
   * @returns {string} SWU characters
   * @example
   * swu.decode('\\uD8C0\\uDC01\\uD836\\uDD06\\uD836\\uDD06')
   * 
   * return '񀀁𝤆𝤆'
   */


  const decode = encoded => encoded.replace(/\\u([0-9A-F]{4})/g, function (match, chr) {
    return String.fromCharCode(parseInt(chr, 16));
  });
  /**
   * Function to decompose an SWU character into UTF-16 surrogate pairs.
   * @function swu.pair
   * @param {string} swuChar - an SWU character
   * @returns {string[]} an array of UTF-16 surrogate pairs
   * @example
   * swu.pair('񀀁')
   * 
   * return ['D8C0', 'DC01']
   */


  const pair = swuChar => [swuChar.charCodeAt(0).toString(16).toUpperCase(), swuChar.charCodeAt(1).toString(16).toUpperCase()];

  const compose = {
    /**
     * Function to compose an swu symbol with optional coordinate and style string
     * @function swu.compose.symbol
     * @param {SymbolObject} swuSymObject - an swu symbol object
     * @returns {string} an swu symbol string
     * @example
     * swu.compose.symbol({
     *  'symbol': '񀀁',
     *  'coord': [500, 500],
     *  'style': '-C'
     * })
     * 
     * return '񀀁𝤆𝤆-C'
     */
    symbol: swuSymObject => {
      if (typeof swuSymObject !== 'object' || swuSymObject === null) return undefined;

      if (typeof swuSymObject.symbol === 'string') {
        const symbol = (swuSymObject.symbol.match(re$1.symbol) || [''])[0];

        if (symbol) {
          const x = swuSymObject.coord && swuSymObject.coord[0] || '';
          const y = swuSymObject.coord && swuSymObject.coord[1] || '';
          const coord = x && y ? coord2swu([x, y]) : '';
          const styleStr = typeof swuSymObject.style === 'string' && (swuSymObject.style.match(re.full) || [''])[0] || '';
          return symbol + coord + styleStr;
        }
      }

      return undefined;
    },

    /**
     * Function to compose an swu sign with style string
     * @function swu.compose.sign
     * @param {SignObject} swuSignObject - an swu sign object
     * @returns {string} an swu sign string
     * @example
     * swu.compose.sign({
     *  sequence: ['񀀒','񀀚','񋚥','񋛩'],
     *  box: '𝠃',
     *  max: [525, 535],
     *  spatials: [
     *    {
     *      symbol: '񋛩',
     *      coord: [483, 510]
     *    },
     *    {
     *      symbol: '񀀒',
     *      coord: [501, 466]
     *    },
     *    {
     *      symbol: '񋚥',
     *      coord: [510, 500]
     *    },
     *    {
     *      symbol: '񀀚',
     *      coord: [476, 475]
     *    }
     *  ],
     *  style: '-C'
     * })
     * 
     * return '𝠀񀀒񀀚񋚥񋛩𝠃𝤟𝤩񋛩𝣵𝤐񀀒𝤇𝣤񋚥𝤐𝤆񀀚𝣮𝣭-C'
     */
    sign: swuSignObject => {
      if (typeof swuSignObject !== 'object' || swuSignObject === null) return undefined;
      let box = typeof swuSignObject.box !== 'string' ? '𝠃' : (swuSignObject.box + '𝠃').match(re$1.box);
      const x = swuSignObject.max && swuSignObject.max[0] || '';
      const y = swuSignObject.max && swuSignObject.max[1] || '';
      const max = x && y ? coord2swu([x, y]) : undefined;
      if (!max) return undefined;
      let prefix = '';

      if (swuSignObject.sequence && Array.isArray(swuSignObject.sequence)) {
        prefix = swuSignObject.sequence.map(key => (key.match(re$1.symbol) || [''])[0]).join('');
        prefix = prefix ? '𝠀' + prefix : '';
      }

      let signbox = '';

      if (swuSignObject.spatials && Array.isArray(swuSignObject.spatials)) {
        signbox = swuSignObject.spatials.map(spatial => {
          if (typeof spatial.symbol === 'string') {
            const symbol = (spatial.symbol.match(re$1.symbol) || [''])[0];

            if (symbol) {
              const x = spatial.coord && spatial.coord[0] || '';
              const y = spatial.coord && spatial.coord[1] || '';
              const coord = x && y ? coord2swu([x, y]) : '';

              if (coord) {
                return symbol + coord;
              }
            }
          }

          return '';
        }).join('');
      }

      const styleStr = typeof swuSignObject.style === 'string' && (swuSignObject.style.match(re.full) || [''])[0] || '';
      return prefix + box + max + signbox + styleStr;
    }
  };

  /**
   * Function to gather sizing information about an swu sign or symbol
   * @function swu.info
   * @param {string} swu - an swu sign or symbol
   * @returns {SegmentInfo} information about the swu string
   * @example
   * swu.info('𝠀񁲡񈩧𝠂𝤘𝤣񁲡𝣳𝣩񈩧𝤉𝣻-P10Z2')
   * 
   * return {
   *   minX: 481,
   *   minY: 471,
   *   width: 37,
   *   height: 58,
   *   lane: -1,
   *   padding: 10,
   *   segment: 'sign',
   *   zoom: 2
   * }
   */

  const info = swu => {
    let lanes = {
      '𝠁': 0,
      '𝠂': -1,
      '𝠃': 0,
      '𝠄': 1
    };
    let parsed = parse.sign(swu);
    let width, height, segment, x1, x2, y1, y2, lane;

    if (parsed.spatials) {
      x1 = Math.min(...parsed.spatials.map(spatial => spatial.coord[0]));
      x2 = parsed.max[0];
      width = x2 - x1;
      y1 = Math.min(...parsed.spatials.map(spatial => spatial.coord[1]));
      y2 = parsed.max[1];
      height = y2 - y1;
      segment = 'sign';
      lane = parsed.box;
    } else {
      parsed = parse.symbol(swu);
      lane = "𝠃";

      if (parsed.coord) {
        x1 = parsed.coord[0];
        width = (500 - x1) * 2;
        y1 = parsed.coord[1];
        height = (500 - y1) * 2;
        segment = 'symbol';
      } else {
        x1 = 490;
        width = 20;
        y1 = 490;
        height = 20;
        segment = 'none';
      }
    }

    let style = parse$1(parsed.style);
    let zoom = style.zoom || 1;
    let padding = style.padding || 0;
    return {
      minX: x1,
      minY: y1,
      width: width,
      height: height,
      segment: segment,
      lane: lanes[lane],
      padding: padding,
      zoom: zoom
    };
  };

  const columnDefaults = {
    'height': 500,
    'width': 150,
    'offset': 50,
    'pad': 20,
    'margin': 5,
    'dynamic': false,
    'background': undefined,
    'punctuation': {
      'spacing': true,
      'pad': 30,
      'pull': true
    },
    'style': {
      'detail': ['black', 'white'],
      'zoom': 1
    }
  };
  /**
   * Function to an object of column options with default values
   * 
   * @function swu.columnDefaultsMerge
   * @param {ColumnOptions} options - object of column options
   * @returns {ColumnOptions} object of column options merged with column defaults
   * @example
   * swu.columnDefaultsMerge({height: 500,width:150})
   * 
   * return {
   *   "height": 500,
   *   "width": 150,
   *   "offset": 50,
   *   "pad": 20,
   *   "margin": 5,
   *   "dynamic": false,
   *   "punctuation": {
   *     "spacing": true,
   *     "pad": 30,
   *     "pull": true
   *   },
   *   "style": {
   *     "detail": [
   *       "black",
   *       "white"
   *     ],
   *     "zoom": 1
   *   }
   * }
   */

  const columnDefaultsMerge = options => {
    if (typeof options !== 'object') options = {};
    return { ...columnDefaults,
      ...options,
      punctuation: { ...columnDefaults.punctuation,
        ...options.punctuation
      },
      style: { ...columnDefaults.style,
        ...options.style
      }
    };
  };
  /**
   * Function to transform an SWU text to an array of columns
   * 
   * @function swu.columns
   * @param {string} swuText - SWU text of signs and punctuation
   * @param {ColumnOptions} options - object of column options
   * @returns {{options:ColumnOptions,widths:number[],columns:ColumnData}} object of column options, widths array, and column data
   * @example
   * swu.columns('𝠀񁲡񈩧𝠃𝤘𝤣񁲡𝣳𝣩񈩧𝤉𝣻 𝠀񃊢񃊫񋛕񆇡𝠃𝤘𝤧񃊫𝣻𝤕񃊢𝣴𝣼񆇡𝤎𝤂񋛕𝤆𝣦 񏌁𝣢𝤂', {height: 500,width:150})
   * 
   * return {
   *   "options": {
   *     "height": 500,
   *     "width": 150,
   *     "offset": 50,
   *     "pad": 20,
   *     "margin": 5,
   *     "dynamic": false,
   *     "punctuation": {
   *       "spacing": true,
   *       "pad": 30,
   *       "pull": true
   *     },
   *     "style": {
   *       "detail": [
   *         "black",
   *         "white"
   *       ],
   *       "zoom": 1
   *     }
   *   },
   *   "widths": [
   *     150
   *   ],
   *   "columns": [
   *     [
   *       {
   *         "x": 56,
   *         "y": 20,
   *         "minX": 481,
   *         "minY": 471,
   *         "width": 37,
   *         "height": 58,
   *         "lane": 0,
   *         "padding": 0,
   *         "segment": "sign",
   *         "text": "𝠀񁲡񈩧𝠃𝤘𝤣񁲡𝣳𝣩񈩧𝤉𝣻",
   *         "zoom": 1
   *       },
   *       {
   *         "x": 57,
   *         "y": 118,
   *         "minX": 482,
   *         "minY": 468,
   *         "width": 36,
   *         "height": 65,
   *         "lane": 0,
   *         "padding": 0,
   *         "segment": "sign",
   *         "text": "𝠀񃊢񃊫񋛕񆇡𝠃𝤘𝤧񃊫𝣻𝤕񃊢𝣴𝣼񆇡𝤎𝤂񋛕𝤆𝣦",
   *         "zoom": 1
   *       },
   *       {
   *         "x": 39,
   *         "y": 203,
   *         "minX": 464,
   *         "minY": 496,
   *         "width": 72,
   *         "height": 8,
   *         "lane": 0,
   *         "padding": 0,
   *         "segment": "symbol",
   *         "text": "񏌁𝣢𝤂",
   *         "zoom": 1
   *       }
   *     ]
   *   ]
   * }
   */


  const columns = (swuText, options) => {
    if (typeof swuText !== 'string') return {};
    const values = columnDefaultsMerge(options);
    let input = parse.text(swuText);
    let cursor = 0;
    let cols = [];
    let col = [];
    let plus = 0;
    let center = parseInt(values.width / 2);
    let maxHeight = values.height - values.margin;
    let pullable = true;
    let finalize = false;

    for (let val of input) {
      let informed = info(val);
      cursor += plus;

      if (values.punctuation.spacing) {
        cursor += informed.segment == 'sign' ? values.pad : 0;
      } else {
        cursor += values.pad;
      }

      finalize = cursor + informed.height > maxHeight;

      if (finalize && informed.segment == 'symbol' && values.punctuation.pull && pullable) {
        finalize = false;
        pullable = false;
      }

      if (col.length == 0) {
        finalize = false;
      }

      if (finalize) {
        cursor = values.pad;
        cols.push(col);
        col = [];
        pullable = true;
      }

      col.push(Object.assign(informed, {
        x: center + values.offset * informed.lane - (500 - informed.minX) * informed.zoom * values.style.zoom,
        y: cursor,
        text: val
      }));
      cursor += informed.height * informed.zoom * values.style.zoom;

      if (values.punctuation.spacing) {
        plus = informed.segment == 'sign' ? values.pad : values.punctuation.pad;
      } else {
        plus = values.pad;
      }
    }

    if (col.length) {
      cols.push(col);
    } // over height issue when pulling punctuation


    if (values.punctuation.pull) {
      for (let col of cols) {
        let last = col[col.length - 1];
        let diff = last.y + last.height - (values.height - values.margin);

        if (diff > 0) {
          let adj = parseInt(diff / col.length) + 1;

          for (let i in col) {
            col[i].y -= adj * i + adj;
          }
        }
      }
    } // contract, expand, adjust


    let widths = [];

    for (let col of cols) {
      let min = [center - values.offset - values.pad];
      let max = [center + values.offset + values.pad];

      for (let item of col) {
        min.push(item.x - values.pad);
        max.push(item.x + item.width + values.pad);
      }

      min = Math.min(...min);
      max = Math.max(...max);
      let width = values.width;
      let adj = 0;

      if (!values.dynamic) {
        adj = center - parseInt((min + max) / 2);
      } else {
        width = max - min;
        adj = -min;
      }

      for (let item of col) {
        item.x += adj;
      }

      widths.push(width);
    }

    return {
      'options': values,
      'widths': widths,
      'columns': cols
    };
  };

  /**
   * Array of plane 4 code points for kinds of symbols: writing, location, and punctuation.
   * @alias swu.kind
   * @type {array}
   */

  const kind = [0x40001, 0x4efa1, 0x4f2a1];
  /**
   * Array of plane 4 code points for categories of symbols: hand, movement, dynamics, head, trunk & limb, location, and punctuation.
   * @alias swu.category
   * @type {array}
   */

  const category = [0x40001, 0x461e1, 0x4bca1, 0x4bfa1, 0x4e8e1, 0x4efa1, 0x4f2a1];
  /**
   * Array of plane 4 code points for the 30 symbol groups.
   * @alias swu.group
   * @type {array}
   */

  const group = [0x40001, 0x40541, 0x40b41, 0x41981, 0x41c81, 0x43241, 0x43d81, 0x445c1, 0x44ce1, 0x45be1, 0x461e1, 0x46841, 0x46fc1, 0x47fe1, 0x485e1, 0x49301, 0x49e41, 0x4a4a1, 0x4afe1, 0x4b521, 0x4bca1, 0x4bfa1, 0x4c3c1, 0x4cfc1, 0x4d621, 0x4e161, 0x4e8e1, 0x4ec41, 0x4efa1, 0x4f2a1];
  /**
   * Object of symbol ranges with starting and ending code points on plane 4.
   * 
   *   { all, writing, hand, movement, dynamic, head, hcenter, vcenter, trunk, limb, location, punctuation }
   * @alias swu.ranges
   * @type {object}
   */

  const ranges = {
    'all': [0x40001, 0x4f480],
    'writing': [0x40001, 0x4efa0],
    'hand': [0x40001, 0x461e0],
    'movement': [0x461e1, 0x4bca0],
    'dynamic': [0x4bca1, 0x4bfa0],
    'head': [0x4bfa1, 0x4e8e0],
    'hcenter': [0x4bfa1, 0x4e8e0],
    'vcenter': [0x4bfa1, 0x4ec40],
    'trunk': [0x4e8e1, 0x4ec40],
    'limb': [0x4ec41, 0x4efa0],
    'location': [0x4efa1, 0x4f2a0],
    'punctuation': [0x4f2a1, 0x4f480]
  };
  /**
   * Function to test if symbol is of a certain type.
   * @function swu.isType
   * @param {string} swuSym - an SWU symbol character
   * @param {string} type - the name of a symbol range
   * @returns {boolean} is symbol of specified type
   * @example
   * swu.isType('񀀁', 'hand')
   * 
   * return true
   */

  const isType = (swuSym, type) => {
    const parsed = parse.symbol(swuSym);

    if (parsed.symbol) {
      const code = swu2code(parsed.symbol);
      const range = ranges[type];

      if (range) {
        return range[0] <= code && range[1] >= code;
      }
    }

    return false;
  };

  /**
   * Array of colors associated with the seven symbol categories.
   * @alias swu.colors
   * @type {array}
   */

  const colors = ['#0000CC', '#CC0000', '#FF0099', '#006600', '#000000', '#884411', '#FF9900'];
  /**
   * Function that returns the standardized color for a symbol.
   * @function swu.colorize
   * @param {string} swuSym - an SWU symbol character
   * @returns {string} name of standardized color for symbol
   * @example
   * swu.colorize('񀀁')
   * 
   * return '#0000CC'
   */

  const colorize = swuSym => {
    const parsed = parse.symbol(swuSym);
    let color = '#000000';

    if (parsed.symbol) {
      const code = swu2code(parsed.symbol);
      const index = category.findIndex(val => val > code);
      color = colors[index < 0 ? 6 : index - 1];
    }

    return color;
  };

  exports.category = category;
  exports.colorize = colorize;
  exports.colors = colors;
  exports.columnDefaults = columnDefaults;
  exports.columnDefaultsMerge = columnDefaultsMerge;
  exports.columns = columns;
  exports.compose = compose;
  exports.decode = decode;
  exports.encode = encode;
  exports.group = group;
  exports.info = info;
  exports.isType = isType;
  exports.kind = kind;
  exports.pair = pair;
  exports.parse = parse;
  exports.ranges = ranges;
  exports.re = re$1;

  Object.defineProperty(exports, '__esModule', { value: true });

}));

/* support ongoing development on https://patreon.com/signwriting */
});

export { swu as s };
