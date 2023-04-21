/**
 *                    ░    ░          ░     ░                ░
 *                    ░               ░░   ░░         ░
 *   ░░░   ░   ░   ░░░░   ░░    ░░░   ░ ░ ░ ░   ░░░  ░░░    ░░    ░░░   ░░░░
 *      ▒  ▒   ▒  ▒   ▒    ▒   ▒   ▒  ▒  ▒  ▒  ▒   ▒  ▒      ▒   ▒   ▒  ▒   ▒
 *   ▒▒▒▒  ▒   ▒  ▒   ▒    ▒   ▒   ▒  ▒     ▒  ▒   ▒  ▒      ▒   ▒   ▒  ▒   ▒
 *  ▓   ▓  ▓   ▓  ▓   ▓    ▓   ▓   ▓  ▓     ▓  ▓   ▓  ▓  ▓   ▓   ▓   ▓  ▓   ▓
 *   ▓▓▓▓   ▓▓▓▓   ▓▓▓▓  ▓▓▓▓▓  ▓▓▓   ▓     ▓   ▓▓▓    ▓▓  ▓▓▓▓▓  ▓▓▓   ▓   ▓
 *
 * audioMotion | High-resolution real-time audio spectrum analyzer and music player
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * @author    Henrique Vianna <hvianna@gmail.com>
 * @copyright (c) 2018-2023 Henrique Avila Vianna
 * @license   AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { version as VERSION } from '../package.json';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import * as fileExplorer from './file-explorer.js';
import * as mm from 'music-metadata-browser';
import './scrollIntoViewIfNeeded-polyfill.js';

import Sortable, { MultiDrag } from 'sortablejs';
Sortable.mount( new MultiDrag() );

import notie from 'notie';
import './notie.css';

import './styles.css';

const isElectron  = 'electron' in window,
	  isWindows   = isElectron && /Windows/.test( navigator.userAgent ),
	  ROUTE_FILE  = '/getFile/',  // server route to read files anywhere (Electron only)
	  ROUTE_COVER = '/getCover/', // server route to get a folder's cover image (Electron and legacy node server)
	  ROUTE_SAVE  = '/savePlist/'; // server route to save a file to the filesystem (Electron only)

const BG_DIRECTORY          = isElectron ? '/getBackground' : 'backgrounds', // folder name (or server route on Electron) for backgrounds
	  MAX_BG_MEDIA_FILES    = 20,			// max number of media files (images and videos) selectable as background
	  MAX_METADATA_REQUESTS = 4,
	  MAX_QUEUED_SONGS      = 1000;

// Background option values
const BG_DEFAULT = '0',
	  BG_BLACK   = '1',
	  BG_COVER   = '2',
	  BG_IMAGE   = '3',
	  BG_VIDEO   = '4';

// Background image fit option values
const BGFIT_ADJUST   = '0',
	  BGFIT_CENTER   = '1',
	  BGFIT_REPEAT   = '2',
	  BGFIT_PULSE    = '3',
	  BGFIT_ZOOM_IN  = '4',
	  BGFIT_ZOOM_OUT = '5',
	  BGFIT_WARP     = '6',
	  BGFIT_WARP_ANI = '7',
	  BGFIT_WARP_ROT = '8';

// Dataset template for playqueue items and audio elements
const DATASET_TEMPLATE = {
	album: '',
	artist: '',
	codec: '',
	cover: '',
	duration: '',
	file: '',
	quality: '',
	title: ''
};

// Channel Layouts
const CHANNEL_COMBINED = 'dual-combined',
	  CHANNEL_SINGLE   = 'single',
	  CHANNEL_VERTICAL = 'dual-vertical';

// Color modes
const COLOR_GRADIENT = 'gradient',
	  COLOR_INDEX    = 'bar-index',
	  COLOR_LEVEL    = 'bar-level';

// Visualization modes
const MODE_DISCRETE    = '0',
	  MODE_AREA        = '10',
	  MODE_LINE        = '101',
	  MODE_OCTAVE_FULL = '8',
	  MODE_OCTAVE_HALF = '7',
	  MODE_OCTAVE_3RD  = '6',
	  MODE_OCTAVE_4TH  = '5',
	  MODE_OCTAVE_6TH  = '4',
	  MODE_OCTAVE_8TH  = '3',
	  MODE_OCTAVE_12TH = '2',
	  MODE_OCTAVE_24TH = '1';

// Random mode property keys
const RND_ALPHA       = 'alpha',
	  RND_BACKGROUND  = 'nobg',
	  RND_BARSPACING  = 'barSp',
	  RND_BGIMAGEFIT  = 'imgfit',
	  RND_CHNLAYOUT   = 'stereo',
	  RND_COLORMODE   = 'colormode',
	  RND_FILLOPACITY = 'fill',
	  RND_GRADIENT    = 'gradient',
	  RND_LEDS        = 'leds',
	  RND_LINEWIDTH   = 'line',
	  RND_LUMI        = 'lumi',
	  RND_MIRROR      = 'mirror',
	  RND_OUTLINE     = 'outline',
	  RND_PEAKS       = 'peaks',
	  RND_RADIAL      = 'radial',
	  RND_SPIN        = 'spin',
	  RND_REFLEX      = 'reflex',
	  RND_ROUND       = 'round',
	  RND_SPLIT       = 'split';

// Frequency scales
const SCALE_BARK   = 'bark',
	  SCALE_LINEAR = 'linear',
	  SCALE_LOG    = 'log',
	  SCALE_MEL    = 'mel';

// Weighting filters
const WEIGHT_NONE = '',
	  WEIGHT_A    = 'A',
	  WEIGHT_B    = 'B',
	  WEIGHT_C    = 'C',
	  WEIGHT_D    = 'D',
	  WEIGHT_468  = '468';

// localStorage keys
const KEY_CUSTOM_GRADS   = 'custom-grads',
	  KEY_CUSTOM_PRESET  = 'custom-preset',
	  KEY_DISABLED_BGFIT = 'disabled-bgfit',
	  KEY_DISABLED_GRADS = 'disabled-gradients',
	  KEY_DISABLED_MODES = 'disabled-modes',
	  KEY_DISABLED_PROPS = 'disabled-properties',
	  KEY_DISPLAY_OPTS   = 'display-options',
	  KEY_GENERAL_OPTS   = 'general-settings',
	  KEY_LAST_CONFIG    = 'last-config',
	  KEY_LAST_DIR       = 'last-dir',
	  KEY_PLAYLISTS      = 'playlists',
	  KEY_SENSITIVITY    = 'sensitivity-presets';

// selector shorthand functions
const $  = document.querySelector.bind( document ),
	  $$ = document.querySelectorAll.bind( document );

// UI HTML elements
const elAlphaBars     = $('#alpha_bars'),
	  elAnalyzer      = $('#analyzer'),			// analyzer canvas container
	  elAnsiBands     = $('#ansi_bands'),
	  elBackground    = $('#background'),
	  elBalance       = $('#balance'),
	  elBarSpace      = $('#bar_space'),
	  elBgImageDim    = $('#bg_img_dim'),
	  elBgImageFit    = $('#bg_img_fit'),
	  elChnLayout     = $('#channel_layout'),
	  elColorMode     = $('#color_mode'),
	  elContainer     = $('#bg_container'),		// outer container with background image
	  elDim           = $('#bg_dim'),				// background image/video darkening layer
	  elEndTimeout    = $('#end_timeout'),
	  elFFTsize       = $('#fft_size'),
	  elFillAlpha     = $('#fill_alpha'),
	  elFPS           = $('#fps'),
	  elFreqScale     = $('#freq_scale'),
	  elFsHeight      = $('#fs_height'),
	  elGradient      = $('#gradient'),
	  elGradientRight = $('#gradientRight'),
	  elInfoTimeout   = $('#info_timeout'),
	  elLedDisplay    = $('#led_display'),
	  elLinearAmpl    = $('#linear_amplitude'),
	  elLineWidth     = $('#line_width'),
	  elLinkGrads     = $('#link_grads'),
	  elLoadedPlist   = $('#loaded_playlist'),
	  elLoRes         = $('#lo_res'),
	  elLumiBars      = $('#lumi_bars'),
	  elMirror        = $('#mirror'),
	  elMode          = $('#mode'),
	  elMute          = $('#mute'),
	  elNoShadow      = $('#no_shadow'),
	  elNoteLabels    = $('#note_labels'),
	  elOutline       = $('#outline'),
	  elOSD           = $('#osd'),				// message canvas
	  elPIPRatio      = $('#pip_ratio'),
	  elPlaylists     = $('#playlists'),
	  elPreset        = $('#preset'),
	  elRadial        = $('#radial'),
	  elRandomMode    = $('#random_mode'),
	  elRangeMax      = $('#freq_max'),
	  elRangeMin      = $('#freq_min'),
	  elReflex        = $('#reflex'),
	  elRepeat        = $('#repeat'),
	  elRoundBars     = $('#round_bars'),
	  elSaveDir       = $('#save_dir'),
	  elScaleX        = $('#scaleX'),
	  elScaleY        = $('#scaleY'),
	  elSensitivity   = $('#sensitivity'),
	  elShowCount     = $('#show_count'),
	  elShowCover     = $('#show_cover'),
	  elShowPeaks     = $('#show_peaks'),
	  elShowSong      = $('#show_song'),
	  elSmoothing     = $('#smoothing'),
	  elSource        = $('#source'),
	  elSpin		  = $('#spin'),
	  elSplitGrad     = $('#split_grad'),
	  elTrackTimeout  = $('#track_timeout'),
	  elVideo         = $('#video'),				// background video
	  elVolume        = $('#volume'),
 	  elWarp          = $('#warp'),				// "warp" effect layer
 	  elWeighting     = $('#weighting');

// Configuration presets
const presets = {
	default: {
		alphaBars    : 0,
		ansiBands    : 0,
		background   : 0,	// gradient default
		balance      : 0,
		barSpace     : 0.1,
		bgImageDim   : 0.5,
		bgImageFit   : 1, 	// center
		channelLayout: CHANNEL_SINGLE,
		colorMode    : COLOR_GRADIENT,
		fillAlpha    : 0.1,
		freqMax      : 22000,
		freqMin      : 20,
		freqScale    : SCALE_LOG,
		gradient     : 'prism',
		gradientRight: 'prism',
		ledDisplay   : 0,
		linearAmpl   : 0,
		lineWidth    : 2,
		linkGrads    : 0,
		loRes        : 0,
		lumiBars     : 0,
		mirror       : 0,
		mode         : MODE_DISCRETE,
		noShadow     : 1,
		noteLabels   : 0,
		outlineBars  : 0,
		radial       : 0,
		randomMode   : 0,
		reflex       : 0,
		repeat       : 0,
		roundBars    : 0,
		sensitivity  : 1,
		showFPS      : 0,
		showPeaks    : 1,
		showScaleX   : 1,
		showScaleY   : 1,
		showSong     : 1,
		spin         : 2,
		splitGrad    : 0,
		volume       : 1,
		weighting    : WEIGHT_NONE
	},

	demo: {
		randomMode  : 6    // 15 seconds
	},

	bands: {
		alphaBars    : 0,
		ansiBands    : 0,
		background   : BG_COVER,
		barSpace     : .25,	// CRIAR CONSTANTE BARSPC_REGULAR
		bgImageDim   : .3,
		bgImageFit   : BGFIT_ADJUST,
		channelLayout: CHANNEL_SINGLE,
		colorMode    : COLOR_GRADIENT,
		freqMax      : 20000,
		freqMin      : 20,
		freqScale    : SCALE_LOG,
		gradient     : 'rainbow',
		ledDisplay   : 0,
		linearAmpl   : 1,
		lumiBars     : 0,
		mirror       : 0,
		mode         : MODE_OCTAVE_12TH,
		noteLabels   : 1,
		outlineBars  : 0,
		radial       : 0,
		randomMode   : 0,
		reflex       : 1,
		roundBars    : 0,
		showPeaks    : 1,
		showScaleX   : 1,
		showScaleY   : 0,
		showSong     : 1,
		splitGrad    : 0,
		weighting    : WEIGHT_D
	},

	ledbars: {
		alphaBars    : 0,
		ansiBands    : 1,
		background   : BG_COVER,
		barSpace     : .25,
		bgImageDim   : .3,
		bgImageFit   : BGFIT_CENTER,
		channelLayout: CHANNEL_SINGLE,
		colorMode    : COLOR_GRADIENT,
		freqMax      : 20000,
		freqMin      : 30,
		freqScale    : SCALE_LOG,
		gradient     : 'classic',
		ledDisplay   : 1,
		linearAmpl   : 1,
		lumiBars     : 0,
		outlineBars  : 0,
		mirror       : 0,
		mode         : MODE_OCTAVE_3RD,
		noteLabels   : 0,
		radial       : 0,
		randomMode   : 0,
		reflex       : 0,
		roundBars    : 0,
		showPeaks    : 1,
		showScaleX   : 1,
		showScaleY   : 0,
		showSong     : 1,
		splitGrad    : 0,
		weighting    : WEIGHT_D
	},

	dual: {
		background   : BG_COVER,
		bgImageDim   : .3,
		bgImageFit   : BGFIT_CENTER,
		channelLayout: CHANNEL_COMBINED,
		colorMode    : COLOR_GRADIENT,
		fillAlpha    : .3,
		freqMax      : 20000,
		freqMin      : 60,
		freqScale    : SCALE_LOG,
		gradient     : 'cool',
		gradientRight: 'dusk',
		linearAmpl   : 1,
		lineWidth    : 1.5,	// ATIVAR STEP .5
		linkGrads    : 0,
		mirror       : 0,
		mode         : MODE_LINE,
		radial       : 0,
		randomMode   : 0,
		reflex       : 0,
		showPeaks    : 0,
		showScaleX   : 0,
		showScaleY   : 0,
		showSong     : 1,
		splitGrad    : 0,
		weighting    : WEIGHT_D
	},

	radial: {
		alphaBars    : 1,
		background   : BG_COVER,
		barSpace     : .1,
		bgImageDim   : .3,
		bgImageFit   : BGFIT_PULSE,
		channelLayout: CHANNEL_SINGLE,
		colorMode    : COLOR_LEVEL,
		freqMax      : 20000,
		freqMin      : 20,
		freqScale    : SCALE_BARK,
		gradient     : 'prism',
		ledDisplay   : 0,
		linearAmpl   : 1,
		lumiBars     : 0,
		mirror       : 0,
		mode         : MODE_OCTAVE_4TH,
		noteLabels   : 0,
		outlineBars  : 0,
		radial       : 1,
		randomMode   : 0,
		showPeaks    : 1,
		showScaleX   : 1,
		showScaleY   : 0,
		showSong     : 1,
		spin         : 1,
		splitGrad    : 0,
		weighting    : WEIGHT_D
	},

	round: {
		alphaBars    : 0,
		background   : BG_COVER,
		barSpace     : .25,
		bgImageDim   : .3,
		bgImageFit   : BGFIT_WARP_ANI,
		channelLayout: CHANNEL_SINGLE,
		colorMode    : COLOR_INDEX,
		freqMax      : 20000,
		freqMin      : 30,
		freqScale    : SCALE_LOG,
		gradient     : 'apple',
		ledDisplay   : 0,
		linearAmpl   : 1,
		lumiBars     : 0,
		mirror       : 0,
		mode         : MODE_OCTAVE_8TH,
		outlineBars  : 0,
		radial       : 0,
		randomMode   : 0,
		reflex       : 2,	// CRIAR CONSTANTE
		roundBars    : 1,
		showPeaks    : 0,
		showScaleX   : 0,
		showScaleY   : 0,
		showSong     : 1,
		splitGrad    : 0,
		weighting    : WEIGHT_D
	}
};

// Gradient definitions
const gradients = {
	apple:    { name: 'Apple ][', colorStops: [
				{ pos: .1667, color: '#61bb46' },
				{ pos: .3333, color: '#fdb827' },
				{ pos: .5, color: '#f5821f' },
				{ pos: .6667, color: '#e03a3e' },
				{ pos: .8333, color: '#963d97' },
				{ pos: 1, color: '#009ddc' }
			  ], disabled: false },
	aurora:   { name: 'Aurora', bgColor: '#0e172a', colorStops: [
				{ pos: .1, color: 'hsl( 120, 100%, 50% )' },
				{ pos:  1, color: 'hsl( 216, 100%, 50% )' }
			  ], disabled: false },
	borealis:  { name: 'Borealis', bgColor: '#0d1526', colorStops: [
				{ pos: .1, color: 'hsl( 120, 100%, 50% )' },
				{ pos: .5, color: 'hsl( 189, 100%, 40% )' },
				{ pos:  1, color: 'hsl( 290, 60%, 40% )' }
			  ], disabled: false },
	candy:    { name: 'Candy', bgColor: '#0d0619', colorStops: [
				{ pos: .1, color: '#ffaf7b' },
				{ pos: .5, color: '#d76d77' },
				{ pos: 1, color: '#3a1c71' }
			  ], disabled: false },
	classic:  { name: 'Classic', disabled: false },
	cool:     { name: 'Cool', bgColor: '#0b202b', colorStops: [
				'hsl( 208, 0%, 100% )',
				'hsl( 208, 100%, 35% )'
			  ], disabled: false },
	dusk:     { name: 'Dusk', bgColor: '#0e172a', colorStops: [
				{ pos: .2, color: 'hsl( 55, 100%, 50% )' },
				{ pos:  1, color: 'hsl( 16, 100%, 50% )' }
			  ], disabled: false },
	miami:    { name: 'Miami', bgColor: '#110a11', colorStops: [
				{ pos: .024, color: 'rgb( 251, 198, 6 )' },
				{ pos: .283, color: 'rgb( 224, 82, 95 )' },
				{ pos: .462, color: 'rgb( 194, 78, 154 )' },
				{ pos: .794, color: 'rgb( 32, 173, 190 )' },
				{ pos: 1, color: 'rgb( 22, 158, 95 )' }
			  ], disabled: false },
	orient:   { name: 'Orient', bgColor: '#100', colorStops: [
				{ pos: .1, color: '#f00' },
				{ pos: 1, color: '#600' }
			  ], disabled: false },
	outrun:   { name: 'Outrun', bgColor: '#101', colorStops: [
				{ pos: 0, color: 'rgb( 255, 223, 67 )' },
				{ pos: .182, color: 'rgb( 250, 84, 118 )' },
				{ pos: .364, color: 'rgb( 198, 59, 243 )' },
				{ pos: .525, color: 'rgb( 133, 80, 255 )' },
				{ pos: .688, color: 'rgb( 74, 104, 247 )' },
				{ pos: 1, color: 'rgb( 35, 210, 255 )' }
			  ], disabled: false },
	pacific:  { name: 'Pacific Dream', bgColor: '#051319', colorStops: [
				{ pos: .1, color: '#34e89e' },
				{ pos: 1, color: '#0f3443' }
			  ], disabled: false },
	prism:    { name: 'Prism', disabled: false },
	rainbow:  { name: 'Rainbow', disabled: false },
	shahabi:  { name: 'Shahabi', bgColor: '#060613', colorStops: [
				{ pos: .1, color: '#66ff00' },
				{ pos: 1, color: '#a80077' }
			  ], disabled: false },
	summer:   { name: 'Summer', bgColor: '#041919', colorStops: [
				{ pos: .1, color: '#fdbb2d' },
				{ pos: 1, color: '#22c1c3' }
			  ], disabled: false },
	sunset:   { name: 'Sunset', bgColor: '#021119', colorStops: [
				{ pos: .1, color: '#f56217' },
				{ pos: 1, color: '#0b486b' }
			  ], disabled: false },
	tiedye:   { name: 'Tie Dye', colorStops: [
				{ pos: .038, color: 'rgb( 15, 209, 165 )' },
				{ pos: .208, color: 'rgb( 15, 157, 209 )' },
				{ pos: .519, color: 'rgb( 133, 13, 230 )' },
				{ pos: .731, color: 'rgb( 230, 13, 202 )' },
				{ pos: .941, color: 'rgb( 242, 180, 107 )' }
			  ], disabled: false }
};

// Visualization modes
const modeOptions = [
	{ value: MODE_DISCRETE,    text: 'Discrete frequencies',    disabled: false },
	{ value: MODE_AREA,        text: 'Area graph',              disabled: false },
	{ value: MODE_LINE,        text: 'Line graph',              disabled: false },
	{ value: MODE_OCTAVE_FULL, text: 'Octave bands / 10 bands', disabled: false },
	{ value: MODE_OCTAVE_HALF, text: '1/2 octave / 20 bands',   disabled: false },
	{ value: MODE_OCTAVE_3RD,  text: '1/3 octave / 30 bands',   disabled: false },
	{ value: MODE_OCTAVE_4TH,  text: '1/4 octave / 40 bands',   disabled: false },
	{ value: MODE_OCTAVE_6TH,  text: '1/6 octave / 60 bands',   disabled: false },
	{ value: MODE_OCTAVE_8TH,  text: '1/8 octave / 80 bands',   disabled: false },
	{ value: MODE_OCTAVE_12TH, text: '1/12 octave / 120 bands', disabled: false },
	{ value: MODE_OCTAVE_24TH, text: '1/24 octave / 240 bands', disabled: false }
];

// Channel Layout options
const channelLayoutOptions = [
	[ CHANNEL_SINGLE,   'Single channel'  ],
	[ CHANNEL_VERTICAL, 'Dual / Vertical' ],
	[ CHANNEL_COMBINED, 'Dual / Combined' ]
];

// Properties that may be changed by Random Mode
const randomProperties = [
	{ value: RND_ALPHA,       text: 'Alpha',          disabled: false },
	{ value: RND_BACKGROUND,  text: 'Background',     disabled: false },
	{ value: RND_BARSPACING,  text: 'Bar Spacing',    disabled: false },
	{ value: RND_BGIMAGEFIT,  text: 'BG Image Fit',   disabled: false },
	{ value: RND_CHNLAYOUT,   text: 'Channel Layout', disabled: false },
	{ value: RND_COLORMODE,   text: 'Color Mode',     disabled: false },
	{ value: RND_FILLOPACITY, text: 'Fill Opacity',   disabled: false },
	{ value: RND_GRADIENT,    text: 'Gradients',      disabled: false },
	{ value: RND_LEDS,        text: 'LEDs',           disabled: false },
	{ value: RND_LINEWIDTH,   text: 'Line Width',     disabled: false },
	{ value: RND_LUMI,        text: 'Lumi',           disabled: false },
	{ value: RND_MIRROR,      text: 'Mirror',         disabled: false },
	{ value: RND_OUTLINE,     text: 'Outline',        disabled: false },
	{ value: RND_PEAKS,       text: 'Peaks',          disabled: false },
	{ value: RND_RADIAL,      text: 'Radial',         disabled: false },
	{ value: RND_SPIN,        text: 'Radial Spin',    disabled: false },
	{ value: RND_REFLEX,      text: 'Reflex',         disabled: false },
	{ value: RND_ROUND,       text: 'Round',          disabled: false },
	{ value: RND_SPLIT,       text: 'Split',          disabled: false },
];

// Sensitivity presets
const sensitivityDefaults = [
	{ min: -70,  max: -20, boost: 1 }, // low
	{ min: -85,  max: -25, boost: 1.6 }, // normal
	{ min: -100, max: -30, boost: 2.4 }  // high
];

// On-screen information display options
const infoDisplayDefaults = {
	info  : 5,	  // display time (secs) when requested via click or keyboard shortcut
	track : 10,   // display time (secs) on track change
	end   : 0,    // display time (secs) at the end of the song
	covers: true, // show album covers in song information
	count : true  // show song number and play queue count
}

// Background Image Fit options
const bgFitOptions = [
	{ value: BGFIT_ADJUST,   text: 'Adjust',      disabled: false },
	{ value: BGFIT_CENTER,   text: 'Center',      disabled: false },
	{ value: BGFIT_PULSE,    text: 'Pulse',       disabled: false },
	{ value: BGFIT_REPEAT,   text: 'Repeat',      disabled: false },
	{ value: BGFIT_WARP,     text: 'Warp',        disabled: false },
	{ value: BGFIT_WARP_ANI, text: 'Warp Drive',  disabled: false },
	{ value: BGFIT_WARP_ROT, text: 'Wormhole',    disabled: false },
	{ value: BGFIT_ZOOM_IN,  text: 'Zoom In',     disabled: false },
	{ value: BGFIT_ZOOM_OUT, text: 'Zoom Out',    disabled: false },
];

// General settings
const generalOptionsElements = [ elFFTsize, elFsHeight, elPIPRatio, elSaveDir, elSmoothing ];

const generalOptionsDefaults = {
	fftSize : 8192,
	smoothing: .5,
	pipRatio: 2.35,
	fsHeight: 100,
	saveDir : true
}

// PIP window aspect ratio options
const pipRatioOptions = [
	[ 1, '1:1' ],
	[ 1.33, '4:3' ],
	[ 1.78, '16:9' ],
	[ 2.35, '2.35:1' ],
	[ 3.55, '32:9' ]
];

// Global variables
let audioElement = [],
	audioMotion,
	bgImages = [],
	bgVideos = [],
	canvasMsg,
	currAudio, 					// audio element currently in use
	currentGradient = null,     // gradient that is currently loaded in gradient editor
	fastSearchTimeout,
	folderImages = {}, 			// folder cover images for songs with no picture in the metadata
	isFastSearch = false,
	isMicSource,				// flag for microphone input in use
	micStream,
	nextAudio, 					// audio element loaded with the next song (for improved seamless playback)
	panNode,					// stereoPanner node for balance control
	playlist, 					// play queue
	playlistPos, 				// index to the current song in the queue
	randomModeTimer,
	serverMode, 				// 1 = custom server; 0 = standard web server; -1 = local (file://) mode
	skipping = false,
	waitingMetadata = 0,
	wasMuted;					// mute status before switching to microphone input

const canvasCtx  = elOSD.getContext('2d'),
	  coverImage = new Image(),	// cover image for the currently playing song (for canvas rendering)
	  pipVideo   = document.createElement('video');


// HELPER FUNCTIONS -------------------------------------------------------------------------------

// convert URL-encoded slashes back to regular ASCII
const decodeSlashes = ( path, osNative ) => path.replace( /(%2f|\/)/g, osNative && isWindows ? '\\' : '/' );

// convert slashes to their URL-safe encoding for server queries
const encodeSlashes = path => path.replace( /\//g, '%2f' );

// precision fix for floating point numbers
const fixFloating = value => Math.round( value * 100 ) / 100;

// return the index of an element inside its parent - based on https://stackoverflow.com/a/13657635/2370385
const getIndex = node => {
	if ( ! node )
		return;
	let i = 0;
	while ( node = node.previousElementSibling )
		i++;
	return i;
}

// returns the text of the selected option in a `select` HTML element
const getText = el => el[ el.selectedIndex ].text;

// returns an object with the current settings
const getCurrentSettings = _ => ({
	alphaBars    : +isSwitchOn( elAlphaBars ),
	ansiBands    : +isSwitchOn( elAnsiBands ),
	background   : elBackground.value,
	barSpace     : elBarSpace.value,
	bgImageDim   : elBgImageDim.value,
	bgImageFit   : elBgImageFit.value,
	channelLayout: elChnLayout.value,
	colorMode    : elColorMode.value,
	fillAlpha    : elFillAlpha.value,
	freqMax		 : elRangeMax.value,
	freqMin		 : elRangeMin.value,
	freqScale    : elFreqScale.value,
	gradient	 : elGradient.value,
	gradientRight: elGradientRight.value,
	ledDisplay   : +isSwitchOn( elLedDisplay ),
	linearAmpl   : +isSwitchOn( elLinearAmpl ),
	lineWidth    : elLineWidth.value,
	linkGrads    : +isSwitchOn( elLinkGrads ),
	loRes        : +isSwitchOn( elLoRes ),
	lumiBars     : +isSwitchOn( elLumiBars ),
	mirror       : elMirror.value,
	mode         : elMode.value,
	noShadow     : +isSwitchOn( elNoShadow ),
	noteLabels   : +isSwitchOn( elNoteLabels ),
	outlineBars  : +isSwitchOn( elOutline ),
	radial       : +isSwitchOn( elRadial ),
	randomMode   : elRandomMode.value,
	reflex       : elReflex.value,
	repeat       : +isSwitchOn( elRepeat ),
	roundBars    : +isSwitchOn( elRoundBars ),
	sensitivity  : elSensitivity.value,
	showFPS      : +isSwitchOn( elFPS ),
	showPeaks 	 : +isSwitchOn( elShowPeaks ),
	showScaleX 	 : +isSwitchOn( elScaleX ),
	showScaleY 	 : +isSwitchOn( elScaleY ),
	showSong     : +isSwitchOn( elShowSong ),
	spin         : elSpin.value,
	splitGrad    : +isSwitchOn( elSplitGrad ),
	weighting    : elWeighting.value
});

// check if a string is an external URL
const isExternalURL = path => path.startsWith('http');

// check if PIP is active
const isPIP = _ => elContainer.classList.contains('pip');

// check if audio is playing
const isPlaying = ( audioEl = audioElement[ currAudio ] ) => audioEl && audioEl.currentTime > 0 && ! audioEl.paused && ! audioEl.ended;

// returns a boolean with the current status of an UI switch
const isSwitchOn = el => el.dataset.active == '1';

// normalize slashes in path to Linux format
const normalizeSlashes = path => path.replace( /\\/g, '/' );

// returns a string with the current status of an UI switch
const onOff = el => isSwitchOn( el ) ? 'ON' : 'OFF';

// parse a path and return its individual parts
const parsePath = uri => {
	const fullPath  = removeServerEncoding( uri ),
		  lastSlash = fullPath.lastIndexOf('/') + 1,
		  path      = fullPath.slice( 0, lastSlash ), // path only
		  fileName  = fullPath.slice( lastSlash ),    // file name with extension
		  lastDot   = fileName.lastIndexOf('.'),
		  baseName  = lastDot >= 0 ? fileName.slice( 0, lastDot ) : fileName, // file name only (no extension)
		  extension = lastDot >= 0 ? fileName.slice( lastDot + 1 ).toLowerCase() : ''; // extension (without dot)

	return { path, fileName, baseName, extension };
}

// try to extract metadata off the filename (artist - title) or #EXTINF text (duration,artist - title)
const parseTrackName = name => {
	name = name.replace( /_/g, ' ' ); // for some really old file naming conventions :)
	// try to discard the track number from the title, by checking commonly used separators (dot, hyphen or space)
	// if the separator is a comma, assume the number is actually the duration from an #EXTINF tag
	const [ ,, duration, separator,, artist, title ] = name.match( /(^(-?\d+)([,\.\-\s]))?((.*?)\s+-\s+)?(.*)/ );
	return { artist, title, duration: separator == ',' ? secondsToTime( duration ) : '' };
}

// prepare a file path for use with the Electron file server if needed
const queryFile = path => {
	if ( isElectron && ! isExternalURL( path ) ) {
		if ( path.startsWith( ROUTE_FILE ) )
			path = path.slice( ROUTE_FILE.length );
		path = ROUTE_FILE + encodeSlashes( path );
	}
	return path;
}

// returns the count of queued songs
const queueLength = _ => playlist.children.length;

// returns a random integer in the range [ 0, n-1 ]
const randomInt = ( n = 2 ) => Math.random() * n | 0;

// remove custom server route and encoded slashes from an URL
const removeServerEncoding = uri => {
	const regexp = new RegExp( `^${ ROUTE_FILE }` );
	return normalizeSlashes( decodeSlashes( uri.replace( regexp, '' ) ) );
}

// format a value in seconds to a string in the format 'hh:mm:ss'
const secondsToTime = secs => {
	if ( secs == Infinity || secs == -1 )
		return 'LIVE';

	let str  = '',
		lead = '';

	if ( secs >= 3600 ) {
		str = ( secs / 3600 | 0 ) + ':';
		secs %= 3600;
		lead = '0';
	}

	str += ( lead + ( secs / 60 | 0 ) ).slice(-2) + ':' + ( '0' + ( secs % 60 | 0 ) ).slice(-2);

	return str;
}

// set attributes of "range" or "number" input elements
const setRangeAtts = ( element, min, max, step = 1 ) => {
	element.min  = min;
	element.max  = max;
	element.step = step;
}

// GENERAL FUNCTIONS ------------------------------------------------------------------------------

/**
 * Adds a batch of files to the queue and displays total songs added when finished
 *
 * @param files {array} array of objects with a 'file' property
 * @param [autoplay] {boolean}
 */
