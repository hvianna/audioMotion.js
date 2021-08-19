/**
 * audioMotion.js
 * High-resolution real-time spectrum analyzer and music player
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * @version   21.8-beta.2
 * @author    Henrique Vianna <hvianna@gmail.com>
 * @copyright (c) 2018-2021 Henrique Avila Vianna
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

const VERSION = '21.8-beta.2';

import AudioMotionAnalyzer from 'audiomotion-analyzer';
import * as fileExplorer from './file-explorer.js';
import * as mm from 'music-metadata-browser';
import './scrollIntoViewIfNeeded-polyfill.js';

import Sortable, { MultiDrag } from 'sortablejs';
Sortable.mount( new MultiDrag() );

import notie from 'notie';
import './notie.css';

import './styles.css';

const BG_DIRECTORY = 'backgrounds'; // folder name for background images and videos (no slashes!)

const MAX_BG_MEDIA_FILES = 20; // max number of media files (images and videos) selectable as background

const KNOB_DELAY = 50; // delay (ms) for knob controls (reduce mac mouse/touchpad sensitivity)

const MAX_METADATA_REQUESTS = 4;

const MAX_QUEUED_SONGS = 1000;

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

// dataset template for playqueue items and audio elements
const DATASET_TEMPLATE = {
	file: '',
	artist: '',
	title: '',
	album: '',
	codec: '',
	quality: '',
	duration: '',
	cover: ''
};

// localStorage keys
const KEY_LAST_CONFIG    = 'last-config',
	  KEY_CUSTOM_PRESET  = 'custom-preset',
	  KEY_DISABLED_MODES = 'disabled-modes',
	  KEY_DISABLED_BGFIT = 'disabled-bgfit',
	  KEY_DISABLED_GRADS = 'disabled-gradients',
	  KEY_DISABLED_PROPS = 'disabled-properties',
	  KEY_SENSITIVITY    = 'sensitivity-presets',
	  KEY_DISPLAY_OPTS   = 'display-options';

// selector shorthand functions
const $  = document.querySelector.bind( document ),
	  $$ = document.querySelectorAll.bind( document );

// Analyzer elements
const elContainer   = $('#bg_container'),		// outer container with background image
	  elVideo       = $('#video'),				// background video
	  elWarp        = $('#warp'),				// warp tunnel effect layer
	  elDim         = $('#bg_dim'),				// background image/video darkening layer
	  elAnalyzer    = $('#analyzer'),			// analyzer canvas container
	  elOSD         = $('#osd'),				// message canvas
	  canvasCtx     = elOSD.getContext('2d');

// UI controls HTML elements
const elFFTsize     = $('#fft_size'),
	  elRangeMin    = $('#freq_min'),
	  elRangeMax    = $('#freq_max'),
	  elSmoothing   = $('#smoothing'),
	  elMode        = $('#mode'),
	  elGradient    = $('#gradient'),
	  elScaleX      = $('#scaleX'),
	  elScaleY      = $('#scaleY'),
	  elSensitivity = $('#sensitivity'),
	  elShowPeaks   = $('#show_peaks'),
	  elCycleGrad   = $('#cycle_grad'),
	  elRandomMode  = $('#random_mode'),
	  elLedDisplay  = $('#led_display'),
	  elLumiBars    = $('#lumi_bars'),
	  elRepeat      = $('#repeat'),
	  elShowSong    = $('#show_song'),
	  elNoShadow    = $('#no_shadow'),
	  elLoRes       = $('#lo_res'),
	  elFPS         = $('#fps'),
	  elLineWidth   = $('#line_width'),
	  elFillAlpha   = $('#fill_alpha'),
	  elBarSpace    = $('#bar_space'),
	  elReflex      = $('#reflex'),
	  elBackground  = $('#background'),
	  elBgImageDim  = $('#bg_img_dim'),
	  elBgImageFit  = $('#bg_img_fit'),
	  elRadial      = $('#radial'),
	  elSpin		= $('#spin'),
	  elStereo      = $('#stereo'),
	  elSplitGrad   = $('#split_grad'),
	  elFsHeight    = $('#fs_height'),
	  elMirror      = $('#mirror'),
	  // player panel and playlists
	  elSource      = $('#source'),
	  elMute        = $('#mute'),
	  elVolume      = $('#volume'),
	  elBalance     = $('#balance'),
	  elPlaylists   = $('#playlists'),
	  // config panel
	  elInfoTimeout = $('#info_timeout'),
	  elTrackTimeout= $('#track_timeout'),
	  elEndTimeout  = $('#end_timeout'),
	  elShowCover   = $('#show_cover'),
	  elShowCount   = $('#show_count');

// AudioMotionAnalyzer object, audio context and pan node
let audioMotion, audioCtx, panNode;

// playlist, index to the current song, indexes to current and next audio elements
let playlist, playlistPos, currAudio, nextAudio;

// audio sources
let audioElement = [], micStream, isMicSource, wasMuted;

// variables for on-screen info display
let canvasMsg, baseSize, coverSize, centerPos, rightPos, topLine1, topLine2, bottomLine1, bottomLine2, bottomLine3, maxWidthTop, maxWidthBot, normalFont, largeFont;

// auxiliary variables for track skip/search, volume/balance control and metadata retrieval
let skipping = false, isFastSearch = false, knobUpdating = false, waitingMetadata = 0, fastSearchTimeout;

// interval for timed random mode
let randomModeTimer;

// cover image for the currently playing song (for canvas rendering)
let coverImage = new Image();

// folder cover images for songs with no picture in the metadata
let folderImages = {};

// background images and videos
let bgImages = [], bgVideos = [];

// server mode: 1 = custom server; 0 = standard web server; -1 = local (file://) mode
let serverMode;

// Configuration presets
const presets = {
	default: {
		mode        : 0,	// discrete frequencies
		fftSize     : 8192,
		freqMin     : 20,
		freqMax     : 22000,
		smoothing   : 0.5,
		gradient    : 'prism',
		background  : 0,	// gradient default
		cycleGrad   : 1,
		randomMode  : 0,
		ledDisplay  : 0,
		lumiBars    : 0,
		sensitivity : 1,
		showScaleX  : 1,
		showScaleY  : 1,
		showPeaks   : 1,
		showSong    : 1,
		repeat      : 0,
		noShadow    : 1,
		loRes       : 0,
		showFPS     : 0,
		lineWidth   : 2,
		fillAlpha   : 0.1,
		barSpace    : 0.1,
		reflex      : 0,
		bgImageDim  : 0.5,
		bgImageFit  : 1, 	// center
		radial      : 0,
		spin        : 2,
		stereo      : 0,
		splitGrad   : 0,
		fsHeight    : 100,
		mirror      : 0,
		volume      : 1,
		balance     : 0
	},

	fullres: {
		fftSize     : 8192,
		freqMin     : 20,
		freqMax     : 22000,
		mode        : 0,
		radial      : 0,
		randomMode  : 0,
		reflex      : 0,
		smoothing   : 0.5
	},

	octave: {
		barSpace    : 0.1,
		ledDisplay  : 0,
		lumiBars    : 0,
		mode        : 3,	// 1/8th octave bands mode
		radial      : 0,
		randomMode  : 0,
		reflex      : 0
	},

	ledbars: {
		background  : 0,
		barSpace    : 0.5,
		ledDisplay  : 1,
		lumiBars    : 0,
		mode        : 3,
		radial      : 0,
		randomMode  : 0,
		reflex      : 0
	},

	demo: {
		cycleGrad   : 1,
		randomMode  : 6    // 15 seconds
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
	{ value: '0',   text: 'Discrete frequencies', disabled: false },
	{ value: '10',  text: 'Area graph',           disabled: false },
	{ value: '101', text: 'Line graph',           disabled: false },
	{ value: '8',   text: 'Full octave bands',    disabled: false },
	{ value: '7',   text: 'Half octave bands',    disabled: false },
	{ value: '6',   text: '1/3rd octave bands',   disabled: false },
	{ value: '5',   text: '1/4th octave bands',   disabled: false },
	{ value: '4',   text: '1/6th octave bands',   disabled: false },
	{ value: '3',   text: '1/8th octave bands',   disabled: false },
	{ value: '2',   text: '1/12th octave bands',  disabled: false },
	{ value: '1',   text: '1/24th octave bands',  disabled: false }
];

// Properties that may be changed by Random Mode
const randomProperties = [
	{ value: 'nobg',   text: 'Background',   disabled: false },
	{ value: 'imgfit', text: 'Image Fit',    disabled: false },
	{ value: 'reflex', text: 'Reflex',       disabled: false },
	{ value: 'peaks',  text: 'PEAKS',        disabled: false },
	{ value: 'leds',   text: 'LEDS',         disabled: false },
	{ value: 'lumi',   text: 'LUMI',         disabled: false },
	{ value: 'barSp',  text: 'Bar Spacing',  disabled: false },
	{ value: 'line',   text: 'Line Width',   disabled: false },
	{ value: 'fill',   text: 'Fill Opacity', disabled: false },
	{ value: 'radial', text: 'Radial',       disabled: false },
	{ value: 'spin',   text: 'Spin',         disabled: false },
	{ value: 'stereo', text: 'Stereo',       disabled: false },
	{ value: 'split',  text: 'Split',        disabled: false },
	{ value: 'mirror', text: 'Mirror',       disabled: false }
];

// Sensitivity presets
const sensitivityDefaults = [
	{ min: -70,  max: -20 }, // low
	{ min: -85,  max: -25 }, // normal
	{ min: -100, max: -30 }  // high
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
	{ value: BGFIT_ADJUST,   text: 'Adjust',          disabled: false },
	{ value: BGFIT_CENTER,   text: 'Center',          disabled: false },
	{ value: BGFIT_PULSE,    text: 'Pulse',           disabled: false },
	{ value: BGFIT_REPEAT,   text: 'Repeat',          disabled: false },
	{ value: BGFIT_ZOOM_IN,  text: 'Zoom In',         disabled: false },
	{ value: BGFIT_ZOOM_OUT, text: 'Zoom Out',        disabled: false },
	{ value: BGFIT_WARP,     text: 'Warp Tunnel',     disabled: false },
	{ value: BGFIT_WARP_ANI, text: 'Warp (moving)',   disabled: false },
	{ value: BGFIT_WARP_ROT, text: 'Warp (rotating)', disabled: false }
];

/**
 * Helper functions
 */

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

