/**
 *                    ░    ░          ░     ░                ░
 *                    ░               ░░   ░░         ░
 *   ░░░   ░   ░   ░░░░   ░░    ░░░   ░ ░ ░ ░   ░░░  ░░░    ░░    ░░░   ░░░░
 *      ▒  ▒   ▒  ▒   ▒    ▒   ▒   ▒  ▒  ▒  ▒  ▒   ▒  ▒      ▒   ▒   ▒  ▒   ▒
 *   ▒▒▒▒  ▒   ▒  ▒   ▒    ▒   ▒   ▒  ▒     ▒  ▒   ▒  ▒      ▒   ▒   ▒  ▒   ▒
 *  ▓   ▓  ▓   ▓  ▓   ▓    ▓   ▓   ▓  ▓     ▓  ▓   ▓  ▓  ▓   ▓   ▓   ▓  ▓   ▓
 *   ▓▓▓▓   ▓▓▓▓   ▓▓▓▓  ▓▓▓▓▓  ▓▓▓   ▓     ▓   ▓▓▓    ▓▓  ▓▓▓▓▓  ▓▓▓   ▓   ▓
 *
 * audioMotion | media player and real-time audio spectrum analyzer
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * @author    Henrique Vianna <hvianna@gmail.com>
 * @copyright (c) 2018-2024 Henrique Avila Vianna
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

import AudioMotionAnalyzer from 'audiomotion-analyzer';
import packageJson from '../package.json';
import * as fileExplorer from './file-explorer.js';
import * as mm from 'music-metadata-browser';
import './scrollIntoViewIfNeeded-polyfill.js';
import { get, set, del } from 'idb-keyval';

import Sortable, { MultiDrag } from 'sortablejs';
Sortable.mount( new MultiDrag() );

import notie from 'notie';
import './notie.css';

import './styles.css';

const URL_ORIGIN = location.origin + location.pathname,
	  VERSION    = packageJson.version;

const AUTOHIDE_DELAY        = 500,				// delay for triggering front panel auto-collapse (in milliseconds)
	  BG_DIRECTORY          = 'backgrounds', 	// server folder name for built-in backgrounds
	  MAX_METADATA_REQUESTS = 4,				// max concurrent metadata requests
	  MAX_QUEUED_SONGS      = 2000,
	  NEXT_TRACK            = -1;				// for loadSong()

// Background option values
const BG_DEFAULT = '0',
	  BG_BLACK   = '1',
	  BG_COVER   = '2',
	  BG_IMAGE   = '3',
	  BG_VIDEO   = '4';

// Backgrounds folder options
const BGFOLDER_NONE   = '0',
	  BGFOLDER_SERVER = '1',
	  BGFOLDER_LOCAL  = '2';

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
const CHANNEL_COMBINED   = 'dual-combined',
 	  CHANNEL_HORIZONTAL = 'dual-horizontal',
	  CHANNEL_SINGLE     = 'single',
	  CHANNEL_VERTICAL   = 'dual-vertical';

// Color modes
const COLOR_GRADIENT = 'gradient',
	  COLOR_INDEX    = 'bar-index',
	  COLOR_LEVEL    = 'bar-level';

// Error codes
const ERR_ABORT = 20; // AbortError

// Recognized file extensions
const FILE_EXT_AUDIO = ['mp3','flac','m4a','aac','ogg','wav'],
	  FILE_EXT_IMAGE = ['jpg','jpeg','webp','avif','png','gif','bmp'],
	  FILE_EXT_PLIST = ['m3u','m3u8'],
	  FILE_EXT_VIDEO = ['mkv','mpg','webm','mp4','avi','mov'];

// File mode access options
const FILEMODE_SERVER = 'server',
	  FILEMODE_LOCAL  = 'local';

// localStorage and indexedDB keys
const KEY_BG_DIR_HANDLE  = 'bgDir',
	  KEY_CUSTOM_GRADS   = 'custom-grads',
	  KEY_CUSTOM_PRESET  = 'custom-preset',
	  KEY_DISABLED_BGFIT = 'disabled-bgfit',
	  KEY_DISABLED_GRADS = 'disabled-gradients',
	  KEY_DISABLED_MODES = 'disabled-modes',
	  KEY_DISABLED_PROPS = 'disabled-properties',
	  KEY_DISPLAY_OPTS   = 'display-options',
	  KEY_FORCE_FS_API   = 'force-filesystem',
	  KEY_GENERAL_OPTS   = 'general-settings',
	  KEY_LAST_CONFIG    = 'last-config',
	  KEY_LAST_DIR       = 'last-dir',
	  KEY_LAST_VERSION   = 'last-version',
	  KEY_PEAK_OPTIONS   = 'peak-settings',
	  KEY_PLAYLISTS      = 'playlists',
	  KEY_PLAYQUEUE      = 'playqueue',
	  KEY_SENSITIVITY    = 'sensitivity-presets',
	  KEY_SUBTITLES_OPTS = 'subtitles-settings',
	  PLAYLIST_PREFIX    = 'pl_';

// Visualization modes
const MODE_BARS        = '11',
 	  MODE_DISCRETE    = '0',
	  MODE_GRAPH       = '10',
	  MODE_LINE        = '101', // deprecated
	  MODE_OCTAVE_FULL = '8',
	  MODE_OCTAVE_HALF = '7',
	  MODE_OCTAVE_3RD  = '6',
	  MODE_OCTAVE_4TH  = '5',
	  MODE_OCTAVE_6TH  = '4',
	  MODE_OCTAVE_8TH  = '3',
	  MODE_OCTAVE_12TH = '2',
	  MODE_OCTAVE_24TH = '1';

// Options for OSD font size
const OSD_SIZE_S = '0',
	  OSD_SIZE_M = '1',
	  OSD_SIZE_L = '2';

// Valid values for the `mediaPanel` URL parameter and config.json option
const PANEL_CLOSE = 'close',
	  PANEL_OPEN  = 'open';

// Valid values for showPeaks
const PEAKS_OFF  = 0,
	  PEAKS_ON   = 1,
	  PEAKS_FADE = 2;

// User presets placeholders
const PRESET_EMPTY  = 'Empty slot',
	  PRESET_NONAME = 'No description';

// Reflex options
const REFLEX_OFF  = '0',
	  REFLEX_ON   = '1',
	  REFLEX_FULL = '2';

// Property keys for Randomize settings
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
	  RND_MODE        = 'mode',
	  RND_OUTLINE     = 'outline',
	  RND_PEAKS       = 'peaks',
	  RND_PRESETS     = 'presets',
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

// X- and Y- scale switches
const SCALEXY_OFF  = 0,
	  SCALEXY_ON   = 1,
	  SCALEX_NOTES = 2;

// Server configuration filename and default values
const SERVERCFG_FILE     = 'config.json',
	  SERVERCFG_DEFAULTS = {
	  	defaultAccessMode: FILEMODE_LOCAL,
		enableLocalAccess: true,
		mediaPanel       : PANEL_OPEN
	  };

// Subtitles settings options
const SUBS_BG_NONE      = 'none',
	  SUBS_BG_SHADOW    = 'shadow',
	  SUBS_BG_SOLID     = 'solid',
	  SUBS_COLOR_GOLD   = 'gold',
	  SUBS_COLOR_GRAY   = 'gray',
	  SUBS_COLOR_WHITE  = 'white',
	  SUBS_COLOR_YELLOW = 'yellow',
	  SUBS_CSS_BG       = 'subs-bg-', // CSS class prefix
	  SUBS_CSS_COLOR    = 'subs-color-',
	  SUBS_POS_BOTTOM   = 'bottom',
	  SUBS_POS_CENTER   = 'center',
	  SUBS_POS_TOP      = 'top';

// Update banner settings
const UPDATE_BANNER_TIMEOUT = 10000,  // time visible (milliseconds)
	  UPDATE_SHOW_CSS_CLASS = 'show'; // active CSS class

// Weighting filters
const WEIGHT_NONE = '',
	  WEIGHT_A    = 'A',
	  WEIGHT_B    = 'B',
	  WEIGHT_C    = 'C',
	  WEIGHT_D    = 'D',
	  WEIGHT_468  = '468';

// Minimum window height to fit the entire player without a scrollbar
// 270px (canvas min-height) + 144px (.player-panel) + 28px (.panel-area) + 370px (.panel-main)
const WINDOW_MIN_HEIGHT = 812;

// selector shorthand functions
const $  = document.querySelector.bind( document ),
	  $$ = document.querySelectorAll.bind( document );

// UI HTML elements
const elAlphaBars     = $('#alpha_bars'),
	  elAnalyzer      = $('#analyzer'),			// analyzer canvas container
	  elAnsiBands     = $('#ansi_bands'),
	  elAutoHide      = $('#auto_hide'),
	  elBackground    = $('#background'),
	  elBandCount     = $('#band_count'),
	  elBarSpace      = $('#bar_space'),
	  elBgImageDim    = $('#bg_img_dim'),
	  elBgImageFit    = $('#bg_img_fit'),
	  elBgLocation    = $('#bg_location'),
	  elBgMaxItems    = $('#bg_max_items'),
	  elChnLayout     = $('#channel_layout'),
	  elColorMode     = $('#color_mode'),
	  elContainer     = $('#bg_container'),		// outer container with background image
	  elDim           = $('#bg_dim'),			// background image/video darkening layer
	  elEndTimeout    = $('#end_timeout'),
	  elFFTsize       = $('#fft_size'),
	  elFillAlpha     = $('#fill_alpha'),
	  elFPS           = $('#fps'),
	  elFreqScale     = $('#freq_scale'),
	  elFsHeight      = $('#fs_height'),
	  elGradient      = $('#gradient'),
	  elGradientRight = $('#gradientRight'),
	  elGravity       = $('#gravity'),
	  elInfoTimeout   = $('#info_timeout'),
	  elLedDisplay    = $('#led_display'),
	  elLinearAmpl    = $('#linear_amplitude'),
	  elLineWidth     = $('#line_width'),
	  elLinkGrads     = $('#link_grads'),
	  elLoRes         = $('#lo_res'),
	  elLumiBars      = $('#lumi_bars'),
	  elMaxFPS        = $('#max_fps'),
	  elMediaPanel    = $('#files_panel'),
	  elMirror        = $('#mirror'),
	  elMode          = $('#mode'),
	  elMute          = $('#mute'),
	  elNoDimSubs     = $('#no_dim_subs'),
	  elNoDimVideo    = $('#no_dim_video'),
	  elNoShadow      = $('#no_shadow'),
	  elOutline       = $('#outline'),
	  elOSD           = $('#osd'),				// message canvas
	  elOSDFontSize   = $('#osd_font_size'),
	  elPeakFade      = $('#peak_fade'),
	  elPeakHold      = $('#peak_hold'),
	  elPIPRatio      = $('#pip_ratio'),
	  elPlaylists     = $('#playlists'),
	  elRadial        = $('#radial'),
	  elRandomMode    = $('#random_mode'),
	  elRangeMax      = $('#freq_max'),
	  elRangeMin      = $('#freq_min'),
	  elReflex        = $('#reflex'),
	  elRepeat        = $('#repeat'),
	  elRoundBars     = $('#round_bars'),
	  elSaveDir       = $('#save_dir'),
	  elSaveQueue     = $('#save_queue'),
	  elScaleX        = $('#scaleX'),
	  elScaleY        = $('#scaleY'),
	  elSensitivity   = $('#sensitivity'),
	  elShowCount     = $('#show_count'),
	  elShowCover     = $('#show_cover'),
	  elShowPeaks     = $('#show_peaks'),
	  elShowSong      = $('#show_song'),
	  elShowSubtitles = $('#show_subs'),
	  elSmoothing     = $('#smoothing'),
	  elSongDuration  = $('#song_duration'),
	  elSongPosition  = $('#current_time'),
	  elSongProgress  = $('#progress'),
	  elSource        = $('#source'),
	  elSpin		  = $('#spin'),
	  elSplitGrad     = $('#split_grad'),
	  elSubsBackground= $('#subs_background'),
	  elSubsColor     = $('#subs_color'),
	  elSubsPosition  = $('#subs_position'),
	  elTogglePanel   = $('#toggle_panel'),
	  elTrackTimeout  = $('#track_timeout'),
	  elVideo         = $('#video'),			// background video
	  elVolume        = $('#volume'),
	  elWarp          = $('#warp'),				// "warp" effect layer
	  elWeighting     = $('#weighting');

// Configuration presets
const presets = [
	{
		key: 'demo',
		name: 'Demo (random)',
		options: {
			randomMode  : 6    // 15 seconds
		}
	},

	{
		key: 'bands',
		name: 'Octave Bands',
		options: {
			alphaBars    : 0,
			ansiBands    : 0,
			background   : BG_COVER,
			barSpace     : .25,
			bgImageDim   : .3,
			bgImageFit   : BGFIT_ADJUST,
			channelLayout: CHANNEL_SINGLE,
			colorMode    : COLOR_GRADIENT,
			freqMax      : 20000,
			freqMin      : 25,
			freqScale    : SCALE_LOG,
			gradient     : 'rainbow',
			ledDisplay   : 0,
			linearAmpl   : 1,
			lumiBars     : 0,
			mirror       : 0,
			mode         : MODE_OCTAVE_12TH,
			outlineBars  : 0,
			radial       : 0,
			randomMode   : 0,
			reflex       : REFLEX_ON,
			roundBars    : 0,
			showPeaks    : PEAKS_ON,
			showScaleX   : SCALEX_NOTES,
			showScaleY   : SCALEXY_OFF,
			showSong     : 1,
			splitGrad    : 0,
			weighting    : WEIGHT_D
		}
	},

	{
		key: 'ledbars',
		name: 'Classic LED bars',
		options: {
			alphaBars    : 0,
			ansiBands    : 1,
			background   : BG_COVER,
			barSpace     : .25,
			bgImageDim   : .3,
			bgImageFit   : BGFIT_CENTER,
			channelLayout: CHANNEL_SINGLE,
			colorMode    : COLOR_GRADIENT,
			freqMax      : 20000,
			freqMin      : 25,
			freqScale    : SCALE_LOG,
			gradient     : 'classic',
			ledDisplay   : 1,
			linearAmpl   : 1,
			lumiBars     : 0,
			outlineBars  : 0,
			mirror       : 0,
			mode         : MODE_OCTAVE_3RD,
			radial       : 0,
			randomMode   : 0,
			reflex       : REFLEX_OFF,
			roundBars    : 0,
			showPeaks    : PEAKS_ON,
			showScaleX   : SCALEXY_ON,
			showScaleY   : SCALEXY_OFF,
			showSong     : 1,
			splitGrad    : 0,
			weighting    : WEIGHT_D
		}
	},

	{
		key: 'dual',
		name: 'Dual-channel combined Graph, Bark frequency scale',
		options: {
			ansiBands    : 0,
			background   : BG_COVER,
			bgImageDim   : .3,
			bgImageFit   : BGFIT_CENTER,
			channelLayout: CHANNEL_COMBINED,
			colorMode    : COLOR_GRADIENT,
			fillAlpha    : .3,
			freqMax      : 20000,
			freqMin      : 20,
			freqScale    : SCALE_BARK,
			gradient     : 'cool',
			gradientRight: 'dusk',
			linearAmpl   : 1,
			lineWidth    : 1.5,
			linkGrads    : 0,
			mirror       : 0,
			mode         : MODE_LINE,
			radial       : 0,
			randomMode   : 0,
			reflex       : REFLEX_OFF,
			showPeaks    : PEAKS_OFF,
			showScaleX   : SCALEXY_OFF,
			showScaleY   : SCALEXY_OFF,
			showSong     : 1,
			splitGrad    : 0,
			weighting    : WEIGHT_D
		}
	},

	{
		key: 'radial',
		name: 'Radial Color by Level',
		options: {
			alphaBars    : 1,
			ansiBands    : 0,
			background   : BG_COVER,
			barSpace     : .1,
			bgImageDim   : .3,
			bgImageFit   : BGFIT_PULSE,
			channelLayout: CHANNEL_SINGLE,
			colorMode    : COLOR_LEVEL,
			freqMax      : 20000,
			freqMin      : 20,
			freqScale    : SCALE_LOG,
			gradient     : 'prism',
			ledDisplay   : 0,
			linearAmpl   : 1,
			lumiBars     : 0,
			mirror       : 0,
			mode         : MODE_OCTAVE_4TH,
			outlineBars  : 0,
			radial       : 1,
			randomMode   : 0,
			showPeaks    : PEAKS_ON,
			showScaleX   : SCALEXY_ON,
			showScaleY   : SCALEXY_OFF,
			showSong     : 1,
			spin         : 1,
			splitGrad    : 0,
			weighting    : WEIGHT_D
		}
	},

	{
		key: 'round',
		name: 'Round Bars reflex',
		options: {
			alphaBars    : 0,
			background   : BG_COVER,
			barSpace     : .25,
			bgImageDim   : .3,
			bgImageFit   : BGFIT_WARP_ANI,
			channelLayout: CHANNEL_SINGLE,
			colorMode    : COLOR_INDEX,
			freqMax      : 20000,
			freqMin      : 20,
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
			reflex       : REFLEX_FULL,
			roundBars    : 1,
			showPeaks    : PEAKS_OFF,
			showScaleX   : SCALEXY_OFF,
			showScaleY   : SCALEXY_OFF,
			showSong     : 1,
			splitGrad    : 0,
			weighting    : WEIGHT_D
		}
	},

	{
		key: 'last',
		name: 'Last session',
		options: {}
	},

	{
		key: 'default',
		name: 'Restore defaults',
		options: {
			alphaBars    : 0,
			ansiBands    : 0,
			background   : BG_DEFAULT,
			bandCount    : MODE_OCTAVE_3RD,
			barSpace     : 0.1,
			bgImageDim   : 0.5,
			bgImageFit   : BGFIT_CENTER,
			channelLayout: CHANNEL_SINGLE,
			colorMode    : COLOR_GRADIENT,
			fftSize      : 8192,
			fillAlpha    : 0.1,
			freqMax      : 20000,
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
			micSource    : 0,
			mirror       : 0,
			mode         : MODE_DISCRETE,
			mute         : 0,
			noShadow     : 1,
			outlineBars  : 0,
			radial       : 0,
			randomMode   : 0,
			reflex       : REFLEX_OFF,
			repeat       : 0,
			roundBars    : 0,
			sensitivity  : 1,
			showFPS      : 0,
			showPeaks    : PEAKS_ON,
			showScaleX   : SCALEXY_ON,
			showScaleY   : SCALEXY_OFF,
			showSong     : 1,
			showSubtitles: 1,
			smoothing    : .7,
			spin         : 2,
			splitGrad    : 0,
			volume       : 1,
			weighting    : WEIGHT_NONE
		}
	},

	{
		key: 'legacy',
		name: 'Legacy options test',
		options: {
			fadePeaks : '1',
			showPeaks : '0',
			noteLabels: '1',
			showScaleX: '0'
		}
	}
];

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
	classic:  { name: 'Classic', colorStops: [
				'#f00',
				{ color: '#ff0', level: .85, pos: .6 },
				{ color: '#0f0', level: .475 }
			  ], disabled: false },
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
	prism:    { name: 'Prism', colorStops: [
				'#a35', '#c66', '#e94', '#ed0', '#9d5', '#4d8', '#2cb', '#0bc', '#09c', '#36b'
			  ], disabled: false },
	prism_old: { name: 'Prism (legacy)', colorStops: [
				'hsl( 0, 100%, 50% )',
				'hsl( 60, 100%, 50% )',
				'hsl( 120, 100%, 50% )',
				'hsl( 180, 100%, 50% )',
				'hsl( 240, 100%, 50% )'
			  ], disabled: true },
	rainbow:  { name: 'Rainbow', dir: 'h', colorStops: [
				'#817', '#a35', '#c66', '#e94', '#ed0', '#9d5', '#4d8', '#2cb', '#0bc', '#09c', '#36b', '#639'
			  ], disabled: false },
	rainbow_old: { name: 'Rainbow (legacy)', dir: 'h', colorStops: [
				'hsl( 0, 100%, 50% )',
				'hsl( 60, 100%, 50% )',
				'hsl( 120, 100%, 50% )',
				'hsl( 180, 100%, 47% )',
				'hsl( 240, 100%, 58% )',
				'hsl( 300, 100%, 50% )',
				'hsl( 360, 100%, 50% )'
			  ], disabled: true },
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
	[ MODE_BARS,     'Bars'  ],
	[ MODE_DISCRETE, 'FFT'   ],
	[ MODE_GRAPH,    'Graph' ]
];

// Channel Layout options
const channelLayoutOptions = [
	[ CHANNEL_SINGLE,     'Single' ],
	[ CHANNEL_COMBINED,   'Comb'   ],
	[ CHANNEL_HORIZONTAL, 'Horiz'  ],
	[ CHANNEL_VERTICAL,   'Vert'   ]
];

// Randomize options
const randomProperties = [
	{ value: RND_ALPHA,       text: 'Alpha',          disabled: false },
	{ value: RND_MODE,        text: 'Analyzer Mode',  disabled: false },
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
	{ value: RND_PRESETS,     text: 'User Presets',   disabled: true }
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
	end   : 10,   // display time (secs) at the end of the song
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
const generalOptionsElements = [ elAutoHide, elBgLocation, elBgMaxItems, elFsHeight, elMaxFPS, elNoDimSubs,
								 elNoDimVideo, elOSDFontSize, elPIPRatio, elSaveDir, elSaveQueue ];

const generalOptionsDefaults = {
	autoHide   : false,
	bgLocation : BGFOLDER_SERVER,
	bgMaxItems : 100,
	osdFontSize: OSD_SIZE_M,
	fsHeight   : 100,
	maxFPS     : 60,
	noDimVideo : true,
	noDimSubs  : true,
	pipRatio   : 2.35,
	saveDir    : true,
	saveQueue  : true
}

const maxFpsOptions = [
	[ 30, '30' ],
	[ 60, '60' ],
	[ 0, 'unlimited' ]
];

const pipRatioOptions = [
	[ 1, '1:1' ],
	[ 1.33, '4:3' ],
	[ 1.78, '16:9' ],
	[ 2.35, '2.35:1' ],
	[ 3.55, '32:9' ]
];

// Peak settings
const peakOptionsElements = [ elGravity, elPeakFade, elPeakHold ];

const peakOptionsDefaults = {
	gravity : 3.8,
	peakFade: 750,
	peakHold: 500,
}

// Subtitles configuration options
const subtitlesElements = [ elSubsBackground, elSubsColor, elSubsPosition ];

const subtitlesDefaults = {
	background: SUBS_BG_SHADOW,
	color     : SUBS_COLOR_WHITE,
	position  : SUBS_POS_TOP
}

// Main panels
const mainPanels = [
	{ id: 'files_panel', label: 'Media' },
	{ id: 'settings', label: 'Settings' },
	{ id: 'advanced', label: 'Advanced' },
	{ id: 'console',  label: 'Console'  }
];

// Global variables
let audioElement = [],
	audioMotion,
	bgImages = [],
	bgVideos = [],
	canvasMsg = {},
	currAudio, 					// audio element currently in use
	currentGradient = null,     // gradient that is currently loaded in gradient editor
	elToggleConsole,			// defined later because HTML element is generated dynamically in setUIEventListeners()
	fastSearchTimeout,
	folderImages = {}, 			// folder cover images for songs with no picture in the metadata
	isFastSearch = false,
	micStream,
	nextAudio, 					// audio element loaded with the next song (for improved seamless playback)
	overwritePreset = false,    // flag to overwrite user preset during fullscreen
	playlist, 					// play queue
	playlistPos, 				// index to the current song in the queue
	randomModeTimer,
	serverHasMedia,				// music directory found on web server
	skipping = false,
	supportsFileSystemAPI,		// browser supports File System API (may be disabled via config.json)
	useFileSystemAPI,			// load music from local device when in web server mode
	userPresets,
	waitingMetadata = 0,
	wasMuted,					// mute status before switching to microphone input
	webServer;					// web server available? (boolean)

// for on-screen info display
let baseSize,
	coverSize,
	centerPos,
	rightPos,
	topLine1,
	topLine2,
	bottomLine1,
	bottomLine2,
	bottomLine3,
	maxWidthTop,
	maxWidthBot,
	normalFont,
	largeFont;

const canvasCtx  = elOSD.getContext('2d'),
	  coverImage = new Image(),	// cover image for the currently playing song (for canvas rendering)
	  pipVideo   = document.createElement('video');


// HELPER FUNCTIONS -------------------------------------------------------------------------------

// return an encoded JSON data URI for a given object - thanks https://stackoverflow.com/a/30800715
const encodeJSONDataURI = obj => 'data:text/json;charset=utf-8,' + encodeURIComponent( JSON.stringify( obj, null, 2 ) );

// precision fix for floating point numbers
const fixFloating = value => Math.round( value * 100 ) / 100;

// removes accents from a given string, converts it to lowercase and replaces any non-alphanumeric character with optional separator
const generateSafeKeyName = ( str, separator = '' ) => ( str + '' ).normalize('NFD').replace( /[\u0300-\u036f]/g, '' ).toLowerCase().replace( /[^a-z0-9]/g, separator );

// return the index of an element inside its parent - based on https://stackoverflow.com/a/13657635/2370385
const getIndex = node => {
	if ( ! node )
		return;
	let i = 0;
	while ( node = node.previousElementSibling )
		i++;
	return i;
}

// returns the text of the selected option in a `select` or custom radio element
const getText = el => {
	let text = '';
	if ( isCustomRadio( el ) ) {
		const option = el.querySelector(':checked ~ label');
		if ( option )
			text = option.textContent;
	}
	else
		text = el[ el.selectedIndex ].text;
	return text;
}

// Returns the value of a UI settings control
// NOTE: this *always* returns a string - be careful when using the value in arithmetic or boolean operations!
const getControlValue = el => {
	let ret = el.value;  // basic select and input elements
	if ( el == elBandCount )
		ret = 9 - ret;
	if ( isCustomRadio( el ) )
		ret = el.elements[ el.dataset.prop ].value;
	if ( el.dataset.active !== undefined ) // switches
		ret = el.dataset.active;
	return '' + ret;
}

// returns an object with the current settings
const getCurrentSettings = _ => ({
	alphaBars    : getControlValue( elAlphaBars ),
	ansiBands    : getControlValue( elAnsiBands ),
	background   : getControlValue( elBackground ),
	bandCount    : getControlValue( elBandCount ),
	barSpace     : getControlValue( elBarSpace ),
	bgImageDim   : getControlValue( elBgImageDim ),
	bgImageFit   : getControlValue( elBgImageFit ),
	channelLayout: getControlValue( elChnLayout ),
	colorMode    : getControlValue( elColorMode ),
	fftSize      : getControlValue( elFFTsize ),
	fillAlpha    : getControlValue( elFillAlpha ),
	freqMax		 : getControlValue( elRangeMax ),
	freqMin		 : getControlValue( elRangeMin ),
	freqScale    : getControlValue( elFreqScale ),
	gradient	 : getControlValue( elGradient ),
	gradientRight: getControlValue( elGradientRight ),
	ledDisplay   : getControlValue( elLedDisplay ),
	linearAmpl   : getControlValue( elLinearAmpl ),
	lineWidth    : getControlValue( elLineWidth ),
	linkGrads    : getControlValue( elLinkGrads ),
	loRes        : getControlValue( elLoRes ),
	lumiBars     : getControlValue( elLumiBars ),
	mirror       : getControlValue( elMirror ),
	mode         : getControlValue( elMode ),
	noShadow     : getControlValue( elNoShadow ),
	outlineBars  : getControlValue( elOutline ),
	radial       : getControlValue( elRadial ),
	randomMode   : getControlValue( elRandomMode ),
	reflex       : getControlValue( elReflex ),
	repeat       : getControlValue( elRepeat ),
	roundBars    : getControlValue( elRoundBars ),
	sensitivity  : getControlValue( elSensitivity ),
	showFPS      : getControlValue( elFPS ),
	showPeaks 	 : getControlValue( elShowPeaks ),
	showScaleX 	 : getControlValue( elScaleX ),
	showScaleY 	 : getControlValue( elScaleY ),
	showSong     : getControlValue( elShowSong ),
	showSubtitles: getControlValue( elShowSubtitles ),
	smoothing    : getControlValue( elSmoothing ),
	spin         : getControlValue( elSpin ),
	splitGrad    : getControlValue( elSplitGrad ),
	weighting    : getControlValue( elWeighting )
});

// get the array index for a preset key, or validate a given index; if invalid or not found returns -1
const getPresetIndex = key => {
	const index = ( +key == key ) ? key : presets.findIndex( item => item.key == key );
	return ( index < 0 || index > presets.length - 1 ) ? -1 : index;
}

// get the configurations options of a preset
const getPreset = key => {
	const index = getPresetIndex( key );
	return ( index == -1 ) ? {} : presets[ index ].options;
}

// get the name of a preset
const getPresetName = key => {
	const index = getPresetIndex( key );
	return ( index == -1 ) ? false : presets[ index ].name;
}

// return selected gradient(s) for canvas OSD message
const getSelectedGradients = () => {
	const isDual = getControlValue( elChnLayout ) != CHANNEL_SINGLE && ! isSwitchOn( elLinkGrads );
	return `Gradient${ isDual ? 's' : ''}: ${ gradients[ elGradient.value ].name + ( isDual ? ' / ' + gradients[ elGradientRight.value ].name : '' ) }`;
}

// return a list of user preset slots and descriptions
const getUserPresets = () => userPresets.map( ( item, index ) => `<strong>[${ index + 1 }]</strong>&nbsp; ${ isEmpty( item ) ? `<em class="empty">${ PRESET_EMPTY }</em>` : item.name || PRESET_NONAME }` );

// check if a given url/path is a blob
const isBlob = src => src && src.startsWith('blob:');

// check if a given object is a custom radio buttons element
const isCustomRadio = el => el.tagName == 'FORM' && el.dataset.prop != undefined;

// check if a string is an external URL
const isExternalURL = path => path.startsWith('http') && ! path.startsWith( URL_ORIGIN );

// check if an object is empty
const isEmpty = obj => ! obj || typeof obj != 'object' || ! Object.keys( obj ).length;

// check if PIP is active
const isPIP = _ => elContainer.classList.contains('pip');

// check if audio is playing
const isPlaying = ( audioEl = audioElement[ currAudio ] ) => audioEl && audioEl.currentTime > 0 && ! audioEl.paused && ! audioEl.ended;

// returns a boolean with the current status of a UI switch
const isSwitchOn = el => el.dataset.active == '1';

// check if a video file is loaded in the current audio element
const isVideoLoaded = () => FILE_EXT_VIDEO.includes( parsePath( audioElement[ currAudio ].dataset.file ).extension );

// normalize slashes in path to Linux format
const normalizeSlashes = path => typeof path == 'string' ? path.replace( /\\/g, '/' ) : path;

// returns a string with the current status of a UI switch
const onOff = el => isSwitchOn( el ) ? 'ON' : 'OFF';

// parse a path and return its individual parts
const parsePath = uri => {
	if ( typeof uri != 'string' )
		return {};

	const fullPath  = normalizeSlashes( uri ),
		  lastSlash = fullPath.lastIndexOf('/') + 1,
		  path      = fullPath.slice( 0, lastSlash ), // path only
		  fileName  = fullPath.slice( lastSlash ),    // file name with extension
		  lastDot   = fileName.lastIndexOf('.'),
		  baseName  = lastDot >= 0 ? fileName.slice( 0, lastDot ) : fileName, // file name only (no extension)
		  extension = lastDot >= 0 ? fileName.slice( lastDot + 1 ).toLowerCase() : ''; // extension (without dot)

	return { path, fileName, baseName, extension };
}

// try to extract detailed metadata off the filename or #EXTINF string
// general format: duration,artist - title (year)
const parseTrackName = name => {
	name = name.replace( /_/g, ' ' ); // for some really old file naming conventions :)

	const re = /\s*\([0-9]{4}\)/; // match a four-digit number between parenthesis (considered to be the year)
	let album = name.match( re );
	if ( album ) {
		album = album[0].trim();
		name = name.replace( re, '' ).trim(); // remove year
	}

	// try to discard the track number from the title, by checking commonly used separators (dot, hyphen or space)
	// if the separator is a comma, assume the number is actually the duration from an #EXTINF tag
	const [ ,, duration, separator,, artist, title ] = name.match( /(^(-?\d+)([,\.\-\s]))?((.*?)\s+-\s+)?(.*)/ );
	return { album, artist, title, duration: separator == ',' ? secondsToTime( duration ) : '' };
}

// returns the count of queued songs
const queueLength = _ => playlist.children.length;

// returns a random integer in the range [ 0, n-1 ]
const randomInt = ( n = 2 ) => Math.random() * n | 0;

// helper function to save a path to localStorage or IndexedDB
const saveLastDir = path => {
	if ( useFileSystemAPI )
		set( KEY_LAST_DIR, path ); // IndexedDB
	else if ( webServer )
		saveToStorage( KEY_LAST_DIR, path );
}

// format a value in seconds to a string in the format 'hh:mm:ss'
const secondsToTime = ( secs, forceHours ) => {
	if ( Math.abs( secs ) == Infinity || secs === '-1' )
		return 'LIVE';

	let lead = '',
		sign = '',
		str  = '';

	if ( secs < 0 ) {
		secs = -secs;
		sign = '-';
	}

	if ( secs >= 3600 || forceHours ) {
		str = ( secs / 3600 | 0 ) + ':';
		secs %= 3600;
		lead = '0';
	}

	str += ( lead + ( secs / 60 | 0 ) ).slice(-2) + ':' + ( '0' + ( secs % 60 | 0 ) ).slice(-2);

	return sign + str;
}

// set the value of a Settings UI control
const setControlValue = ( el, val ) => {
	if ( el == elMute )
		toggleMute( val );
	else if ( el == elSource )
		setSource( val );
	else if ( el == elVolume )
		setVolume( val );
	else if ( el == elBandCount ) // invert values when setting/getting, so the slider goes from lower to higher band count
		el.value = 9 - val;
	else if ( isCustomRadio( el ) ) {
		// note: el.elements[ prop ].value = val won't work for empty string value
		const option = el.querySelector(`[value="${val}"]`);
		if ( option )
			option.checked = true;
	}
	else if ( el.classList.contains('switch') )
		el.dataset.active = +val;
	else {
		el.value = val;
		if ( el.selectedIndex == -1 ) // fix invalid values in select elements
			el.selectedIndex = 0;
	}
	updateRangeValue( el );
}

// update configuration options from an existing preset
const setPreset = ( key, options ) => {
	const index = getPresetIndex( key );
	if ( index == -1 )
		return;
	presets[ index ].options = options;
}

// set attributes of "range" or "number" input elements
const setRangeAtts = ( element, min, max, step = 1 ) => {
	element.min  = min;
	element.max  = max;
	element.step = step;
}

// toggle display of an element
const toggleDisplay = ( el, status ) => {
	if ( status === undefined )
		status = !! el.style.display;
	el.style.display = status ? '' : 'none';
}

// promise-compatible `onloadeddata` event handler for media elements
const waitForLoadedData = async audioEl => new Promise( ( resolve, reject ) => {
	audioEl.onerror = () => {
		audioEl.onerror = audioEl.onloadeddata = null;
		reject();
	}
	audioEl.onloadeddata = () => {
		audioEl.onerror = audioEl.onloadeddata = null;
		resolve();
	};
});

// GENERAL FUNCTIONS ------------------------------------------------------------------------------

/**
 * Adds a batch of files to the queue and displays total songs added when finished
 *
 * @param files {array} array of objects with a 'file' property (and optional 'handle' property)
 * @param [autoplay] {boolean}
 */