function addBatchToPlayQueue( files, autoplay = false ) {
	const promises = files.map( entry => addToPlayQueue( entry.file, autoplay ) );
	Promise.all( promises ).then( added => {
		const total = added.reduce( ( sum, val ) => sum + val, 0 ),
			  text  = `${total} song${ total > 1 ? 's' : '' } added to the queue${ queueLength() < MAX_QUEUED_SONGS ? '' : '. Queue is full!' }`;
		notie.alert({ text, time: 5 });
	});
}

/**
 * Add audio metadata to a playlist item or audio element
 */
function addMetadata( metadata, target ) {
	const trackData  = target.dataset,
		  sourceData = metadata.dataset,
		  common     = metadata.common,
		  format     = metadata.format;

	if ( sourceData ) 	// metadata is a dataset (playqueue item) - just copy the data to target element
		Object.assign( trackData, sourceData );
	else {				// parse metadata read from file
		trackData.artist = common.artist || trackData.artist;
		trackData.title  = common.title || trackData.title;
		trackData.album  = common.album ? common.album + ( common.year ? ' (' + common.year + ')' : '' ) : '';
		trackData.codec  = format ? format.codec || format.container : trackData.codec;

		if ( format && format.bitsPerSample )
			trackData.quality = ( format.sampleRate / 1000 | 0 ) + 'KHz / ' + format.bitsPerSample + 'bits';
		else if ( format.bitrate )
			trackData.quality = ( format.bitrate / 1000 | 0 ) + 'K ' + ( format.codecProfile || '' );
		else
			trackData.quality = '';

		if ( format && format.duration )
			trackData.duration = secondsToTime( format.duration );
		else
			trackData.duration = '';

		if ( common.picture && common.picture.length ) {
			const blob = new Blob( [ common.picture[0].data ], { type: common.picture[0].format } );
			trackData.cover = URL.createObjectURL( blob );
		}
	}

	if ( target == audioElement[ currAudio ] )
		setCurrentCover();
}