// format time in seconds to hh:mm:ss string
const formatHHMMSS = time => {
	let str = '',
		lead = '';

	if ( time >= 3600 ) {
		str = ( time / 3600 | 0 ) + ':';
		time %= 3600;
		lead = '0';
	}

	str += ( lead + ( time / 60 | 0 ) ).slice(-2) + ':' + ( '0' + ( time % 60 | 0 ) ).slice(-2);

	return str;
}

// returns the text of the selected option in a `select` HTML element
const getText = el => el[ el.selectedIndex ].text;

// returns a string with the current status of an UI switch
const onOff = el => isSwitchOn( el ) ? 'ON' : 'OFF';

// returns a boolean with the current status of an UI switch
const isSwitchOn = el => el.dataset.active == '1';

// returns only the name of a filename
const getFileName = filename => filename.slice( 0, filename.lastIndexOf('.') );

// returns the extension of a file (lowercase, no dot)
const getFileExt = filename => filename.slice( filename.lastIndexOf('.') + 1 ).toLowerCase();

// returns the count of queued songs
const queueLength = _ => playlist.children.length;

// returns a random integer in the range [ 0, n-1 ]
const randomInt = ( n=2 ) => Math.random() * n | 0;


/**
 * Display the canvas in full-screen mode
 */
function fullscreen() {
	audioMotion.toggleFullscreen();
	document.activeElement.blur(); // move keyboard focus to the document body
}

/**
 * Set audioMotion properties
 *
 * @param elems {object|array} a DOM element object or array of objects
 * @param [save] {boolean} true to save current settings to last used preset
 */