function addBatchToPlayQueue( files, autoplay = false ) {
	const promises = files.map( entry => addToPlayQueue( entry, autoplay ) );
	Promise.all( promises ).then( added => {
		const total = added.reduce( ( sum, val ) => sum + val, 0 ),
			  text  = `${total} song${ total > 1 ? 's' : '' } added to the queue${ queueLength() < MAX_QUEUED_SONGS ? '' : '. Queue is full!' }`;
		notie.alert({ text, time: 5 });
		storePlayQueue( true );
	});
}

/**
 * Add audio metadata to a playlist item or audio element
 */
function addMetadata( metadata, target ) {
	const trackData  = target.dataset,
		  sourceData = metadata.dataset,
		  { album, artist, picture, title, year } = metadata.common || {},
		  { bitrate, bitsPerSample, codec, codecProfile, container,
		    duration, lossless, numberOfChannels, sampleRate } = metadata.format || {};

	if ( sourceData ) { // if `metadata` has a dataset it's a playqueue item; just copy the data to target element
		Object.assign( trackData, sourceData );
	}
	else {				// otherwise, it's metadata read from file; we need to parse it and populate the dataset
		trackData.artist = artist || trackData.artist;
		trackData.title  = title || trackData.title;
		trackData.album  = album ? album + ( year ? ' (' + year + ')' : '' ) : trackData.album;
		trackData.codec  = codec || container ? ( codec || container ) + ' (' + numberOfChannels + 'ch)' : trackData.codec;

		const khz = sampleRate ? Math.round( sampleRate / 1000 ) + 'kHz' : '';

		// track quality info
		// if lossless: bitsPerSample / sampleRate        - ex.: 24bits / 96kHz
		// if lossy:    bitrate codecProfile / sampleRate - ex.: 320kbps CBR / 44kHz
		if ( lossless || ! bitrate )
			trackData.quality = ( bitsPerSample ? bitsPerSample + 'bits' : '' ) + ( khz && bitsPerSample ? ' / ' : '' ) + khz;
		else
			trackData.quality = Math.round( bitrate / 1000 ) + 'kbps' + ( codecProfile ? ' ' + codecProfile : '' ) + ( khz ? ' / ' : '' ) + khz;

		trackData.duration = duration ? secondsToTime( duration ) : '';

		if ( picture && picture.length ) {
			const blob = new Blob( [ picture[0].data ], { type: picture[0].format } );
			trackData.cover = URL.createObjectURL( blob );
		}
	}

	if ( target == audioElement[ currAudio ] )
		setCurrentCover();
}

