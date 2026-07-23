/**
 * APP DEFAULTS
 */

import * as _ from './constants.js';
import * as _am from 'audiomotion-analyzer';

export const DEFAULT_KBD_SHORTCUTS = {
	'A': _.UI_RANDOMIZE,
	'B': _.UI_BACKGROUND,
	'C': _.UI_BANDCOUNT,
	'D': _.UI_OSD,
	'E': _.UI_SHUFFLE,
	'F': _.UI_FULLSCREEN,
	'G': null,
	'H': _.UI_FPS,
	'I': _.UI_TRACKINFO,
	'J': null,
	'K': null,
	'L': _.UI_LEDBARS,
	'M': _.UI_ANALYZERMODE,
	'N': _.UI_SENSITIVITY,
	'O': _.UI_LORES,
	'P': _.UI_PEAKS,
	'Q': null,
	'R': _.UI_REPEAT,
	'S': null,
	'T': _.UI_THEME0,
	'U': null,
	'V': null,
	'W': null,
	'X': _.UI_LABELSX,
	'Y': _.UI_LABELSY,
	'Z': null
};

// Fallback default preset - NOTE: `volume` property is required for first-run initialization!
export const DEFAULT_PRESET = {
	key: _.PRESET_KEY_DEFAULT,
	name: 'Defaults',
	options: {
		alphaBars    : _am.ALPHABARS_OFF,
		ansiBands    : 0,
		background   : _.BG_COVER,
		bandCount    : _am.BANDS_FFT,
		barSpace     : .2,
		bgImageDim   : .3,
		bgImageFit   : _.BGFIT_CENTER,
		channelLayout: _am.LAYOUT_SINGLE,
		colorMode    : _am.COLORMODE_GRADIENT,
		fftSize      : 8192,
		fillAlpha    : .3,
		freqMax      : 20000,
		freqMin      : 20,
		freqScale    : _am.SCALE_LOG,
		ledDisplay   : _am.LEDS_OFF,
		ledFormat    : _.LEDFORMAT_REGULAR,
		linearAmpl   : 1,
		lineWidth    : 1,
		linkGrads    : 0,
		loRes        : 0,
		micSource    : 0,
		mirror       : _am.MIRROR_OFF,
		mode         : _am.MODE_BARS,
		mute         : 0,
		outlineBars  : 0,
		radial       : 0,
		radius       : .5,
		randomMode   : 0,
		reflex       : 0,
		repeat       : 0,
		roundBars    : 0,
		sensitivity  : 1,
		showFPS      : 0,
		showLedMask  : 1,
		showPeaks    : _am.PEAKS_DROP,
		showScaleX   : _am.LABELS_X_FREQS,
		showScaleY   : _am.LABELS_Y_OFF,
		showSong     : 1,
		showSubtitles: 1,
		smoothing    : .7,
		spin         : 2,
		splitGrad    : 0,
		themes       : 'prism',
		volume       : 1,
		weighting    : _am.FILTER_TILT3
	}
};

export const DEFAULT_THEME_MODIFIERS = {
	horizontal: false,
	reverse: false
};

// Server configuration
export const SERVERCFG_DEFAULTS = {
	defaultAccessMode: _.FILEMODE_LOCAL,
	enableLocalAccess: true,
	frontPanel       : _.PANEL_OPEN,
	preserveFilenames: false
};

// On-screen information display
export const infoDisplayDefaults = {
	info  : 5,	  // display time (secs) when requested via click or keyboard shortcut
	track : 10,   // display time (secs) on track change
	end   : 10,   // display time (secs) at the end of the song
	covers: true, // show album covers in song information
	count : true, // show song number and play queue count
	osdFontSize: _.OSD_SIZE_M,
	osdTextStyle: _.OSD_STYLE_OUTLINE
};

// Sensitivity presets
export const sensitivityDefaults = [
	{ min: -84, max: -21, boost: 1 },   // low
	{ min: -90, max: -30, boost: 1.6 }, // medium
	{ min: -96, max: -36, boost: 2.4 }  // high
];