function setProperty( elems, save ) {
	if ( ! Array.isArray( elems ) )
		elems = [ elems ];

	for ( const el of elems ) {
		switch ( el ) {
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

			case elFFTsize:
				audioMotion.fftSize = elFFTsize.value;
				consoleLog( 'FFT size is ' + audioMotion.fftSize + ' samples' );
				break;

			case elFillAlpha:
				audioMotion.fillAlpha = ( elMode.value == 10 ) ? 1 : elFillAlpha.value;
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
				if ( elGradient.value === '' ) // handle invalid setting
					elGradient.selectedIndex = 0;
				audioMotion.gradient = elGradient.value;
				break;

			case elLedDisplay:
				audioMotion.showLeds = isSwitchOn( elLedDisplay );
				break;

			case elLineWidth:
				audioMotion.lineWidth = ( elMode.value == 10 ) ? 0 : elLineWidth.value;
				break;

			case elLoRes:
				audioMotion.loRes = isSwitchOn( elLoRes );
				break;

			case elLumiBars:
				audioMotion.lumiBars = isSwitchOn( elLumiBars );
				setProperty( elBarSpace );
				break;

			case elMode:
				const mode = elMode.value;
				if ( mode < 10 )
					audioMotion.mode = mode;
				else {
					audioMotion.mode = 10;

					if ( mode == 10 ) { // "Area graph" mode
						audioMotion.lineWidth = 0;
						audioMotion.fillAlpha = 1;
					}
					else { // "Line graph" mode with custom line width and fill opacity
						audioMotion.lineWidth = elLineWidth.value;
						audioMotion.fillAlpha = elFillAlpha.value;
					}
				}
				setProperty( elBarSpace );
				break;

			case elMirror:
				audioMotion.mirror = elMirror.value;
				break;

			case elRadial:
				audioMotion.radial = isSwitchOn( elRadial );
				setProperty( elBarSpace );
				break;

			case elRandomMode:
				const option = elRandomMode.value;

				if ( randomModeTimer )
					randomModeTimer = window.clearInterval( randomModeTimer );

				if ( option > 1 )
					randomModeTimer = window.setInterval( selectRandomMode, 2500 * option );

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

			case elStereo:
				audioMotion.stereo = isSwitchOn( elStereo );
				break;

		} // switch
	} // for

	if ( save )
		updateLastConfig();
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
 * Set the background image CSS variable
 */
function setBackgroundImage( url ) {
	document.documentElement.style.setProperty( '--background-image', url ? `url( ${ url.replace( /['()]/g, '\\$&' ) } )` : 'none' );
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
 * Delete all child nodes of an element
 */
function deleteChildren( el ) {
	while ( el.firstChild )
		el.removeChild( el.firstChild );
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
 * Load playlists from localStorage and legacy playlists.cfg file
 */
function loadSavedPlaylists( keyName ) {

	// reset UI playlist selection box

	deleteChildren( elPlaylists );

	const item = new Option( 'Select a playlist', '' );
	item.disabled = true;
	item.selected = true;
	elPlaylists.options[ elPlaylists.options.length ] = item;

	// load playlists from localStorage

	let playlists = localStorage.getItem('playlists');

	if ( playlists ) {
		playlists = JSON.parse( playlists );

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
 * Add a song or playlist to the play queue
 */
function addToPlayQueue( file, autoplay = false ) {

	let ret;

	if ( ['m3u','m3u8'].includes( getFileExt( file ) ) )
		ret = loadPlaylist( file );
	else
		ret = new Promise( resolve => resolve( addSongToPlayQueue( file ) ) );

	// when promise resolved, if autoplay requested start playing the first added song
	ret.then( n => {
		if ( autoplay && ! isPlaying() && n > 0 )
			playSong( queueLength() - n );
	});

	return ret;
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
			trackData.duration = formatHHMMSS( format.duration );
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

	// normalize slashes in path
	uri = uri.replace( /\\/g, '/' );

	// extract file name and extension
	const file = uri.split('/').pop(),
		  ext  = file.split('.').pop();

	// create new list element
	const newEl     = document.createElement('li'),
		  trackData = newEl.dataset;

	Object.assign( trackData, DATASET_TEMPLATE ); // initialize element's dataset attributes

	trackData.artist = content.artist || '';
	trackData.title  = content.title || file.replace( /%23/g, '#' ) || uri.slice( uri.lastIndexOf('//') + 2 );
	trackData.codec  = ( ext !== file ) ? ext.toUpperCase() : '';

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
						loadCover( uri ).then( cover => {
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
 * Sync a queue item metadata with any audio elements loaded with the same file
 */
function syncMetadataToAudioElements( source ) {
	for ( const el of audioElement ) {
		if ( el.dataset.file == source.dataset.file )
			addMetadata( source, el ); // transfer metadata to audio element
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
 * Load a playlist file into the play queue
 */
function loadPlaylist( path ) {

	// normalize slashes
	path = path.replace( /\\/g, '/' );

	return new Promise( resolve => {
		let	n = 0,
			songInfo;

		if ( ! path ) {
			resolve( -1 );
		}
		else if ( ['m3u','m3u8'].includes( getFileExt( path ) ) ) {
			fetch( path )
				.then( response => {
					if ( response.status == 200 )
						return response.text();
					else
						consoleLog( `Fetch returned error code ${response.status} for URI ${path}`, true );
				})
				.then( content => {
					path = path.slice( 0, path.lastIndexOf('/') + 1 ); // remove file name from path
					content.split(/[\r\n]+/).forEach( line => {
						if ( line.charAt(0) != '#' && line.trim() != '' ) { // not a comment or blank line?
							line = line.replace( /\\/g, '/' );
							if ( ! songInfo ) { // if no previous #EXTINF tag, extract info from the filename
								songInfo = line.slice( line.lastIndexOf('/') + 1 );
								songInfo = getFileName( songInfo ).replace( /_/g, ' ' );
							}
							if ( line.slice( 0, 4 ) != 'http' && line[1] != ':' && line[0] != '/' )
								line = path + line;

							// try to extract artist name and song title off the info tag (format: ARTIST - SONG)
							const sep  = songInfo.indexOf(' - '),
								  data = sep == -1 ? { title: songInfo } : { artist: songInfo.slice( 0, sep ), title: songInfo.slice( sep + 3 ) };

							n += addSongToPlayQueue( line, data );
							songInfo = '';
						}
						else if ( line.slice( 0, 7 ) == '#EXTINF' )
							songInfo = line.slice( line.indexOf(',') + 1 || 8 ); // info will be saved for the next iteration
					});
					resolve( n );
				})
				.catch( e => {
					consoleLog( e, true );
					resolve( n );
				});
		}
		else { // try to load playlist from localStorage
			let list = localStorage.getItem( 'pl_' + path );
			if ( list ) {
				list = JSON.parse( list );
				list.forEach( item => {
					item = item.replace( /\\/g, '/' );
					songInfo = item.slice( item.lastIndexOf('/') + 1 );
					songInfo = getFileName( songInfo ).replace( /_/g, ' ' );
					n += addSongToPlayQueue( item, { title: songInfo } )
				});
			}
			else
				consoleLog( `Unrecognized playlist file: ${path}`, true );

			resolve( n );
		}
	});
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
 * Store a playlist in localStorage
 */
function storePlaylist( name, update = true ) {

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

			let playlists = localStorage.getItem('playlists');

			if ( playlists )
				playlists = JSON.parse( playlists );
			else
				playlists = {};

			while ( playlists.hasOwnProperty( safename ) )
				safename += '_1';

			playlists[ safename ] = name;

			saveToStorage( 'playlists', playlists );
			loadSavedPlaylists( safename );
		}

		let songs = [];
		playlist.childNodes.forEach( item => songs.push( item.dataset.file ) );

		saveToStorage( 'pl_' + safename, songs );
		notie.alert({ text: `Playlist saved!` });
	}
}

/**
 * Delete a playlist from localStorage
 */
function deletePlaylist( index ) {
	if ( elPlaylists[ index ].dataset.isLocal ) {
		notie.confirm({
			text: `Do you really want to DELETE the "${elPlaylists[ index ].innerText}" playlist?<br>THIS CANNOT BE UNDONE!`,
			submitText: 'Delete',
			submitCallback: () => {
				const keyName = elPlaylists[ index ].value;
				let playlists = localStorage.getItem('playlists');

				if ( playlists ) {
					playlists = JSON.parse( playlists );
					delete playlists[ keyName ];
					saveToStorage( 'playlists', playlists );
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
 * Shuffle the playlist
 */
function shufflePlayQueue() {

	let temp, r;

	for ( let i = queueLength() - 1; i > 0; i-- ) {
		r = Math.random() * ( i + 1 ) | 0;
		temp = playlist.replaceChild( playlist.children[ r ], playlist.children[ i ] );
		playlist.insertBefore( temp, playlist.children[ r ] );
	}

	playSong(0);
}

/**
 * Try to get a cover image from the song's folder
 */
function loadCover( uri ) {
	return new Promise( resolve => {
		const path = uri.slice( 0, uri.lastIndexOf('/') + 1 );

		if ( serverMode == -1 )
			resolve(''); // nothing to do when in serverless mode
		else if ( folderImages[ path ] !== undefined )
			resolve( path + folderImages[ path ] ); // use the stored image URL for this path
		else {
			const urlToFetch = ( serverMode == 1 ) ? '/getCover/' + path.replace( /\//g, '%2f' ) : path;

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
					resolve( path + imageUrl );
				});
		}
	});
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
 * Play a song from the play queue
 */
function playSong( n ) {
	if ( loadSong( n ) )
		playPause( true );
}

/**
 * Player controls
 */
function playPause( play ) {
	if ( isMicSource )
		return;
	if ( isPlaying() && ! play )
		audioElement[ currAudio ].pause();
	else
		audioElement[ currAudio ].play().catch( err => {
			// ignore AbortError - when play promise is interrupted by a new load request or call to pause()
			if ( err.code != 20 ) {
				consoleLog( err, true )
				playNextSong( true );
			}
		});
}

function stop() {
	audioElement[ currAudio ].pause();
	setCanvasMsg();
	loadSong( 0 );
}

function skipTrack( back = false ) {
	const status = back ? playPreviousSong() : playNextSong();
	if ( ! status )
		setCanvasMsg( `Already at ${ back ? 'first' : 'last' } track` );
}

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
 * Schedule start of track fast search
 *
 * @param mode {string} 'm' for mouse, 'k' for keyboard
 * @param [dir] {number} 1 for FF, -1 for REW
 */
function scheduleFastSearch( mode, dir = 1 ) {
	// set a 200ms timeout to start fast search (wait for 'click' or 'keyup' event)
	fastSearchTimeout = window.setTimeout( () => {
		isFastSearch = mode;
		fastSearch( dir );
	}, 200 );
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
	window.clearTimeout( fastSearchTimeout );
	if ( isFastSearch ) {
		isFastSearch = false;
		return true;
	}
	// fast search was never activated, return false to indicate a track skip
	return false;
}

/**
 * Check if audio is playing
 */
function isPlaying() {
	const audioEl = audioElement[ currAudio ];

	return audioEl
		&& audioEl.currentTime > 0
		&& ! audioEl.paused
		&& ! audioEl.ended;
//		&& audioEl.readyState > 2;
}

/**
 * Toggle display of song and settings information on canvas
 */
function toggleInfo() {
	if ( canvasMsg.info == 2 ) // if already showing all info, turn it off
		setCanvasMsg();
	else {
		const timeout = elInfoTimeout.value | 0 || Infinity;
		// increase the information level (0 -> 1 -> 2)
		setCanvasMsg( ( canvasMsg.info | 0 ) + 1, timeout );
	}
}

/**
 * Draws outlined text on canvas
 */
function outlineText( text, x, y, maxWidth ) {
	if ( isSwitchOn( elNoShadow ) ) {
		canvasCtx.strokeText( text, x, y, maxWidth );
		canvasCtx.fillText( text, x, y, maxWidth );
	}
	else {
		canvasCtx.shadowOffsetX = canvasCtx.shadowOffsetY = 3 * audioMotion.pixelRatio;
		canvasCtx.fillText( text, x, y, maxWidth );
		canvasCtx.shadowOffsetX = canvasCtx.shadowOffsetY = 0;
	}
}

/**
 * Display messages on canvas
 *
 * Uses global object canvasMsg
 * canvasMsg = {
 * 		info    : <number>, // 1 = song info; 2 = song + settings info
 *      timer   : <number>, // countdown timer (in frames) to display info
 *      fade    : <number>, // fade in/out time (in frames, negative number for fade-in)
 *		msg     : <string>, // custom message to be displayed at the top
 *      msgTimer: <number>  // countdown timer (in frames) to display custom message
 * 		                    // (fade for custom message is always 60 frames)
 * }
 */
function displayCanvasMsg() {

	const audioEl    = audioElement[ currAudio ],
		  trackData  = audioEl.dataset,
		  remaining  = audioEl.duration - audioEl.currentTime,
		  endTimeout = elEndTimeout.value | 0,
		  bgOption   = elBackground.value[0],
		  bgImageFit = elBgImageFit.value;

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

	canvasCtx.lineWidth = 4 * audioMotion.pixelRatio;
	canvasCtx.lineJoin = 'round';
	canvasCtx.font = normalFont;
	canvasCtx.textAlign = 'center';

	canvasCtx.fillStyle = '#fff';
	canvasCtx.strokeStyle = canvasCtx.shadowColor = '#000';

	// Display custom message if any and info level 2 is not set
	if ( canvasMsg.msgTimer > 0 && canvasMsg.info != 2 ) {
		canvasCtx.globalAlpha = canvasMsg.msgTimer < 60 ? canvasMsg.msgTimer / 60 : 1;
		outlineText( canvasMsg.msg, centerPos, topLine1 );
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
			outlineText( 'Gradient: ' + gradients[ elGradient.value ].name, centerPos, topLine1, maxWidthTop );
			outlineText( `Auto gradient is ${ onOff( elCycleGrad ) }`, centerPos, topLine2 );

			canvasCtx.textAlign = 'left';
			outlineText( getText( elMode ), baseSize, topLine1, maxWidthTop );
			outlineText( `Random mode: ${ getText( elRandomMode ) }`, baseSize, topLine2, maxWidthTop );

			canvasCtx.textAlign = 'right';
			outlineText( getText( elSensitivity ).toUpperCase() + ' sensitivity', rightPos, topLine1, maxWidthTop );
			outlineText( `Repeat is ${ onOff( elRepeat ) }`, rightPos, topLine2, maxWidthTop );
		}

		if ( isMicSource ) {
			canvasCtx.textAlign = 'left';
			canvasCtx.font = largeFont;
			outlineText( 'MIC source', baseSize, bottomLine2, maxWidthBot );
		}
		else {
			// codec and quality
			canvasCtx.textAlign = 'right';
			outlineText( trackData.codec, rightPos, bottomLine1 );
			outlineText( trackData.quality, rightPos, bottomLine1 + baseSize );

			// song/queue count
			const totalSongs = queueLength();
			if ( totalSongs && elShowCount.checked ) {
				const padDigits = ( '' + totalSongs ).length,
					  counter   = `Track ${ ( '' + ( playlistPos + 1 ) ).padStart( padDigits, '0' ) } of ${ totalSongs }`;
				outlineText( counter, rightPos, bottomLine1 - baseSize );
			}

			// artist name
			canvasCtx.textAlign = 'left';
			outlineText( trackData.artist.toUpperCase(), baseSize, bottomLine1, maxWidthBot );

			// album title
			canvasCtx.font = `italic ${normalFont}`;
			outlineText( trackData.album, baseSize, bottomLine3, maxWidthBot );

			// song title
			canvasCtx.font = largeFont;
			outlineText( audioEl.src ? trackData.title : 'No song loaded', baseSize, bottomLine2, maxWidthBot );

			// time
			if ( audioEl.duration || trackData.duration ) {
				if ( ! trackData.duration ) {
					trackData.duration =
						audioEl.duration === Infinity ? 'LIVE' : formatHHMMSS( audioEl.duration );

					if ( playlist.children[ playlistPos ] )
						playlist.children[ playlistPos ].dataset.duration = trackData.duration;
				}
				canvasCtx.textAlign = 'right';

				outlineText( formatHHMMSS( audioEl.currentTime ) + ' / ' + trackData.duration, rightPos, bottomLine3 );
			}

			// cover image
			if ( coverImage.width && elShowCover.checked )
				canvasCtx.drawImage( coverImage, baseSize, bottomLine1 - coverSize * 1.3, coverSize, coverSize );
		}

		if ( --canvasMsg.timer < 1 )
			canvasMsg.info = canvasMsg.fade = 0;
	}
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
 * Display information about canvas size changes
 */
function showCanvasInfo( reason, instance ) {

	// resize OSD canvas
	const dPR    = instance.pixelRatio,
		  width  = elOSD.width  = elContainer.clientWidth * dPR,
		  height = elOSD.height = elContainer.clientHeight * dPR;

	let msg;

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
		content.innerHTML += `<div ${ error ? 'class="error"' : '' }>${ time } ${msg}</div>`;

	content.scrollTop = content.scrollHeight;
}

/**
 * Change audio input source
 */
function setSource() {

	// set global variable
	isMicSource = elSource.checked;

	if ( isMicSource ) {
		if ( ! micStream ) {
			// if micStream is not set yet, try to get access to user's microphone
			if ( navigator.mediaDevices ) {
				navigator.mediaDevices.getUserMedia( { audio: true, video: false } )
				.then( stream => {
					micStream = audioCtx.createMediaStreamSource( stream );
					setSource(); // recursive call, micStream should now be set
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
			if ( isPlaying() )
				audioElement[ currAudio ].pause();
			// mute the output to avoid feedback loop from the microphone
			wasMuted = elMute.checked;
			toggleMute( true );
			audioMotion.connectInput( micStream );
			consoleLog( 'Audio source set to microphone' );
		}
	}
	else {
		if ( micStream ) {
			audioMotion.disconnectInput( micStream );
			toggleMute( wasMuted );
		}
		consoleLog( 'Audio source set to built-in player' );
	}

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
 * Set balance
 */
function setBalance( value ) {
	elBalance.dataset.value = value;
	panNode.pan.value = Math.log10( 9 * Math.abs( value ) + 1 ) * Math.sign( value );
	elBalance.querySelector('.marker').style.transform = `rotate( ${ 145 * value - 90 }deg )`;
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
 * Set volume
 */
function setVolume( value ) {
	elVolume.dataset.value = value;
	audioMotion.volume = value ** 2.5; // creates a more natural volume curve
	elVolume.querySelector('.marker').style.transform = `rotate( ${ 125 + 290 * value }deg )`;
}

/**
 * Change fullscreen analyzer height
 */
function changeFsHeight( incr ) {
	const val = +elFsHeight.value;

	if ( incr == 1 && val < +elFsHeight.max || incr == -1 && val > +elFsHeight.min ) {
		elFsHeight.value = val + elFsHeight.step * incr;
		setProperty( elFsHeight, true );
		updateRangeValue( elFsHeight );
	}
	setCanvasMsg( `Analyzer height: ${ elFsHeight.value }%` );
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

	if ( thisPreset.randomMode !== undefined ) // convert legacy boolean value to integer (version =< 19.12)
		thisPreset.randomMode |= 0;

	if ( thisPreset.blackBg !== undefined ) // convert legacy blackBg property (version =< 20.4)
		thisPreset.background = thisPreset.blackBg | 0;

	if ( thisPreset.showScale !== undefined ) { // convert legacy showScale property (version =< 20.9)
		thisPreset.showScaleX = thisPreset.showScale & 1;
		thisPreset.showScaleY = thisPreset.showScale >> 1;
	}

	if ( thisPreset.reflex !== undefined && isNaN( thisPreset.reflex ) ) // convert legacy string value to integer (version =< 20.6)
		thisPreset.reflex = ['off','on','mirror'].indexOf( thisPreset.reflex );

	if ( thisPreset.bgImageFit !== undefined && isNaN( thisPreset.bgImageFit ) ) // convert legacy string value to integer (version =< 20.6)
		thisPreset.bgImageFit = ['adjust','center','repeat','pulse','zoom-in','zoom-out'].indexOf( thisPreset.bgImageFit );

	$$('[data-prop]').forEach( el => {
		const prop = el.dataset.prop,
			  val  = thisPreset[ prop ] !== undefined ? thisPreset[ prop ] : init ? defaults[ prop ] : undefined;

		if ( val !== undefined ) {
			if ( el.classList.contains('switch') )
				el.dataset.active = val | 0;
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

	if ( thisPreset.highSens !== undefined ) // legacy option (version =< 19.5)
		elSensitivity.value = thisPreset.highSens ? 2 : 1;

	if ( thisPreset.minDb !== undefined && thisPreset.maxDb !== undefined ) { // legacy options (version =< 19.12)
		$('.min-db[data-preset="1"]').value = thisPreset.minDb;
		$('.max-db[data-preset="1"]').value = thisPreset.maxDb;
		savePreferences( KEY_SENSITIVITY );
	}

	audioMotion.setOptions( {
		fftSize      : elFFTsize.value,
		minFreq      : elRangeMin.value,
		maxFreq      : elRangeMax.value,
		smoothing    : elSmoothing.value,
		showPeaks    : isSwitchOn( elShowPeaks ),
		showLeds     : isSwitchOn( elLedDisplay ),
		lumiBars     : isSwitchOn( elLumiBars ),
		loRes        : isSwitchOn( elLoRes ),
		showFPS      : isSwitchOn( elFPS ),
		showScaleX   : isSwitchOn( elScaleX ),
		showScaleY   : isSwitchOn( elScaleY ),
		radial       : isSwitchOn( elRadial ),
		spinSpeed    : elSpin.value,
		stereo       : isSwitchOn( elStereo ),
		splitGradient: isSwitchOn( elSplitGrad ),
		mirror       : elMirror.value
	} );

	// settings that make additional changes are set by the setProperty() function
	setProperty(
		[ elBackground,
		elBgImageFit,
		elBgImageDim,
		elSensitivity,
		elReflex,
		elGradient,
		elRandomMode,
		elBarSpace,
		elFsHeight,
		elMode ], true );

	if ( name == 'demo' )
		selectRandomMode( true );

	if ( alert )
		notie.alert({ text: 'Settings loaded!' });
}

/**
 * Return an object with the current settings
 */
function getCurrentSettings() {
	return {
		fftSize		: elFFTsize.value,
		freqMin		: elRangeMin.value,
		freqMax		: elRangeMax.value,
		smoothing	: elSmoothing.value,
		gradient	: elGradient.value,
		mode        : elMode.value,
		randomMode  : elRandomMode.value,
		sensitivity : elSensitivity.value,
		lineWidth   : elLineWidth.value,
		fillAlpha   : elFillAlpha.value,
		barSpace    : elBarSpace.value,
		reflex      : elReflex.value,
		background  : elBackground.value,
		bgImageDim  : elBgImageDim.value,
		bgImageFit  : elBgImageFit.value,
		spin        : elSpin.value,
		fsHeight    : elFsHeight.value,
		mirror      : elMirror.value,
		showScaleX 	: elScaleX.dataset.active,
		showScaleY 	: elScaleY.dataset.active,
		showPeaks 	: elShowPeaks.dataset.active,
		cycleGrad   : elCycleGrad.dataset.active,
		ledDisplay  : elLedDisplay.dataset.active,
		lumiBars    : elLumiBars.dataset.active,
		repeat      : elRepeat.dataset.active,
		showSong    : elShowSong.dataset.active,
		noShadow    : elNoShadow.dataset.active,
		loRes       : elLoRes.dataset.active,
		showFPS     : elFPS.dataset.active,
		radial      : elRadial.dataset.active,
		stereo      : elStereo.dataset.active,
		splitGrad   : elSplitGrad.dataset.active,
		volume      : elVolume.dataset.value,
		balance     : elBalance.dataset.value
	};
}

/**
 * Update last used configuration
 */
function updateLastConfig() {
	saveToStorage( KEY_LAST_CONFIG, getCurrentSettings() );
}

/**
 * Update custom preset
 */
function updateCustomPreset() {
	saveToStorage( KEY_CUSTOM_PRESET, getCurrentSettings() );
	$('#preset').value = 'custom';
	notie.alert({ text: 'Custom preset saved!' });
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
			case 'KeyA': 		// cycle thru auto gradient / random mode options
				if ( isSwitchOn( elCycleGrad ) || isShiftKey ) {
					if ( ( elRandomMode.selectedIndex == elRandomMode.options.length - 1 && ! isShiftKey ) ||
					     ( elRandomMode.selectedIndex == 0 && isSwitchOn( elCycleGrad ) && isShiftKey ) ) {
						elCycleGrad.dataset.active = '0';
						elRandomMode.value = '0';
						setCanvasMsg( 'Auto gradient OFF / Random mode OFF' );
					}
					else {
						cycleElement( elRandomMode, isShiftKey );
						setCanvasMsg( 'Random mode: ' + getText( elRandomMode ) );
					}
				}
				else {
					elCycleGrad.dataset.active = '1';
					setCanvasMsg( 'Auto gradient ON' );
				}
				setProperty( elRandomMode, true );
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
 * Event handler for 'play' on audio elements
 */
function audioOnPlay() {
	if ( ! audioElement[ currAudio ].attributes.src ) {
		playSong( playlistPos );
		return;
	}

	if ( audioElement[ currAudio ].currentTime < .1 ) {
		if ( elRandomMode.value == '1' )
			selectRandomMode( true );
		else if ( isSwitchOn( elCycleGrad ) && elRandomMode.value == '0' )
			cycleElement( elGradient );
	}

	if ( isSwitchOn( elShowSong ) ) {
		const timeout = elTrackTimeout.value | 0 || Infinity;
		setCanvasMsg( 1, timeout );
	}
}

/**
 * Event handler for 'ended' on audio elements
 */
function audioOnEnded() {
	if ( ! playNextSong( true ) ) {
		loadSong( 0 );
		setCanvasMsg( 'Queue ended', 10 );
	}
}

/**
 * Error event handler for audio elements
 */
function audioOnError( e ) {
	if ( e.target.attributes.src )
		consoleLog( 'Error loading ' + e.target.src, true );
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
 * Choose a random visualization mode
 *
 * @param [force] {boolean} force change even when not playing
 *                (default true for microphone input, false otherwise )
 */
function selectRandomMode( force = isMicSource ) {
	if ( ! isPlaying() && ! force )
		return;

	// helper function
	const isEnabled = ( prop ) => ! randomProperties.find( item => item.value == prop ).disabled;

	let props = []; // properties that need to be updated

	elMode.selectedIndex = randomInt( elMode.options.length );

	if ( isEnabled('nobg') )
		elBackground.selectedIndex = randomInt( elBackground.options.length );

	if ( isEnabled('imgfit') ) {
		elBgImageFit.selectedIndex = randomInt( elBgImageFit.options.length );
		props.push( elBgImageFit );
	}

	if ( isEnabled('peaks') ) {
		elShowPeaks.dataset.active = randomInt(); // 0 or 1
		props.push( elShowPeaks );
	}

	if ( isEnabled('leds') ) {
		elLedDisplay.dataset.active = randomInt();
		props.push( elLedDisplay );
	}

	if ( isEnabled('lumi') ) {
		// always disable lumi when leds are active and background is set to image or video
		elLumiBars.dataset.active = elBackground.value[0] > 1 && isSwitchOn( elLedDisplay ) ? 0 : randomInt();
		props.push( elLumiBars );
	}

	if ( isEnabled('line') ) {
		elLineWidth.value = randomInt( 5 ) + 1; // 1 to 5
		updateRangeValue( elLineWidth );
	}

	if ( isEnabled('fill') ) {
		elFillAlpha.value = randomInt( 6 ) / 10; // 0 to 0.5
		updateRangeValue( elFillAlpha );
	}

	if ( isEnabled('barSp') )
		elBarSpace.selectedIndex = randomInt( elBarSpace.options.length );

	if ( isEnabled('reflex') ) {
		// exclude 'mirrored' reflex option for octave bands modes
		const options = elReflex.options.length - ( elMode.value % 10 != 0 );
		elReflex.selectedIndex = randomInt( options );
	}

	if ( isEnabled('radial') ) {
		elRadial.dataset.active = randomInt();
		props.push( elRadial );
	}

	if ( isEnabled('spin') ) {
		elSpin.value = randomInt(4);
		updateRangeValue( elSpin );
		props.push( elSpin );
	}

	if ( isEnabled('split') ) {
		elSplitGrad.dataset.active = randomInt();
		props.push( elSplitGrad );
	}

	if ( isEnabled('stereo') ) {
		elStereo.dataset.active = randomInt();
		props.push( elStereo );
	}

	if ( isEnabled('mirror') ) {
		elMirror.value = randomInt(3) - 1;
		props.push( elMirror );
	}

	if ( isSwitchOn( elCycleGrad ) ) {
		elGradient.selectedIndex = randomInt( elGradient.options.length );
		props.push( elGradient );
	}

	// add properties that depend on other settings (mode also sets barspace)
	props.push( elBackground, elReflex, elMode );

	// effectively set the affected properties
	setProperty( props, true );
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

	setProperty( el, true );
}

/**
 * Cycle X and Y axis scales
 *
 * @param [prev] {boolean} true to select previous option
 * @return integer (bit 0 = scale X status; bit 1 = scale Y status)
 */
function cycleScale( prev ) {
	let scale = ( elScaleX.dataset.active | 0 ) + ( elScaleY.dataset.active << 1 ) + ( prev ? -1 : 1 );

	if ( scale < 0 )
		scale = 3;
	else if ( scale > 3 )
		scale = 0;

	elScaleX.dataset.active = scale & 1;
	elScaleY.dataset.active = scale >> 1;

	setProperty( [ elScaleX, elScaleY ], true );
	return scale;
}

/**
 * Populate a select element
 *
 * @param element
 * @param options - an array of arrays or objects
 */
function populateSelect( element, options ) {
	const oldValue  = element.value,
		  hasConfig = ! Array.isArray( options[0] );

	if ( hasConfig )
		deleteChildren( element );

	for ( const item of ( hasConfig ? options.filter( i => ! i.disabled ) : options ) )
		element[ element.options.length ] = new Option( item.text || item[1], item.value || item[0] );

	if ( oldValue !== '' ) {
		element.value = oldValue;
		if ( element.selectedIndex == -1 ) // old value disabled
			element.selectedIndex = 0;
		setProperty( element, true );
	}
}

/**
 * Populate UI gradient selection combo box
 */
function populateGradients() {
	let grad = elGradient.value;
	deleteChildren( elGradient );

	// add the option to the html select element for the user interface
	for ( const key of Object.keys( gradients ) ) {
		if ( ! gradients[ key ].disabled )
			elGradient.options[ elGradient.options.length ] = new Option( gradients[ key ].name, key );
	}

	if ( grad !== '' ) {
		elGradient.value = grad;
		setProperty( elGradient, true );
	}
}

/**
 * Set event listeners for UI elements
 */
function setUIEventListeners() {

	// toggle settings
	const elToggleSettings = $('#toggle_settings');
	elToggleSettings.addEventListener( 'click', () => {
		$('#settings').classList.toggle('active', elToggleSettings.classList.toggle('active') );
	});
	$('.settings-close').addEventListener( 'click', () => elToggleSettings.click() );

	// toggle console
	const elToggleConsole = $('#toggle_console');
	elToggleConsole.addEventListener( 'click', () => {
		$('#console').classList.toggle( 'active', elToggleConsole.classList.toggle('active') );
		elToggleConsole.classList.remove('warning');
		consoleLog(); // update scroll only
	});
	$('#console-close').addEventListener( 'click', () => elToggleConsole.click() );
	$('#console-clear').addEventListener( 'click', () => consoleLog( 'Console cleared.', false, true ) );

	// Add event listeners to the custom checkboxes
	$$('.switch').forEach( el => {
		el.addEventListener( 'click', () => { el.dataset.active = ! ( el.dataset.active | 0 ) | 0 } );
	});

	[ elShowPeaks,
	  elLedDisplay,
	  elLumiBars,
	  elLoRes,
	  elFPS,
  	  elScaleX,
	  elScaleY,
	  elRadial,
	  elStereo,
	  elSplitGrad ].forEach( el => el.addEventListener( 'click', () => setProperty( el, true ) ) );

	[ elCycleGrad,
	  elRepeat,
	  elShowSong,
	  elNoShadow ].forEach( el => el.addEventListener( 'click', updateLastConfig ) );

	// Add event listeners to UI config elements

	elSource.addEventListener( 'change', setSource );
	elMute.addEventListener( 'change', () => toggleMute() );

	[ elVolume,
	  elBalance ].forEach( el => {
	  	el.addEventListener( 'wheel', e => {
			e.preventDefault();
			if ( knobUpdating )
				return;
			knobUpdating = true;
			const incr = Math.sign( e.deltaY || 0 );
			if ( el == elVolume )
				changeVolume( incr );
			else
				changeBalance( incr );
			setTimeout( () => knobUpdating = false, KNOB_DELAY );
		});
	});

	elBalance.addEventListener( 'dblclick', () => {
		changeBalance(0);
	});

	[ elMode,
	  elRandomMode,
	  elFFTsize,
	  elRangeMin,
	  elRangeMax,
	  elGradient,
	  elSmoothing,
	  elSensitivity,
	  elLineWidth,
	  elFillAlpha,
	  elBarSpace,
	  elReflex,
	  elBackground,
	  elBgImageDim,
	  elBgImageFit,
  	  elSpin,
  	  elFsHeight,
  	  elMirror ].forEach( el => el.addEventListener( 'change', () => setProperty( el, true ) ) );

	// update range elements' value
	$$('input[type="range"]').forEach( el => el.addEventListener( 'change', () => updateRangeValue( el ) ) );

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
		const elPreset = $('#preset');
		if ( elPreset.value ) {
			consoleLog( `Loading preset '${ getText( elPreset ) }'` );
			loadPreset( elPreset.value, true );
		}
	});
	$('#btn_save').addEventListener( 'click', updateCustomPreset );
	$('#btn_fullscreen').addEventListener( 'click', fullscreen );
	$('#load_playlist').addEventListener( 'click', () => {
		loadPlaylist( elPlaylists.value ).then( n => {
			const text = ( n == -1 ) ? 'No playlist selected' : `${n} song${ n > 1 ? 's' : '' } added to the queue`;
			notie.alert({ text, time: 5 });
		});
	});
	$('#save_playlist').addEventListener( 'click', () => savePlaylist( elPlaylists.selectedIndex ) );
	$('#create_playlist').addEventListener( 'click', () => storePlaylist() );
	$('#delete_playlist').addEventListener( 'click', () => deletePlaylist( elPlaylists.selectedIndex ) );
	$('#btn_clear').addEventListener( 'click', clearPlayQueue );

	// clicks on canvas toggle info display on/off
	elOSD.addEventListener( 'click', () =>	toggleInfo() );

	// local file upload
	$('#local_file').addEventListener( 'change', e => loadLocalFile( e.target ) );

	// load remote files from URL
	$('#btn_load_url').addEventListener( 'click', () => {
		notie.input({
			text: 'Load audio file or stream from URL',
			submitText: 'Load',
			submitCallback: url => { if ( url.trim() ) addToPlayQueue( url, true ) }
		});
	});
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
			savePreferences( KEY_DISABLED_GRADS );
		});
	});

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
				$(`.min-db[data-preset="${el.dataset.preset}"]`).value = sensitivityDefaults[ el.dataset.preset ].min;
				$(`.max-db[data-preset="${el.dataset.preset}"]`).value = sensitivityDefaults[ el.dataset.preset ].max;
				if ( el.dataset.preset == elSensitivity.value ) // current preset has been changed
					setProperty( elSensitivity );
				savePreferences( KEY_SENSITIVITY );
			});
		}
		else {
			el.addEventListener( 'change', () => {
				if ( el.dataset.preset == elSensitivity.value ) // current preset has been changed
					setProperty( elSensitivity );
				savePreferences( KEY_SENSITIVITY );
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
}

/**
 * Load preferences from localStorage
 */
function loadPreferences() {
	// helper function
	const parseDisabled = ( jsonData, options ) => {
		if ( jsonData !== null ) {
			JSON.parse( jsonData ).forEach( option => {
				options.find( item => item.value == option ).disabled = true;
			});
		}
	}

	// Load last used settings
	const lastConfig    = localStorage.getItem( KEY_LAST_CONFIG ),
		  isLastSession = ( lastConfig !== null );

	// if no data found from last session, use the defaults (in the demo site use the demo preset)
	presets['last'] = JSON.parse( lastConfig ) || { ...presets[ location.host.startsWith('demo.') ? 'demo' : 'default' ] };

	// Load custom preset; if none found in storage, use the last settings
	presets['custom'] = JSON.parse( localStorage.getItem( KEY_CUSTOM_PRESET ) ) || { ...presets['last'] };

	// Load disabled modes preference
	parseDisabled( localStorage.getItem( KEY_DISABLED_MODES ), modeOptions );

	// Load disabled background image fit options
	parseDisabled( localStorage.getItem( KEY_DISABLED_BGFIT ), bgFitOptions );

	// Load disabled gradients preference
	const disabledGradients = localStorage.getItem( KEY_DISABLED_GRADS );
	if ( disabledGradients !== null ) {
		JSON.parse( disabledGradients ).forEach( key => {
			gradients[ key ].disabled = true;
		});
	}

	// Load disabled random properties preference
	parseDisabled( localStorage.getItem( KEY_DISABLED_PROPS ), randomProperties );

	// Sensitivity presets
	const elMinSens = $$('.min-db');
	for ( let i = -60; i >= -110; i -= 5 )
		elMinSens.forEach( el => el[ el.options.length ] = new Option( i ) );

	const elMaxSens = $$('.max-db');
	for ( let i = 0; i >= -40; i -= 5 )
		elMaxSens.forEach( el => el[ el.options.length ] = new Option( i ) );

	const sensitivityPresets = JSON.parse( localStorage.getItem( KEY_SENSITIVITY ) ) || sensitivityDefaults;

	sensitivityPresets.forEach( ( preset, index ) => {
		elMinSens[ index ].value = preset.min;
		elMaxSens[ index ].value = preset.max;
	});

	// On-screen display options - merge saved options (if any) with the defaults and set UI fields
	setInfoOptions( { ...infoDisplayDefaults, ...( JSON.parse( localStorage.getItem( KEY_DISPLAY_OPTS ) ) || {} ) } );

	return isLastSession;
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

	if ( ! key || key == KEY_DISABLED_PROPS )
		saveToStorage( KEY_DISABLED_PROPS, getDisabledItems( randomProperties ) );

	if ( ! key || key == KEY_SENSITIVITY ) {
		let sensitivityPresets = [];
		for ( const i of [0,1,2] ) {
			sensitivityPresets.push( {
				min: $(`.min-db[data-preset="${i}"]`).value,
				max: $(`.max-db[data-preset="${i}"]`).value
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
 * Initialization function
 */
(function() {

	// Log all JS errors to our UI console
	window.addEventListener( 'error', event => consoleLog( `Unexpected ${event.error}`, true ) );

	consoleLog( `audioMotion.js v${VERSION} initializing...` );
	consoleLog( `User agent: ${window.navigator.userAgent}` );

	$('#version').innerText = VERSION;

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

	audioCtx = audioMotion.audioCtx;

	// create panNode for balance control - NOTE: no support on Safari < 14.1
	panNode = audioCtx.createStereoPanner();

	// Initialize and connect audio elements

	currAudio = 0;
	nextAudio = 1;

	for ( const i of [0,1] ) {
		audioElement[ i ] = $( `#player${i}` );
		clearAudioElement( i );
		audioElement[ i ].addEventListener( 'play', audioOnPlay );
		audioElement[ i ].addEventListener( 'ended', audioOnEnded );
		audioElement[ i ].addEventListener( 'error', audioOnError );

		audioCtx.createMediaElementSource( audioElement[ i ] ).connect( panNode );
	}

	audioMotion.connectInput( panNode );

	// Setup configuration panel
	doConfigPanel();

	// Populate combo boxes

	populateSelect( elMode, modeOptions );

	for ( let i = 9; i < 16; i++ )
		elFFTsize[ elFFTsize.options.length ] = new Option( 2**i );

	for ( const i of [20,30,40,50,60,100,250,500,1000,2000] )
		elRangeMin[ elRangeMin.options.length ] = new Option( ( i >= 1000 ? ( i / 1000 ) + 'k' : i ) + 'Hz', i );

	for ( const i of [1000,2000,4000,8000,12000,16000,22000] )
		elRangeMax[ elRangeMax.options.length ] = new Option( ( i / 1000 ) + 'kHz', i );

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
		[ BG_DEFAULT, 'Gradient default' ],
		[ BG_BLACK,   'Black'            ],
		[ BG_COVER,   'Album cover'      ]
	]);

	populateSelect( elBgImageFit, bgFitOptions );

	populateSelect( elMirror, [
		[ '0',  'Off' ],
		[ '-1', 'Left'    ],
		[ '1',  'Right'   ]
	]);

	// Check the backgrounds directory for additional background options (images and videos)
	const bgDirPromise = fetch( BG_DIRECTORY )
		.then( response => response.text() )
		.then( content => {
			const imageExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i,
				  videoExtensions = /\.(mp4|webm|mov)$/i;

			for ( const { file } of fileExplorer.parseWebIndex( content ) ) {
				if ( file.match( imageExtensions ) )
					bgImages.push( file );
				else if ( file.match( videoExtensions ) )
					bgVideos.push( file );
			}

			const imageCount = bgImages.length,
				  videoCount = bgVideos.length,
				  bgOptions  = bgImages.map( fn => [ BG_IMAGE + fn, '🖼️ ' + getFileName( fn ) ] ).concat(
							   bgVideos.map( fn => [ BG_VIDEO + fn, '🎬 ' + getFileName( fn ) ] )
							   ).slice( 0, MAX_BG_MEDIA_FILES );

			if ( videoCount )
				bgOptions.splice( 0, 0, [ BG_VIDEO, 'Random video' ] );

			if ( imageCount )
				bgOptions.splice( 0, 0, [ BG_IMAGE, 'Random image' ] );

			populateSelect( elBackground, bgOptions );
		})
		.catch( e => {} ); // fail silently

	// Set attributes of range elements
	const setRangeAtts = ( element, min, max, step = 1 ) => {
		element.min  = min;
		element.max  = max;
		element.step = step;
	}

	setRangeAtts( elBgImageDim, 0.1, 1, .1 );
	setRangeAtts( elLineWidth, 1, 5 );
	setRangeAtts( elFillAlpha, 0, .5, .1 );
	setRangeAtts( elSmoothing, 0, .9, .1 );
	setRangeAtts( elSpin, 0, 3, 1 );
	setRangeAtts( elFsHeight, 25, 100, 5 );

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
			dblClick: ( file, event ) => {
				addBatchToPlayQueue( [ { file } ], true );
				event.target.classList.remove( 'selected', 'sortable-chosen' );
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
			consoleLog( `${serversignature} detected` );
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

	// Wait for all async operations to finish before loading the last used settings
	Promise.all( [ bgDirPromise, fileExplorerPromise ] ).then( () => {
		consoleLog( `Loading ${ isLastSession ? 'last session' : 'default' } settings` );
		loadPreset( 'last', false, true );
		consoleLog( `AudioContext sample rate is ${audioCtx.sampleRate}Hz; Latency is ${ ( ( audioCtx.outputLatency || 0 ) + audioCtx.baseLatency ) * 1e3 | 0 }ms` );
		consoleLog( 'Initialization complete!' );
	});

})();