/**
 * Add a song to the play queue
 *
 * @param {object} { file, handle, dirHandle, subs }
 * @param {object} { album, artist, codec, duration, title }
 * @returns {Promise} resolves to 1 when song added, or 0 if queue is full
 */
function addSongToPlayQueue( fileObject, content ) {

	return new Promise( resolve => {
		if ( queueLength() >= MAX_QUEUED_SONGS ) {
			resolve(0);
			return;
		}

		const { fileName, baseName, extension } = parsePath( fileExplorer.decodeChars( fileObject.file ) ),
			  uri       = normalizeSlashes( fileObject.file ),
			  newEl     = document.createElement('li'), // create new list element
			  trackData = newEl.dataset;

		Object.assign( trackData, DATASET_TEMPLATE ); // initialize element's dataset attributes

		if ( ! content )
			content = parseTrackName( baseName );

		trackData.album    = content.album || '';
		trackData.artist   = content.artist || '';
		trackData.title    = content.title || fileName || uri.slice( uri.lastIndexOf('//') + 2 );
		trackData.duration = content.duration || '';
		trackData.codec    = content.codec || extension.toUpperCase();
//		trackData.subs     = + !! fileObject.subs; // show 'subs' badge in the playqueue (TO-DO: resolve CSS conflict)

		trackData.file     = uri; 				// for web server access
		newEl.handle       = fileObject.handle; // for File System API access
		newEl.dirHandle    = fileObject.dirHandle;
		newEl.subs         = fileObject.subs;	// only defined when coming from the file explorer (not playlists)

		playlist.appendChild( newEl );

		if ( FILE_EXT_AUDIO.includes( extension ) || ! extension ) {
			// disable retrieving metadata of video files for now - https://github.com/Borewit/music-metadata-browser/issues/950
			trackData.retrieve = 1; // flag this item as needing metadata
			retrieveMetadata();
		}

		if ( queueLength() == 1 && ! isPlaying() )
			loadSong(0).then( () => resolve(1) );
		else {
			if ( playlistPos > queueLength() - 3 )
				loadSong( NEXT_TRACK );
			resolve(1);
		}
	});
}

/**
 * Add a song or playlist to the play queue
 */
function addToPlayQueue( fileObject, autoplay = false ) {

	let ret;

	if ( FILE_EXT_PLIST.includes( parsePath( fileObject.file ).extension ) )
		ret = loadPlaylist( fileObject );
	else
		ret = addSongToPlayQueue( fileObject );

	// when promise resolved, if autoplay requested start playing the first added song
	ret.then( n => {
		if ( autoplay && ! isPlaying() && n > 0 )
			playSong( queueLength() - n );
	});

	return ret;
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
 *
 * @param {number|HTMLMediaElement} index to media element, or object itself
 */
function clearAudioElement( n = currAudio ) {
	const audioEl   = n instanceof HTMLMediaElement ? n : audioElement[ n ],
		  trackData = audioEl.dataset;

	loadAudioSource( audioEl, null ); // remove .src attribute
	loadSubs( audioEl ); // clear subtitles track
	Object.assign( trackData, DATASET_TEMPLATE ); // clear data attributes
	audioEl.load();

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
 * Recalculate global variables and resize the canvas used for OSD
 */
function computeFontSizes( instance = audioMotion ) {

	const factors = [ 24, 17, 13.5 ], // approx. 45px, 64px, 80px for 1080px canvas (baseSize)
		  dPR     = instance.pixelRatio,
		  height  = elOSD.height = elContainer.clientHeight * dPR, // resize OSD canvas
		  width   = elOSD.width  = elContainer.clientWidth * dPR;

	baseSize    = Math.max( 12, Math.min( width, height ) / factors[ +elOSDFontSize.value ] );
	coverSize   = baseSize * 3;				// cover image size
	centerPos   = width / 2;
	rightPos    = width - baseSize;
	topLine1    = baseSize * 1.4;			// gradient, mode & sensitivity status + informative messages
	topLine2    = topLine1 * 1.8;			// auto gradient, Randomize & repeat status
	maxWidthTop = width / 3 - baseSize;		// maximum width for messages shown at the top
	bottomLine1 = height - baseSize * 4;	// artist name, codec/quality
	bottomLine2 = height - baseSize * 2.8;	// song title
	bottomLine3 = height - baseSize * 1.6;	// album title, time
	maxWidthBot = width - baseSize * 8;		// maximum width for artist and song name

	normalFont  = `bold ${ baseSize * .7 }px sans-serif`;
	largeFont   = `bold ${baseSize}px sans-serif`;
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

	if ( error && elToggleConsole )
		elToggleConsole.classList.add('warning');

	if ( msg )
		content.innerHTML += `<div ${ error ? 'class="error"' : '' }>${ time } &gt; ${msg}</div>`;

	content.scrollTop = content.scrollHeight;
}

/**
 * Select next or previous option in a `select` HTML element or custom radio buttons, cycling around when necessary
 *
 * @param el {object} HTML object
 * @param [prev] {boolean} true to select previous option
 */
function cycleElement( el, prev ) {
	const options = isCustomRadio( el ) ? el.elements[ el.dataset.prop ] : el.options;

	let idx = ( isCustomRadio( el ) ? Array.from( options ).findIndex( item => item.checked ) : el.selectedIndex ) + ( prev ? -1 : 1 );

	if ( idx < 0 )
		idx = options.length - 1;
	else if ( idx >= options.length )
		idx = 0;

	if ( isCustomRadio( el ) )
		options[ idx ].checked = true;
	else
		el.selectedIndex = idx;

	setProperty( el );
}

/**
 * Cycle scale labels for X- and- Y axes
 *
 * @param [{boolean}] `true` to select previous option
 * @return {number} integer indicating status (see table below)
 */
function cycleScale( prev ) {
// Y X  scale
// 0 00 (0): x off    y off
// 0 01 (1): x freqs  y off
// 0 10 (2): x notes  y off
// 0 11 (3): not used
// 1 00 (4): x off    y on
// 1 01 (5): x freqs  y on
// 1 10 (6): x notes  y on
// 1 11 (7): not used
//
	prev = prev * -2 + 1; // true = -1; false = 1
	let scale = +getControlValue( elScaleX ) + ( +getControlValue( elScaleY ) << 2 ) + prev;

	if ( scale < 0 )
		scale = 6;
	else if ( scale == 3 )
		scale += prev;
	else if ( scale > 6 )
		scale = 0;

	setControlValue( elScaleX, scale & 3 );
	setControlValue( elScaleY, scale >> 2 );
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
	location.href = '#config';
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
					  key       = PLAYLIST_PREFIX + keyName,
					  playlists = await get( KEY_PLAYLISTS );

				if ( playlists )
					delete playlists[ keyName ];

				// delete playlist from indexedDB and update list of playlists
				await del( key );
				await set( KEY_PLAYLISTS, playlists );

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
			container.innerHTML += `<label><input type="checkbox" class="${cssClass}" data-option="${item.value}" ${ item.disabled ? '' : 'checked' }> ${item.text}</label>`;
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
				const opt = options.find( item => item.value == element.dataset.option );
				if ( opt ) {
					opt.disabled = ! element.checked;
					populateSelect( parent, options );
					savePreferences( cfgKey );
				}
			});
		});
	}

	// helper function to validate range value
	const isValidRange = el => ( +el.value >= +el.min && +el.value <= +el.max );

	// Enabled visualization modes
	buildOptions( $('#enabled_modes'), 'enabledMode', modeOptions, elMode, KEY_DISABLED_MODES );

	// Enabled Background Image Fit options
	buildOptions( $('#enabled_bgfit'), 'enabledBgFit', bgFitOptions, elBgImageFit, KEY_DISABLED_BGFIT );

	// Enabled gradients

	const elEnabledGradients = $('#enabled_gradients');

	Object.keys( gradients ).forEach( key => {
		elEnabledGradients.innerHTML += `<label><input type="checkbox" class="enabledGradient" data-grad="${key}" ${gradients[ key ].disabled ? '' : 'checked'}> ${gradients[ key ].name}</label>`;
	});

	populateEnabledGradients();

	// Randomize configuration

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
				if ( el.dataset.preset == getControlValue( elSensitivity ) ) // current preset has been changed
					setProperty( elSensitivity, false );
				savePreferences( KEY_SENSITIVITY );
			});
		}
		else {
			el.addEventListener( 'change', () => {
				if ( isValidRange( el ) ) {
					if ( el.dataset.preset == getControlValue( elSensitivity ) ) // current preset has been changed
						setProperty( elSensitivity, false );
					savePreferences( KEY_SENSITIVITY );
				}
				el.classList.toggle( 'field-error', ! isValidRange( el ) );
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
		el.addEventListener( 'change', () => {
			const isValid = el.type != 'number' || isValidRange( el );
			if ( isValid )
				setProperty( el );
			el.classList.toggle( 'field-error', ! isValid );
		});
	});

	$('#reset_general').addEventListener( 'click', () => {
		setGeneralOptions( generalOptionsDefaults );
		setProperty( generalOptionsElements );
	});

	// Peak settings
	peakOptionsElements.forEach( el => {
		el.addEventListener( 'change', () => {
			const isValid = el.type != 'number' || isValidRange( el );
			if ( isValid )
				setProperty( el );
			el.classList.toggle( 'field-error', ! isValid );
		});
	});

	$('#reset_peak').addEventListener( 'click', () => {
		setPeakOptions( peakOptionsDefaults );
		setProperty( peakOptionsElements );
	});

	// Subtitle settings
	subtitlesElements.forEach( el => el.addEventListener( 'change', () => setProperty( el ) ) );
	$('#reset_subs').addEventListener( 'click', () => {
		setSubtitlesOptions( subtitlesDefaults );
		setProperty( subtitlesElements );
	});
	setProperty( subtitlesElements ); // initialize subtitles settings
}

/**
 * Erase a user preset
 *
 * @param {number} slot index (0-8)
 * @param [{boolean}] force
 */