/**
 * Add a song to the play queue
 * returns 1 if song added or 0 if queue is full
 */
function addSongToPlayQueue( uri, content = {} ) {

	if ( queueLength() >= MAX_QUEUED_SONGS )
		return 0;

	uri = normalizeSlashes( uri );

	// extract file name and extension
	const file = decodeSlashes( uri ).split('/').pop(),
		  ext  = file.split('.').pop();

	// create new list element
	const newEl     = document.createElement('li'),
		  trackData = newEl.dataset;

	Object.assign( trackData, DATASET_TEMPLATE ); // initialize element's dataset attributes

	trackData.artist   = content.artist || '';
	trackData.title    = content.title || file.replace( /%23/g, '#' ) || uri.slice( uri.lastIndexOf('//') + 2 );
	trackData.duration = content.duration || '';
	trackData.codec    = ( ext !== file ) ? ext.toUpperCase() : '';

	// replace any '#' character in the filename for its URL-safe code (for content coming from playlist files)
	uri = uri.replace( /#/g, '%23' );
	trackData.file = uri;

	playlist.appendChild( newEl );

	if ( queueLength() == 1 && ! isPlaying() )
		loadSong(0);
	if ( playlistPos > queueLength() - 3 )
		loadNextSong();

	trackData.retrieve = 1; // flag this item as needing metadata
	retrieveMetadata();
	return 1;
}

/**
 * Add a song or playlist to the play queue
 */
function addToPlayQueue( file, autoplay = false ) {

	let ret;

	if ( ['m3u','m3u8'].includes( parsePath( file ).extension ) )
		ret = loadPlaylist( file );
	else
		ret = new Promise( resolve => resolve( addSongToPlayQueue( file, parseTrackName( parsePath( file ).baseName ) ) ) );

	// when promise resolved, if autoplay requested start playing the first added song
	ret.then( n => {
		if ( autoplay && ! isPlaying() && n > 0 )
			playSong( queueLength() - n );
	});

	return ret;
}

/**
 * Increase or decrease balance
 */
function changeBalance( incr ) {
	let newVal = incr ? fixFloating( ( +elBalance.dataset.value || 0 ) + incr * .1 ) : 0;

	if ( newVal < -1 )
		newVal = -1;
	else if ( newVal > 1 )
		newVal = 1;

	setBalance( newVal );
	setCanvasMsg( `Balance: ${ newVal == 0 ? 'CENTER' : ( Math.abs( newVal ) * 100 ) + '% ' + ( newVal > 0 ? 'Right' : 'Left' ) }` );
	updateLastConfig();
}

/**
 * Change fullscreen analyzer height
 */
function changeFsHeight( incr ) {
	const val = +elFsHeight.value;

	if ( incr == 1 && val < +elFsHeight.max || incr == -1 && val > +elFsHeight.min ) {
		elFsHeight.value = val + elFsHeight.step * incr;
		setProperty( elFsHeight );
	}
	setCanvasMsg( `Analyzer height: ${ elFsHeight.value }%` );
}

/**
 * Increase or decrease volume
 */
function changeVolume( incr ) {
	let newVal = fixFloating( ( +elVolume.dataset.value || 0 ) + incr * .05 );

	if ( newVal < 0 )
		newVal = 0;
	else if ( newVal > 1 )
		newVal = 1;

	setVolume( newVal );
	setCanvasMsg( `Volume: ${ newVal * 20 }` );
	updateLastConfig();
}

/**
 * Clear audio element
 */
function clearAudioElement( n = currAudio ) {
	const elAudio   = audioElement[ n ],
		  trackData = elAudio.dataset;

	elAudio.removeAttribute('src');
	Object.assign( trackData, DATASET_TEMPLATE ); // clear data attributes
	elAudio.load();

	if ( n == currAudio )
		setCurrentCover(); // clear coverImage and background image if needed
}

/**
 * Clear the play queue
 */
function clearPlayQueue() {

	while ( playlist.hasChildNodes() )
		revokeBlobURL( playlist.removeChild( playlist.firstChild ) );

	if ( ! isPlaying() ) {
		playlistPos = 0;
		clearAudioElement( currAudio );
	}
	else
		playlistPos = -1;

	clearAudioElement( nextAudio );
	updatePlaylistUI();
}

/**
 * Output messages to the UI "console"
 */
function consoleLog( msg, error, clear ) {
	const content = $('#console-content'),
	 	  dt = new Date(),
		  time = dt.toLocaleTimeString( [], { hour12: false } ) + '.' + String( dt.getMilliseconds() ).padStart( 3, '0' );

	if ( clear )
		content.innerHTML = '';

	if ( error )
		$('#toggle_console').classList.add('warning');

	if ( msg )
		content.innerHTML += `<div ${ error ? 'class="error"' : '' }>${ time } &gt; ${msg}</div>`;

	content.scrollTop = content.scrollHeight;
}

/**
 * Select next or previous option in a `select` HTML element, cycling around when necessary
 *
 * @param el {object} HTML object
 * @param [prev] {boolean} true to select previous option
 */
function cycleElement( el, prev ) {
	const idx = el.selectedIndex + ( prev ? -1 : 1 );

	if ( idx < 0 )
		el.selectedIndex = el.options.length - 1;
	else if ( idx >= el.options.length )
		el.selectedIndex = 0;
	else
		el.selectedIndex = idx;

	setProperty( el );
}

/**
 * Cycle X and Y axis scales
 *
 * @param [prev] {boolean} true to select previous option
 * @return integer (bit 0 = scale X status; bit 1 = scale Y status)
 */
function cycleScale( prev ) {
	let scale = +elScaleX.dataset.active + ( elScaleY.dataset.active << 1 ) + ( prev ? -1 : 1 );

	if ( scale < 0 )
		scale = 3;
	else if ( scale > 3 )
		scale = 0;

	elScaleX.dataset.active = scale & 1;
	elScaleY.dataset.active = scale >> 1;

	setProperty( [ elScaleX, elScaleY ] );
	return scale;
}

/**
 * Delete all child nodes of an element
 */
function deleteChildren( el ) {
	while ( el.firstChild )
		el.removeChild( el.firstChild );
}

/**
 * Removes gradient that has been loaded into the editor from the gradients object as well as the saved custom gradients
 * preference.
 *
 * Note, this does not remove the gradient from the analyzer. Rather, the analyzer's gradient object will be
 * overwritten next time a gradient is created. This is because custom gradient keys are generated based on how many
 * custom gradients. See `openGradientEditorNew()`. Additionally, the deleted gradient is removed from the stored
 * preferences, so the analyzer will not have it on next load.
 */
function deleteGradient() {
	if (!currentGradient || !currentGradient.key) return;

	delete gradients[currentGradient.key];

	// if that was the only enabled gradient, set the first gradient as enabled
	if (Object.keys(gradients).filter(key => !gradients[key].disabled).length === 0) {
		gradients[Object.keys(gradients)[0]].disabled = false;
	}

	populateGradients();
	populateEnabledGradients();
	savePreferences(KEY_CUSTOM_GRADS);
	savePreferences(KEY_DISABLED_GRADS); // saving disabled gradients because if we the only enabled one, we set the first to be enabled.

	currentGradient = null;
	location.href = '/#config';
}

/**
 * Delete a playlist from localStorage
 */
function deletePlaylist( index ) {
	if ( elPlaylists[ index ].dataset.isLocal ) {
		notie.confirm({
			text: `Do you really want to DELETE the "${elPlaylists[ index ].innerText}" playlist?<br>THIS CANNOT BE UNDONE!`,
			submitText: 'Delete',
			submitCallback: async () => {
				const keyName   = elPlaylists[ index ].value,
					  playlists = await loadFromStorage( KEY_PLAYLISTS );

				if ( playlists ) {
					delete playlists[ keyName ];
					saveToStorage( KEY_PLAYLISTS, playlists );
				}

				localStorage.removeItem( `pl_${keyName}` );
				notie.alert({ text: 'Playlist deleted' });
				loadSavedPlaylists();
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled' })
			},
		});
	}
	else if ( elPlaylists[ index ].value )
		notie.alert({ text: 'Cannot delete a server playlist!' });
}

/**
 * Populate Config Panel options
 */
function doConfigPanel() {

	// helper function
	const buildOptions = ( container, cssClass, options, parent, cfgKey ) => {
		// create checkboxes inside the container
		options.forEach( item => {
			container.innerHTML += `<label><input type="checkbox" class="${cssClass}" data-option="${item.value}" ${item.disabled ? '' : 'checked'}> ${item.text}</label>`;
		});

		// add event listeners for enabling/disabling options
		$$( `.${cssClass}` ).forEach( element => {
			element.addEventListener( 'click', event => {
				if ( ! element.checked ) {
					const count = options.filter( item => ! item.disabled ).length;
					if ( count < 2 ) {
						notie.alert({ text: 'At least one item must be enabled!' });
						event.preventDefault();
						return false;
					}
				}
				options.find( item => item.value == element.dataset.option ).disabled = ! element.checked;
				populateSelect( parent, options );
				savePreferences( cfgKey );
			});
		});
	}

	// Enabled visualization modes
	buildOptions( $('#enabled_modes'), 'enabledMode', modeOptions, elMode, KEY_DISABLED_MODES );

	// Enabled Background Image Fit options
	buildOptions( $('#enabled_bgfit'), 'enabledMode', bgFitOptions, elBgImageFit, KEY_DISABLED_BGFIT );

	// Enabled gradients

	const elEnabledGradients = $('#enabled_gradients');

	Object.keys( gradients ).forEach( key => {
		elEnabledGradients.innerHTML += `<label><input type="checkbox" class="enabledGradient" data-grad="${key}" ${gradients[ key ].disabled ? '' : 'checked'}> ${gradients[ key ].name}</label>`;
	});

	populateEnabledGradients();

	// Random Mode properties

	const elProperties = $('#random_properties');

	randomProperties.forEach( prop => {
		elProperties.innerHTML += `<label><input type="checkbox" class="randomProperty" value="${prop.value}" ${prop.disabled ? '' : 'checked'}> ${prop.text}</label>`;
	});

	$$('.randomProperty').forEach( el => {
		el.addEventListener( 'click', event => {
			randomProperties.find( item => item.value == el.value ).disabled = ! el.checked;
			savePreferences( KEY_DISABLED_PROPS );
		});
	});

	// Sensitivity presets (already populated by loadPreferences())
	$$( '[data-preset]' ).forEach( el => {
		if ( el.className == 'reset-sens' ) {
			el.addEventListener( 'click', () => {
				const preset = el.dataset.preset;
				$(`.min-db[data-preset="${preset}"]`).value = sensitivityDefaults[ preset ].min;
				$(`.max-db[data-preset="${preset}"]`).value = sensitivityDefaults[ preset ].max;
				$(`.linear-boost[data-preset="${preset}"]`).value = sensitivityDefaults[ preset ].boost;
				$$(`[data-preset="${preset}"]`).forEach( field => {
					field.classList.remove('field-error');
				});
				if ( el.dataset.preset == elSensitivity.value ) // current preset has been changed
					setProperty( elSensitivity, false );
				savePreferences( KEY_SENSITIVITY );
			});
		}
		else {
			el.addEventListener( 'change', () => {
				const isValid = ( +el.value >= +el.min && +el.value <= +el.max );
				if ( isValid ) {
					if ( el.dataset.preset == elSensitivity.value ) // current preset has been changed
						setProperty( elSensitivity, false );
					savePreferences( KEY_SENSITIVITY );
				}
				el.classList.toggle( 'field-error', ! isValid );
			});
		}
	});

	// On-screen display options
	for ( const el of [ elInfoTimeout, elTrackTimeout, elEndTimeout, elShowCover, elShowCount ] )
		el.addEventListener( 'change', () => savePreferences( KEY_DISPLAY_OPTS ) );

	$('#reset_osd').addEventListener( 'click', () => {
		setInfoOptions( infoDisplayDefaults );
		savePreferences( KEY_DISPLAY_OPTS );
	});

	// General settings
	generalOptionsElements.forEach( el => {
		el.addEventListener( 'change', () => setProperty( el ) );
	});

	$('#reset_general').addEventListener( 'click', () => {
		setGeneralOptions( generalOptionsDefaults );
		setProperty( generalOptionsElements );
	});
}

/**
 * Fast forward or rewind the current audio element
 */
function fastSearch( dir = 1 ) {
	const audioEl = audioElement[ currAudio ];

	if ( audioEl.duration > 0 && audioEl.duration < Infinity ) {
		let newPos = audioEl.currentTime + dir * 5; // 5 seconds steps

		if ( newPos < 0 )
			newPos = 0;
		else if ( newPos > audioEl.duration - 1 )
			newPos = audioEl.duration - 1

		setCanvasMsg(1); // display song info
		audioEl.currentTime = newPos;
	}

	// 'keydown' keeps triggering while the key is pressed, but 'mousedown' triggers only once,
	// so we need to schedule another call to keep this working when in mouse mode
	if ( isFastSearch == 'm' )
		scheduleFastSearch( 'm', dir );
}

/**
 * Finish track fast search
 */
function finishFastSearch() {
	clearTimeout( fastSearchTimeout );
	if ( isFastSearch ) {
		isFastSearch = false;
		return true;
	}
	// fast search was never activated, return false to indicate a track skip
	return false;
}

/**
 * Display the canvas in full-screen mode
 */
async function fullscreen() {
	if ( isPIP() )
		await document.exitPictureInPicture();
	audioMotion.toggleFullscreen();
	document.activeElement.blur(); // move keyboard focus to the document body
}

/**
 * Try to get a cover image from the song's folder
 */
function getFolderCover( uri ) {
	return new Promise( resolve => {
		const path = parsePath( uri ).path; // extract path (no filename)

		if ( serverMode == -1 || isExternalURL( uri ) )
			resolve(''); // nothing to do when in serverless mode or external file
		else if ( folderImages[ path ] !== undefined )
			resolve( queryFile( path + folderImages[ path ] ) ); // use the stored image URL for this path
		else {
			const urlToFetch = ( serverMode == 1 ) ? ROUTE_COVER + encodeSlashes( path ) : path;

			fetch( urlToFetch )
				.then( response => {
					return ( response.status == 200 ) ? response.text() : null;
				})
				.then( content => {
					let imageUrl = '';
					if ( content ) {
						if ( serverMode == 1 )
							imageUrl = content;
						else {
							const dirContents = fileExplorer.parseWebDirectory( content );
							if ( dirContents.cover )
								imageUrl = dirContents.cover;
						}
					}
					folderImages[ path ] = imageUrl;
					resolve( queryFile( path + imageUrl ) );
				});
		}
	});
}

/**
 * Process keyboard shortcuts
 */
function keyboardControls( event ) {

	if ( event.target.tagName != 'BODY' || event.altKey || event.ctrlKey )
		return;

	const isShiftKey = event.shiftKey;

	if ( event.type == 'keydown' ) {
		switch ( event.code ) {
			case 'ArrowUp': 	// volume up
				if ( isShiftKey )
					changeFsHeight(1);
				else
					changeVolume(1);
				break;
			case 'ArrowDown': 	// volume down
				if ( isShiftKey )
					changeFsHeight(-1);
				else
					changeVolume(-1);
				break;
			case 'ArrowLeft': 	// rewind
				if ( isShiftKey )
					changeBalance(-1);
				else if ( isFastSearch ) {
					setCanvasMsg( 'Rewind', 1 );
					fastSearch(-1);
				}
				else
					scheduleFastSearch('k', -1);
				break;
			case 'ArrowRight': 	// fast forward
				if ( isShiftKey )
					changeBalance(1);
				else if ( isFastSearch ) {
					setCanvasMsg( 'Fast forward', 1 );
					fastSearch();
				}
				else
					scheduleFastSearch('k');
				break;
			default:
				// no key match - quit and keep default behavior
				return;
		}
	}
	else {
		// the keys below are handled on 'keyup' to avoid key repetition
		switch ( event.code ) {
			case 'Delete': 		// delete selected songs from the playlist
			case 'Backspace':	// for Mac
				playlist.querySelectorAll('.selected').forEach( e => {
					revokeBlobURL( e );
					e.remove();
				});
				const current = getIndex( playlist.querySelector('.current') );
				if ( current !== undefined )
					playlistPos = current;	// update playlistPos if current song hasn't been deleted
				else if ( playlistPos > queueLength() - 1 )
					playlistPos = queueLength() - 1;
				else
					playlistPos--;
				if ( queueLength() )
					loadNextSong();
				else {
					clearAudioElement( nextAudio );
					if ( ! isPlaying() )
						clearAudioElement();
				}
				break;
			case 'Space': 		// play / pause
				setCanvasMsg( isPlaying() ? 'Pause' : 'Play', 1 );
				playPause();
				break;
			case 'ArrowLeft': 	// previous song
			case 'KeyJ':
				if ( ! finishFastSearch() && ! isShiftKey ) {
					setCanvasMsg( 'Previous track', 1 );
					skipTrack(true);
				}
				break;
			case 'KeyG': 		// gradient
				cycleElement( elGradient, isShiftKey );
				setCanvasMsg( 'Gradient: ' + gradients[ elGradient.value ].name );
				break;
			case 'ArrowRight': 	// next song
			case 'KeyK':
				if ( ! finishFastSearch() && ! isShiftKey ) {
					setCanvasMsg( 'Next track', 1 );
					skipTrack();
				}
				break;
			case 'KeyA': 		// cycle thru random mode options
				cycleElement( elRandomMode, isShiftKey );
				setCanvasMsg( 'Random mode: ' + getText( elRandomMode ) );
				setProperty( elRandomMode );
				break;
			case 'KeyB': 		// background or image fit (shift)
				cycleElement( isShiftKey ? elBgImageFit : elBackground );
				const bgOption = elBackground.value[0];
				setCanvasMsg( 'Background: ' + getText( elBackground ) + ( bgOption > 1 && bgOption < 7 ? ` (${getText( elBgImageFit )})` : '' ) );
				break;
			case 'KeyC': 		// radial
				elRadial.click();
				setCanvasMsg( 'Radial ' + onOff( elRadial ) );
				break;
			case 'KeyD': 		// display information
				toggleInfo();
				break;
			case 'KeyE': 		// shuffle queue
				if ( queueLength() > 0 ) {
					shufflePlayQueue();
					setCanvasMsg( 'Shuffle' );
				}
				break;
			case 'KeyF': 		// toggle fullscreen
				fullscreen();
				break;
			case 'KeyH': 		// toggle fps display
				elFPS.click();
				break;
			case 'KeyI': 		// toggle info display on track change
				elShowSong.click();
				setCanvasMsg( 'Song info display ' + onOff( elShowSong ) );
				break;
			case 'KeyL': 		// toggle LED display effect
				elLedDisplay.click();
				setCanvasMsg( 'LED effect ' + onOff( elLedDisplay ) );
				break;
			case 'KeyM': 		// visualization mode
			case 'KeyV':
				cycleElement( elMode, isShiftKey );
				setCanvasMsg( 'Mode: ' + getText( elMode ) );
				break;
			case 'KeyN': 		// increase or reduce sensitivity
				cycleElement( elSensitivity, isShiftKey );
				setCanvasMsg( getText( elSensitivity ).toUpperCase() + ' sensitivity' );
				break;
			case 'KeyO': 		// toggle resolution
				elLoRes.click();
				setCanvasMsg( ( isSwitchOn( elLoRes ) ? 'LOW' : 'HIGH' ) + ' Resolution' );
				break;
			case 'KeyP': 		// toggle peaks display
				elShowPeaks.click();
				setCanvasMsg( 'Peaks ' + onOff( elShowPeaks ) );
				break;
			case 'KeyR': 		// toggle playlist repeat
				elRepeat.click();
				setCanvasMsg( 'Queue repeat ' + onOff( elRepeat ) );
				break;
			case 'KeyS': 		// toggle X and Y axis scales
				setCanvasMsg( 'Scale: ' + ['None','Frequency (Hz)','Level (dB)','Both'][ cycleScale( isShiftKey ) ] );
				break;
			case 'KeyT': 		// toggle text shadow
				elNoShadow.click();
				setCanvasMsg( ( isSwitchOn( elNoShadow ) ? 'Flat' : 'Shadowed' ) + ' text mode' );
				break;
			case 'KeyU': 		// toggle lumi bars
				elLumiBars.click();
				setCanvasMsg( 'Luminance bars ' + onOff( elLumiBars ) );
				break;
			case 'KeyX':
				cycleElement( elReflex, isShiftKey );
				setCanvasMsg( 'Reflex: ' + getText( elReflex ) );
				break;
			default:
				// no key match - quit and keep default behavior
				return;

		} // switch
	} // else

	event.preventDefault();
}

/**
 * Load a JSON-encoded object from localStorage
 *
 * @param {string} item key
 * @returns {object} parsed object
 */
async function loadFromStorage( key ) {
	return JSON.parse( isElectron ? await electron.api( 'storage-get', key ) : localStorage.getItem( key ) );
}

/**
 * Clones the gradient of the given key into the currentGradient variable
 */
function loadGradientIntoCurrentGradient(gradientKey) {
	if (!gradients[gradientKey]) throw new Error(`gradients[${gradientKey}] is null or undefined.`);

	const src = gradients[gradientKey];
	const dest = {};

	dest.name = src.name;
	dest.bgColor = src.bgColor;
	dest.dir = src.dir
	dest.disabled = src.disabled;
	dest.key = gradientKey;
	dest.colorStops = [];
	for (const stop of src.colorStops) {
		dest.colorStops.push({...stop});
	}

	currentGradient = dest;
}

/**
 * Load a music file from the user's computer
 */
function loadLocalFile( obj ) {

	const fileBlob = obj.files[0];

	if ( fileBlob ) {
		clearAudioElement();

		const audioEl = audioElement[ currAudio ];

		audioEl.src = URL.createObjectURL( fileBlob );
		audioEl.play();
		audioEl.onload = () => URL.revokeObjectURL( audioEl.src );

		mm.parseBlob( fileBlob )
			.then( metadata => addMetadata( metadata, audioEl ) )
			.catch( e => {} );
	}
}

/**
 * Loads next song into the audio element not currently in use
 */
function loadNextSong() {
	const next    = ( playlistPos < queueLength() - 1 ) ? playlistPos + 1 : 0,
		  song    = playlist.children[ next ],
		  audioEl = audioElement[ nextAudio ];

	if ( song ) {
		audioEl.src = song.dataset.file;
		audioEl.load();
		addMetadata( song, audioEl );
	}

	skipping = false; // finished skipping track
}

/**
 * Load a playlist file into the play queue
 */
function loadPlaylist( path ) {

	path = normalizeSlashes( path );

	return new Promise( async ( resolve ) => {
		let	n = 0,
			songInfo;

		if ( ! path ) {
			resolve( -1 );
		}
		else if ( ['m3u','m3u8'].includes( parsePath( path ).extension ) ) {
			fetch( path )
				.then( response => {
					if ( response.status == 200 )
						return response.text();
					else
						consoleLog( `Fetch returned error code ${response.status} for URI ${path}`, true );
				})
				.then( content => {
					if ( ! elLoadedPlist.dataset.path )
						setLoadedPlaylist( path );
					path = parsePath( path ).path; // extracts the path (no filename); also decodes/normalize slashes

					content.split(/[\r\n]+/).forEach( line => {
						if ( line.charAt(0) != '#' && line.trim() != '' ) { // not a comment or blank line?
							line = normalizeSlashes( line );
							if ( ! songInfo ) // if no #EXTINF tag found on previous line, use the filename
								songInfo = parsePath( line ).baseName;

							// if it's not an external URL or absolute path, add the current path to it
							if ( ! isExternalURL( line ) && line[1] != ':' && line[0] != '/' )
								line = path + line;

							n += addSongToPlayQueue( queryFile( line ), parseTrackName( songInfo ) );
							songInfo = '';
						}
						else if ( line.startsWith('#EXTINF') )
							songInfo = line.slice(8); // save #EXTINF metadata for the next iteration
					});
					resolve( n );
				})
				.catch( e => {
					consoleLog( e, true );
					resolve( n );
				});
		}
		else { // try to load playlist from localStorage
			const list = await loadFromStorage( 'pl_' + path );
			if ( Array.isArray( list ) ) {
				list.forEach( item => {
					item = normalizeSlashes( item );
					n += addSongToPlayQueue( item, parseTrackName( parsePath( item ).baseName ) );
				});
			}
			else
				consoleLog( `Unrecognized playlist file: ${path}`, true );

			resolve( n );
		}
	});
}

/**
 * Load preferences from localStorage
 */
async function loadPreferences() {
	// helper function
	const parseDisabled = ( data, optionList ) => {
		if ( Array.isArray( data ) ) {
			data.forEach( option => {
				const opt = optionList.find( item => item.value == option );
				if ( opt )
					opt.disabled = true;
			});
		}
	}

	const lastConfig    = await loadFromStorage( KEY_LAST_CONFIG ),
	 	  isLastSession = lastConfig !== null;

	// Merge defaults with the last session settings (if any)
	presets['last'] = { ...presets['default'], ...lastConfig };

	// Load custom preset
	presets['custom'] = await loadFromStorage( KEY_CUSTOM_PRESET );

	// Populate presets combo box
	populatePresets( isLastSession );

	// Load disabled modes preference
	parseDisabled( await loadFromStorage( KEY_DISABLED_MODES ), modeOptions );

	// Load disabled background image fit options
	parseDisabled( await loadFromStorage( KEY_DISABLED_BGFIT ), bgFitOptions );

	// Load custom gradients
	const customGradients = await loadFromStorage( KEY_CUSTOM_GRADS );
	if ( customGradients ) {
		Object.keys( customGradients ).forEach( key => {
			gradients[ key ] = customGradients[ key ];
		});
	}

	// Load disabled gradients preference
	const disabledGradients = await loadFromStorage( KEY_DISABLED_GRADS );
	if ( Array.isArray( disabledGradients ) ) {
		disabledGradients.forEach( key => {
			gradients[ key ].disabled = true;
		});
	}

	// Load disabled random properties preference
	parseDisabled( await loadFromStorage( KEY_DISABLED_PROPS ), randomProperties );

	// Sensitivity presets
	const elMinSens = $$('.min-db');
	elMinSens.forEach( el => setRangeAtts( el, -120, -60 ) );

	const elMaxSens = $$('.max-db');
	elMaxSens.forEach( el => setRangeAtts( el, -50, 0 ) );

	const elLinearBoost = $$('.linear-boost');
	elLinearBoost.forEach( el => setRangeAtts( el, 1, 5, .2 ) );

	const sensitivityPresets = await loadFromStorage( KEY_SENSITIVITY ) || sensitivityDefaults;

	sensitivityPresets.forEach( ( preset, index ) => {
		elMinSens[ index ].value = preset.min;
		elMaxSens[ index ].value = preset.max;
		elLinearBoost[ index ].value = preset.boost || sensitivityDefaults[ index ].boost;
	});

	// On-screen display options - merge saved options (if any) with the defaults and set UI fields
	setInfoOptions( { ...infoDisplayDefaults, ...( await loadFromStorage( KEY_DISPLAY_OPTS ) || {} ) } );

	// General settings
	for ( let i = 10; i < 16; i++ )
		elFFTsize[ elFFTsize.options.length ] = new Option( 2**i );

	setRangeAtts( elSmoothing, 0, .9, .1 );

	populateSelect( elPIPRatio, pipRatioOptions );

	setRangeAtts( elFsHeight, 25, 100, 5 );

	setGeneralOptions( { ...generalOptionsDefaults, ...( await loadFromStorage( KEY_GENERAL_OPTS ) || {} ) } );

	return isLastSession;
}

/**
 * Load a configuration preset
 *
 * @param name {string} desired preset name
 * @param [alert] {boolean} true to display on-screen alert after loading
 * @param [init] {boolean} true to use default values for missing properties
 */
function loadPreset( name, alert, init ) {

	if ( ! presets[ name ] ) // check invalid preset name
		return;

	const thisPreset = presets[ name ],
		  defaults   = presets['default'];

	if ( thisPreset.stereo !== undefined ) // convert legacy 'stereo' option to 'channelLayout'
		thisPreset.channelLayout = channelLayoutOptions[ +thisPreset.stereo ][0];

	$$('[data-prop]').forEach( el => {
		const prop = el.dataset.prop,
			  val  = thisPreset[ prop ] !== undefined ? thisPreset[ prop ] : init ? defaults[ prop ] : undefined;

		if ( val !== undefined ) {
			if ( el.classList.contains('switch') )
				el.dataset.active = +val;
			else if ( el == elVolume )
				setVolume( val );
			else if ( el == elBalance )
				setBalance( val );
			else {
				el.value = val;
				if ( el.selectedIndex == -1 ) // fix invalid values in select elements
					el.selectedIndex = 0;
				updateRangeValue( el );
			}
		}
	});

	audioMotion.setOptions( {
		alphaBars      : isSwitchOn( elAlphaBars ),
		ansiBands      : isSwitchOn( elAnsiBands ),
		colorMode      : elColorMode.value,
		fftSize        : elFFTsize.value,
		frequencyScale : elFreqScale.value,
		ledBars        : isSwitchOn( elLedDisplay ),
		linearAmplitude: isSwitchOn( elLinearAmpl ),
		loRes          : isSwitchOn( elLoRes ),
		lumiBars       : isSwitchOn( elLumiBars ),
		maxFreq        : elRangeMax.value,
		minFreq        : elRangeMin.value,
		mirror         : elMirror.value,
		noteLabels     : isSwitchOn( elNoteLabels ),
		outlineBars    : isSwitchOn( elOutline ),
		radial         : isSwitchOn( elRadial ),
		roundBars      : isSwitchOn( elRoundBars ),
		showFPS        : isSwitchOn( elFPS ),
		showPeaks      : isSwitchOn( elShowPeaks ),
		showScaleX     : isSwitchOn( elScaleX ),
		showScaleY     : isSwitchOn( elScaleY ),
		smoothing      : elSmoothing.value,
		spinSpeed      : elSpin.value,
		splitGradient  : isSwitchOn( elSplitGrad ),
		weightingFilter: elWeighting.value
	} );

	// settings that affect other properties are set by the setProperty() function
	setProperty(
		[ elBackground,
		elBgImageFit,
		elBgImageDim,
		elChnLayout,
		elFsHeight,
		elLinkGrads, // needs to be set before the gradients
		elSensitivity,
		elReflex,
		elGradient,
		elGradientRight,
		elRandomMode,
		elBarSpace,
		elMode ]
	);

	if ( name == 'demo' )
		selectRandomMode( true );

	if ( alert )
		notie.alert({ text: 'Settings loaded!' });
}

/**
 * Load playlists from localStorage and legacy playlists.cfg file
 */
async function loadSavedPlaylists( keyName ) {

	// reset UI playlist selection box

	deleteChildren( elPlaylists );

	const item = new Option( 'Select a playlist', '' );
	item.disabled = true;
	item.selected = true;
	elPlaylists.options[ elPlaylists.options.length ] = item;

	// load playlists from localStorage

	const playlists = await loadFromStorage( KEY_PLAYLISTS );

	if ( playlists ) {
		Object.keys( playlists ).forEach( key => {
			const item = new Option( playlists[ key ], key );
			item.dataset.isLocal = '1';
			if ( key == keyName )
				item.selected = true;
			elPlaylists.options[ elPlaylists.options.length ] = item;
		});
	}

	// try to load legacy playlists.cfg file

	fetch( 'playlists.cfg' )
		.then( response => {
			if ( response.status == 200 ) {
				consoleLog( 'Found legacy playlists.cfg file' );
				return response.text();
			}
			else
				return false;
		})
		.then( content => {
			if ( content !== false ) {
				let n = 0;
				content.split(/[\r\n]+/).forEach( line => {
					if ( line.charAt(0) != '#' && line.trim() != '' ) { // not a comment or blank line?
						let info = line.split(/\|/);
						if ( info.length == 2 ) {
							elPlaylists.options[ elPlaylists.options.length ] = new Option( info[0].trim(), info[1].trim() );
							n++;
						}
					}
				});
				if ( n )
					consoleLog( `${n} playlists loaded from playlists.cfg` );
				else
					consoleLog( 'No playlists found in playlists.cfg', true );
			}
		})
		.catch( e => {} );
}

/**
 * Load a song into the currently active audio element
 */
function loadSong( n ) {
	const audioEl = audioElement[ currAudio ];

	if ( playlist.children[ n ] ) {
		playlistPos = n;
		const song = playlist.children[ playlistPos ];
		audioEl.src = song.dataset.file;
		addMetadata( song, audioEl );

		updatePlaylistUI();
		loadNextSong();
		return true;
	}
	else
		return false;
}

/**
 * Copy the gradient of given key into currentGradient, and render the gradient editor.
 */
function openGradientEdit(key) {
	loadGradientIntoCurrentGradient(key);
	renderGradientEditor();
	$('#btn-save-gradient').innerText = 'Save';
	$('#btn-delete-gradient').style.display = 'block';
	location.href = '/#gradient-editor';
}

/**
 * Build a new gradient, set it as the current gradient, then render the gradient editor.
 */
function openGradientEditorNew() {
	currentGradient = {
		name: 'New Gradient',
		bgColor: '#111111',
		colorStops: [
			{ pos: .1, color: '#222222' },
			{ pos: 1, color: '#eeeeee' }
		],
		disabled: false,
		key: 'custom-gradient-1'  // using this to keep track of the key of the gradient object in the gradient list
	};

	// To prevent accidental overwriting of gradients and to allow duplicate names, a unique internal key is chosen
	// instead of simply using the name the user chooses for the new gradient.

	// find unique key for new gradient
	let modifier = 2;
	while (Object.keys(gradients).some(key => key === currentGradient.key) && modifier < 10) {
		currentGradient.key = `custom-gradient-${modifier}`;
		modifier++;
	}

	renderGradientEditor();
	$('#btn-save-gradient').innerText = 'Add';
	$('#btn-delete-gradient').style.display = 'none'; // don't show delete button while editing a new gradient

	location.href = '/#gradient-editor';
}

/**
 * Play next song on queue
 */
function playNextSong( play ) {

	if ( skipping || isMicSource || playlistPos > queueLength() - 1 )
		return true;

	skipping = true;

	if ( playlistPos < queueLength() - 1 )
		playlistPos++;
	else if ( isSwitchOn( elRepeat ) )
		playlistPos = 0;
	else {
		skipping = false;
		return false;
	}

	play |= isPlaying();

	currAudio = nextAudio;
	nextAudio = ! currAudio | 0;
	setCurrentCover();

	if ( play ) {
		audioElement[ currAudio ].play()
		.then( () => {
			loadNextSong();
		})
		.catch( err => {
			if ( err.code != 20 ) {
				consoleLog( err, true );
				loadNextSong();
				playNextSong( true );
			}
		});
	}
	else
		loadNextSong();

	updatePlaylistUI();
	return true;
}

/**
 * Player play/pause control
 */
function playPause( play ) {
	if ( isMicSource )
		return;
	if ( isPlaying() && ! play ) {
		audioElement[ currAudio ].pause();
		if ( isPIP() )
			pipVideo.pause();
	}
	else
		audioElement[ currAudio ].play().catch( err => {
			// ignore AbortError - when play promise is interrupted by a new load request or call to pause()
			if ( err.code != 20 ) {
				consoleLog( err, true )
				playNextSong( true );
			}
		});
}

/**
 * Play previous song on queue
 */
function playPreviousSong() {
	let ret = true;

	if ( isPlaying() ) {
		if ( audioElement[ currAudio ].currentTime > 2 )
			audioElement[ currAudio ].currentTime = 0;
		else if ( playlistPos > 0 )
			playSong( playlistPos - 1 );
		else
			ret = false;
	}
	else
		ret = loadSong( playlistPos - 1 );

	return ret;
}

/**
 * Play a song from the play queue
 */
function playSong( n ) {
	if ( loadSong( n ) )
		playPause( true );
}

/**
 * Build checkboxes in #config that enables gradients in the combo box of the settings panel
 */
function populateEnabledGradients() {
	// Enabled gradients
	const elEnabledGradients = $('#enabled_gradients');

	// reset
	deleteChildren(elEnabledGradients);

	Object.keys( gradients ).forEach( key => {
		// only set up link for editing if this is a custom gradient
		if (key.startsWith('custom')) {
			elEnabledGradients.innerHTML +=
				`<label>
			       <input type="checkbox" class="enabledGradient" data-grad="${key}" ${gradients[ key ].disabled ? '' : 'checked'}>
                   <a href="#" data-grad="${key}" class="grad-edit-link">${gradients[ key ].name}</a>
                </label>`;
		} else {
			elEnabledGradients.innerHTML +=
				`<label>
			       <input type="checkbox" class="enabledGradient" data-grad="${key}" ${gradients[key].disabled ? '' : 'checked'}>
                   ${gradients[key].name}
                </label>`;
		}
	});

	$$('.enabledGradient').forEach( el => {
		el.addEventListener( 'click', event => {
			if ( ! el.checked ) {
				const count = Object.keys( gradients ).reduce( ( acc, val ) => acc + ! gradients[ val ].disabled, 0 );
				if ( count < 2 ) {
					notie.alert({ text: 'At least one Gradient must be enabled!' });
					event.preventDefault();
					return false;
				}
			}
			gradients[ el.dataset.grad ].disabled = ! el.checked;
			populateGradients();
			savePreferences(KEY_DISABLED_GRADS);
		});
	});

	$$('.grad-edit-link').forEach( el => {
		el.addEventListener('click', event => {
			event.preventDefault();
			const key = event.target.getAttribute("data-grad");
			openGradientEdit(key);
		})
	})
}

/**
 * Populate UI gradient selection combo box
 */
function populateGradients() {
	for ( const el of [ elGradient, elGradientRight ] ) {
		let grad = el.value;
		deleteChildren( el );

		// add the option to the html select element for the user interface
		for ( const key of Object.keys( gradients ) ) {
			if ( ! gradients[ key ].disabled )
				el.options[ el.options.length ] = new Option( gradients[ key ].name, key );
		}

		if ( grad !== '' ) {
			el.value = grad;
			setProperty( el );
		}
	}
}

/**
 * Populate presets combo box
 */
function populatePresets( isLastSession, newValue ) {
	const presetOptions = [
		[ null,      'Select preset' ],
		[ 'demo',    'Demo (random)' ],
		[ 'bands',   'Octave Bands' ],
		[ 'ledbars', 'Classic LED bars' ],
		[ 'dual',    'Dual Channel Line Graph' ],
		[ 'radial',  'Radial color by Level' ],
		[ 'round',   'Round Bars' ],
		...( presets['custom'] ? [ [ 'custom', 'Custom' ] ] : [] ),
		...( isLastSession ? [ [ 'last', 'Last session' ] ] : [] ),
		[ 'default', 'Restore defaults' ]
	];

	populateSelect( elPreset, presetOptions );
	elPreset.value = newValue || '';
}

/**
 * Populate a select element
 *
 * @param element {object}
 * @param options {array} arrays [ value, text ] or objects { value, text, disabled }
 * @param keep {boolean}  whether to keep existing content
 */
function populateSelect( element, options, keep ) {
	const oldValue = element.value,
		  isObject = ! Array.isArray( options[0] );

	if ( ! keep )
		deleteChildren( element );

	for ( const item of ( isObject ? options.filter( i => ! i.disabled ) : options ) ) {
		const option = new Option( item.text || item[1], item.value || item[0] );
		if ( item[0] === null )
			option.disabled = true;
		element[ element.options.length ] = option;
	}

	if ( oldValue !== '' ) {
		element.value = oldValue;
		if ( element.selectedIndex == -1 ) // old value disabled
			element.selectedIndex = 0;
		setProperty( element );
	}
}

/**
 * Remove a key from localStorage
 *
 * @param key {string}
 */
function removeFromStorage( key ) {
	if ( isElectron )
		electron.api( 'storage-remove', key );
	else
		localStorage.removeItem( key );
}

/**
 * Renders #grad-color-table based upon values of currentGradient.
 */
function renderGradientEditor() {
	if (currentGradient == null) throw new Error("Current gradient must be set before editing gradient")

	// empty table
	const table = $('#grad-color-table');
	deleteChildren(table);

	// set name
	$('#new-gradient-name').value = currentGradient.name;

	// set horizontal
	$('#new-gradient-horizontal').checked = currentGradient.dir === 'h';

	const tableLabels = $('#grad-row-label-template').cloneNode(true);
	tableLabels.removeAttribute("id");
	table.appendChild(tableLabels);

	// build row for each stop in the gradient
	currentGradient.colorStops.forEach((stop, i) => {
		renderColorRow(i, currentGradient.colorStops[i]);
	});

	$('#new-gradient-bkgd').value = currentGradient.bgColor;
}

/**
 * Render color stop row inside of the #grad-color-table, adding proper event listeners.
 */
function renderColorRow(index, stop) {
	const table = $('#grad-color-table');

	const template = $('#grad-row-template').cloneNode(true);
	const colorPicker = template.querySelector('.grad-color-picker');
	const colorValue = template.querySelector('.grad-color-value');
	const colorStop = template.querySelector('.grad-color-stop');
	const addColorButton = template.querySelector('.grad-add-stop');
	const removeColorButton = template.querySelector('.grad-remove-stop');

	colorPicker.value = stop.color;
	colorValue.value = stop.color;
	colorStop.value = stop.pos;

	colorPicker.addEventListener('input', (e) => {
		colorValue.value = e.target.value;
		currentGradient.colorStops[index].color = colorPicker.value;
	});

	colorValue.addEventListener('input', (e) => {
		colorPicker.value = e.target.value;
		currentGradient.colorStops[index].color = colorPicker.value;
	});

	colorStop.addEventListener('input', (e) => {
		currentGradient.colorStops[index].pos = parseFloat(e.target.value);
	});

	addColorButton.addEventListener('click', () => {
		const idealColorPos = () => {
			// if this is the last color stop, set the second to last stop's position as the midpoint between the last
			// and the second to last, then return this stop's position
			// if not, return the midpoint between this and the next stop
			if (index === currentGradient.colorStops.length - 1) {
				const lastPos = currentGradient.colorStops[currentGradient.colorStops.length - 1].pos
				currentGradient.colorStops[currentGradient.colorStops.length - 1].pos =
					(currentGradient.colorStops[currentGradient.colorStops.length - 2].pos + lastPos) / 2;
				return lastPos;
			} else {
				return (currentGradient.colorStops[index].pos + currentGradient.colorStops[index + 1].pos) / 2;
			}
		}

		currentGradient.colorStops.splice(index + 1, 0, {
			pos: idealColorPos(),
			color: '#111111',
		});
		renderGradientEditor();
	});

	// prevent from being able to delete stops if there are two stops
	if (currentGradient.colorStops.length === 2) {
		removeColorButton.setAttribute('disabled', 'true');
	} else {
		removeColorButton.addEventListener('click', () => {
			currentGradient.colorStops.splice(index, 1);
			renderGradientEditor();
		});
	}

	template.removeAttribute("id");
	table.appendChild(template);
}

/**
 * Retrieve metadata for files in the play queue
 */
function retrieveMetadata() {
	// leave when we already have enough concurrent requests pending
	if ( waitingMetadata >= MAX_METADATA_REQUESTS )
		return;

	// find the first play queue item for which we haven't retrieved the metadata yet
	const queueItem = Array.from( playlist.children ).find( el => el.dataset.retrieve );

	if ( queueItem ) {
		waitingMetadata++;
		delete queueItem.dataset.retrieve;

		const uri = queueItem.dataset.file;

		mm.fetchFromUrl( uri, { skipPostHeaders: true } )
			.then( metadata => {
				if ( metadata ) {
					addMetadata( metadata, queueItem ); // add metadata to play queue item
					syncMetadataToAudioElements( queueItem );
					if ( ! ( metadata.common.picture && metadata.common.picture.length ) ) {
						getFolderCover( uri ).then( cover => {
							queueItem.dataset.cover = cover;
							syncMetadataToAudioElements( queueItem );
						});
					}
				}
			})
			.catch( e => {} ) // fail silently
			.finally( () => {
				waitingMetadata--;
				retrieveMetadata(); // call back to continue processing the queue
			});
	}
}

/**
 * Release URL objects created for image blobs
 */
function revokeBlobURL( item ) {
	const cover = item.dataset.cover;
	if ( cover.startsWith('blob:') )
		URL.revokeObjectURL( cover );
}

/**
 * Assign the gradient in the global gradients object, register in the analyzer, populate gradients in the config,
 * then close the panel.
 */
function saveGradient() {
	if (currentGradient === null) return;

	gradients[currentGradient.key] = currentGradient;
	audioMotion.registerGradient(currentGradient.key, currentGradient);
	populateGradients();
	populateEnabledGradients();
	savePreferences(KEY_CUSTOM_GRADS);

	currentGradient = null;
	location.href = '/#config';
}

/**
 * Save/update an existing playlist
 */
function savePlaylist( index ) {

	if ( elPlaylists[ index ].value == '' )
		storePlaylist();
	else if ( ! elPlaylists[ index ].dataset.isLocal )
		notie.alert({ text: 'This is a server playlist which cannot be overwritten.<br>Click "Save as..." to create a new local playlist.', time: 5 });
	else
		notie.confirm({ text: `Overwrite "${elPlaylists[ index ].innerText}" with the current play queue?`,
			submitText: 'Overwrite',
			submitCallback: () => {
				storePlaylist( elPlaylists[ index ].value );
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled' });
			}
		});
}

/**
 * Save the playqueue to the filesystem
 * (Electron only)
 */
function savePlayqueueToServer( path, update ) {
	if ( queueLength() == 0 ) {
		notie.alert({ text: 'Queue is empty!' });
		return;
	}

	if ( ! path ) {
		notie.input({
			text: 'Playlist will be saved to the current folder.<br>Enter filename:',
			submitText: 'Save',
			submitCallback: value => {
				if ( value ) {
					const newPath = fileExplorer.makePath( value, true );
					savePlayqueueToServer( newPath );
				}
				else
					notie.alert({ text: 'Canceled' });
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled' });
			}
		});
		return;
	}

	const contents = [];

	playlist.childNodes.forEach( item => {
		const { file, artist, title, duration } = item.dataset;
		contents.push( { file: removeServerEncoding( file ), artist, title, duration } );
	});

	fetch( ROUTE_SAVE + path, {
		method: update ? 'PUT' : 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify( { contents } )
	})
	.then( response => response.status == 200 ? response.json() : { error: `Cannot save file (ERROR ${ response.status })` } )
	.then( ( { file, error } ) => {
		const text = file ? `${ update ? 'Updated' : 'Saved as' } ${ parsePath( file ).fileName }` : error;
		notie.alert({ text });
		setLoadedPlaylist( file );
		fileExplorer.refresh();
	});
}

/**
 * Save Config Panel preferences to localStorage
 *
 * @param [key] {string} preference to save; if undefined save all preferences (default)
 */
function savePreferences( key ) {
	// helper function
	const getDisabledItems = items => items.filter( item => item.disabled ).map( item => item.value );

	if ( ! key || key == KEY_DISABLED_MODES )
		saveToStorage( KEY_DISABLED_MODES, getDisabledItems( modeOptions ) );

	if ( ! key || key == KEY_DISABLED_BGFIT )
		saveToStorage( KEY_DISABLED_BGFIT, getDisabledItems( bgFitOptions ) );

	if ( ! key || key == KEY_DISABLED_GRADS )
		saveToStorage( KEY_DISABLED_GRADS, Object.keys( gradients ).filter( key => gradients[ key ].disabled ) );

	if (! key || key == KEY_CUSTOM_GRADS) {
		const customGradients = {};
		Object.keys(gradients)
			.filter(key => key.startsWith('custom'))
			.forEach(key => customGradients[key] = gradients[key]);
		saveToStorage( KEY_CUSTOM_GRADS, customGradients);
	}

	if ( ! key || key == KEY_DISABLED_PROPS )
		saveToStorage( KEY_DISABLED_PROPS, getDisabledItems( randomProperties ) );

	if ( ! key || key == KEY_SENSITIVITY ) {
		let sensitivityPresets = [];
		for ( const i of [0,1,2] ) {
			sensitivityPresets.push( {
				min: $(`.min-db[data-preset="${i}"]`).value,
				max: $(`.max-db[data-preset="${i}"]`).value,
				boost: $(`.linear-boost[data-preset="${i}"]`).value
			});
		}
		saveToStorage( KEY_SENSITIVITY, sensitivityPresets );
	}

	if ( ! key || key == KEY_DISPLAY_OPTS ) {
		const displayOptions = {
			info  : elInfoTimeout.value,
			track : elTrackTimeout.value,
			end   : elEndTimeout.value,
			covers: elShowCover.checked,
			count : elShowCount.checked
		}
		saveToStorage( KEY_DISPLAY_OPTS, displayOptions );
	}

	if ( ! key || key == KEY_GENERAL_OPTS ) {
		const generalOptions = {
			fftSize  : elFFTsize.value,
			smoothing: elSmoothing.value,
			pipRatio : elPIPRatio.value,
			fsHeight : elFsHeight.value,
			saveDir  : elSaveDir.checked
		}
		saveToStorage( KEY_GENERAL_OPTS, generalOptions );
	}
}

/**
 * Save an object to localStorage in JSON format
 *
 * @param {string} item key
 * @param {object} data object
 */
function saveToStorage( key, data ) {
	const value = JSON.stringify( data );
	if ( isElectron )
		electron.api( 'storage-set', key, value );
	else
		localStorage.setItem( key, value );
}

/**
 * Schedule start of track fast search
 *
 * @param mode {string} 'm' for mouse, 'k' for keyboard
 * @param [dir] {number} 1 for FF, -1 for REW
 */
function scheduleFastSearch( mode, dir = 1 ) {
	// set a 200ms timeout to start fast search (wait for 'click' or 'keyup' event)
	fastSearchTimeout = setTimeout( () => {
		isFastSearch = mode;
		fastSearch( dir );
	}, 200 );
}

/**
 * Choose a random visualization mode
 *
 * @param [force] {boolean} force change even when not playing
 *                (default true for microphone input, false otherwise )
 */
function selectRandomMode( force = isMicSource ) {
	if ( ! isPlaying() && ! force )
		return;

	// helper functions
	const isEnabled = prop => ! randomProperties.find( item => item.value == prop ).disabled;

	const randomizeSelect = ( el, push = true ) => {
		el.selectedIndex = randomInt( el.options.length );
		if ( push )
			props.push( el );
	}

	const randomizeSwitch = el => {
		el.dataset.active = randomInt();
		props.push( el );
	}

	let props = []; // properties that need to be updated

	elMode.selectedIndex = randomInt( elMode.options.length );

	if ( isEnabled( RND_ALPHA ) )
		randomizeSwitch( elAlphaBars );

	if ( isEnabled( RND_BACKGROUND ) )
		randomizeSelect( elBackground, false );

	if ( isEnabled( RND_BGIMAGEFIT ) )
		randomizeSelect( elBgImageFit );

	if ( isEnabled( RND_COLORMODE ) )
		randomizeSelect( elColorMode );

	if ( isEnabled( RND_PEAKS ) )
		randomizeSwitch( elShowPeaks );

	if ( isEnabled( RND_LEDS ) )
		randomizeSwitch( elLedDisplay );

	if ( isEnabled( RND_LUMI ) ) {
		// always disable lumi when leds are active and background is set to image or video
		elLumiBars.dataset.active = elBackground.value[0] > 1 && isSwitchOn( elLedDisplay ) ? 0 : randomInt();
		props.push( elLumiBars );
	}

	if ( isEnabled( RND_LINEWIDTH ) ) {
		elLineWidth.value = ( randomInt( 8 ) + 1 ) / 2; // 0.5 to 4 with .5 intervals
		updateRangeValue( elLineWidth );
	}

	if ( isEnabled( RND_FILLOPACITY ) ) {
		elFillAlpha.value = randomInt( 6 ) / 10; // 0 to 0.5
		updateRangeValue( elFillAlpha );
	}

	if ( isEnabled( RND_BARSPACING ) )
		randomizeSelect( elBarSpace, false );

	if ( isEnabled( RND_OUTLINE ) )
		randomizeSwitch( elOutline );

	if ( isEnabled( RND_REFLEX ) ) {
		// exclude 'mirrored' reflex option for octave bands modes
		const options = elReflex.options.length - ( elMode.value % 10 != 0 );
		elReflex.selectedIndex = randomInt( options );
	}

	if ( isEnabled( RND_RADIAL ) )
		randomizeSwitch( elRadial );

	if ( isEnabled( RND_SPIN ) ) {
		elSpin.value = randomInt(4);
		updateRangeValue( elSpin );
		props.push( elSpin );
	}

	if ( isEnabled( RND_SPLIT ) )
		randomizeSwitch( elSplitGrad );

	if ( isEnabled( RND_CHNLAYOUT ) )
		randomizeSelect( elChnLayout, false );

	if ( isEnabled( RND_MIRROR ) ) {
		elMirror.value = randomInt(3) - 1;
		props.push( elMirror );
	}

	if ( isEnabled( RND_GRADIENT ) ) {
		for ( const el of [ elGradient, ...( isSwitchOn( elLinkGrads ) ? [] : [ elGradientRight ] ) ] )
			randomizeSelect( el );
	}

	// add properties that depend on other settings (mode also sets barspace)
	props.push( elBackground, elReflex, elMode );

	// effectively set the affected properties
	setProperty( props );
}

/**
 * Set the background image CSS variable
 */
function setBackgroundImage( url ) {
	document.documentElement.style.setProperty( '--background-image', url ? `url( ${ url.replace( /['()]/g, '\\$&' ) } )` : 'none' );
}

/**
 * Set balance
 */
function setBalance( value ) {
	elBalance.dataset.value = value;
	if ( panNode )
		panNode.pan.value = Math.log10( 9 * Math.abs( value ) + 1 ) * Math.sign( value );
	elBalance.querySelector('.marker').style.transform = `rotate( ${ 145 * value - 90 }deg )`;
}

/**
 * Set message for on-screen display
 *
 * @param msg {number|string} number indicates information level (0=none; 1=song info; 2=full info)
 *                            string provides a custom message to be displayed at the top
 * @param [timer] {number} time in seconds to display message (1/3rd of it will be used for fade in/out)
 * @param [dir] {number} -1 for fade-in; 1 for fade-out (default)
 */
function setCanvasMsg( msg, timer = 2, dir = 1 ) {
	if ( ! msg )
		canvasMsg = { timer: 0, msgTimer: 0 }; // clear all canvas messages
	else {
		if ( typeof msg == 'number' ) {
			canvasMsg.info = msg; // set info level 1 or 2
			canvasMsg.timer = Math.round( Math.max( timer * 60, canvasMsg.timer || 0 ) ); // note: Infinity | 0 == 0
			canvasMsg.fade = Math.round( canvasMsg.timer / 3 ) * dir;
		}
		else {
			canvasMsg.msg = msg;  // set custom message
			if ( canvasMsg.info == 2 )
				canvasMsg.info = 1;
			canvasMsg.msgTimer = timer * 60 | 0;
		}
	}
}

/**
 * Set the cover image for the current audio element
 */
function setCurrentCover() {
	coverImage.src = audioElement[ currAudio ].dataset.cover;
	if ( elBackground.value == BG_COVER )
		setBackgroundImage( coverImage.src );
}

/**
 * Set general configuration options
 */
function setGeneralOptions( options ) {
	elFFTsize.value   = options.fftSize;
	elSmoothing.value = options.smoothing;
	elPIPRatio.value  = options.pipRatio;
	elFsHeight.value  = options.fsHeight;
	elSaveDir.checked = options.saveDir;
}

/**
 * Set on-screen display options UI fields
 */
function setInfoOptions( options ) {
	elInfoTimeout.value  = options.info;
	elTrackTimeout.value = options.track;
	elEndTimeout.value   = options.end;
	elShowCover.checked  = options.covers;
	elShowCount.checked  = options.count;
}

/**
 * Set / clear the currently loaded playlist (for Electron version)
 */
function setLoadedPlaylist( path = '' ) {
	if ( isElectron ) {
		path = removeServerEncoding( path );
		elLoadedPlist.dataset.path = encodeSlashes( path );
		elLoadedPlist.innerText = parsePath( path ).fileName;
		elLoadedPlist.title = decodeSlashes( path, true ); // display native OS slashes (Windows)
	}
}

/**
 * Set audioMotion properties
 *
 * @param elems {object|array} a DOM element object or array of objects
 * @param [save] {boolean} true to save current settings to last used preset
 */
function setProperty( elems, save = true ) {
	if ( ! Array.isArray( elems ) )
		elems = [ elems ];

	const toggleGradients = () => elGradientRight.style.display = ( elChnLayout.value == CHANNEL_SINGLE || isSwitchOn( elLinkGrads ) ) ? 'none' : '';

	for ( const el of elems ) {
		switch ( el ) {
			case elAlphaBars:
				audioMotion.alphaBars = isSwitchOn( elAlphaBars );
				break;

			case elAnsiBands:
				audioMotion.ansiBands = isSwitchOn( elAnsiBands );
				break;

			case elBackground:
				const bgOption  = elBackground.value[0],
					  isOverlay = bgOption != BG_DEFAULT && bgOption != BG_BLACK;

				let filename = elBackground.value.slice(1);

				audioMotion.overlay = isOverlay;
				audioMotion.showBgColor = bgOption == BG_DEFAULT;

				if ( bgOption == BG_VIDEO ) {
					setBackgroundImage(); // clear background image
					elVideo.style.display = ''; // enable display of video layer

					if ( ! filename )
						filename = bgVideos[ randomInt( bgVideos.length ) ]; // pick a new random video from the list

					if ( ! decodeURIComponent( elVideo.src ).endsWith( filename ) ) // avoid restarting the video if it's the same file already in use
						elVideo.src = BG_DIRECTORY + '/' + encodeURIComponent( filename );
				}
				else {
					elVideo.style.display = 'none'; // hide video layer
					if ( isOverlay ) {
						if ( bgOption == BG_IMAGE && ! filename )
							filename = bgImages[ randomInt( bgImages.length ) ];

						if ( filename )
							filename = BG_DIRECTORY + '/' + encodeURIComponent( filename );

						setBackgroundImage( filename || coverImage.src );
					}
					else
						setBackgroundImage();
				}
				break;

			case elBgImageFit:
				const bgFit  = elBgImageFit.value,
					  isWarp = bgFit == BGFIT_WARP || bgFit == BGFIT_WARP_ANI || bgFit == BGFIT_WARP_ROT;
				elContainer.classList.toggle( 'repeat', bgFit == BGFIT_REPEAT );
				elContainer.classList.toggle( 'cover', bgFit == BGFIT_ADJUST || isWarp );
				elContainer.style.backgroundSize = '';
				elWarp.style.display = isWarp ? '' : 'none';
				elWarp.classList.toggle( 'rotating', bgFit == BGFIT_WARP_ROT );
				elWarp.classList.toggle( 'paused', bgFit == BGFIT_WARP );
				break;

			case elBgImageDim:
				elDim.style.background = `rgba(0,0,0,${ 1 - elBgImageDim.value })`;
				break;

			case elBarSpace:
				audioMotion.barSpace = audioMotion.isLumiBars ? 1.5 : elBarSpace.value;
				break;

			case elChnLayout:
				audioMotion.channelLayout = elChnLayout.value;
				toggleGradients();
				break;

			case elColorMode:
				audioMotion.colorMode = elColorMode.value;
				break;

			case elFillAlpha:
				audioMotion.fillAlpha = ( elMode.value == MODE_AREA ) ? 1 : elFillAlpha.value;
				break;

			case elFFTsize :
				audioMotion.fftSize = elFFTsize.value;
				consoleLog( 'FFT size is ' + audioMotion.fftSize + ' samples' );
				break;

			case elFreqScale:
				audioMotion.frequencyScale = elFreqScale.value;
				break;

			case elFsHeight:
				elAnalyzer.style.height = `${elFsHeight.value}%`;
				break;

			case elRangeMin:
			case elRangeMax:
				while ( +elRangeMax.value <= +elRangeMin.value )
					elRangeMax.selectedIndex++;
				audioMotion.setFreqRange( elRangeMin.value, elRangeMax.value );
				break;

			case elGradient:
			case elGradientRight:
				if ( el.value === '' ) // handle invalid setting
					el.selectedIndex = 0;
				if ( isSwitchOn( elLinkGrads ) )
					audioMotion.gradient = elGradient.value = elGradientRight.value = el.value;
				else
					audioMotion[ el == elGradient ? 'gradientLeft' : 'gradientRight' ] = el.value;
				break;

			case elLedDisplay:
				audioMotion.ledBars = isSwitchOn( elLedDisplay );
				break;

			case elLinearAmpl:
				audioMotion.linearAmplitude = isSwitchOn( elLinearAmpl );
				break;

			case elLineWidth:
				audioMotion.lineWidth = ( elMode.value == MODE_AREA ) ? 0 : elLineWidth.value;
				break;

			case elLinkGrads:
				toggleGradients();
				break;

			case elLoRes:
				audioMotion.loRes = isSwitchOn( elLoRes );
				break;

			case elLumiBars:
				audioMotion.lumiBars = isSwitchOn( elLumiBars );
				setProperty( elBarSpace, false );
				break;

			case elMode:
				const mode = elMode.value;
				if ( ! [ MODE_AREA, MODE_LINE ].includes( mode ) )
					audioMotion.mode = mode;
				else
					audioMotion.mode = 10; // graph mode - for both "Area" and "Line"

				if ( mode == MODE_AREA ) {
					audioMotion.lineWidth = 0;
					audioMotion.fillAlpha = 1;
				}
				else {
					audioMotion.lineWidth = elLineWidth.value;
					audioMotion.fillAlpha = elFillAlpha.value;
				}

				setProperty( elBarSpace, false );
				break;

			case elMirror:
				audioMotion.mirror = elMirror.value;
				break;

			case elNoteLabels:
				audioMotion.noteLabels = isSwitchOn( elNoteLabels );
				break;

			case elOutline:
				audioMotion.outlineBars = isSwitchOn( elOutline );
				break;

			case elPIPRatio:
				if ( isPIP() )
					audioMotion.width = audioMotion.height * elPIPRatio.value;
				break;

			case elRadial:
				audioMotion.radial = isSwitchOn( elRadial );
				setProperty( elBarSpace, false );
				break;

			case elRandomMode:
				const option = elRandomMode.value;

				if ( randomModeTimer )
					randomModeTimer = clearInterval( randomModeTimer );

				if ( option > 1 )
					randomModeTimer = setInterval( selectRandomMode, 2500 * option );

				break;

			case elReflex:
				switch ( elReflex.value ) {
					case '1':
						audioMotion.reflexRatio = .4;
						audioMotion.reflexAlpha = .2;
						break;

					case '2':
						audioMotion.reflexRatio = .5;
						audioMotion.reflexAlpha = 1;
						break;

					default:
						audioMotion.reflexRatio = 0;
				}
				break;

			case elRoundBars:
				audioMotion.roundBars = isSwitchOn( elRoundBars );
				break;

			case elSaveDir :
				if ( elSaveDir.checked )
					saveToStorage( KEY_LAST_DIR, fileExplorer.getPath() );
				else
					removeFromStorage( KEY_LAST_DIR );

			case elScaleX:
				audioMotion.showScaleX = isSwitchOn( elScaleX );
				break;

			case elScaleY:
				audioMotion.showScaleY = isSwitchOn( elScaleY );
				break;

			case elSensitivity:
				const sensitivity = elSensitivity.value;
				audioMotion.setSensitivity(
					$(`.min-db[data-preset="${sensitivity}"]`).value,
					$(`.max-db[data-preset="${sensitivity}"]`).value
				);
				audioMotion.linearBoost = $(`.linear-boost[data-preset="${sensitivity}"]`).value;
				break;

			case elFPS:
				audioMotion.showFPS = isSwitchOn( elFPS );
				break;

			case elShowPeaks:
				audioMotion.showPeaks = isSwitchOn( elShowPeaks );
				break;

			case elSmoothing:
				audioMotion.smoothing = elSmoothing.value;
				consoleLog( 'smoothingTimeConstant is ' + audioMotion.smoothing );
				break;

			case elSpin:
				audioMotion.spinSpeed = elSpin.value;
				break;

			case elSplitGrad:
				audioMotion.splitGradient = isSwitchOn( elSplitGrad );
				break;

			case elWeighting:
				audioMotion.weightingFilter = elWeighting.value;
				break;

		} // switch

		if ( save ) {
			if ( generalOptionsElements.includes( el ) )
				savePreferences( KEY_GENERAL_OPTS );
			else
				updateLastConfig();
		}

	} // for

}

/**
 * Change audio input source
 */
async function setSource() {
	// set global variable
	isMicSource = elSource.checked;

	if ( isMicSource ) {
		// try to get access to user's microphone
		const hasPermission = isElectron ? await electron.api('ask-for-media-access') : true;

		if ( hasPermission && navigator.mediaDevices ) {
			navigator.mediaDevices.getUserMedia( { audio: true } )
			.then( stream => {
				micStream = audioMotion.audioCtx.createMediaStreamSource( stream );
				if ( isPlaying() )
					audioElement[ currAudio ].pause();
				// mute the output to avoid feedback loop from the microphone
				wasMuted = elMute.checked;
				toggleMute( true );
				audioMotion.connectInput( micStream );
				consoleLog( 'Audio source set to microphone' );
			})
			.catch( err => {
				consoleLog( `Could not change audio source - ${err}`, true );
				elSource.checked = isMicSource = false;
			});
		}
		else {
			consoleLog( 'Cannot access user microphone', true );
			elSource.checked = isMicSource = false;
		}
	}
	else {
		if ( micStream ) {
			audioMotion.disconnectInput( micStream );
			micStream.mediaStream.getTracks()[0].stop(); // stop (release) stream
			micStream = null;
			toggleMute( wasMuted );
		}
		consoleLog( 'Audio source set to built-in player' );
	}

}

/**
 * Set volume
 */
function setVolume( value ) {
	elVolume.dataset.value = value;
	audioMotion.volume = value ** 2.5; // creates a more natural volume curve
	elVolume.querySelector('.marker').style.transform = `rotate( ${ 125 + 290 * value }deg )`;
}

/**
 * Set event listeners for UI elements
 * NOTE: this is called only once during initialization
 */
function setUIEventListeners() {

	// open/close settings panel
	const elToggleSettings = $('#toggle_settings');
	elToggleSettings.addEventListener( 'click', () => {
		$('#settings').classList.toggle('active', elToggleSettings.classList.toggle('active') );
	});
	$('.settings-close').addEventListener( 'click', () => elToggleSettings.click() );

	// open/close console
	const elToggleConsole = $('#toggle_console');
	elToggleConsole.addEventListener( 'click', () => {
		$('#console').classList.toggle( 'active', elToggleConsole.classList.toggle('active') );
		elToggleConsole.classList.remove('warning');
		consoleLog(); // update scroll only
	});
	$('#console-close').addEventListener( 'click', () => elToggleConsole.click() );
	$('#console-clear').addEventListener( 'click', () => consoleLog( 'Console cleared.', false, true ) );

	// settings switches
	$$('.switch').forEach( el => {
		el.addEventListener( 'click', () => {
			el.dataset.active = +!+el.dataset.active;
			setProperty( el );
		});
	});

	// settings combo boxes and sliders ('change' event is only triggered for select and input elements)
	$$('[data-prop]').forEach( el => {
		el.addEventListener( 'change', () => {
			setProperty( el );
			updateRangeValue( el );
		});
	});

	// audio source selection and speakers mute
	elSource.addEventListener( 'change', setSource );
	elMute.addEventListener( 'change', () => toggleMute() );

	// helper debounce function - thanks https://www.freecodecamp.org/news/javascript-debounce-example/
	const debounce = ( func, timeout = 300 ) => {
		let timer;
		return ( ...args ) => {
			clearTimeout( timer );
			timer = setTimeout( () => func.apply( this, args ), timeout );
		}
	}

	// volume and balance knobs
	let wheelTimer;
	[ elVolume,
	  elBalance ].forEach( el => {
	  	el.addEventListener( 'wheel', e => {
			e.preventDefault(); // prevent scrolling the window
			if ( wheelTimer )
				return;
			wheelTimer = setTimeout( () => wheelTimer = false, 50 ); // 50ms delay for reduced mouse/touchpad sensitivity on Mac
			const incr = Math.sign( e.deltaY || 0 );
			if ( el == elVolume )
				changeVolume( incr );
			else
				changeBalance( incr );
		});
	});

	elBalance.addEventListener( 'dblclick', () => {
		changeBalance(0);
	});

	// player controls
	$('#btn_play').addEventListener( 'click', () => playPause() );
	$('#btn_stop').addEventListener( 'click', stop );
	$('#btn_shuf').addEventListener( 'click', shufflePlayQueue );

	$('#btn_prev').addEventListener( 'mousedown', () =>	scheduleFastSearch('m', -1) );
	$('#btn_prev').addEventListener( 'click', e => {
		if ( ! finishFastSearch() )
			skipTrack(true);
	});

	$('#btn_next').addEventListener( 'mousedown', () => scheduleFastSearch('m') );
	$('#btn_next').addEventListener( 'click', () => {
		if ( ! finishFastSearch() )
			skipTrack();
	});

	// action buttons
	$('#load_preset').addEventListener( 'click', () => {
		if ( elPreset.value ) {
			consoleLog( `Loading preset '${ getText( elPreset ) }'` );
			loadPreset( elPreset.value, true );
		}
	});
	$('#btn_save').addEventListener( 'click', updateCustomPreset );

	$('#btn_fullscreen').addEventListener( 'click', fullscreen );

	// playlist controls

	$('#save_playlist').addEventListener( 'click', () => {
		if ( isElectron ) {
			const path = elLoadedPlist.dataset.path;
			if ( path ) {
				notie.confirm({
					text: `<strong>${ elLoadedPlist.innerText }</strong><br>will be overwritten with the current play queue<br>ARE YOU SURE?`,
					submitText: 'Overwrite',
					submitCallback: () => savePlayqueueToServer( path, true ),
					cancelCallback: () => notie.alert({ text: 'Canceled' }),
				});
			}
			else
				savePlayqueueToServer();
		}
		else
			savePlaylist( elPlaylists.selectedIndex );
	});
	$('#create_playlist').addEventListener( 'click', () => isElectron ? savePlayqueueToServer() : storePlaylist() );
	$('#btn_clear').addEventListener( 'click', () => {
		clearPlayQueue();
		setLoadedPlaylist();
	});

	// hide unused playlist components depending on which server we're running
	( isElectron ? $('.playlist-bar') : elLoadedPlist ).style.display = 'none';

	if ( ! isElectron ) {
		$('#load_playlist').addEventListener( 'click', () => {
			loadPlaylist( elPlaylists.value ).then( n => {
				const text = ( n == -1 ) ? 'No playlist selected' : `${n} song${ n > 1 ? 's' : '' } added to the queue`;
				notie.alert({ text, time: 5 });
			});
		});
		$('#delete_playlist').addEventListener( 'click', () => deletePlaylist( elPlaylists.selectedIndex ) );
	}

	// clicks on canvas toggle info display on/off
	elOSD.addEventListener( 'click', () => toggleInfo() );

	// local file upload
	const uploadBtn = $('#local_file');
	if ( isElectron )
		uploadBtn.parentElement.style.display = 'none';
	else
		uploadBtn.addEventListener( 'change', e => loadLocalFile( e.target ) );

	// load remote files from URL
	$('#btn_load_url').addEventListener( 'click', () => {
		notie.input({
			text: 'Load audio file or stream from URL',
			submitText: 'Load',
			submitCallback: url => { if ( url.trim() ) addToPlayQueue( url, true ) }
		});
	});

	// Picture-In-Picture functionality
	let canvasTrack, pipWindow;

	const pipButton = $('#btn_pip');
	if ( document.pictureInPictureEnabled ) {
		pipButton.addEventListener( 'click', async () => {
			if ( pipVideo !== document.pictureInPictureElement ) {
				const canvasStream = audioMotion.canvas.captureStream();
				canvasTrack = canvasStream.getTracks()[0];
				pipVideo.muted = true;
				pipVideo.srcObject = canvasStream;
				await pipVideo.play();
				pipVideo.requestPictureInPicture();
			}
			else
				document.exitPictureInPicture();
		});
	}
	else
		pipButton.classList.add('disabled');

	const onPipWindowResize = debounce( () => audioMotion.setCanvasSize( pipWindow.width, pipWindow.height ) );

	pipVideo.addEventListener( 'enterpictureinpicture', event => {
		pipWindow = event.pictureInPictureWindow;
		elContainer.classList.add('pip');
		pipButton.classList.add('active');
		// resize analyzer canvas for best quality
		audioMotion.setCanvasSize( pipWindow.height * elPIPRatio.value, pipWindow.height );
		pipWindow.addEventListener( 'resize', onPipWindowResize );
	});

	pipVideo.addEventListener( 'leavepictureinpicture', () => {
		pipWindow.removeEventListener( 'resize', onPipWindowResize );
		pipVideo.pause();
		canvasTrack.stop();
		pipVideo.srcObject = canvasTrack = null;
		pipButton.classList.remove('active');
		elContainer.classList.remove('pip');
		audioMotion.setCanvasSize(); // restore fluid canvas
	});

	// Show player controls in the PIP window
	const mediaSession  = navigator.mediaSession;
	if ( mediaSession ) {
		mediaSession.setActionHandler( 'play', () => playPause() );
		mediaSession.setActionHandler( 'pause', () => playPause() );
		mediaSession.setActionHandler( 'previoustrack', () => playPreviousSong() );
		mediaSession.setActionHandler( 'nexttrack', () => playNextSong() );
	}

	// setup gradient editor controls
	$('#add-gradient').addEventListener('click', openGradientEditorNew);
	$('#btn-save-gradient').addEventListener( 'click', saveGradient );
	$('#btn-delete-gradient').addEventListener('click', deleteGradient );


	$('#new-gradient-bkgd').addEventListener('input', (e) => {
		currentGradient.bgColor = e.target.value;
	});

	$('#new-gradient-name').addEventListener('input', (e) => {
		currentGradient.name = e.target.value;
	});

	$('#new-gradient-horizontal').addEventListener('input', (e) => {
		currentGradient.dir = e.target.checked ? 'h' : undefined;
	})
}

/**
 * Shuffle the playlist
 */
function shufflePlayQueue() {

	for ( let i = queueLength() - 1; i > 0; i-- ) {
		const randIndex = Math.random() * ( i + 1 ) | 0,
			  oldChild  = playlist.replaceChild( playlist.children[ randIndex ], playlist.children[ i ] );
		playlist.insertBefore( oldChild, playlist.children[ randIndex ] );
	}

	playSong(0);
}

/**
 * Player previous/next buttons
 */
function skipTrack( back = false ) {
	const status = back ? playPreviousSong() : playNextSong();
	if ( ! status )
		setCanvasMsg( `Already at ${ back ? 'first' : 'last' } track` );
}

/**
 * Player stop button
 */
function stop() {
	audioElement[ currAudio ].pause();
	setCanvasMsg();
	loadSong( 0 );
}

/**
 * Store a playlist in localStorage
 */
async function storePlaylist( name, update = true ) {

	if ( queueLength() == 0 ) {
		notie.alert({ text: 'Queue is empty!' });
		return;
	}

	if ( ! name ) {
		notie.input({
			text: 'Give this playlist a name:',
			submitText: 'Save',
			submitCallback: value => {
				if ( value )
					storePlaylist( value, false );
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled' });
			}
		});
		return;
	}

	if ( name ) {
		let safename = name;

		if ( ! update ) {
			safename = safename.normalize('NFD').replace( /[\u0300-\u036f]/g, '' ); // remove accents
			safename = safename.toLowerCase().replace( /[^a-z0-9]/g, '_' );

			const playlists = await loadFromStorage( KEY_PLAYLISTS ) || {};

			while ( playlists.hasOwnProperty( safename ) )
				safename += '_1';

			playlists[ safename ] = name;

			saveToStorage( KEY_PLAYLISTS, playlists );
			loadSavedPlaylists( safename );
		}

		let songs = [];
		playlist.childNodes.forEach( item => songs.push( item.dataset.file ) );

		saveToStorage( 'pl_' + safename, songs );
		notie.alert({ text: `Playlist saved!` });
	}
}

/**
 * Sync a queue item metadata with any audio elements loaded with the same file
 */
function syncMetadataToAudioElements( source ) {
	for ( const el of audioElement ) {
		if ( el.dataset.file == source.dataset.file )
			addMetadata( source, el ); // transfer metadata to audio element
	}
}

/**
 * Toggle display of song and settings information on canvas
 */
function toggleInfo() {
	if ( canvasMsg.info == 2 ) // if already showing all info, turn it off
		setCanvasMsg();
	else // increase the information level (0 -> 1 -> 2) and reset the display timeout
		setCanvasMsg( ( canvasMsg.info | 0 ) + 1, +elInfoTimeout.value || Infinity ); // NOTE: canvasMsg.info may be undefined
}

/**
 * Update the playlist shown to the user
 */
function updatePlaylistUI() {

	const current = playlist.querySelector('.current'),
		  newCurr = playlist.children[ playlistPos ];

	if ( current )
		current.classList.remove('current');

	if ( newCurr ) {
		newCurr.classList.add('current');
		newCurr.scrollIntoViewIfNeeded();
	}
}

/**
 * Connect or disconnect audio output to the speakers
 */
function toggleMute( mute ) {
	if ( mute !== undefined )
		elMute.checked = mute;
	else
		mute = elMute.checked;

	if ( mute )
		audioMotion.disconnectOutput();
	else
		audioMotion.connectOutput();
}

/**
 * Update custom preset
 */
function updateCustomPreset() {
	const settings = getCurrentSettings();
	presets['custom'] = settings;
	saveToStorage( KEY_CUSTOM_PRESET, settings );
	notie.alert({ text: 'Custom preset saved!' });
	populatePresets( Array.from( elPreset.options, item => item.value ).includes('last'), 'custom' );
}

/**
 * Update last used configuration
 */
function updateLastConfig() {
	saveToStorage( KEY_LAST_CONFIG, { ...getCurrentSettings(), volume: elVolume.dataset.value, balance: elBalance.dataset.value } );
}

/**
 * Update range elements value div
 */
function updateRangeValue( el ) {
	const elVal = el.previousElementSibling;
	if ( elVal && elVal.className == 'value' )
		elVal.innerText = el.value;
}


/**
 *  MAIN FUNCTION
 * ------------------------------------------------------------------------------------------------
 */
( async function() {
	// variables for on-screen info display
	let baseSize, coverSize, centerPos, rightPos, topLine1, topLine2, bottomLine1, bottomLine2, bottomLine3, maxWidthTop, maxWidthBot, normalFont, largeFont;

	// Callback function to handle canvas size changes (onCanvasResize)
	const showCanvasInfo = ( reason, instance ) => {
		let msg;

		// resize OSD canvas
		const dPR    = instance.pixelRatio,
			  width  = elOSD.width  = elContainer.clientWidth * dPR,
			  height = elOSD.height = elContainer.clientHeight * dPR;

		switch ( reason ) {
			case 'create':
				consoleLog( `Display resolution: ${instance.fsWidth} x ${instance.fsHeight} px (pixelRatio: ${window.devicePixelRatio})` );
				msg = 'Canvas created';
				break;
			case 'lores':
				msg = `Lo-res ${ instance.loRes ? 'ON' : 'OFF' } (pixelRatio = ${dPR})`;
				break;
			case 'fschange':
				msg = `${ instance.isFullscreen ? 'Enter' : 'Exit' }ed fullscreen`;
				break;
			case 'resize':
				msg = 'Window resized';
				break;
			case 'user' :
				msg = `${ isPIP() ? 'Resized for' : 'Closed' } PIP`;
		}

		consoleLog( `${ msg || reason }. Canvas size is ${ instance.canvas.width } x ${ instance.canvas.height } px` );

		// recalculate variables used for info display
		baseSize    = Math.min( width, height ) / 17; // ~64px for 1080px canvas
		coverSize   = baseSize * 3;				// cover image size
		centerPos   = width / 2;
		rightPos    = width - baseSize;
		topLine1    = baseSize * 1.4;			// gradient, mode & sensitivity status + informative messages
		topLine2    = topLine1 * 1.8;			// auto gradient, random mode & repeat status
		maxWidthTop = width / 3 - baseSize;		// maximum width for messages shown at the top
		bottomLine1 = height - baseSize * 4;	// artist name, codec/quality
		bottomLine2 = height - baseSize * 2.8;	// song title
		bottomLine3 = height - baseSize * 1.6;	// album title, time
		maxWidthBot = width - baseSize * 7;		// maximum width for artist and song name

		normalFont  = `bold ${ baseSize * .7 }px sans-serif`;
		largeFont   = `bold ${baseSize}px sans-serif`;
	}

	/**
	 * Callback function to display on-screen messages (onCanvasDraw)
	 *
	 * Uses global object canvasMsg
	 * canvasMsg = {
	 * 		info    : <number>, // 1 = song info; 2 = song & settings info
	 * 		timer   : <number>, // countdown timer (in frames) to display info
	 * 		fade    : <number>, // fade in/out time (in frames, negative number for fade-in)
	 *		msg     : <string>, // custom message to be displayed at the top
	 * 		msgTimer: <number>  // countdown timer (in frames) to display custom message
	 * }	                    // (fade for custom message is always 60 frames)
	 */
	const displayCanvasMsg = _ => {

		const audioEl    = audioElement[ currAudio ],
			  trackData  = audioEl.dataset,
			  remaining  = audioEl.duration - audioEl.currentTime,
			  endTimeout = +elEndTimeout.value,
			  bgOption   = elBackground.value[0],
			  bgImageFit = elBgImageFit.value,
			  noShadow   = isSwitchOn( elNoShadow ),
			  pixelRatio = audioMotion.pixelRatio;

		// if song is less than 100ms from the end, skip to the next track for improved gapless playback
		if ( remaining < .1 )
			playNextSong( true );

		// set song info display at the end of the song
		if ( endTimeout > 0 && remaining <= endTimeout && isSwitchOn( elShowSong ) && ! canvasMsg.info && isPlaying() )
			setCanvasMsg( 1, remaining, -1 );

		// compute background image size for pulse and zoom in/out effects
		if (
			( bgImageFit == BGFIT_PULSE || bgImageFit == BGFIT_ZOOM_IN || bgImageFit == BGFIT_ZOOM_OUT ) &&
			( bgOption == BG_COVER || bgOption == BG_IMAGE )
		) {
			let size;

			if ( bgImageFit == BGFIT_PULSE )
				size = ( audioMotion.getEnergy() * 70 | 0 ) - 25;
			else {
				const songProgress = audioEl.currentTime / audioEl.duration;
				size = ( bgImageFit == BGFIT_ZOOM_IN ? songProgress : 1 - songProgress ) * 100;
			}

			elContainer.style.backgroundSize = `auto ${ 100 + size }%`;
		}

		elOSD.width |= 0; // clear OSD canvas

		if ( ( canvasMsg.timer || canvasMsg.msgTimer ) < 1 )
			return;

		// helper function
		const drawText = ( text, x, y, maxWidth ) => {
			if ( noShadow ) {
				canvasCtx.strokeText( text, x, y, maxWidth );
				canvasCtx.fillText( text, x, y, maxWidth );
			}
			else {
				canvasCtx.shadowOffsetX = canvasCtx.shadowOffsetY = 3 * pixelRatio;
				canvasCtx.fillText( text, x, y, maxWidth );
				canvasCtx.shadowOffsetX = canvasCtx.shadowOffsetY = 0;
			}
		}

		canvasCtx.lineWidth = 4 * pixelRatio;
		canvasCtx.lineJoin = 'round';
		canvasCtx.font = normalFont;
		canvasCtx.textAlign = 'center';

		canvasCtx.fillStyle = '#fff';
		canvasCtx.strokeStyle = canvasCtx.shadowColor = '#000';

		// Display custom message if any and info level 2 is not set
		if ( canvasMsg.msgTimer > 0 && canvasMsg.info != 2 ) {
			canvasCtx.globalAlpha = canvasMsg.msgTimer < 60 ? canvasMsg.msgTimer / 60 : 1;
			drawText( canvasMsg.msg, centerPos, topLine1 );
			canvasMsg.msgTimer--;
		}

		// Display song and config info
		if ( canvasMsg.timer > 0 ) {
			if ( canvasMsg.fade < 0 ) {
				// fade-in
				const fade     = Math.abs( canvasMsg.fade ),
					  framesIn = fade * 3 - canvasMsg.timer;
				canvasCtx.globalAlpha = framesIn < fade ? framesIn / fade : 1;
			}
			else // fade-out
				canvasCtx.globalAlpha = canvasMsg.timer < canvasMsg.fade ? canvasMsg.timer / canvasMsg.fade : 1;

			// display additional information (level 2) at the top
			if ( canvasMsg.info == 2 ) {
				drawText( 'Gradient: ' + gradients[ elGradient.value ].name, centerPos, topLine1, maxWidthTop );

				canvasCtx.textAlign = 'left';
				drawText( getText( elMode ), baseSize, topLine1, maxWidthTop );
				drawText( `Random mode: ${ getText( elRandomMode ) }`, baseSize, topLine2, maxWidthTop );

				canvasCtx.textAlign = 'right';
				drawText( getText( elSensitivity ).toUpperCase() + ' sensitivity', rightPos, topLine1, maxWidthTop );
				drawText( `Repeat is ${ onOff( elRepeat ) }`, rightPos, topLine2, maxWidthTop );
			}

			if ( isMicSource ) {
				canvasCtx.textAlign = 'left';
				canvasCtx.font = largeFont;
				drawText( 'MIC source', baseSize, bottomLine2, maxWidthBot );
			}
			else {
				// codec and quality
				canvasCtx.textAlign = 'right';
				drawText( trackData.codec, rightPos, bottomLine1 );
				drawText( trackData.quality, rightPos, bottomLine1 + baseSize );

				// song/queue count
				const totalSongs = queueLength();
				if ( totalSongs && elShowCount.checked ) {
					const padDigits = ( '' + totalSongs ).length,
						  counter   = `Track ${ ( '' + ( playlistPos + 1 ) ).padStart( padDigits, '0' ) } of ${ totalSongs }`;
					drawText( counter, rightPos, bottomLine1 - baseSize );
				}

				// artist name
				canvasCtx.textAlign = 'left';
				drawText( trackData.artist.toUpperCase(), baseSize, bottomLine1, maxWidthBot );

				// album title
				canvasCtx.font = `italic ${normalFont}`;
				drawText( trackData.album, baseSize, bottomLine3, maxWidthBot );

				// song title
				canvasCtx.font = largeFont;
				drawText( audioEl.src ? trackData.title : 'No song loaded', baseSize, bottomLine2, maxWidthBot );

				// time
				if ( audioEl.duration || trackData.duration ) {
					if ( ! trackData.duration ) {
						trackData.duration = secondsToTime( audioEl.duration );

						if ( playlist.children[ playlistPos ] )
							playlist.children[ playlistPos ].dataset.duration = trackData.duration;
					}
					canvasCtx.textAlign = 'right';

					drawText( secondsToTime( audioEl.currentTime ) + ' / ' + trackData.duration, rightPos, bottomLine3 );
				}

				// cover image
				if ( coverImage.width && elShowCover.checked )
					canvasCtx.drawImage( coverImage, baseSize, bottomLine1 - coverSize * 1.3, coverSize, coverSize );
			}

			if ( --canvasMsg.timer < 1 )
				canvasMsg.info = canvasMsg.fade = 0;
		}
	}

	// event handlers for audio elements

	const audioOnEnded = _ => {
		if ( ! playNextSong( true ) ) {
			loadSong( 0 );
			setCanvasMsg( 'Queue ended', 10 );
			if ( isPIP() )
				pipVideo.pause();
		}
	}

	const audioOnError = e => {
		if ( e.target.attributes.src )
			consoleLog( 'Error loading ' + e.target.src, true );
	}

	const audioOnPlay = _ => {
		if ( ! audioElement[ currAudio ].attributes.src ) {
			playSong( playlistPos );
			return;
		}

		if ( isPIP() )
			pipVideo.play();

		if ( audioElement[ currAudio ].currentTime < .1 && elRandomMode.value == '1' )
			selectRandomMode( true );

		if ( isSwitchOn( elShowSong ) ) {
			const timeout = +elTrackTimeout.value || Infinity;
			setCanvasMsg( 1, timeout );
		}
	}

	// BEGIN INITIALIZATION -----------------------------------------------------------------------

	// Log all JS errors to our UI console
	window.addEventListener( 'error', event => consoleLog( `Unexpected ${event.error}`, true ) );

	let initDone = false;

	consoleLog( `audioMotion v${VERSION} initializing...` );
	consoleLog( `User agent: ${navigator.userAgent}` );

	$('#version').innerText = VERSION;

	// Load preferences from localStorage
	if ( isElectron )
		consoleLog( `Reading user preferences from ${ await electron.api('storage-info') }` );
	const isLastSession = await loadPreferences();

	// Initialize play queue and set event listeners
	playlist = $('#playlist');
	playlist.addEventListener( 'dblclick', e => {
		if ( e.target && e.target.dataset.file ) {
			playSong( getIndex( e.target ) );
			e.target.classList.remove( 'selected', 'sortable-chosen' );
		}
	});
	playlistPos = 0;

	// Add drag-n-drop functionality to the play queue
	Sortable.create( playlist, {
		animation: 150,
		group: {
			name: 'filelist',
			pull: false,
			put: true
		},
		multiDrag: true,
		multiDragKey: 'ctrl',
		selectedClass: 'selected',
		onEnd: evt => {
			playlistPos = getIndex( playlist.querySelector('.current') );
			if ( evt.newIndex == 0 && ! isPlaying() )
				loadSong(0);
			loadNextSong();
		}
	});

	// Create audioMotion analyzer

	consoleLog( `Instantiating audioMotion-analyzer v${ AudioMotionAnalyzer.version }` );

	audioMotion = new AudioMotionAnalyzer( elAnalyzer, {
		fsElement: elContainer,
		onCanvasDraw: displayCanvasMsg,
		onCanvasResize: showCanvasInfo
	});

	const audioCtx = audioMotion.audioCtx;

	// create panNode for balance control - NOTE: no support on Safari < 14.1
	if ( audioCtx.createStereoPanner ) {
		panNode = audioCtx.createStereoPanner();
		audioMotion.connectInput( panNode );
	}

	// Initialize and connect audio elements

	currAudio = 0;
	nextAudio = 1;

	for ( const i of [0,1] ) {
		audioElement[ i ] = $( `#player${i}` );
		clearAudioElement( i );
		audioElement[ i ].addEventListener( 'play', audioOnPlay );
		audioElement[ i ].addEventListener( 'ended', audioOnEnded );
		audioElement[ i ].addEventListener( 'error', audioOnError );

		if ( panNode )
			audioCtx.createMediaElementSource( audioElement[ i ] ).connect( panNode );
		else
			audioMotion.connectInput( audioElement[ i ] );
	}

	// Setup configuration panel
	doConfigPanel();

	// Populate combo boxes

	populateSelect( elMode, modeOptions );

	for ( const i of [16,20,30,40,50,60,100,250,500,1000,2000] )
		elRangeMin[ elRangeMin.options.length ] = new Option( ( i >= 1000 ? ( i / 1000 ) + 'k' : i ) + 'Hz', i );

	for ( const i of [1000,2000,4000,8000,12000,16000,20000,22000] )
		elRangeMax[ elRangeMax.options.length ] = new Option( ( i / 1000 ) + 'kHz', i );

	populateSelect( elChnLayout, channelLayoutOptions );

	populateSelect(	elSensitivity, [
		[ '0', 'Low'    ],
		[ '1', 'Normal' ],
		[ '2', 'High'   ]
	]);

	populateSelect(	elBarSpace, [
		[ '1.5',  'Legacy'     ],
		[ '0.1',  'Narrow'     ],
		[ '0.25', 'Regular'    ],
		[ '0.5',  'Wide'       ],
		[ '0.75', 'Extra wide' ]
	]);

	populateSelect( elRandomMode, [
		[ '0',   'Off'             ],
		[ '1',   'On track change' ],
		[ '2',   '5 seconds'       ],
		[ '6',   '15 seconds'      ],
		[ '12',  '30 seconds'      ],
		[ '24',  '1 minute'        ],
		[ '48',  '2 minutes'       ],
		[ '120', '5 minutes'       ]
	]);

	populateSelect(	elReflex, [
		[ '0', 'Off'      ],
		[ '1', 'On'       ],
		[ '2', 'Mirrored' ]
	]);

	populateSelect(	elBackground, [
		[ BG_COVER,   'Album cover'      ],
		[ BG_BLACK,   'Black'            ],
		[ BG_DEFAULT, 'Gradient default' ]
	]);

	populateSelect( elBgImageFit, bgFitOptions );

	populateSelect( elMirror, [
		[ '0',  'Off' ],
		[ '-1', 'Left'    ],
		[ '1',  'Right'   ]
	]);

	populateSelect( elFreqScale, [
		[ SCALE_BARK,   'Bark' ],
		[ SCALE_LINEAR, 'Linear' ],
		[ SCALE_LOG,    'Logarithmic' ],
		[ SCALE_MEL,    'Mel']
	]);

	populateSelect( elWeighting, [
		[ WEIGHT_NONE, 'None' ],
		[ WEIGHT_A,    'A-weighting' ],
		[ WEIGHT_B,    'B-weighting' ],
		[ WEIGHT_C,    'C-weighting' ],
		[ WEIGHT_D,    'D-weighting' ],
		[ WEIGHT_468,  'ITU-R 468' ],
	]);

	populateSelect( elColorMode, [
		[ COLOR_GRADIENT, 'Gradient'  ],
		[ COLOR_INDEX,    'Bar Index' ],
		[ COLOR_LEVEL,    'Bar Level' ]
	]);

	// Check the backgrounds directory for additional background options (images and videos)
	const bgDirPromise = fetch( BG_DIRECTORY )
		.then( response => response.text() )
		.then( content => {
			const imageExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i,
				  videoExtensions = /\.(mp4|webm|mov)$/i;

			for ( const { file } of fileExplorer.parseWebIndex( content ) ) {
				if ( imageExtensions.test( file ) )
					bgImages.push( file );
				else if ( videoExtensions.test( file ) )
					bgVideos.push( file );
			}

			const imageCount = bgImages.length,
				  videoCount = bgVideos.length,
				  bgOptions  = bgImages.map( fn => [ BG_IMAGE + fn, '🖼️ ' + parsePath( fn ).baseName ] ).concat(
							   bgVideos.map( fn => [ BG_VIDEO + fn, '🎬 ' + parsePath( fn ).baseName ] )
							   ).slice( 0, MAX_BG_MEDIA_FILES );

			if ( videoCount )
				bgOptions.splice( 0, 0, [ BG_VIDEO, 'Random video' ] );

			if ( imageCount )
				bgOptions.splice( 0, 0, [ BG_IMAGE, 'Random image' ] );

			consoleLog( 'Found ' + ( imageCount + videoCount == 0 ? 'no media' : imageCount + ' image files and ' + videoCount + ' video' ) + ' files in the backgrounds folder' );

			populateSelect( elBackground, bgOptions, true ); // add more background options
		})
		.catch( e => {} ); // fail silently

	setRangeAtts( elBgImageDim, 0.1, 1, .1 );
	setRangeAtts( elLineWidth, 1, 4, .5 );
	setRangeAtts( elFillAlpha, 0, .5, .1 );
	setRangeAtts( elSpin, 0, 3, 1 );

	// Set UI event listeners
	setUIEventListeners();

	// Clear canvas messages
	setCanvasMsg();

	// Register custom gradients
	Object.keys( gradients ).forEach( key => {
		if ( gradients[ key ].colorStops )
			audioMotion.registerGradient( key, { bgColor: gradients[ key ].bgColor, colorStops: gradients[ key ].colorStops } );
	});
	populateGradients();

	// Set audio source to built-in player
	setSource();

	// Load saved playlists
	loadSavedPlaylists();

	// Initialize file explorer
	const fileExplorerPromise = fileExplorer.create(
		$('#file_explorer'),
		{
			onDblClick: ( file, event ) => {
				addBatchToPlayQueue( [ { file } ], true );
				event.target.classList.remove( 'selected', 'sortable-chosen' );
			},
			onEnterDir: path => {
				if ( elSaveDir.checked && initDone ) // avoid saving the path during file explorer initialization
					saveToStorage( KEY_LAST_DIR, path );
			}
		}
	).then( ([ status, filelist, serversignature ]) => {
		const btnAddSelected = $('#btn_add_selected'),
			  btnAddFolder   = $('#btn_add_folder');

		serverMode = status;

		if ( status == -1 ) {
			consoleLog( 'No server found. File explorer will not be available.', true );
			btnAddSelected.disabled = true;
			btnAddFolder.disabled = true;
		}
		else {
			consoleLog( `${ serversignature } detected on port ${ location.port }` );
			Sortable.create( filelist, {
				animation: 150,
				draggable: '[data-type="file"], [data-type="list"]',
				group: {
					name: 'filelist',
					pull: 'clone',
					put: false
				},
				multiDrag: true,
				multiDragKey: 'ctrl',
				selectedClass: 'selected',
				sort: false,
				onEnd: evt => {
					if ( evt.to.id == 'playlist') {
						let items = evt.items.length ? evt.items : [ evt.item ];
						items.forEach( item => {
							addToPlayQueue( fileExplorer.makePath( item.dataset.path ) );
							item.remove();
						});
					}
				}
			});

			btnAddSelected.addEventListener( 'mousedown', () => addBatchToPlayQueue( fileExplorer.getFolderContents('.selected') ) );
			btnAddFolder.addEventListener( 'click', () => addBatchToPlayQueue(	fileExplorer.getFolderContents() ) );
		}
	});

	// Add events listeners for keyboard controls
	window.addEventListener( 'keydown', keyboardControls );
	window.addEventListener( 'keyup', keyboardControls );

	// notie options
	notie.setOptions({
		positions: { alert: 'bottom' }
	});

	const lastDir = await loadFromStorage( KEY_LAST_DIR );

	// Wait for all async operations to finish before loading the last used settings
	Promise.all( [ bgDirPromise, fileExplorerPromise ] ).then( () => {
		consoleLog( `Loading ${ isLastSession ? 'last session' : 'default' } settings` );
		loadPreset( 'last', false, true );
		fileExplorer.setPath( lastDir );
		consoleLog( `AudioContext sample rate is ${audioCtx.sampleRate}Hz; Total latency is ${ ( ( audioCtx.outputLatency || 0 ) + audioCtx.baseLatency ) * 1e3 | 0 }ms` );
		consoleLog( 'Initialization complete!' );
		initDone = true;
	});

})();