function eraseUserPreset( index, force ) {
	if ( isEmpty( userPresets[ index ] ) )
		return; // nothing to do

	const userPresetText = `User Preset #${ index + 1 }`,
		  currentName = userPresets[ index ].name ? '<br>' + userPresets[ index ].name : '';

	if ( ! force ) {
		notie.confirm({
			text: `Do you really want to DELETE ${ userPresetText }?${ currentName }<br>THIS CANNOT BE UNDONE!`,
			submitText: 'DELETE',
			submitCallback: () => {
				eraseUserPreset( index, true ); // force erase
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled!' })
			},
		});
		return;
	}

	// Update presets array in memory and save updated contents to storage
	userPresets[ index ] = {};
	saveToStorage( KEY_CUSTOM_PRESET, userPresets );

	notie.alert({ text: `Deleted ${ userPresetText }` });
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
async function getFolderCover( target ) {
	const { path } = parsePath( target.dataset.file ), // extract path from filename
		  { dirHandle } = target;

	if ( ! webServer || isExternalURL( path ) )
		return ''; // nothing to do when in serverless mode or external file
	else if ( folderImages[ path ] !== undefined )
		return folderImages[ path ]; // use the stored image URL for this path
	else {
		if ( target.handle && ! dirHandle )
			return ''; // filesystem mode, but no dirHandle available (entry from old playlist) - quit

		let imageUrl = '';

		try {
			const contents = await fileExplorer.getDirectoryContents( path, dirHandle );

			if ( contents && contents.cover ) {
				const { handle, name } = contents.cover;
				if ( handle ) {
					const blob = await handle.getFile();
					imageUrl = URL.createObjectURL( blob );
				}
				else
					imageUrl = path + name;
			}
		}
		catch( e ) {}

		folderImages[ path ] = imageUrl;

		return imageUrl;
	}
}

/**
 * Process keyboard shortcuts
 */
function keyboardControls( event ) {

	// ignore system shortcuts keys (alt, ctrl and win/command key)
	if ( event.altKey || event.ctrlKey || event.metaKey )
		return;

	const isShiftKey = event.shiftKey;

	// F1 is accepted independently of where the focus is
	if ( event.code == 'F1' && ! isShiftKey ) {
		location.href = '#help';
		event.preventDefault();
		return;
	}

	// ignore other keys when the focus is not on body (e.g., in a input or select field)
	if ( event.target.tagName != 'BODY' )
		return;

	// keys handled on 'keydown' allow automatic repetition
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
				if ( isFastSearch ) {
					setCanvasMsg( 'Rewind', 1 );
					fastSearch(-1);
				}
				else
					scheduleFastSearch('k', -1);
				break;
			case 'ArrowRight': 	// fast forward
				if ( isFastSearch ) {
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
		if ( event.code.match( /^(Digit|Numpad)[0-9]$/ ) ) {
			const index = event.code.slice(-1) - 1;
			if ( index == -1 ) { // '0' pressed
				// ignore if Shift pressed as it could be a user mistake
				if ( ! isShiftKey ) {
					randomizeSettings( true );
					setProperty( elRandomMode, false ); // restart randomize timer (if active)
				}
			}
			else if ( isShiftKey ) {
				const settings = getCurrentSettings();
				settings.randomMode = 0; // when saving via keyboard shortcut, turn off Randomize
				saveUserPreset( index, settings );
			}
			else
				loadPreset( index );
		}
		else {
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
						loadSong( NEXT_TRACK );
					else {
						clearAudioElement( nextAudio );
						if ( ! isPlaying() )
							clearAudioElement();
					}
					storePlayQueue( true );
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
					setCanvasMsg( getSelectedGradients() );
					break;
				case 'ArrowRight': 	// next song
				case 'KeyK':
					if ( ! finishFastSearch() && ! isShiftKey ) {
						setCanvasMsg( 'Next track', 1 );
						skipTrack();
					}
					break;
				case 'KeyA': 		// cycle thru Randomize options
					cycleElement( elRandomMode, isShiftKey );
					setCanvasMsg( 'Randomize: ' + getText( elRandomMode ) );
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
					cycleElement( elShowPeaks, isShiftKey );
					setCanvasMsg( 'Peaks ' + getText( elShowPeaks ) );
					break;
				case 'KeyR': 		// toggle playlist repeat
					elRepeat.click();
					setCanvasMsg( 'Queue repeat ' + onOff( elRepeat ) );
					break;
				case 'KeyS': 		// toggle scale labels for X- and Y- axes
					const info   = ['None','Frequencies','Musical Notes',,'Level'],
						  status = cycleScale( isShiftKey );
					setCanvasMsg( 'Scale labels: ' + ( status < 5 ? info[ status ] : info[ status - 4 ] + ' + ' + info[ 4 ] ) );
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
		}
	} // else if ( event.type == 'keydown' )

	event.preventDefault();
}

/**
 * Sets (or removes) the `src` attribute of a audio element and
 * releases any data blob (File System API) previously in use by it
 *
 * @param {object} audio element
 * @param {string} URL - if `null` completely removes the `src` attribute
 */
function loadAudioSource( audioEl, newSource ) {
	const oldSource = audioEl.src || '';

	if ( isBlob( oldSource ) )
		URL.revokeObjectURL( oldSource );

	if ( ! newSource )
		audioEl.removeAttribute('src');
	else
		audioEl.src = newSource;

	setOverlay(); // adjust overlay for video playback or background media
}

/**
 * Load a file blob into an audio element
 *
 * @param {object}    audio element
 * @param {object}    file blob
 * @param {boolean}   `true` to start playing
 * @returns {Promise} resolves to a string containing the URL created for the blob
 */
async function loadFileBlob( fileBlob, audioEl, playIt ) {
	const url = URL.createObjectURL( fileBlob );
	loadAudioSource( audioEl, url );
	try {
		await waitForLoadedData( audioEl );
		if ( playIt )
			audioEl.play();
	}
	catch ( e ) {}

	return url;
}

/**
 * Load a JSON-encoded object from localStorage
 *
 * @param {string} item key
 * @returns {object} parsed object, array, string, number, boolean or null value
 */
function loadFromStorage( key ) {
	return JSON.parse( localStorage.getItem( key ) );
}

/**
 * Clones the gradient of the given key into the currentGradient variable
 */
function loadGradientIntoCurrentGradient(gradientKey) {
	if (!gradients[gradientKey]) throw new Error(`gradients[${gradientKey}] is null or undefined.`);

	// convert hsl values to rgb hexadecimal string - thanks https://stackoverflow.com/a/64090995
	const hsl2rgb = ( h, s, l ) => {
		// h in [0,360] and s,l in [0,1]
		const a = s * Math.min( l, 1 - l );
		const f = ( n, k = ( n + h / 30 ) % 12 ) => l - a * Math.max( Math.min( k - 3, 9 - k, 1 ), -1 );
		let rgb = '#';
		for ( const i of [ 0, 8, 4 ] )
			rgb += Math.round( f( i ) * 255 ).toString(16).padStart(2, '0');
		return rgb;
	}

	// split values from a hsl or rgb string (removes % sign from hsl values)
	const splitValues = str => str.match( /\(\s+(.*),\s+(.*?)%?,\s+(.*?)%?\s+\)/ ).slice(1);

	const src  = gradients[ gradientKey ],
		  dest = { ...src }; // make a copy of the gradient object

	dest.colorStops = [];

	// NOTE: colorStops in our `gradients` objects are normalized (modified!) by the analyzer's registerGradient()
	//       method, which ensures all colorStops elements are objects with `pos` and `color` attributes!

	// clone the source colorStops and convert all colors to hexadecimal format, required by the HTML color picker
	for ( const stop of src.colorStops ) {
		if ( stop.color.startsWith('rgb') ) {
			const { color } = stop;
			stop.color = '#';
			for ( const component of splitValues( color ) )
				stop.color += ( +component ).toString(16).padStart(2, '0');
		}
		else if ( stop.color.startsWith('hsl') ) {
			const [ h, s, l ] = splitValues( stop.color );
			stop.color = hsl2rgb( h, s/100, l/100 );
		}
		else if ( stop.color.length == 4 ) { // short hexadecimal format
			const [ _, r, g, b ] = stop.color;
			stop.color = '#' + r + r + g + g + b + b;
		}
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
		audioEl.dataset.file = fileBlob.name;
		audioEl.dataset.title = parsePath( fileBlob.name ).baseName;

		// load and play
		loadFileBlob( fileBlob, audioEl, true )
			.then( url => mm.fetchFromUrl( url ) )
			.then( metadata => addMetadata( metadata, audioEl ) )
			.catch( e => {} );
	}
}

/**
 * Load a playlist file into the play queue
 */
function loadPlaylist( fileObject ) {

	let path = normalizeSlashes( fileObject.file );

	return new Promise( async ( resolve ) => {
		let	promises = [];

		const resolveAddedSongs = saveQueue => {
			Promise.all( promises ).then( added => {
				const total = added.reduce( ( sum, val ) => sum + val, 0 );
				resolve( total );
				if ( saveQueue )
					storePlayQueue( true );
			});
		}

		const parsePlaylistContent = async content => {
			path = parsePath( path ).path; // extracts the path (no filename); also decodes/normalize slashes

			let album, songInfo;

			for ( let line of content.split(/[\r\n]+/) ) {
				if ( line.charAt(0) != '#' && line.trim() != '' ) { // not a comment or blank line?
					line = normalizeSlashes( line );
					if ( ! songInfo ) // if no #EXTINF tag found on previous line, use the filename
						songInfo = parsePath( line ).baseName;

					let handle, dirHandle;

					// external URLs do not require any processing
					if ( ! isExternalURL( line ) ) {

						// finds the filesystem handle for this file and its directory
						if ( useFileSystemAPI ) {
							( { handle, dirHandle } = await fileExplorer.getHandles( line ) );
							if ( ! handle ) {
								consoleLog( `Cannot resolve file handle for ${ line }`, true );
								songInfo = '';
								continue; // skip this entry
							}
						}

						// encode special characters into URL-safe codes
						line = fileExplorer.encodeChars( line );

						// if it's not an absolute path, prepend the current path to it
						if ( line[1] != ':' && line[0] != '/' )
							line = path + line;
					}

					promises.push( addSongToPlayQueue( { file: line, handle, dirHandle }, { ...parseTrackName( songInfo ), ...( album ? { album } : {} ) } ) );
					songInfo = '';
				}
				else if ( line.startsWith('#EXTINF') )
					songInfo = line.slice(8); // save #EXTINF metadata for the next iteration
				else if ( line.startsWith('#EXTALB') )
					album = line.slice(8);
			}
			resolveAddedSongs();
		}

		// --- main fuction ---

		if ( ! path ) {
			resolve( -1 );
		}
		else if ( typeof path == 'string' && FILE_EXT_PLIST.includes( parsePath( path ).extension ) ) {
			if ( fileObject.handle ) {
				fileObject.handle.getFile()
					.then( fileBlob => fileBlob.text() )
					.then( parsePlaylistContent )
					.catch( e => {
						consoleLog( e, true );
						resolve( 0 );
					});
			}
			else {
				fetch( path )
					.then( response => {
						if ( response.ok )
							return response.text();
						else {
							consoleLog( `Fetch returned error code ${response.status} for URI ${path}`, true );
							return '';
						}
					})
					.then( parsePlaylistContent )
					.catch( e => {
						consoleLog( e, true );
						resolve( 0 );
					});
			}
		}
		else { // try to load playlist or last play queue from indexedDB
			const list = await get( path === true ? KEY_PLAYQUEUE : PLAYLIST_PREFIX + path );

			if ( Array.isArray( list ) ) {
				list.forEach( entry => {
					const { file, handle, dirHandle, subs, content } = entry;
					promises.push( addSongToPlayQueue( { file, handle, dirHandle, ...( handle && ! dirHandle ? { subs } : {} ) }, content ) );
					// keep subs from old saved playlists only for filesystem entries, since they don't have the dirHandle stored
				});
				resolveAddedSongs( list != KEY_PLAYQUEUE ); // save playqueue when loading an internal playlist
			}
			else {
				if ( path !== true ) // avoid error message if no play queue found on storage
					consoleLog( `Unrecognized playlist file: ${path}`, true );
				resolve( 0 );
			}
		}
	});
}

/**
 * Load preferences from localStorage
 */
function loadPreferences() {
	// helper function
	const parseDisabled = ( data, optionList ) => {
		if ( Array.isArray( data ) ) {
			data.forEach( option => {
				// if `option` is not an object, `disabled` is inferred true - for compatibility with legacy versions
				const { value, disabled } = typeof option == 'object' ? option : { value: option, disabled: true } ;
				const opt = Array.isArray( optionList ) ? optionList.find( item => item.value == value ) : optionList[ value ];
				if ( opt )
					opt.disabled = disabled;
			});
		}
	}

	const lastConfig        = loadFromStorage( KEY_LAST_CONFIG ),
	 	  isLastSession     = lastConfig !== null;

	// for compatibility with v24.6 (down to v21.11), when FFT size and smoothing were stored in the general settings
	const storedGeneralOptions   = loadFromStorage( KEY_GENERAL_OPTS ) || {},
		  { fftSize, smoothing } = storedGeneralOptions;

	// Merge defaults with the last session settings (if any)
	setPreset( 'last', { ...getPreset('default'), fftSize, smoothing, ...lastConfig } );

	// Load user presets
	userPresets = loadFromStorage( KEY_CUSTOM_PRESET ) || [];
	if ( ! Array.isArray( userPresets ) )
		userPresets = [ { name: 'Custom', options: userPresets } ]; // convert old custom preset (version <= 21.11)
	for ( let i = 0; i < 9; i++ ) {
		if ( userPresets[ i ] === undefined )
			userPresets[ i ] = {};
		else if ( ! isEmpty( userPresets[ i ] ) && ! userPresets[ i ].options ) // make sure 'options' exists
			userPresets[ i ] = { options: userPresets[ i ] };
	}

	// Load disabled modes preference
	parseDisabled( loadFromStorage( KEY_DISABLED_MODES ), modeOptions );

	// Load disabled background image fit options
	parseDisabled( loadFromStorage( KEY_DISABLED_BGFIT ), bgFitOptions );

	// Load custom gradients
	const customGradients = loadFromStorage( KEY_CUSTOM_GRADS );
	if ( customGradients ) {
		Object.keys( customGradients ).forEach( key => {
			gradients[ key ] = customGradients[ key ];
			gradients[ key ].key = key; // a `key` property indicates this is a custom gradient
		});
	}

	// Load disabled gradients preference
	parseDisabled( loadFromStorage( KEY_DISABLED_GRADS ), gradients );

	// Load disabled random properties preference
	parseDisabled( loadFromStorage( KEY_DISABLED_PROPS ), randomProperties );

	// Sensitivity presets
	const elMinSens = $$('.min-db');
	elMinSens.forEach( el => setRangeAtts( el, -120, -60 ) );

	const elMaxSens = $$('.max-db');
	elMaxSens.forEach( el => setRangeAtts( el, -50, 0 ) );

	const elLinearBoost = $$('.linear-boost');
	elLinearBoost.forEach( el => setRangeAtts( el, 1, 5, .2 ) );

	const sensitivityPresets = loadFromStorage( KEY_SENSITIVITY ) || sensitivityDefaults;

	sensitivityPresets.forEach( ( preset, index ) => {
		elMinSens[ index ].value = preset.min;
		elMaxSens[ index ].value = preset.max;
		elLinearBoost[ index ].value = preset.boost || sensitivityDefaults[ index ].boost;
	});

	// On-screen display options - merge saved options (if any) with the defaults and set UI fields
	setInfoOptions( { ...infoDisplayDefaults, ...( loadFromStorage( KEY_DISPLAY_OPTS ) || {} ) } );

	// General settings

	populateSelect( elPIPRatio, pipRatioOptions );

	setRangeAtts( elFsHeight, 25, 100, 5 );

	populateSelect( elMaxFPS, maxFpsOptions );

	populateSelect( elBgLocation, [
		[ BGFOLDER_NONE,   'Disable'  ],
		[ BGFOLDER_SERVER, 'Built-in' ],
		[ ...( supportsFileSystemAPI ? [ BGFOLDER_LOCAL, 'Local folder' ] : [] ) ]
	]);

	setRangeAtts( elBgMaxItems, 0, 1000 );

	populateSelect( elOSDFontSize, [
		[ OSD_SIZE_S, 'Small'  ],
		[ OSD_SIZE_M, 'Medium' ],
		[ OSD_SIZE_L, 'Large'  ]
	]);

	setGeneralOptions( { ...generalOptionsDefaults, ...storedGeneralOptions } );

	// Peak settings

	setRangeAtts( elGravity, .01, 25, .01 );

	setRangeAtts( elPeakFade, 0, 5000, 50 );

	setRangeAtts( elPeakHold, 0, 5000, 50 );

	setPeakOptions( { ...peakOptionsDefaults, ...( loadFromStorage( KEY_PEAK_OPTIONS ) || {} ) } );

	// Subtitles configuration

	populateSelect( elSubsBackground, [
		[ SUBS_BG_NONE,   'None'   ],
		[ SUBS_BG_SHADOW, 'Shadow' ],
		[ SUBS_BG_SOLID,  'Solid'  ]
	]);

	populateSelect( elSubsColor, [
		[ SUBS_COLOR_GOLD,   'Gold'   ],
		[ SUBS_COLOR_GRAY,   'Gray'   ],
		[ SUBS_COLOR_WHITE,  'White'  ],
		[ SUBS_COLOR_YELLOW, 'Yellow' ]
	]);

	populateSelect( elSubsPosition, [
		[ SUBS_POS_TOP,    'Top'    ],
		[ SUBS_POS_CENTER, 'Center' ],
		[ SUBS_POS_BOTTOM, 'Bottom' ]
	]);

	setSubtitlesOptions( { ...subtitlesDefaults, ...( loadFromStorage( KEY_SUBTITLES_OPTS ) || {} ) } );

	return isLastSession;
}

/**
 * Load a configuration preset
 *
 * @param {string|number|object} desired built-in preset key or user preset index or settings object (uploaded by user)
 * @param [{boolean}] true to display console message and on-screen alert after loading (default)
 * @param [{boolean}] true to use default values for missing properties
 * @param [{boolean}] true to keep Randomize setting unchanged
 */
function loadPreset( key, alert = true, init, keepRandomize ) {

	const isUserPreset = ( +key == key ),
		  isObject     = typeof key == 'object',
		  thisPreset   = isObject ? key : ( isUserPreset ? userPresets[ key ].options : getPreset( key ) ),
		  defaults     = getPreset('default');

	if ( isEmpty( thisPreset ) ) // invalid or empty preset
		return;

	if ( alert && ! isObject )
		consoleLog( `Loading ${ isUserPreset ? 'User Preset #' + ( key + 1 ) : "'" + getPresetName( key ) + "' preset" }` );

	if ( thisPreset.stereo !== undefined ) // convert legacy 'stereo' option to 'channelLayout'
		thisPreset.channelLayout = channelLayoutOptions[ +thisPreset.stereo ][0];

	// convert options from version <= 24.6
	if ( thisPreset.barSpace == 1.5 )
		thisPreset.barSpace = 1;

	if ( +thisPreset.fadePeaks && +thisPreset.showPeaks )
		thisPreset.showPeaks = PEAKS_FADE;

	if ( thisPreset.mode == MODE_LINE )
		thisPreset.mode = MODE_GRAPH;

	if ( ! [ MODE_DISCRETE, MODE_BARS, MODE_GRAPH ].includes( thisPreset.mode ) ) {
		thisPreset.bandCount = thisPreset.mode;
		thisPreset.mode = MODE_BARS;
	}

	if ( +thisPreset.noteLabels && +thisPreset.showScaleX )
		thisPreset.showScaleX = SCALEX_NOTES;

	// assign values read from the preset to the UI controls
	$$('[data-prop]').forEach( el => {
		const prop = el.dataset.prop,
			  val  = thisPreset[ prop ] !== undefined ? thisPreset[ prop ] : init ? defaults[ prop ] : undefined;

		if ( val !== undefined && ( el != elRandomMode || ! keepRandomize ) )
			setControlValue( el, val );
	});

	audioMotion.setOptions( {
		alphaBars      : isSwitchOn( elAlphaBars ),
		ansiBands      : +getControlValue( elAnsiBands ),
		colorMode      : getControlValue( elColorMode ),
		fftSize        : getControlValue( elFFTsize ),
		fillAlpha      : getControlValue( elFillAlpha ),
		frequencyScale : getControlValue( elFreqScale ),
		ledBars        : isSwitchOn( elLedDisplay ),
		linearAmplitude: +getControlValue( elLinearAmpl ),
		lineWidth      : getControlValue( elLineWidth ),
		loRes          : isSwitchOn( elLoRes ),
		lumiBars       : isSwitchOn( elLumiBars ),
		maxFPS         : getControlValue( elMaxFPS ),
		maxFreq        : getControlValue( elRangeMax ),
		minFreq        : getControlValue( elRangeMin ),
		mirror         : getControlValue( elMirror ),
		outlineBars    : isSwitchOn( elOutline ),
		peakFadeTime   : getControlValue( elPeakFade ),
		peakHoldTime   : getControlValue( elPeakHold ),
		radial         : isSwitchOn( elRadial ),
		roundBars      : isSwitchOn( elRoundBars ),
		showFPS        : isSwitchOn( elFPS ),
		showScaleY     : +getControlValue( elScaleY ),
		smoothing      : getControlValue( elSmoothing ),
		spinSpeed      : getControlValue( elSpin ),
		splitGradient  : isSwitchOn( elSplitGrad ),
		weightingFilter: getControlValue( elWeighting )
	} );

	// settings that affect or are affected by other properties must be set by the setProperty() function
	setProperty(
		[ elBackground,
		elBgImageFit,
		elBgImageDim,
		elChnLayout,
		elShowPeaks, // also sets fadePeaks
		elFsHeight,
		elGravity,
		elLinkGrads, // note: this needs to be set before the gradients!
		elSensitivity,
		elReflex,
		elGradient,
		elGradientRight,
		...( keepRandomize ? [] : [ elRandomMode ] ),
		elBarSpace,
		elShowSubtitles,
		elScaleX, // also sets noteLabels
		elMode ]
	);

	if ( key == 'demo' )
		randomizeSettings( true );

	if ( alert )
		notie.alert({ text: 'Settings loaded!' });
}

/**
 * Load list of playlists stored on indexedDB
 * @param [string] key name of the currently selected playlist
 */
async function loadSavedPlaylists( keyName ) {

	// reset UI playlist selection box

	deleteChildren( elPlaylists );

	const item = new Option( 'Select a playlist', '' );
	item.disabled = true;
	item.selected = true;
	elPlaylists.options[ elPlaylists.options.length ] = item;

	// load list of playlists from indexedDB
	let playlists = await get( KEY_PLAYLISTS );

	// migrate playlists from localStorage (for compatibility with versions up to 24.2-beta.1)
	const oldPlaylists = loadFromStorage( KEY_PLAYLISTS );

	if ( oldPlaylists ) {
		for ( const key of Object.keys( oldPlaylists ) ) {
			const plKey    = PLAYLIST_PREFIX + key,
				  contents = loadFromStorage( plKey );

			let songs = [];
			for ( const file of contents )
				songs.push( { file } );

			await set( plKey, songs );  // save playlist to indexedDB
			removeFromStorage( plKey );

			playlists[ key ] = oldPlaylists[ key ];
		}

		await set( KEY_PLAYLISTS, playlists ); // save updated list to indexedDB
		removeFromStorage( KEY_PLAYLISTS );
	}

	// add playlists to the selection box
	if ( playlists ) {
		for ( const key of Object.keys( playlists ) ) {
			const item = new Option( playlists[ key ], key );
			item.dataset.isLocal = '1';
			if ( key == keyName )
				item.selected = true;
			elPlaylists.options[ elPlaylists.options.length ] = item;
		}
	}
}

/**
 * Load a song from the queue into the currently active audio element
 *
 * @param {number}    index to the desired play queue element
 * @param {boolean}   `true` to start playing
 * @returns {Promise} resolves to a boolean indicating success or failure (invalid queue index)
 */
async function loadSong( n, playIt ) {
	const isCurrent = n !== NEXT_TRACK,
		  index     = isCurrent ? n : ( ( playlistPos < queueLength() - 1 ) ? playlistPos + 1 : 0 ),
		  audioEl   = audioElement[ isCurrent ? currAudio : nextAudio ],
		  song      = playlist.children[ index ];

	if ( ! isCurrent )
		setSubtitlesDisplay(); // avoid stuck subtitles on track change

	let success = false;

	if ( song ) {
		if ( isCurrent )
			playlistPos = index;

		addMetadata( song, audioEl );
		loadSubs( audioEl, song );

		if ( song.handle ) {
			// file system mode
			try {
				await song.handle.requestPermission();
				const fileBlob = await song.handle.getFile();
				await loadFileBlob( fileBlob, audioEl, playIt );
				success = true;
			}
			catch( e ) {
				consoleLog( `Error loading ${ song.dataset.file }`, true );
				clearAudioElement( audioEl );
			}
		}
		else {
			// web server mode
			loadAudioSource( audioEl, song.dataset.file );
			try {
				await waitForLoadedData( audioEl );
				if ( isCurrent && playIt )
					audioEl.play();
				success = true;
			}
			catch( e ) {} // error will be handled (logged) by `audioOnError()`
		}

		if ( success ) {
			if ( isCurrent ) {
				updatePlaylistUI();
				loadSong( NEXT_TRACK );
			}
			else
				audioEl.load();
		}
	}

	song.classList.toggle( 'error', ! success );

	if ( ! isCurrent )
		skipping = false; // finished skipping track

	return success;
}

/**
 * Load subtitles file to audio element track
 *
 * @param {object} audio element
 * @param {object|null} song object or `null` to clear subtitles track
 */
async function loadSubs( audioEl, song ) {
	// References:
	// https://www.w3.org/wiki/VTT_Concepts
	// https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API

	const subsTrack = audioEl.querySelector('track');

	// revoke any previous object URL
	if ( isBlob( subsTrack.src ) )
		URL.revokeObjectURL( subsTrack.src );

	let { subs } = song || {};

	if ( song && ! subs && isSwitchOn( elShowSubtitles ) && ! isExternalURL( song.dataset.file ) ) {
		// search for subs for this file
		const { path, baseName } = parsePath( song.dataset.file );
		let contents;

		// playlists saved in v24.6 didn't store the `dirHandle` property
		if ( song.dirHandle || ! song.handle )
			contents = await fileExplorer.getDirectoryContents( path, song.dirHandle );

		if ( contents ) {
			const targetFile = contents.files.find( entry => entry.name.startsWith( baseName ) );
			if ( targetFile && targetFile.subs ) {
				subs = targetFile.subs;
				song.subs = subs; // add the subs to the entry in the play queue
			}
		}
	}

	if ( subs ) {
		const { src, lang, handle } = subs;
		subsTrack.srclang = lang || navigator.language;
		if ( handle ) {
			handle.getFile()
				.then( fileBlob => subsTrack.src = URL.createObjectURL( fileBlob ) )
				.catch( e => {} );
		}
		else
			subsTrack.src = src;
	}
	else {
		subsTrack.removeAttribute('src');
		subsTrack.removeAttribute('srclang');
	}
}

/**
 * Copy the gradient of given key into currentGradient, and render the gradient editor.
 */
function openGradientEdit(key) {
	loadGradientIntoCurrentGradient(key);
	renderGradientEditor();

	// save and delete buttons are enabled for custom gradients only
	toggleDisplay( $('#btn-delete-gradient'), !! gradients[ key ].key );
	toggleDisplay( $('#btn-save-gradient'), !! gradients[ key ].key );
	toggleDisplay( $('#btn-export-gradient'), true );
	toggleDisplay( $('#btn-save-gradient-copy'), true );

	location.href = '#gradient-editor';
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
		key: '', // using this to keep track of the key of the gradient object in the gradient list - will be set by saveGradient()
	};

	renderGradientEditor();

	// for new gradients only the save button is enabled
	toggleDisplay( $('#btn-delete-gradient'), false );
	toggleDisplay( $('#btn-save-gradient'), true );
	toggleDisplay( $('#btn-export-gradient'), false );
	toggleDisplay( $('#btn-save-gradient-copy'), false );

	location.href = '#gradient-editor';
}

/**
 * Play next song on queue
 */
function playNextSong( play ) {

	if ( skipping || elSource.checked || playlistPos > queueLength() - 1 )
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

	[ currAudio, nextAudio ] = [ nextAudio, currAudio ];
	setOverlay();
	setCurrentCover();

	if ( play && audioElement[ currAudio ].src ) { // note: play() on empty element never resolves!
		audioElement[ currAudio ].play()
		.then( () => loadSong( NEXT_TRACK ) )
		.catch( err => {
			// ignore AbortError when play promise is interrupted by a new load request or call to pause()
			if ( err.code != ERR_ABORT ) {
				consoleLog( err, true );
				loadSong( NEXT_TRACK );
				playNextSong( true );
			}
		});
	}
	else
		loadSong( NEXT_TRACK );

	updatePlaylistUI();
	return true;
}

/**
 * Player play/pause control
 */
function playPause( play ) {
	if ( elSource.checked )
		return;
	if ( isPlaying() && ! play ) {
		audioElement[ currAudio ].pause();
		if ( isPIP() )
			pipVideo.pause();
	}
	else
		audioElement[ currAudio ].play().catch( err => {
			// ignore AbortError when play promise is interrupted by a new load request or call to pause()
			if ( err.code != ERR_ABORT ) {
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
	loadSong( n, true );
}

/**
 * Populate background selection
 * uses `bgImages` and `bgVideos` globals
 */
function populateBackgrounds() {
	// basic background options
	let bgOptions = [
		{ value: BG_COVER,   text: 'Album cover'      },
		{ value: BG_BLACK,   text: 'Black'            },
		{ value: BG_DEFAULT, text: 'Gradient default' }
	];

	const basicCount = bgOptions.length,
		  imageCount = bgImages.length,
		  videoCount = bgVideos.length;

	// add image and video files from the backgrounds folder
	bgOptions = [
		...bgOptions,
		...bgImages.map( ( item, idx ) => ({ value: BG_IMAGE + item.name, text: '🖼️ ' + item.name, idx }) ),
		...bgVideos.map( ( item, idx ) => ({ value: BG_VIDEO + item.name, text: '🎬 ' + item.name, idx }) )
	].slice( 0, basicCount + +elBgMaxItems.value ); // coerce field value to number

	if ( videoCount )
		bgOptions.splice( basicCount, 0, { value: BG_VIDEO, text: 'Random video' } );

	if ( imageCount )
		bgOptions.splice( basicCount, 0, { value: BG_IMAGE, text: 'Random image' } );

	populateSelect( elBackground, bgOptions ); // add more background options
}

/**
 * Populate a custom radio buttons element
 *
 * @param element {object}
 * @param options {array} arrays [ value, text ] or objects { value, text, disabled }
 */
function populateCustomRadio( element, options ) {
	const isObject = ! Array.isArray( options[0] );
	for ( const item of ( isObject ? options.filter( i => ! i.disabled ) : options ) ) {
		const name = element.dataset.prop,
			  text = item.text || item[1],
			  val  = item.value || item[0],
			  id   = name + '-' + val,
		 	  button = document.createElement('input'),
		 	  label = document.createElement('label');

		button.name  = name;
		button.id    = id;
		button.type  = 'radio';
		button.value = val;

		label.htmlFor = id;
		label.innerText = text;

		element.append( button, label );
	}
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
		elEnabledGradients.innerHTML +=
			`<label>
				<input type="checkbox" class="enabledGradient" data-grad="${key}" ${gradients[ key ].disabled ? '' : 'checked'}>
				${gradients[ key ].name}<a href="#" data-grad="${key}" class="grad-edit-link">Edit / Export</a>
			</label>`;
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
 * Populate a select element
 *
 * @param element {object}
 * @param options {array} array of `[ value, text ]` arrays or `{ value, text, disabled?, idx? }` objects
 */
function populateSelect( element, options ) {
	const oldValue = element.value;

	if ( ! Array.isArray( options ) )
		options = [ options ]; // ensure options is an array

	deleteChildren( element );

	for ( const item of options.filter( i => i && ! i.disabled ) ) {
		const option = new Option( item.text || item[1], item.value || item[0] );
		if ( item[0] === null )
			option.disabled = true;
		if ( item.idx !== undefined )
			option.idx = item.idx; // index to bgImages or bgVideos arrays (for backgrounds select element only)
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
 * Choose random settings
 *
 * @param [force] {boolean} force change even when not playing
 *                (default true for microphone input, false otherwise )
 */
function randomizeSettings( force = elSource.checked ) {
	if ( ! isPlaying() && ! force )
		return;

	// helper functions
	const isEnabled = prop => ! randomProperties.find( item => item.value == prop ).disabled;

	const randomizeControl = ( el, validate = () => true ) => {
		let attempts = 9; // avoid an infinite loop just in case validation is never satisfied
		do {
			if ( isCustomRadio( el ) ) {
				// custom radio buttons
				const items = el.elements[ el.dataset.prop ];
				items[ randomInt( items.length ) ].checked = true;
			}
			else if ( el.dataset.active !== undefined ) // on/off switches
				el.dataset.active = randomInt();
			else if ( el.step ) {
				// range inputs
				const { min, max, step } = el, // note: these come as strings
					  range = ( max - min ) / step,
					  newVal = randomInt( range + 1 ) * step + +min; // coerce min to number

				setControlValue( el, ( newVal * 10 | 0 ) / 10 ); // fix rounding errors (1 decimal place)
			}
			else // selects
				el.selectedIndex = randomInt( el.options.length );
		} while ( ! validate( getControlValue( el ) ) && attempts-- );

		setProperty( el );
	}

	let props = []; // properties that need to be updated

	if ( isEnabled( RND_PRESETS ) ) {
		const validIndexes = userPresets.map( ( item, index ) => isEmpty( item ) ? null : index ).filter( item => item !== null ),
			  count = validIndexes.length;
		if ( count )
			loadPreset( validIndexes[ randomInt( count ) ], false, false, true );
	}

	if ( isEnabled( RND_MODE ) )
		randomizeControl( elMode );

	if ( isEnabled( RND_ALPHA ) )
		randomizeControl( elAlphaBars );

	if ( isEnabled( RND_BACKGROUND ) )
		randomizeControl( elBackground );

	if ( isEnabled( RND_BGIMAGEFIT ) )
		randomizeControl( elBgImageFit );

	if ( isEnabled( RND_CHNLAYOUT ) )
		randomizeControl( elChnLayout, newVal => newVal != CHANNEL_COMBINED ); // remove dual-combined from randomize

	if ( isEnabled( RND_COLORMODE ) )
		randomizeControl( elColorMode );

	if ( isEnabled( RND_PEAKS ) )
		randomizeControl( elShowPeaks );

	if ( isEnabled( RND_LEDS ) )
		randomizeControl( elLedDisplay );

	if ( isEnabled( RND_LUMI ) )
		randomizeControl( elLumiBars, newVal => ! +newVal || ! audioMotion.overlay || ! isSwitchOn( elLedDisplay ) ); // no LUMI when LEDs are on and background is image or video

	if ( isEnabled( RND_LINEWIDTH ) )
		randomizeControl( elLineWidth );

	if ( isEnabled( RND_FILLOPACITY ) )
		randomizeControl( elFillAlpha );

	if ( isEnabled( RND_BARSPACING ) )
		randomizeControl( elBarSpace );

	if ( isEnabled( RND_OUTLINE ) )
		randomizeControl( elOutline );

	if ( isEnabled( RND_REFLEX ) )
		randomizeControl( elReflex, newVal => newVal != REFLEX_FULL || ! isSwitchOn( elLedDisplay ) ); // no full reflex with LEDs

	if ( isEnabled( RND_RADIAL ) )
		randomizeControl( elRadial );

	if ( isEnabled( RND_ROUND ) )
		randomizeControl( elRoundBars );

	if ( isEnabled( RND_SPIN ) )
		randomizeControl( elSpin );

	if ( isEnabled( RND_SPLIT ) )
		randomizeControl( elSplitGrad );

	if ( isEnabled( RND_MIRROR ) )
		randomizeControl( elMirror );

	if ( isEnabled( RND_GRADIENT ) ) {
		for ( const el of [ elGradient, ...( isSwitchOn( elLinkGrads ) ? [] : [ elGradientRight ] ) ] )
			randomizeControl( el );
	}

}

/**
 * Remove a key from localStorage
 *
 * @param key {string}
 */
function removeFromStorage( key ) {
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
 * Retrieve image and video files from the selected backgrounds folder
 * Data is stored in the `bgImages` and `bgVideos` global arrays
 */
async function retrieveBackgrounds() {
	const bgLocation = elBgLocation.value,
		  imageExtensions = new RegExp( '\\.(' + FILE_EXT_IMAGE.join('|') + ')$', 'i' ),
		  videoExtensions = new RegExp( '\\.(' + FILE_EXT_VIDEO.join('|') + ')$', 'i' );

	bgImages = [];
	bgVideos = [];

	if ( bgLocation == BGFOLDER_SERVER ) {
		try {
			const response = await fetch( BG_DIRECTORY ),
				  content  = await response.text();

			for ( const { url, file } of fileExplorer.parseWebIndex( content ) ) {
				const name = parsePath( file ).baseName;
				if ( imageExtensions.test( file ) )
					bgImages.push( { name, url: BG_DIRECTORY + '/' + url } );
				else if ( videoExtensions.test( file ) )
					bgVideos.push( { name, url: BG_DIRECTORY + '/' + url } );
			}
		}
		catch( e ) {} // fail silently (possibly directory not found on server)
	}
	else if ( bgLocation == BGFOLDER_LOCAL ) {
		const bgDirHandle = await get( KEY_BG_DIR_HANDLE );

		try {
			if ( bgDirHandle ) {
				for await ( const [ name, handle ] of bgDirHandle.entries() ) {
					if ( handle instanceof FileSystemFileHandle ) {
						const isImage = imageExtensions.test( name ),
							  isVideo = videoExtensions.test( name );

						if ( isImage || isVideo ) {
							const file = await handle.getFile(),
								  url  = URL.createObjectURL( file );

							if ( isImage )
								bgImages.push( { name, url } );
							else
								bgVideos.push( { name, url } );
						}
					}
				}
			}
		}
		catch( e ) {} // needs permission to access local device
	}

	if ( bgLocation != BGFOLDER_NONE ) {
		const imageCount = bgImages.length,
			  videoCount = bgVideos.length;

		consoleLog( 'Found ' + ( imageCount + videoCount == 0 ? 'no media' : imageCount + ' image files and ' + videoCount + ' video' ) + ' files in the backgrounds folder' );
	}

	populateBackgrounds();
}

/**
 * Retrieve metadata for files in the play queue
 */
async function retrieveMetadata() {
	// leave when we already have enough concurrent requests pending
	if ( waitingMetadata >= MAX_METADATA_REQUESTS )
		return;

	// find the first play queue item for which we haven't retrieved the metadata yet
	const queueItem = Array.from( playlist.children ).find( el => el.dataset.retrieve );

	if ( queueItem ) {

		let uri    = queueItem.dataset.file,
			revoke = false;

		waitingMetadata++;
		delete queueItem.dataset.retrieve;

		queryMetadata: {
			if ( queueItem.handle ) {
				try {
					if ( await queueItem.handle.requestPermission() != 'granted' )
						break queryMetadata;

					uri = URL.createObjectURL( await queueItem.handle.getFile() );
					revoke = true;
				}
				catch( e ) {
					break queryMetadata;
				}
			}

			try {
				const metadata = await mm.fetchFromUrl( uri, { skipPostHeaders: true } );
				if ( metadata ) {
					addMetadata( metadata, queueItem ); // add metadata to play queue item
					syncMetadataToAudioElements( queueItem );
					if ( ! ( metadata.common.picture && metadata.common.picture.length ) ) {
						getFolderCover( queueItem ).then( cover => {
							queueItem.dataset.cover = cover;
							syncMetadataToAudioElements( queueItem );
						});
					}
				}
			}
			catch( e ) {}

			if ( revoke )
				URL.revokeObjectURL( uri );
		}

		waitingMetadata--;
		retrieveMetadata(); // call again to continue processing the queue
	}
}

/**
 * Release URL objects created for image blobs
 */
function revokeBlobURL( item ) {
	const cover = item.dataset.cover;
	if ( isBlob( cover ) )
		URL.revokeObjectURL( cover );
}

/**
 * Assign the gradient in the global gradients object, register in the analyzer, populate gradients in the config,
 * then close the panel.
 */
function saveGradient( options = {} ) {
	if (currentGradient === null) return;

	if ( ! currentGradient.key || options.imported || options.copy ) {
		let safename = currentGradient.key || generateSafeKeyName( currentGradient.name ); // keep the key when importing, or generate one if not defined
		currentGradient.key = safename;

		// find unique key for new gradient
		let modifier = 1;
		while ( Object.keys( gradients ).some( key => key === currentGradient.key ) && modifier < 1000 ) {
			currentGradient.key = `${safename}-${modifier}`;
			modifier++;
		}

		// if the same name already exists, add a suffix to it
		while ( Object.keys( gradients ).some( key => gradients[ key ].name === currentGradient.name ) )
			currentGradient.name += options.imported ? ' (imported)' : ' (copy)';
	}

	gradients[currentGradient.key] = currentGradient;
	audioMotion.registerGradient(currentGradient.key, currentGradient);
	populateGradients();
	populateEnabledGradients();
	savePreferences(KEY_CUSTOM_GRADS);

	currentGradient = null;
	location.href = '#config';
}

/**
 * Save/update an existing playlist
 */
function savePlaylist( index ) {

	if ( elPlaylists[ index ].value == '' )
		storePlayQueue();
	else if ( ! elPlaylists[ index ].dataset.isLocal )
		notie.alert({ text: 'This is a server playlist which cannot be overwritten.<br>Click "Save as..." to create a new local playlist.', time: 5 });
	else
		notie.confirm({ text: `Overwrite "${elPlaylists[ index ].innerText}" with the current play queue?`,
			submitText: 'Overwrite',
			submitCallback: () => {
				storePlayQueue( elPlaylists[ index ].value );
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled' });
			}
		});
}

/**
 * Save Config Panel preferences to localStorage
 *
 * @param [key] {string} preference to save; if undefined save all preferences (default)
 */
function savePreferences( key ) {
	// helper function
	const getDisabledItems = items => items.map( ( { value, disabled } ) => ( { value, disabled } ) );

	if ( ! key || key == KEY_DISABLED_MODES )
		saveToStorage( KEY_DISABLED_MODES, getDisabledItems( modeOptions ) );

	if ( ! key || key == KEY_DISABLED_BGFIT )
		saveToStorage( KEY_DISABLED_BGFIT, getDisabledItems( bgFitOptions ) );

	if ( ! key || key == KEY_DISABLED_GRADS )
		saveToStorage( KEY_DISABLED_GRADS, Object.keys( gradients ).map( key => ( { value: key, disabled: gradients[ key ].disabled } ) ) );

	if (! key || key == KEY_CUSTOM_GRADS) {
		const customGradients = {};
		Object.keys(gradients)
			.filter( key => gradients[ key ].key ) // if it has a `key` property it's a custom gradient
			.forEach( key => customGradients[key] = gradients[key]);
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
			autoHide   : elAutoHide.checked,
			bgLocation : elBgLocation.value,
			bgMaxItems : elBgMaxItems.value,
			fsHeight   : elFsHeight.value,
			maxFPS     : elMaxFPS.value,
			noDimSubs  : elNoDimSubs.checked,
			noDimVideo : elNoDimVideo.checked,
			pipRatio   : elPIPRatio.value,
			saveDir    : elSaveDir.checked,
			saveQueue  : elSaveQueue.checked
		}
		saveToStorage( KEY_GENERAL_OPTS, generalOptions );
	}

	if ( ! key || key == KEY_PEAK_OPTIONS ) {
		const peakOptions = {
			gravity : elGravity.value,
			peakFade: elPeakFade.value,
			peakHold: elPeakHold.value,
		}
		saveToStorage( KEY_PEAK_OPTIONS, peakOptions );
	}

	if ( ! key || key == KEY_SUBTITLES_OPTS ) {
		const subtitlesOptions = {
			background: elSubsBackground.value,
			color     : elSubsColor.value,
			position  : elSubsPosition.value
		}
		saveToStorage( KEY_SUBTITLES_OPTS, subtitlesOptions );
	}
}

/**
 * Save an object to localStorage in JSON format
 *
 * @param {string} item key
 * @param {object} data object
 */
function saveToStorage( key, data ) {
	localStorage.setItem( key, JSON.stringify( data ) );
}

/**
 * Save or update a user preset
 *
 * @param {number} slot index (0-8)
 * @param {object} settings object
 * @param [{boolean}] force overwriting existing content
 */
function saveUserPreset( index, options, name, force ) {
	const userPresetText = `User Preset #${ index + 1 }`,
		  currentName    = userPresets[ index ].name || '', // avoid undefined
		  isFullscreen   = audioMotion.isFullscreen,
		  confirmTimeout = 5;

	// Show warning messages on attempt to overwrite existing preset
	if ( ! isEmpty( userPresets[ index ] ) && ! force && overwritePreset !== index ) {
		if ( isFullscreen ) {
			setCanvasMsg( `Overwrite ${ userPresetText } - Press again to confirm!`, confirmTimeout );
			overwritePreset = index;
			setTimeout( () => {
				if ( overwritePreset === index )
					overwritePreset = false;
			}, confirmTimeout * 1000 );
		}
		else {
			notie.confirm({
				text: `Do you really want to overwrite ${ userPresetText }?<br>${ currentName }`,
				submitText: 'Overwrite',
				submitCallback: () => {	saveUserPreset( index, options, name, true ); }, // force save
				cancelCallback: () => {	notie.alert({ text: 'Canceled!' }) }
			});
		}
		return;
	}

	overwritePreset = false;

	if ( ! name || ! `${ name }`.trim() ) { // coerce to string, but check for falsy values first (avoid strings like 'undefined')
		if ( isFullscreen )
			name = '';
		else {
			notie.input({
				text: 'Give this preset a name or short description',
				submitText: 'Save',
				value: currentName,
				maxlength: 40,
				submitCallback: newName => { saveUserPreset( index, options, newName.trim() || PRESET_NONAME, true ); },
				cancelCallback: () => {	notie.alert({ text: 'Save canceled!' }) }
			});
			return;
		}
	}

	// avoid saving the placeholder text
	if ( name == PRESET_NONAME )
		name = '';

	// Update presets array in memory and save updated contents to storage
	userPresets[ index ] = { name, options };
	saveToStorage( KEY_CUSTOM_PRESET, userPresets );

	const text = `Saved to ${ userPresetText }`;
	if ( isFullscreen )
		setCanvasMsg( text, 5 );
	else
		notie.alert({ text });
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
 * Set the background image CSS variable
 */
function setBackgroundImage( url ) {
	document.documentElement.style.setProperty( '--background-image', url ? `url('${ url.replace( /['()]/g, '\\$&' ) }')` : 'none' );
}

/**
 * Set message for on-screen display
 *
 * @param msg {number|string} number indicates information level (0=none; 1=song info; 2=full info)
 *                            string provides a custom message to be displayed at the top
 * @param [timer] {number} time in seconds to display message (1/3rd of it will be used for fade in/out)
 * @param [dir] {number} 1 for fade-in; -1 for fade-out (default)
 */
function setCanvasMsg( msg, timer = 2, dir = -1 ) {
	if ( ! msg )
		canvasMsg = { endTime: 0, msgTimer: 0 }; // clear all canvas messages
	else {
		const now = performance.now(),
		 	  targetTime = now + timer * 1000;
		if ( msg == +msg ) { // msg is a number
			canvasMsg.info = msg; // set info level 1 or 2
			canvasMsg.startTime = now;
			canvasMsg.endTime = Math.max( targetTime, canvasMsg.endTime || 0 ); // note: Infinity | 0 == 0
			canvasMsg.fade = ( timer == Infinity ) ? 0 : timer / 3 * dir;
		}
		else {
			canvasMsg.msg = msg;  // set custom message
			if ( canvasMsg.info == 2 )
				canvasMsg.info = 1;
			canvasMsg.msgTimer = targetTime;
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
	elAutoHide.checked  = options.autoHide;
	elBgLocation.value  = options.bgLocation;
	elBgMaxItems.value  = options.bgMaxItems;
	elFsHeight.value    = options.fsHeight;
	elMaxFPS.value      = options.maxFPS;
	elNoDimSubs.checked = options.noDimSubs;
	elNoDimVideo.checked= options.noDimVideo;
	elOSDFontSize.value = options.osdFontSize;
	elPIPRatio.value    = options.pipRatio;
	elSaveDir.checked   = options.saveDir;
	elSaveQueue.checked = options.saveQueue;
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
 * Set overlay options, based on selected background and current media content (audio or video)
 *
 * @return {boolean} overlay status
 */
function setOverlay() {
	const bgOption  = elBackground.value[0],
		  hasSubs   = isSwitchOn( elShowSubtitles ) && !! audioElement[ currAudio ].querySelector('track').src,
		  isVideo   = isVideoLoaded(),
		  isOverlay = isVideo || hasSubs || ( bgOption != BG_DEFAULT && bgOption != BG_BLACK );

	// set visibility of video elements
	for ( const audioEl of audioElement )
		audioEl.style.display = ( isVideo || hasSubs ) && audioEl == audioElement[ currAudio ] ? '' : 'none';

	audioMotion.overlay = isOverlay;
	audioMotion.showBgColor = ! isVideo && bgOption == BG_DEFAULT;

	// enable/disable background image
	elContainer.style.backgroundImage = isVideo ? 'none' : 'var(--background-image)';
	// set visibility of background video layer
	elVideo.style.display = isVideo || bgOption != BG_VIDEO ? 'none' : '';
	// enable/disable background dim layer
	elDim.style.display = ( isVideo && elNoDimVideo.checked ) || ( hasSubs && elNoDimSubs.checked ) ? 'none' : '';

	return isOverlay;
}

/**
 * Set peak behavior options
 */
function setPeakOptions( options ) {
	elGravity.value  = options.gravity;
	elPeakFade.value = options.peakFade;
	elPeakHold.value = options.peakHold;
}

/**
 * Set audioMotion properties
 *
 * @param {object|array} a DOM element object or array of objects
 * @param {boolean} `true` (default) to save current settings to last used preset
 */
function setProperty( elems, save = true ) {
	if ( ! Array.isArray( elems ) )
		elems = [ elems ];

	const toggleGradients = () => elGradientRight.style.display = ( getControlValue( elChnLayout ) == CHANNEL_SINGLE || isSwitchOn( elLinkGrads ) ) ? 'none' : '';

	for ( const el of elems ) {
		switch ( el ) {
			case elAlphaBars:
				audioMotion.alphaBars = isSwitchOn( elAlphaBars );
				break;

			case elAnsiBands:
				audioMotion.ansiBands = +getControlValue( elAnsiBands );
				break;

			case elAutoHide:
				toggleMediaPanel( true );
				break;

			case elBackground:
				const bgOption  = elBackground.value[0],
					  index     = elBackground[ elBackground.selectedIndex ].idx,
					  isOverlay = setOverlay(); // configures overlay for video playback or background media

				if ( bgOption == BG_VIDEO ) {
					setBackgroundImage(); // clear background image

					// if there's no index, pick a random video from the array
					const url = bgVideos[ index === undefined ? randomInt( bgVideos.length ) : index ].url;

					// avoid restarting the video if it's the same file already in use
					// note: github-pages-directory-listing doesn't generate encoded URLs (non-standard)
					try {
						if ( ! decodeURIComponent( elVideo.src ).endsWith( decodeURIComponent( url ) ) )
							elVideo.src = url;
					}
					catch ( e ) { // in case decodeURIComponent() fails
						elVideo.src = url;
					}
				}
				else {
					if ( isOverlay && ! [ BG_DEFAULT, BG_BLACK ].includes( bgOption ) ) {
						if ( bgOption == BG_COVER )
							setBackgroundImage( coverImage.src );
						else
							setBackgroundImage( bgImages[ index === undefined ? randomInt( bgImages.length ) : index ].url );
					}
					else
						setBackgroundImage();
				}
				break;

			case elBandCount:
				setControlValue( elMode, getControlValue( elBandCount ) ); // note: elBandCount value must be translated by getControlValue()
				setProperty( elMode, false );
				break;

			case elBarSpace:
				const value = getControlValue( elBarSpace );
				audioMotion.barSpace = audioMotion.isLumiBars || value == 1 ? 1.5 : value;
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

			case elBgLocation:
				if ( elBgLocation.value == BGFOLDER_LOCAL ) {
					window.showDirectoryPicker({ startIn: 'pictures' })
						.then( handle => {
							set( KEY_BG_DIR_HANDLE, handle );
						})
						.catch( e => {
							// disable if user denies access
							elBgLocation.value = BGFOLDER_NONE;
							del( KEY_BG_DIR_HANDLE );
						})
						.finally( () => retrieveBackgrounds() );
				}
				else {
					del( KEY_BG_DIR_HANDLE );
					retrieveBackgrounds();
				}
				break;

			case elBgMaxItems:
				populateBackgrounds();
				break;

			case elChnLayout:
				audioMotion.channelLayout = getControlValue( elChnLayout );
				toggleGradients();
				break;

			case elColorMode:
				audioMotion.colorMode = getControlValue( elColorMode );
				break;

			case elFillAlpha:
				audioMotion.fillAlpha = elFillAlpha.value;
				break;

			case elFFTsize :
				audioMotion.fftSize = getControlValue( elFFTsize );
				consoleLog( 'FFT size is ' + audioMotion.fftSize + ' samples' );
				break;

			case elFPS:
				audioMotion.showFPS = isSwitchOn( elFPS );
				break;

			case elFreqScale:
				audioMotion.frequencyScale = getControlValue( elFreqScale );
				break;

			case elFsHeight:
				elAnalyzer.style.height = `${elFsHeight.value}%`;
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
				audioMotion.linearAmplitude = +getControlValue( elLinearAmpl );
				break;

			case elLineWidth:
				audioMotion.lineWidth = elLineWidth.value;
				break;

			case elLinkGrads:
				toggleGradients();
				if ( isSwitchOn( elLinkGrads ) )
					setProperty( elGradient, false );
				break;

			case elLoRes:
				audioMotion.loRes = isSwitchOn( elLoRes );
				break;

			case elLumiBars:
				audioMotion.lumiBars = isSwitchOn( elLumiBars );
				setProperty( elBarSpace, false );
				break;

			case elMaxFPS:
				audioMotion.maxFPS = elMaxFPS.value;
				break;

			case elMirror:
				audioMotion.mirror = getControlValue( elMirror );
				break;

			case elMode:
				const mode = getControlValue( elMode );
				audioMotion.mode = ( mode == MODE_BARS ) ? getControlValue( elBandCount ) : mode;
				setProperty( elBarSpace, false );
				break;

			case elMute:
				toggleMute();
				break;

			case elNoDimSubs:
			case elNoDimVideo:
				setOverlay();
				break;

			case elOSDFontSize:
				computeFontSizes();
				break;

			case elOutline:
				audioMotion.outlineBars = isSwitchOn( elOutline );
				break;

			case elGravity:
				audioMotion.gravity = elGravity.value;
				break;

			case elPeakFade:
				audioMotion.peakFadeTime = elPeakFade.value;
				break;

			case elPeakHold:
				audioMotion.peakHoldTime = elPeakHold.value;
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
					randomModeTimer = setInterval( randomizeSettings, 2500 * option );

				break;

			case elRangeMin:
			case elRangeMax:
				while ( +elRangeMax.value <= +elRangeMin.value )
					elRangeMax.selectedIndex++;
				audioMotion.setFreqRange( elRangeMin.value, elRangeMax.value );
				break;

			case elReflex:
				switch ( getControlValue( elReflex ) ) {
					case REFLEX_ON:
						audioMotion.reflexRatio = .4;
						audioMotion.reflexAlpha = .2;
						break;

					case REFLEX_FULL:
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

			case elSaveDir:
				if ( elSaveDir.checked )
					saveLastDir( fileExplorer.getPath() );
				else {
					del( KEY_LAST_DIR ); // IndexedDB
					removeFromStorage( KEY_LAST_DIR );
				}
				break;

			case elSaveQueue:
				if ( elSaveQueue.checked )
					storePlayQueue( true );
				else
					del( KEY_PLAYQUEUE );
				break;

			case elScaleX:
				audioMotion.showScaleX = getControlValue( elScaleX ) != SCALEXY_OFF;
				audioMotion.noteLabels = getControlValue( elScaleX ) == SCALEX_NOTES;
				break;

			case elScaleY:
				audioMotion.showScaleY = +getControlValue( elScaleY );
				break;

			case elSensitivity:
				const sensitivity = getControlValue( elSensitivity );
				audioMotion.setSensitivity(
					$(`.min-db[data-preset="${sensitivity}"]`).value,
					$(`.max-db[data-preset="${sensitivity}"]`).value
				);
				audioMotion.linearBoost = $(`.linear-boost[data-preset="${sensitivity}"]`).value;
				break;

			case elShowPeaks:
				audioMotion.showPeaks = getControlValue( elShowPeaks ) != PEAKS_OFF;
				audioMotion.fadePeaks = getControlValue( elShowPeaks ) == PEAKS_FADE;
				break;

			case elShowSubtitles:
				setSubtitlesDisplay();
				break;

			case elSmoothing:
				audioMotion.smoothing = elSmoothing.value;
				consoleLog( 'smoothingTimeConstant is ' + audioMotion.smoothing );
				break;

			case elSource:
				const isMic = elSource.checked;
				save = false; // last config will be updated by the callback
				setSource( isMic, success => {
					if ( isMic && success ) {
						// mute the output to avoid feedback loop from the microphone
						wasMuted = elMute.checked;
						toggleMute( true );
					}
					else if ( ! isMic )
						toggleMute( !! wasMuted ); // false if undefined
					updateLastConfig();
				});
				break;

			case elSpin:
				audioMotion.spinSpeed = elSpin.value;
				break;

			case elSplitGrad:
				audioMotion.splitGradient = isSwitchOn( elSplitGrad );
				break;

			case elSubsBackground:
			case elSubsColor:
				setSubtitlesColors();
				break;

			case elSubsPosition:
				setSubtitlesPosition( { target: audioElement[ currAudio ].querySelector('track') } );
				break;

			case elWeighting:
				audioMotion.weightingFilter = getControlValue( elWeighting );
				break;

		} // switch

		if ( save ) {
			if ( generalOptionsElements.includes( el ) )
				savePreferences( KEY_GENERAL_OPTS );
			else if ( peakOptionsElements.includes( el ) )
				savePreferences( KEY_PEAK_OPTIONS );
			else if ( subtitlesElements.includes( el ) )
				savePreferences( KEY_SUBTITLES_OPTS );
			else
				updateLastConfig();
		}

	} // for

}

/**
 * Change audio input source
 *
 * @param {boolean}  `true` for microphone source
 * @param {function} callback (passed boolean indicating success of request)
 */
async function setSource( isMicSource, callback ) {

	// update UI control value, when setting via preset definition
	elSource.checked = isMicSource;

	if ( isMicSource ) {
		// try to get access to user's microphone
		if ( navigator.mediaDevices ) {
			navigator.mediaDevices.getUserMedia( { audio: true } )
			.then( stream => {
				micStream = audioMotion.audioCtx.createMediaStreamSource( stream );
				if ( isPlaying() )
					audioElement[ currAudio ].pause();
				audioMotion.connectInput( micStream );
				consoleLog( 'Audio source set to microphone' );
			})
			.catch( err => {
				consoleLog( `Could not change audio source - ${err}`, true );
				elSource.checked = false;
			})
			.finally( () => {
				if ( callback )
					callback( elSource.checked );
			});
		}
		else {
			consoleLog( 'Cannot access user microphone', true );
			elSource.checked = false;
			if ( callback )
				callback( false );
		}
	}
	else {
		if ( micStream ) {
			audioMotion.disconnectInput( micStream );
			micStream.mediaStream.getTracks()[0].stop(); // stop (release) stream
			micStream = null;
		}
		consoleLog( 'Audio source set to built-in player' );
		if ( callback )
			callback( true );
	}

}

/**
 * Set subtitles color and background preferences
 */
function setSubtitlesColors() {
	// remove all CSS classes related to subtitles
	elContainer.className = elContainer.className.replace( new RegExp( `(${ SUBS_CSS_BG }|${ SUBS_CSS_COLOR }).*`, 'gi' ), '' ); // /(subs-bg-|subs-color-).*/gi
	// add classes for the current settings
	elContainer.classList.add( SUBS_CSS_BG + elSubsBackground.value, SUBS_CSS_COLOR + elSubsColor.value );
}

/**
 * Set display of subtitles
 */
function setSubtitlesDisplay() {
	for ( const audioEl of audioElement ) {
		audioEl.textTracks[0].mode = 'hidden'; // clear any remaining subtitles on track change or playback stop
		if ( isSwitchOn( elShowSubtitles ) )
			audioEl.textTracks[0].mode = 'showing';
	}
	setOverlay();
}

/**
 * Set subtitles configuration options
 */
function setSubtitlesOptions( options ) {
	elSubsBackground.value = options.background;
	elSubsColor.value      = options.color;
	elSubsPosition.value   = options.position;
}

/**
 * Set the vertical position of all subtitle "cues"
 *
 * @param {object} event
 */
function setSubtitlesPosition( event ) {
	if ( ! event.target.track )
		return;

	let align, line, snap = false;

	switch( elSubsPosition.value ) {
		case SUBS_POS_BOTTOM:
			align = 'end';
			line  = 95;
			break;

		case SUBS_POS_CENTER:
			align = 'center';
			line  = 50;
			break;

		default: // SUBS_POS_TOP
			align = 'start';
			line  = 1;
			snap  = true;
	}

	// https://developer.mozilla.org/en-US/docs/Web/API/VTTCue
	for ( const cue of event.target.track.cues ) {
		cue.line        = line;
		cue.snapToLines = snap;  // when false, `line` represents a percentage
		cue.lineAlign   = align; // ignored by Chromium; doesn't seem to work as expected on Firefox (v125)
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
	// collapse front panel on analyzer hover
	let autoHideTimeout;
	elContainer.addEventListener( 'mouseenter', () => {
		if ( elAutoHide.checked && ! audioMotion.isFullscreen )
			autoHideTimeout = setTimeout( () => toggleMediaPanel( false ), AUTOHIDE_DELAY );
	});
	elContainer.addEventListener( 'mouseleave', () => clearTimeout( autoHideTimeout ) );

	// toggle front panel button (expand/collapse)
	elTogglePanel.addEventListener( 'click', () => toggleMediaPanel() );

	// wait for the transition on the analyzer container to end (triggered by the height change from toggleMediaPanel())
	elContainer.addEventListener( 'transitionend', () => {
		if ( elContainer.style.height ) {
			for ( const panel of mainPanels )
				$(`#${ panel.id }`).style.display = 'none'; // hide main panels
		}

 		// restore overflow on body (keep the scroll bar always visible when the window is too short)
		document.body.style.overflowY = window.innerHeight < WINDOW_MIN_HEIGHT ? 'scroll' : '';
	});

	// main panel selection
	const elPanelSelection = $('#panel_selection');
	for ( const { id, label } of mainPanels ) {
		const button_id = `panel_${ id }`;
		elPanelSelection.innerHTML += `<input type="radio" name="panel" id="${ button_id }" value="${ id }"><label class="thin-button" for="${ button_id }">${ label }</label>`;
	}
	elToggleConsole = $('label[for="panel_console"]');

	const panelButtons = elPanelSelection.panel; // RadioNodeList
	panelButtons.forEach( btn => {
		btn.addEventListener( 'click', evt => {
			panelButtons.forEach( el => $(`#${ el.value }`).classList.toggle( 'active', el == evt.target ) );
			toggleMediaPanel( true ); // make sure the main panel is expanded
			if ( btn.value == 'console' ) {
				elToggleConsole.classList.remove('warning');
				consoleLog(); // update scroll only
			}
		});
	});
	// make the first panel visible on initialization
	$(`#panel_${ mainPanels[0].id }`).checked = true;
	elMediaPanel.classList.add('active');

	// clear console
	$('#console-clear').addEventListener( 'click', () => consoleLog( 'Console cleared.', false, true ) );

	// settings switches
	$$('.switch').forEach( el => {
		el.addEventListener( 'click', () => {
			el.dataset.active = +!+el.dataset.active;
			setProperty( el );
		});
	});

	// settings combo boxes and sliders
	$$('[data-prop]').forEach( el => {
		if ( isCustomRadio( el ) ) {
			el.elements[ el.dataset.prop ].forEach( btn => {
				btn.addEventListener( 'click', () => setProperty( el ) );
			});
		}
		else { // 'input' event is triggered for select and input elements
			el.addEventListener( 'input', () => {
				setProperty( el );
				updateRangeValue( el );
			});
		}
	});

	// helper debounce function - thanks https://www.freecodecamp.org/news/javascript-debounce-example/
	const debounce = ( func, timeout = 300 ) => {
		let timer;
		return ( ...args ) => {
			clearTimeout( timer );
			timer = setTimeout( () => func.apply( this, args ), timeout );
		}
	}

	// volume knob
	let wheelTimer;
	elVolume.addEventListener( 'wheel', e => {
		e.preventDefault(); // prevent scrolling the window
		if ( wheelTimer )
			return;
		wheelTimer = setTimeout( () => wheelTimer = false, 50 ); // 50ms delay for reduced mouse/touchpad sensitivity on Mac
		const incr = Math.sign( e.deltaY || 0 );
		changeVolume( incr );
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

	// song progress
	elSongProgress.addEventListener( 'input', () => {
		const audioEl = audioElement[ currAudio ],
			  { duration } = audioEl;
		if ( ! duration || duration == Infinity ) {
			elSongProgress.value = 0;
			return;
		}
		audioEl.currentTime = duration * elSongProgress.value;
	});

	// load / save presets

	$('#load_preset').addEventListener( 'click', () => {
		const choices = [];

		presets.forEach( item => {
			if ( ! isEmpty( item.options ) )
				choices.push( { text: item.name + ( item.key == 'default' ? ' (warning: resets Volume!)' : '' ), handler: () => loadPreset( item.key ) } );
		});

		choices.push({
			text: '<strong>USER PRESETS →</strong>', handler: () => {
				const userChoices = [];
				getUserPresets().forEach( ( text, index ) => {
					userChoices.push( { text, handler: () => loadPreset( index ) } );
				});
				notie.select({
					text: 'LOAD PRESET:',
					choices: userChoices
				});
			}
		});

		notie.select({
			text: 'LOAD PRESET:',
			choices
		});
	});

	$('#btn_save').addEventListener( 'click', () => {
		const choices = [];
		getUserPresets().forEach( ( text, index ) => {
			const options = userPresets[ index ].options;
			choices.push(
				{ type: 1, text, handler: () => saveUserPreset( index, getCurrentSettings() ) },
				{ type: 2, text: isEmpty( options ) ? '' : '<button title="Edit name">&#xf11f;</button>', handler: () => saveUserPreset( index, options, '', true ) },
				{ type: 2, text: isEmpty( options ) ? '' : '<button title="Delete preset">&#xf120;</button>', handler: () => eraseUserPreset( index ) }
			);
		});

		notie.select({
			text: '<strong>Click slot to SAVE - Use buttons to Edit or Delete</strong>',
			choices
		});
	});

	// playlist controls

	$('#btn_clear').addEventListener( 'click', () => {
		clearPlayQueue();
		storePlayQueue( true );
	});

	$('#create_playlist').addEventListener( 'click', () => storePlayQueue() );
	$('#delete_playlist').addEventListener( 'click', () => deletePlaylist( elPlaylists.selectedIndex ) );

	$('#load_playlist').addEventListener( 'click', () => {
		loadPlaylist( { file: elPlaylists.value } ).then( n => {
			const text = ( n == -1 ) ? 'No playlist selected' : `${n} song${ n > 1 ? 's' : '' } added to the queue`;
			notie.alert({ text, time: 5 });
		});
	});

	$('#save_playlist').addEventListener( 'click', () => savePlaylist( elPlaylists.selectedIndex ) );

	// clicks on canvas toggle info display on/off
	elOSD.addEventListener( 'click', () => toggleInfo() );

	// use server/local music button
	const btnToggleFS = $('#btn_toggle_filesystem'),
		  setToggleButtonText = () => btnToggleFS.innerText = `Switch to ${ useFileSystemAPI ? 'Server' : 'Device' }`;

	if ( ! serverHasMedia && ! useFileSystemAPI || ! supportsFileSystemAPI )
		btnToggleFS.style.display = 'none';
	else {
		setToggleButtonText();
		btnToggleFS.addEventListener( 'click', async () => {
			useFileSystemAPI = ! useFileSystemAPI;
			const lastDir = useFileSystemAPI ? await get( KEY_LAST_DIR ) : loadFromStorage( KEY_LAST_DIR );
			if ( ! useFileSystemAPI || ! lastDir || await lastDir[0].handle.requestPermission() == 'granted' ) {
				fileExplorer.switchMode( lastDir );
				setToggleButtonText();
				saveToStorage( KEY_FORCE_FS_API, useFileSystemAPI );
			}
			else // revert on permission deny
				useFileSystemAPI = false;
		});
	}

	// add selected / all files buttons
	const btnAddSelected = $('#btn_add_selected'),
		  btnAddFolder   = $('#btn_add_folder');

	if ( serverHasMedia || useFileSystemAPI ) {
		btnAddSelected.addEventListener( 'mousedown', () => addBatchToPlayQueue( fileExplorer.getCurrentFolderContents('.selected') ) );
		btnAddFolder.addEventListener( 'click', () => addBatchToPlayQueue( fileExplorer.getCurrentFolderContents() ) );
	}
	else {
		btnAddSelected.style.display = 'none';
		btnAddFolder.style.display = 'none';
	}

	// local file upload - disabled when the File System API is supported
	const uploadBtn = $('#local_file');
	if ( supportsFileSystemAPI )
		uploadBtn.parentElement.style.display = 'none';
	else
		uploadBtn.addEventListener( 'change', e => loadLocalFile( e.target ) );

	// load remote files from URL
	$('#btn_load_url').addEventListener( 'click', () => {
		notie.input({
			text: 'Load audio file or stream from URL',
			submitText: 'Load',
			submitCallback: url => {
				if ( url.trim() ) {
					addToPlayQueue( { file: url }, true );
					storePlayQueue( true );
				}
			}
		});
	});

	// toggle Fullscreen
	$('#btn_fullscreen').addEventListener( 'click', fullscreen );

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
	$('#add-gradient').addEventListener('click', () => openGradientEditorNew() );
	$('#btn-save-gradient').addEventListener( 'click', () => saveGradient() );
	$('#btn-save-gradient-copy').addEventListener( 'click', () => saveGradient({ copy: true }) );
	$('#btn-delete-gradient').addEventListener('click', () => {
		notie.confirm({
			text: `Do you really want to DELETE <strong>${ currentGradient.name }</strong>?<br>THIS CANNOT BE UNDONE!`,
			submitText: 'DELETE',
			submitCallback: () => deleteGradient()
		});
	});

	const btnExportGradient = $('#btn-export-gradient');
	btnExportGradient.addEventListener( 'click', () => {
		btnExportGradient.setAttribute( 'href', encodeJSONDataURI( currentGradient ) );
		btnExportGradient.setAttribute( 'download', `audioMotion-gradient-${ currentGradient.key }.json` );
	});

	const btnImportGradient = $('#import_gradient');
	btnImportGradient.addEventListener( 'input', () => {
		const fileBlob = btnImportGradient.files[0];
		btnImportGradient.value = ''; // clear file (needed for the event to trigger if user loads the same file again)
		fileBlob.text().then( contents => {
			try {
				currentGradient = JSON.parse( contents );
			}
			catch ( e ) {
				consoleLog( e, true );
				return;
			}
			saveGradient({ imported: true });
		});
	});

	$('#new-gradient-bkgd').addEventListener('input', (e) => {
		currentGradient.bgColor = e.target.value;
	});

	$('#new-gradient-name').addEventListener('input', (e) => {
		currentGradient.name = e.target.value;
	});

	$('#new-gradient-horizontal').addEventListener('input', (e) => {
		currentGradient.dir = e.target.checked ? 'h' : undefined;
	});

	// Config panel accordion
	const accordionItems = $$('details');
	accordionItems.forEach( el => {
		el.addEventListener( 'click', () => {
			if ( ! el.open )
				accordionItems.forEach( item => item.open = false );
		});
	});

	// Export / import settings

	const btnExportSettings = $('#export_settings');
	btnExportSettings.addEventListener( 'click', () => {
		btnExportSettings.setAttribute( 'href', encodeJSONDataURI( getCurrentSettings() ) );
		btnExportSettings.setAttribute( 'download', 'audioMotion-settings.json' );
	});

	const btnImportSettings = $('#import_settings');
	btnImportSettings.addEventListener( 'input', () => {
		const fileBlob = btnImportSettings.files[0];
		btnImportSettings.value = ''; //
		notie.confirm({
			text: 'ATTENTION!<br>This will overwrite all current options in the <strong>Settings</strong> and <strong>Advanced</strong> panels!',
			submitText: 'Continue',
			submitCallback: () => {
				fileBlob.text().then( contents => {
					try {
						loadPreset( JSON.parse( contents ) );
					}
					catch ( e ) {
						consoleLog( e, true );
					}
				});
			}
		});
	});
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
	storePlayQueue( true );
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
 * Store the contents of the play queue into a playlist in indexedDB
 *
 * @param {String|Boolean} playlist name or _true_ to save to the last used play queue
 * @param {Boolean} true to force overwritting an existing playlist
 */
async function storePlayQueue( name, update = true ) {

	const isSaveQueue = name == true;

	if ( isSaveQueue && ! elSaveQueue.checked )
		return;

	if ( queueLength() == 0 && ! isSaveQueue ) {
		notie.alert({ text: 'Queue is empty!' });
		return;
	}

	if ( name ) {
		let safename;

		if ( ! isSaveQueue && ! update ) {
			safename = generateSafeKeyName( name, '_' );

			let playlists = await get( KEY_PLAYLISTS ) || {},
				attempt   = 0,
				basename  = safename;

			while ( playlists.hasOwnProperty( safename ) && attempt < 1000 ) {
				safename = basename + '_' + attempt;
				attempt++;
			}

			playlists[ safename ] = name;
			await set( KEY_PLAYLISTS, playlists ); // save list to indexedDB
			loadSavedPlaylists( safename );
		}

		let songs = [];

		for ( const item of playlist.childNodes ) {
			const { album, artist, codec, duration, file, title } = item.dataset,
				  { handle, dirHandle } = item;
			songs.push( { file, handle, dirHandle, content: { album, artist, codec, duration, title } } );
		}

		if ( isSaveQueue )
			set( KEY_PLAYQUEUE, songs );
		else
			set( PLAYLIST_PREFIX + safename, songs ).then( () => notie.alert({ text: `Playlist saved!` }) );
	}
	else {
		notie.input({
			text: 'Give this playlist a name:',
			submitText: 'Save',
			submitCallback: value => {
				if ( value )
					storePlayQueue( value, false );
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled' });
			}
		});
		return;
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
 * Expand/collapse the front panel and adjust the canvas height
 *
 * @param {boolean} `true` to expand or `false` to collapse the front panel; if undefined, toggles the current state
 */
function toggleMediaPanel( show ) {
	if ( show === undefined )
		show = !! elContainer.style.height;

	// disable overflow to avoid scrollbar while the analyzer area is expanding (when the window is tall enough)
	// it will be restored by the `transitionend` event listener on the container, set in setUIEventListeners()
	if ( window.innerHeight >= WINDOW_MIN_HEIGHT )
		document.body.style.overflowY = 'hidden';

	// show main panels (hidden by the `transitionend` event listener)
	if ( show ) {
		for ( const panel of mainPanels )
			$(`#${ panel.id }`).style.display = '';
	}

	const minPanelHeight = $('.player-panel').clientHeight + $('.bottom-panel').clientHeight + 10;
	elContainer.style.height = show ? '' : `calc( 100vh - ${ minPanelHeight }px )`;
	elTogglePanel.classList.toggle( 'closed', ! show );
}

/**
 * Toggle display of song and settings information on canvas
 */
function toggleInfo() {
	if ( canvasMsg.endTime < performance.now() )
		canvasMsg.info = 0; // reset info flag if display time has ended
	if ( canvasMsg.info == 2 )
		setCanvasMsg(); // if already showing all info, turn it off
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
 * Update last used configuration
 */
function updateLastConfig() {
	saveToStorage( KEY_LAST_CONFIG, {
		...getCurrentSettings(),
		micSource: elSource.checked,
		mute     : elMute.checked,
		volume   : elVolume.dataset.value,
	});
}

/**
 * Update range elements value div
 */
function updateRangeValue( el ) {
	const elVal = el.previousElementSibling;
	if ( ! elVal || elVal.className != 'value' )
		return;

	const translation = val => {
		if ( el == elBandCount ) {
			return [
				'',
				'10 bands (octaves)',
				'20 bands (half octaves)',
				'30 bands (1/3rd oct.)',
				'40 bands (1/4th oct.)',
				'60 bands (1/6th oct.)',
				'80 bands (1/8th oct.)',
				'120 bands (1/12th oct.)',
				'240 bands (1/24th oct.)'
			][ +val || 0 ];
		}
		else if ( el == elBarSpace )
			return val == 0 ? 'None' : ( val == 1 ? 'Legacy' : `${ val * 100 | 0 }%` );
		else if ( el == elFillAlpha )
			return val == 0 ? 0 : `${ val * 100 | 0 }%`;
		else if ( el == elSpin )
			return val == 0 ? 'OFF' : val + ' RPM';
		return val;
	}

	elVal.innerText = translation( el.value );
}


/**
 *  MAIN FUNCTION
 * ------------------------------------------------------------------------------------------------
 */
( async function() {

	// Callback function to handle canvas size changes (onCanvasResize)
	const showCanvasInfo = ( reason, instance ) => {
		// resize OSD canvas and recalculate variables used for info display
		// note: the global `audioMotion` object is not set yet during the `create` event, so we must pass the instance
		computeFontSizes( instance );

		let msg;

		switch ( reason ) {
			case 'create':
				consoleLog( `Display resolution: ${ instance.fsWidth } x ${ instance.fsHeight } px (pixelRatio: ${ window.devicePixelRatio })` );
				msg = 'Canvas created';
				break;
			case 'lores':
				msg = `Lo-res ${ instance.loRes ? 'ON' : 'OFF' } (pixelRatio = ${ instance.dPR })`;
				break;
			case 'fschange':
				msg = `${ instance.isFullscreen ? 'Enter' : 'Exit' }ed fullscreen`;
				break;
			case 'user' :
				msg = `${ isPIP() ? 'Resized for' : 'Closed' } PIP`;
				break;
			default:
				// don't display any message for window/canvas resizing
				return;
		}

		consoleLog( `${ msg || reason }. Canvas size is ${ instance.canvas.width } x ${ instance.canvas.height } px` );
	}

	/**
	 * Callback function to display on-screen messages (onCanvasDraw)
	 *
	 * Uses global object canvasMsg
	 * canvasMsg = {
	 * 		info     : <number>, // 1 = song info; 2 = song & settings info
	 * 		endTime  : <number>, // timestamp (in milliseconds) up to when info should be displayed
	 *      startTime: <number>, // initial timestamp (for fade-in control only)
	 * 		fade     : <number>, // fade in/out time in seconds (negative number for fade-out)
	 *		msg      : <string>, // custom message to be displayed at the top
	 * 		msgTimer : <number>  // timestamp (in milliseconds) up to when msg should be displayed
	 * }	                     // (custom messages always use a one second fade-out only)
	 */
	const displayCanvasMsg = ( instance, data ) => {

		if ( ! audioElement.length )
			return; // initialization not finished yet

		const audioEl    = audioElement[ currAudio ],
			  trackData  = audioEl.dataset,
			  remaining  = audioEl.duration - audioEl.currentTime,
			  endTimeout = +elEndTimeout.value,
			  bgOption   = elBackground.value[0],
			  bgImageFit = elBgImageFit.value,
			  noShadow   = isSwitchOn( elNoShadow ),
			  pixelRatio = instance.pixelRatio,
			  { timestamp } = data;

		// if song is less than 100ms from the end, skip to the next track for improved gapless playback
		if ( remaining < .1 )
			playNextSong( true );

		// set song info display at the end of the song
		if ( endTimeout > 0 && remaining <= endTimeout && isSwitchOn( elShowSong ) && timestamp > canvasMsg.endTime && isPlaying() )
			setCanvasMsg( 1, remaining, 1 );

		// compute background image size for pulse and zoom in/out effects
		if (
			( bgImageFit == BGFIT_PULSE || bgImageFit == BGFIT_ZOOM_IN || bgImageFit == BGFIT_ZOOM_OUT ) &&
			( bgOption == BG_COVER || bgOption == BG_IMAGE )
		) {
			let size;

			if ( bgImageFit == BGFIT_PULSE )
				size = ( instance.getEnergy() * 70 | 0 ) - 25;
			else {
				const songProgress = audioEl.currentTime / audioEl.duration;
				size = ( bgImageFit == BGFIT_ZOOM_IN ? songProgress : 1 - songProgress ) * 100;
			}

			elContainer.style.backgroundSize = `auto ${ 100 + size }%`;
		}

		elOSD.width |= 0; // clear OSD canvas

		const { endTime, startTime, msgTimer, info, msg, fade } = canvasMsg;

		if ( timestamp > endTime && timestamp > msgTimer )
			return; // nothing to display

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

		// Display custom message if we don't need to display info level 2
		if ( msgTimer > timestamp && ( timestamp > endTime || info != 2 ) ) {
			const timeLeft = ( msgTimer - timestamp ) / 1000;
			canvasCtx.globalAlpha = timeLeft > 1 ? 1 : timeLeft; // one second fade-out
			drawText( canvasMsg.msg, centerPos, topLine1 );
		}

		// Display song and config info
		if ( endTime > timestamp ) {
			if ( fade < 0 ) {
				// fade-out
				const timeLeft = ( endTime - timestamp ) / 1000;
				canvasCtx.globalAlpha = timeLeft > -fade ? 1 : timeLeft / -fade;
			}
			else {
				// fade-in - avoid negative timeElapsed when canvasMsg has been set in this same iteration (info at song end)
				const timeElapsed = Math.max( 0, ( timestamp - startTime ) / 1000 );
				canvasCtx.globalAlpha = timeElapsed > fade ? 1 : timeElapsed / fade;
			}

			// display additional information (level 2) at the top
			if ( canvasMsg.info == 2 ) {
				drawText( getSelectedGradients(), centerPos, topLine1, maxWidthTop );

				canvasCtx.textAlign = 'left';
				drawText( getText( elMode ), baseSize, topLine1, maxWidthTop );
				drawText( `Randomize: ${ getText( elRandomMode ) }`, baseSize, topLine2, maxWidthTop );

				canvasCtx.textAlign = 'right';
				drawText( getText( elSensitivity ).toUpperCase() + ' sensitivity', rightPos, topLine1, maxWidthTop );
				drawText( `Repeat is ${ onOff( elRepeat ) }`, rightPos, topLine2, maxWidthTop );
			}

			if ( elSource.checked ) {
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
				if ( totalSongs && elShowCount.checked )
					drawText( `Track ${ playlistPos + 1 } of ${ totalSongs }`, rightPos, bottomLine1 - baseSize );

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
			randomizeSettings( true );

		if ( isSwitchOn( elShowSong ) ) {
			const timeout = +elTrackTimeout.value || Infinity;
			setCanvasMsg( 1, timeout );
		}
	}

	const audioOnTimeUpdate = e => {
		if ( e.target != audioElement[ currAudio ] )
			return;

		const { currentTime, duration } = audioElement[ currAudio ];

		elSongProgress.value = ! duration || duration == Infinity ? 0 : currentTime / duration;
		elSongPosition.innerText = secondsToTime( currentTime, true );
		elSongDuration.innerHTML = secondsToTime( ! duration ? 0 : currentTime - duration, true ).padEnd(6).replaceAll(' ','&nbsp;'); // make sure 'LIVE' is centered
	}

	// BEGIN INITIALIZATION -----------------------------------------------------------------------

	// Log all JS errors to our UI console
	window.addEventListener( 'error', event => consoleLog( `Unexpected ${event.error}`, true ) );

	let initDone = false;

	consoleLog( `audioMotion v${VERSION} initializing...` );
	consoleLog( `User agent: ${navigator.userAgent}` );

	$('#version').innerText = VERSION;

	// Show update message if needed
	const lastVersion = loadFromStorage( KEY_LAST_VERSION ),
		  elBanner    = $('#update-banner');

	if ( lastVersion == null || lastVersion == VERSION )
		elBanner.remove();

	if ( lastVersion != VERSION ) {
		saveToStorage( KEY_LAST_VERSION, VERSION );
		if ( lastVersion != null ) {
			elBanner.classList.add( UPDATE_SHOW_CSS_CLASS );
			elBanner.addEventListener( 'click', () => elBanner.classList.remove( UPDATE_SHOW_CSS_CLASS ) );
			setTimeout( () => {
				elBanner.classList.remove( UPDATE_SHOW_CSS_CLASS );
			}, UPDATE_BANNER_TIMEOUT );
		}
	}

	// Load server configuration options from config.json
	let response;

	try {
		response = await fetch( SERVERCFG_FILE );
	}
	catch( e ) {}

	let serverConfig = response && response.ok ? await response.text() : null;
	try {
		serverConfig = JSON.parse( serverConfig );
	}
	catch( err ) {
		consoleLog( `Error parsing ${ SERVERCFG_FILE } - ${ err }`, true );
		serverConfig = {};
	}

	serverConfig = { ...SERVERCFG_DEFAULTS, ...serverConfig };

	supportsFileSystemAPI = serverConfig.enableLocalAccess && !! window.showDirectoryPicker;

	// Read URL parameters
	const isSelfHosted   = window.location.hostname != 'audiomotion.app',
		  urlParams      = new URL( window.location ).searchParams,
		  userMode       = urlParams.get('mode'),
		  userMediaPanel = urlParams.get('mediaPanel');

	let forceFileSystemAPI = serverConfig.enableLocalAccess && ( ! isSelfHosted || userMode == FILEMODE_LOCAL ? true : ( userMode == FILEMODE_SERVER ? false : loadFromStorage( KEY_FORCE_FS_API ) ) );

	if ( forceFileSystemAPI === null )
		forceFileSystemAPI = serverConfig.defaultAccessMode == FILEMODE_LOCAL;

	if ( userMediaPanel == PANEL_CLOSE || ( serverConfig.mediaPanel == PANEL_CLOSE && userMediaPanel != PANEL_OPEN ) )
		toggleMediaPanel( false );

	// Load preferences from localStorage
	const isLastSession = loadPreferences();

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
			else
				loadSong( NEXT_TRACK );
			storePlayQueue( true );
		}
	});

	// Create audioMotion analyzer

	consoleLog( `Instantiating audioMotion-analyzer v${ AudioMotionAnalyzer.version }` );

	audioMotion = new AudioMotionAnalyzer( elAnalyzer, {
		bgAlpha: 0, // transparent background when overlay is active (for subtitles display)
		fsElement: elContainer,
		onCanvasDraw: displayCanvasMsg,
		onCanvasResize: showCanvasInfo
	});

	const audioCtx = audioMotion.audioCtx;

	// Initialize and connect audio elements

	currAudio = 0;
	nextAudio = 1;

	for ( const i of [0,1] ) {
		audioElement[ i ] = $( `#player${i}` );
		clearAudioElement( i );
		audioElement[ i ].addEventListener( 'play', audioOnPlay );
		audioElement[ i ].addEventListener( 'ended', audioOnEnded );
		audioElement[ i ].addEventListener( 'error', audioOnError );
		audioElement[ i ].addEventListener( 'timeupdate', audioOnTimeUpdate );
		audioElement[ i ].querySelector('track').addEventListener( 'load', setSubtitlesPosition );

		audioMotion.connectInput( audioElement[ i ] );
	}

	setRangeAtts( elSongProgress, 0, 1, .001 );
	elSongProgress.value = 0;
	elSongPosition.innerText = elSongDuration.innerText = secondsToTime( 0, true );

	// Setup configuration panel
	doConfigPanel();

	// Populate combo boxes

	for ( const i of [16,20,25,30,40,50,60,100,250,500,1000,2000] )
		elRangeMin[ elRangeMin.options.length ] = new Option( ( i >= 1000 ? ( i / 1000 ) + 'k' : i ) + 'Hz', i );

	for ( const i of [1000,2000,4000,8000,12000,16000,20000,22000] )
		elRangeMax[ elRangeMax.options.length ] = new Option( ( i / 1000 ) + 'kHz', i );

	populateCustomRadio( elMode, modeOptions );

	populateCustomRadio( elChnLayout, channelLayoutOptions );

	populateCustomRadio( elSensitivity, [
		[ '0', 'Low'    ],
		[ '1', 'Medium' ],
		[ '2', 'High'   ]
	]);

	populateSelect( elRandomMode, [
		[ '0',   'OFF'              ],
		[ '1',   'On track change'  ],
		[ '2',   'every 5 seconds'  ],
		[ '6',   'every 15 seconds' ],
		[ '12',  'every 30 seconds' ],
		[ '24',  'every minute'     ],
		[ '48',  'every 2 minutes'  ],
		[ '120', 'every 5 minutes'  ]
	]);

	populateCustomRadio( elReflex, [
		[ '0', 'Off'  ],
		[ '1', 'On'   ],
		[ '2', 'Full' ]
	]);

	populateSelect( elBgImageFit, bgFitOptions );

	populateCustomRadio( elMirror, [
		[ '-1', 'Left'  ],
		[ '0',  'Off'   ],
		[ '1',  'Right' ]
	]);

	populateCustomRadio( elFreqScale, [
		[ SCALE_BARK,   'Bark'   ],
		[ SCALE_LINEAR, 'Linear' ],
		[ SCALE_LOG,    'Log'    ],
		[ SCALE_MEL,    'Mel'    ]
	]);

	populateCustomRadio( elWeighting, [
		[ WEIGHT_NONE, 'OFF' ],
		[ WEIGHT_A,    'A'   ],
		[ WEIGHT_B,    'B'   ],
		[ WEIGHT_C,    'C'   ],
		[ WEIGHT_D,    'D'   ],
		[ WEIGHT_468,  '468' ],
	]);

	populateCustomRadio( elColorMode, [
		[ COLOR_GRADIENT, 'Gradient'  ],
		[ COLOR_INDEX,    'Index' ],
		[ COLOR_LEVEL,    'Level' ]
	]);

	populateCustomRadio( elShowPeaks, [
		[ PEAKS_OFF,  'Off'  ],
		[ PEAKS_ON,   'Drop' ],
		[ PEAKS_FADE, 'Fade' ]
	]);

	populateCustomRadio( elScaleX, [
		[ SCALEXY_OFF,  'Off'   ],
		[ SCALEXY_ON,   'Freqs' ],
		[ SCALEX_NOTES, 'Notes' ]
	]);

	populateCustomRadio( elScaleY, [
		[ SCALEXY_OFF, 'Off' ],
		[ SCALEXY_ON,  'On'  ]
	]);

	populateCustomRadio( elAnsiBands, [
		[ 0, 'Tempered' ],
		[ 1, 'ANSI/IEC' ]
	]);

	populateCustomRadio( elLinearAmpl, [
		[ 0, 'Decibels' ],
		[ 1,  'Linear'  ]
	]);

	let fftOptions = [];
	for ( let i = 10; i < 16; i++ ) {
		const size = 2 ** i;
		fftOptions.push( [ size, `${ size / 1024 | 0 }k` ] );
	}
	populateCustomRadio( elFFTsize, fftOptions );

	setRangeAtts( elBandCount, 1, 8 );
	setRangeAtts( elBarSpace, 0, 1, .05 );
	setRangeAtts( elBgImageDim, 0.1, 1, .1 );
	setRangeAtts( elFillAlpha, 0, 1, .05 );
	setRangeAtts( elLineWidth, 0, 3, .5 );
	setRangeAtts( elSmoothing, 0, .95, .05 );
	setRangeAtts( elSpin, 0, 3, 1 );

	// Clear canvas messages
	setCanvasMsg();

	// Register custom gradients
	Object.keys( gradients ).forEach( key => {
		const { bgColor, dir, colorStops } = gradients[ key ];
		if ( colorStops )
			audioMotion.registerGradient( key, { bgColor, dir, colorStops } );
	});
	populateGradients();

	// Initialize file explorer
	const fileExplorerPromise = fileExplorer.create(
		$('#file_explorer'),
		{
			onDblClick: ( fileObject, event ) => {
				addBatchToPlayQueue( [ fileObject ], true );
				event.target.classList.remove( 'selected', 'sortable-chosen' );
			},
			onEnterDir: path => {
				if ( elSaveDir.checked && initDone ) // avoid saving the path during initialization
					saveLastDir( path );
			},
			fileExtensions: [ ...FILE_EXT_AUDIO, ...FILE_EXT_PLIST, ...FILE_EXT_VIDEO ],
			forceFileSystemAPI
		}
	).then( status => {
		// set global variables
		webServer        = status.webServer;
		serverHasMedia   = status.serverHasMedia;
		useFileSystemAPI = status.useFileSystemAPI;

		const { filelist } = status;

		if ( ! serverHasMedia )
			consoleLog( `${ webServer ? 'Cannot access music directory on server' : 'No server found' }`, true );
		if ( useFileSystemAPI )
			consoleLog( 'Accessing files from local device via File System Access API.' );
		if ( ! supportsFileSystemAPI && serverConfig.enableLocalAccess )
			consoleLog( 'No browser support for File System Access API. Cannot access files from local device.', forceFileSystemAPI );

		saveToStorage( KEY_FORCE_FS_API, forceFileSystemAPI && supportsFileSystemAPI );
		loadSavedPlaylists();

		// initialize drag-and-drop in the file explorer
		if ( useFileSystemAPI || serverHasMedia ) {
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
					if ( evt.to.id == 'playlist' ) {
						let items    = evt.items.length ? evt.items : [ evt.item ],
							promises = [];
						items.forEach( item => {
							const { handle, dirHandle, subs } = item;
							promises.push( addToPlayQueue( { file: fileExplorer.makePath( item.dataset.path ), handle, dirHandle, subs } ) );
							item.remove();
						});
						Promise.all( promises ).then( () => storePlayQueue( true ) );
					}
				}
			});
		}

		// Set UI event listeners
		setUIEventListeners();
	});

	// Add events listeners for keyboard controls
	window.addEventListener( 'keydown', keyboardControls );
	window.addEventListener( 'keyup', keyboardControls );

	// notie options
	notie.setOptions({
		positions: { alert: 'bottom' }
	});

	// Wait for all async operations to finish before loading the last used settings
	Promise.all( [ retrieveBackgrounds(), fileExplorerPromise ] ).then( async () => {
		// helper function - enter last used directory and load saved play queue
		const enterLastDir = () => {
			if ( lastDir )
				fileExplorer.setPath( lastDir );
			if ( elSaveQueue.checked )
				loadPlaylist( { file: true } );
		}

		// helper function - request user permission to access local device (File System API)
		const requestPermission = async () => {
			const isClear = ( ! isBgDirLocked || await bgDirHandle.requestPermission() == 'granted' ) &&
							( ! isLastDirLocked || await lastDir[0].handle.requestPermission() == 'granted' );

			if ( isClear ) {
				elMediaPanel.classList.remove('locked');
				window.removeEventListener( 'click', requestPermission );
				if ( isBgDirLocked )
					retrieveBackgrounds();
				enterLastDir();
			}
		}

		const lastDir         = useFileSystemAPI ? await get( KEY_LAST_DIR ) : loadFromStorage( KEY_LAST_DIR ),
			  bgDirHandle     = await get( KEY_BG_DIR_HANDLE ),
			  isBgDirLocked   = supportsFileSystemAPI && bgDirHandle && await bgDirHandle.queryPermission() != 'granted',
			  isLastDirLocked = useFileSystemAPI && Array.isArray( lastDir ) && lastDir[0] && await lastDir[0].handle.queryPermission() != 'granted';

		consoleLog( `Loading ${ isLastSession ? 'last session' : 'default' } settings` );
		loadPreset( 'last', false, true );

		if ( isBgDirLocked || isLastDirLocked ) {
			elMediaPanel.classList.add('locked');
			window.addEventListener( 'click', requestPermission );
		}
		else
			enterLastDir();

		consoleLog( `AudioContext sample rate is ${audioCtx.sampleRate}Hz; Total latency is ${ ( ( audioCtx.outputLatency || 0 ) + audioCtx.baseLatency ) * 1e3 | 0 }ms` );
		consoleLog( 'Initialization complete!' );
		initDone = true;
	});

})();
