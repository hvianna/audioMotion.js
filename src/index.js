/**
 * audioMotion.js
 * High-resolution real-time spectrum analyzer and music player
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * @author    Henrique Vianna <hvianna@gmail.com>
 * @copyright (c) 2018-2020 Henrique Avila Vianna
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

const _VERSION = '20.12';

import AudioMotionAnalyzer from 'audiomotion-analyzer';
import * as fileExplorer from './file-explorer.js';
import * as mm from 'music-metadata-browser';
import './scrollIntoViewIfNeeded-polyfill.js';

import Sortable, { MultiDrag } from 'sortablejs';
Sortable.mount( new MultiDrag() );

import notie from 'notie';
import './notie.css';

import './styles.css';

// selector shorthand functions
const $  = document.querySelector.bind( document ),
	  $$ = document.querySelectorAll.bind( document );

// UI HTML elements
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
	  elSource      = $('#source'),
	  elPlaylists   = $('#playlists'),
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
	  elVolume      = $('#volume'),
	  elInfoTimeout = $('#info_timeout'),
	  elTrackTimeout= $('#track_timeout'),
	  elEndTimeout  = $('#end_timeout'),
	  elShowCover   = $('#show_cover');

// AudioMotionAnalyzer object
let audioMotion;

// playlist, index to the current song, indexes to current and next audio elements
let playlist, playlistPos, currAudio, nextAudio;

// audio sources
let audioElement, micStream, isMicSource, savedVolume;

// on-screen messages
let canvasMsg;

// auxiliary variables for track skip and fast search
let skipping = false, isFastSearch = false, fastSearchTimeout;

// interval for timed random mode
let randomModeTimer;

// cover images for current and next song
let coverImage = [];

// folder cover images for songs with no picture in the metadata
let folderImages = {};

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
		bgImageDim  : 0.3,
		bgImageFit  : 1, 	// center
		radial      : 0,
		spin        : 2,
		stereo      : 0,
		splitGrad   : 0
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
	apple:    { name: 'Apple ][', bgColor: '#111', colorStops: [
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
	tiedye:   { name: 'Tie Dye', bgColor: '#111', colorStops: [
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
	{ value: 'split',  text: 'Split',        disabled: false }
];

// Sensitivity presets
const sensitivityDefaults = [
	{ min: -70,  max: -20 }, // low
	{ min: -85,  max: -25 }, // normal
	{ min: -100, max: -30 }  // high
];

// On-screen information display options
const infoDisplayDefaults = {
	info  : 5,	 // display time (secs) when requested via click or keyboard shortcut
	track : 10,  // display time (secs) on track change
	end   : 0,   // display time (secs) at the end of the song
	covers: true // show album covers in song information
}

/**
 * Display the canvas in full-screen mode
 */
function fullscreen() {
	audioMotion.toggleFullscreen();
	$('#btn_fullscreen').blur();
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
			case elBgImageFit:
			case elBgImageDim:
				const bgOption = elBackground.value,
					  bgFit    = elBgImageFit.value;

				audioMotion.overlay = ( bgOption > 1 );
				audioMotion.showBgColor = ( bgOption == 0 );
				audioMotion.canvas.classList.toggle( 'repeat', bgFit == 2 );
				audioMotion.canvas.classList.toggle( 'cover', bgFit == 0 );

				setCurrentCover();
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

			case elRangeMin:
			case elRangeMax:
				while ( Number( elRangeMax.value ) <= Number( elRangeMin.value ) )
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
				if ( elMode.value === '' ) // handle invalid setting
					elMode.selectedIndex = 0;

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
 * Set the current cover image or just update the canvas background
 */
function setCurrentCover( url ) {
	if ( url )
		coverImage[ currAudio ].src = url;

	if ( elBackground.value > 1 && coverImage[ currAudio ].src ) {
		const alpha = 1 - elBgImageDim.value;
		const imageUrl = coverImage[ currAudio ].src.replace( /'/g, "\\'" ); // escape single quotes
		audioMotion.canvas.style.backgroundImage = `linear-gradient( rgba(0,0,0,${alpha}) 0%, rgba(0,0,0,${alpha}) 100% ), url('${imageUrl}')`;
	}
	else
		audioMotion.canvas.style.backgroundImage = '';

	audioMotion.canvas.style.backgroundSize = '';
}

/**
 * Clear audio element
 */
function clearAudioElement( n = currAudio ) {
	const elAudio   = audioElement[ n ],
		  trackData = elAudio.dataset;

	elAudio.removeAttribute('src');
	trackData.file = '';
	trackData.artist = '';
	trackData.title = '';
	trackData.album = '';
	trackData.codec = '';
	trackData.quality = '';
	trackData.duration = '';

	elAudio.load();

	coverImage[ n ] = new Image();
	if ( n == currAudio )
		setCurrentCover(); // clear current background image
}

/**
 * Clear the play queue
 */
function clearPlayQueue() {

	while ( playlist.hasChildNodes() )
		playlist.removeChild( playlist.firstChild );

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

	while ( elPlaylists.hasChildNodes() )
		elPlaylists.removeChild( elPlaylists.firstChild );

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
		const total = added.reduce( ( sum, val ) => sum + val, 0 );
		notie.alert({ text: `${total} song${ total > 1 ? 's' : '' } added to the queue`, time: 5 });
	});
}

/**
 * Add a song or playlist to the play queue
 */
function addToPlayQueue( file, autoplay = false ) {

	const ext = file.slice( file.lastIndexOf('.') + 1 ).toLowerCase();
	let ret;

	if ( ['m3u','m3u8'].includes( ext ) )
		ret = loadPlaylist( file );
	else
		ret = new Promise( resolve => {
			addSongToPlayQueue( file );
			resolve(1);
		});

	// when promise resolved, if autoplay requested start playing the first added song
	ret.then( n => {
		if ( autoplay && ! isPlaying() && n > 0 )
			playSong( playlist.children.length - n );
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

	if ( sourceData ) { 	// just copy metadata from element dataset (playlist item)
		trackData.artist   = sourceData.artist || '';
		trackData.title    = sourceData.title || '';
		trackData.album    = sourceData.album || '';
		trackData.codec    = sourceData.codec || '';
		trackData.quality  = sourceData.quality || '';
		trackData.duration = sourceData.duration || '';
	}
	else {						// parse metadata read from file
		trackData.artist   = common.artist || trackData.artist;
		trackData.title    = common.title || trackData.title;
		trackData.album    = common.album ? common.album + ( common.year ? ' (' + common.year + ')' : '' ) : '';
		trackData.codec    = format ? format.codec || format.container : trackData.codec;

		if ( format && format.bitsPerSample )
			trackData.quality = Math.floor( format.sampleRate / 1000 ) + 'KHz / ' + format.bitsPerSample + 'bits';
		else if ( format.bitrate )
			trackData.quality = Math.floor( format.bitrate / 1000 ) + 'K ' + format.codecProfile || '';
		else
			trackData.quality = '';

		if ( format && format.duration )
			trackData.duration = formatHHMMSS( format.duration );
		else
			trackData.duration = '';
	}
}

/**
 * Add a song to the play queue
 */
function addSongToPlayQueue( uri, content = {} ) {

	// normalize slashes in path
	uri = uri.replace( /\\/g, '/' );

	// extract file name and extension
	const file = uri.split('/').pop(),
		  ext  = file.split('.').pop();

	// create new list element
	const newEl     = document.createElement('li'),
		  trackData = newEl.dataset;

	trackData.artist = content.artist || '';
	trackData.title  = content.title || file.replace( /%23/g, '#' ) || uri.slice( uri.lastIndexOf('//') + 2 );
	trackData.codec  = ( ext !== file ) ? ext.toUpperCase() : '';

	// replace any '#' character in the filename for its URL-safe code (for content coming from playlist files)
	uri = uri.replace( /#/g, '%23' );
	trackData.file = uri;

	playlist.appendChild( newEl );

	const len = playlist.children.length;
	if ( len == 1 && ! isPlaying() )
		loadSong(0);
	if ( playlistPos > len - 3 )
		loadNextSong();

	// try to retrieve metadata from audio file or stream
	fetch( uri ).then( response => {
		return response.body;
	}).then( stream => {
		mm.parseReadableStream( stream, '', { skipCovers: true } ).then( metadata => {
			if ( metadata ) {
				addMetadata( metadata, newEl ); // add metadata to play queue item
				audioElement.forEach( el => {
					if ( el.dataset.file == trackData.file )
						addMetadata( newEl, el ); // transfer metadata to audio element
				});
			}
			stream.cancel(); // release stream
		}).catch( e => {} ); // fail silently
	});
}

/**
 * Load a playlist file into the play queue
 */
function loadPlaylist( path ) {

	// normalize slashes
	path = path.replace( /\\/g, '/' );

	// get file extension
	const ext = path.slice( path.lastIndexOf('.') + 1 ).toLowerCase();

	let	n = 0,
		songInfo;

	return new Promise( resolve => {
		if ( ! path ) {
			resolve( -1 );
		}
		else if ( ['m3u','m3u8'].includes( ext ) ) {
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
							n++;
							if ( ! songInfo ) { // if no previous #EXTINF tag, extract info from the filename
								songInfo = line.slice( line.lastIndexOf('/') + 1 );
								songInfo = songInfo.slice( 0, songInfo.lastIndexOf('.') ).replace( /_/g, ' ' );
							}
							if ( line.slice( 0, 4 ) != 'http' && line[1] != ':' && line[0] != '/' )
								line = path + line;
							// extract artist name and song title off the info tag (format: ARTIST - SONG)
							const sep = songInfo.indexOf(' - ');
							if ( sep == -1 )
								addSongToPlayQueue( line, { title: songInfo } );
							else
								addSongToPlayQueue( line, { artist: songInfo.slice( 0, sep ), title: songInfo.slice( sep + 3 ) } );
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
					n++;
					item = item.replace( /\\/g, '/' );
					songInfo = item.slice( item.lastIndexOf('/') + 1 );
					songInfo = songInfo.slice( 0, songInfo.lastIndexOf('.') ).replace( /_/g, ' ' );
					addSongToPlayQueue( item, { title: songInfo } )
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

	if ( playlist.children.length == 0 ) {
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

			localStorage.setItem( 'playlists', JSON.stringify( playlists ) );
			loadSavedPlaylists( safename );
		}

		let songs = [];
		playlist.childNodes.forEach( item => songs.push( item.dataset.file ) );

		localStorage.setItem( 'pl_' + safename, JSON.stringify( songs ) );
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
					localStorage.setItem( 'playlists', JSON.stringify( playlists ) );
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

	for ( let i = playlist.children.length - 1; i > 0; i-- ) {
		r = Math.floor( Math.random() * ( i + 1 ) );
		temp = playlist.replaceChild( playlist.children[ r ], playlist.children[ i ] );
		playlist.insertBefore( temp, playlist.children[ r ] );
	}

	playSong(0);
}

/**
 * Return the index of an element inside its parent
 * based on https://stackoverflow.com/a/13657635/2370385
 */
function getIndex( node ) {
	if ( ! node )
		return;
	let i = 0;
	while ( node = node.previousElementSibling )
		i++;
	return i;
}

/**
 * Get album cover from file metadata
 */
function loadCover( uri ) {
	return new Promise( resolve => {
		mm.fetchFromUrl( uri )
			.then( metadata => {
				if ( metadata.common.picture && metadata.common.picture.length ) {
					const blob = new Blob( [ metadata.common.picture[0].data ], { type: metadata.common.picture[0].format } );
					resolve( URL.createObjectURL( blob ) );
				}
				else if ( serverMode == -1 ) { // in file mode there's nothing else we can do
					resolve('');
				}
				else {
					// no picture in the metadata - try to get a cover image from the song's folder
					const path = uri.slice( 0, uri.lastIndexOf('/') + 1 );

					if ( folderImages[ path ] !== undefined )
						resolve( path + folderImages[ path ] );
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
				}
			})
			.catch( e => resolve('') ); // fail silently
	});
}

/**
 * Load a song into the currently active audio element
 */
function loadSong( n ) {
	if ( playlist.children[ n ] ) {
		playlistPos = n;
		const song = playlist.children[ playlistPos ];
		audioElement[ currAudio ].src = song.dataset.file;
		audioElement[ currAudio ].dataset.file = song.dataset.file;
		coverImage[ currAudio ] = new Image();
		addMetadata( song, audioElement[ currAudio ] );
		loadCover( song.dataset.file ).then( cover => setCurrentCover( cover ) );

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
	const next    = ( playlistPos < playlist.children.length - 1 ) ? playlistPos + 1 : 0,
		  song    = playlist.children[ next ],
		  audioEl = audioElement[ nextAudio ];

	if ( song ) {
		audioEl.src = song.dataset.file;
		audioEl.load();
		audioEl.dataset.file = song.dataset.file;
		coverImage[ nextAudio ] = new Image();

		addMetadata( song, audioEl );
		loadCover( song.dataset.file ).then( cover => coverImage[ nextAudio ].src = cover );
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
			consoleLog( err, true );
			playNextSong( true );
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
	if ( isPlaying() ) {
		if ( audioElement[ currAudio ].currentTime > 2 )
			audioElement[ currAudio ].currentTime = 0;
		else if ( playlistPos > 0 )
			playSong( playlistPos - 1 );
		else
			return false;
	}
	else
		return loadSong( playlistPos - 1 );
}

function playNextSong( play ) {

	if ( skipping || isMicSource || playlistPos > playlist.children.length - 1 )
		return true;

	skipping = true;

	if ( playlistPos < playlist.children.length - 1 )
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

	if ( play ) {
		audioElement[ currAudio ].play()
		.then( () => {
			loadNextSong();
		})
		.catch( err => {
			consoleLog( err, true );
			loadNextSong();
			playNextSong( true );
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
	const canvasCtx = audioMotion.canvasCtx;
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
 * Format time in seconds to hh:mm:ss
 */
function formatHHMMSS( time ) {
	let str = '',
		lead = '';

	if ( time >= 3600 ) {
		str = Math.floor( time / 3600 ) + ':';
		time %= 3600;
		lead = '0';
	}

	str += ( lead + Math.floor( time / 60 ) ).slice(-2) + ':' + ( '0' + Math.floor( time % 60 ) ).slice(-2);

	return str;
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
		  endTimeout = elEndTimeout.value | 0;

	// if song is less than 100ms from the end, skip to the next track for improved gapless playback
	if ( remaining < .1 )
		playNextSong( true );

	// set song info display at the end of the song
	if ( endTimeout > 0 && remaining <= endTimeout && isSwitchOn( elShowSong ) && ! canvasMsg.info && isPlaying() )
		setCanvasMsg( 1, remaining, -1 );

	// update background image for pulse and zoom effects
	if ( elBackground.value > 1 && elBgImageFit.value > 2 ) {
		let size;

		if ( elBgImageFit.value == 3 )	// pulse
			size = ( audioMotion.energy * 70 | 0 ) - 25;
		else {
			const songProgress = audioEl.currentTime / audioEl.duration;
			size = ( elBgImageFit.value == 4 ? songProgress : 1 - songProgress ) * 100;
		}

		audioMotion.canvas.style.backgroundSize = `auto ${ 100 + size }%`;
	}

	if ( ( canvasMsg.timer || canvasMsg.msgTimer ) < 1 )
		return;

	const canvas     = audioMotion.canvas,
		  canvasCtx  = audioMotion.canvasCtx,
		  fontSize   = canvas.height / 17, // ~64px for a 1080px-tall canvas - used to scale several other measures
		  centerPos  = canvas.width / 2,
		  topLine    = fontSize * 1.4,
		  normalFont = `bold ${ fontSize * .7 }px sans-serif`,
		  largeFont  = `bold ${fontSize}px sans-serif`;

	canvasCtx.lineWidth = 4 * audioMotion.pixelRatio;
	canvasCtx.lineJoin = 'round';
	canvasCtx.font = normalFont;
	canvasCtx.textAlign = 'center';

	canvasCtx.fillStyle = '#fff';
	canvasCtx.strokeStyle = canvasCtx.shadowColor = '#000';

	// Display custom message if any and info level 2 is not set
	if ( canvasMsg.msgTimer > 0 && canvasMsg.info != 2 ) {
		canvasCtx.globalAlpha = canvasMsg.msgTimer < 60 ? canvasMsg.msgTimer / 60 : 1;
		outlineText( canvasMsg.msg, centerPos, topLine );
		canvasMsg.msgTimer--;
	}

	// Display song and config info
	if ( canvasMsg.timer > 0 ) {
		const leftPos     = fontSize,
			  rightPos    = canvas.width - fontSize,
			  bottomLine1 = canvas.height - fontSize * 4,
			  bottomLine2 = canvas.height - fontSize * 2.8,
			  bottomLine3 = canvas.height - fontSize * 1.6,
			  maxWidth    = canvas.width - fontSize * 7,    // maximum width for artist and song name
			  maxWidthTop = canvas.width / 3 - fontSize;    // maximum width for messages shown at the top

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
			const secondLine = topLine * 1.8;

			outlineText( 'Gradient: ' + gradients[ elGradient.value ].name, centerPos, topLine, maxWidthTop );
			outlineText( `Auto gradient is ${ onOff( elCycleGrad ) }`, centerPos, secondLine );

			canvasCtx.textAlign = 'left';
			outlineText( getText( elMode ), leftPos, topLine, maxWidthTop );
			outlineText( `Random mode: ${ getText( elRandomMode ) }`, leftPos, secondLine, maxWidthTop );

			canvasCtx.textAlign = 'right';
			outlineText( getText( elSensitivity ).toUpperCase() + ' sensitivity', rightPos, topLine, maxWidthTop );
			outlineText( `Repeat is ${ onOff( elRepeat ) }`, rightPos, secondLine, maxWidthTop );
		}

		if ( isMicSource ) {
			canvasCtx.textAlign = 'left';
			canvasCtx.font = largeFont;
			outlineText( 'MIC source', leftPos, bottomLine2, maxWidth );
		}
		else {
			// codec and quality
			canvasCtx.textAlign = 'right';
			outlineText( trackData.codec, rightPos, bottomLine1 );
			outlineText( trackData.quality, rightPos, bottomLine1 + fontSize );

			// artist name
			canvasCtx.textAlign = 'left';
			outlineText( trackData.artist.toUpperCase(), leftPos, bottomLine1, maxWidth );

			// album title
			canvasCtx.font = `italic ${normalFont}`;
			outlineText( trackData.album, leftPos, bottomLine3, maxWidth );

			// song title
			canvasCtx.font = largeFont;
			outlineText( audioEl.src ? trackData.title : 'No song loaded', leftPos, bottomLine2, maxWidth );

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
			if ( coverImage[ currAudio ].width && elShowCover.checked ) {
				const coverSize = fontSize * 3;
				canvasCtx.drawImage( coverImage[ currAudio ], leftPos, bottomLine1 - coverSize * 1.3, coverSize, coverSize );
			}
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
	let msg;

	switch ( reason ) {
		case 'create':
			consoleLog( `Display resolution: ${instance.fsWidth} x ${instance.fsHeight} pixels` );
			consoleLog( `Display pixel ratio: ${window.devicePixelRatio}` );
			msg = 'Canvas created';
			break;
		case 'lores':
			msg = `Lo-res mode ${ instance.loRes ? 'ON' : 'OFF' } (pixelRatio = ${instance.pixelRatio})`;
			break;
		case 'fschange':
			msg = 'Fullscreen changed';
			break;
		case 'resize':
			msg = 'Window resized';
			break;
	}

	consoleLog( `${ msg || reason }. Canvas size is ${ instance.canvas.width } x ${ instance.canvas.height } px ${ instance.isFullscreen ? '(fullscreen)' : '' }` );
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
					micStream = audioMotion.audioCtx.createMediaStreamSource( stream );
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
			savedVolume = audioMotion.volume;
			setVolume(0);
			audioMotion.connectInput( micStream );
			consoleLog( 'Audio source set to microphone' );
		}
	}
	else {
		if ( micStream ) {
			audioMotion.disconnectInput( micStream );
			setVolume( savedVolume );
		}
		consoleLog( 'Audio source set to built-in player' );
	}

}

/**
 * Increase or decrease volume
 */
function changeVolume( incr ) {
	let newVal = Number( elVolume.dataset.value || 0 ) + incr * .05;

	if ( newVal < 0 )
		newVal = 0;
	else if ( newVal > 1 )
		newVal = 1;

	setVolume( newVal );
	setCanvasMsg( `Volume: ${ Math.round( newVal * 20 ) }` );
}

/**
 * Set volume
 */
function setVolume( value ) {
	audioMotion.volume = elVolume.dataset.value = value;
	elVolume.querySelector('.marker').style.transform = `rotate( ${ 125 + 290 * value }deg )`;
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

		mm.parseBlob( fileBlob )
			.then( metadata => {
				addMetadata( metadata, audioEl );
				if ( metadata.common.picture && metadata.common.picture.length ) {
					const imgBlob = new Blob( [ metadata.common.picture[0].data ], { type: metadata.common.picture[0].format } );
					setCurrentCover( URL.createObjectURL( imgBlob ) );
				}
			})
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

	if ( thisPreset.hasOwnProperty( 'randomMode' ) ) // convert legacy boolean value to integer (version =< 19.12)
		thisPreset.randomMode |= 0;

	if ( thisPreset.hasOwnProperty( 'blackBg' ) ) // convert legacy blackBg property (version =< 20.4)
		thisPreset.background = thisPreset.blackBg | 0;

	if ( thisPreset.hasOwnProperty( 'showScale' ) ) { // convert legacy showScale property (version =< 20.9)
		thisPreset.showScaleX = thisPreset.showScale & 1;
		thisPreset.showScaleY = thisPreset.showScale >> 1;
	}

	if ( thisPreset.hasOwnProperty( 'reflex' ) && isNaN( thisPreset.reflex ) ) // convert legacy string value to integer (version =< 20.6)
		thisPreset.reflex = ['off','on','mirror'].indexOf( thisPreset.reflex );

	if ( thisPreset.hasOwnProperty( 'bgImageFit') && isNaN( thisPreset.bgImageFit ) ) // convert legacy string value to integer (version =< 20.6)
		thisPreset.bgImageFit = ['adjust','center','repeat','pulse','zoom-in','zoom-out'].indexOf( thisPreset.bgImageFit );

	$$('[data-prop]').forEach( el => {
		if ( el.classList.contains('switch') ) {
			if ( thisPreset.hasOwnProperty( el.dataset.prop ) )
				el.dataset.active = thisPreset[ el.dataset.prop ] | 0;
			else if ( init )
				el.dataset.active = defaults[ el.dataset.prop ];
		}
		else {
			if ( thisPreset.hasOwnProperty( el.dataset.prop ) )
				el.value = thisPreset[ el.dataset.prop ];
			else if ( init )
				el.value = defaults[ el.dataset.prop ];

			updateRangeValue( el );
		}
	});

	if ( thisPreset.hasOwnProperty( 'highSens' ) ) // legacy option (version =< 19.5)
		elSensitivity.value = thisPreset.highSens ? 2 : 1;

	if ( thisPreset.hasOwnProperty( 'minDb' ) && thisPreset.hasOwnProperty( 'maxDb' ) ) { // legacy options (version =< 19.12)
		$('.min-db[data-preset="1"]').value = thisPreset.minDb;
		$('.max-db[data-preset="1"]').value = thisPreset.maxDb;
		savePreferences('sens');
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
		splitGradient: isSwitchOn( elSplitGrad )
	} );

	// settings that make additional changes are set by the setProperty() function
	setProperty(
		[ elBackground,
		elSensitivity,
		elReflex,
		elGradient,
		elRandomMode,
		elBarSpace,
		elMode ], true );

	if ( name == 'demo' )
		selectRandomMode( true );

	if ( alert )
		notie.alert({ text: 'Settings loaded!' });
}

/**
 * Save / update a configuration
 */
function saveConfig( config ) {

	const settings = {
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
		splitGrad   : elSplitGrad.dataset.active
	};

	localStorage.setItem( config, JSON.stringify( settings ) );
}

/**
 * Update last used configuration
 */
function updateLastConfig() {
	saveConfig( 'last-config' );
}

/**
 * Update custom preset
 */
function updateCustomPreset() {
	saveConfig( 'custom-preset' );
	$('#preset').value = 'custom';
	notie.alert({ text: 'Custom preset saved!' });
}

/**
 * Process keyboard shortcuts
 */
function keyboardControls( event ) {

	if ( event.target.tagName != 'BODY' || event.altKey || event.ctrlKey )
		return;

	if ( event.type == 'keydown' ) {
		switch ( event.code ) {
			case 'ArrowUp': 	// volume up
				changeVolume(1);
				break;
			case 'ArrowDown': 	// volume down
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
		// the keys below are handled on 'keyup' to avoid key repetition
		const isShiftKey = event.shiftKey;

		switch ( event.code ) {
			case 'Delete': 		// delete selected songs from the playlist
			case 'Backspace':	// for Mac
				playlist.querySelectorAll('.selected').forEach( e => {
					e.remove();
				});
				const current = getIndex( playlist.querySelector('.current') ),
					  queueLength = playlist.children.length;
				if ( current !== undefined )
					playlistPos = current;	// update playlistPos if current song hasn't been deleted
				else if ( playlistPos > queueLength - 1 )
					playlistPos = queueLength - 1;
				else
					playlistPos--;
				if ( queueLength )
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
				if ( ! finishFastSearch() ) {
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
				if ( ! finishFastSearch() ) {
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
				setCanvasMsg( 'Background: ' + getText( elBackground ) + ( elBackground.value > 1 ? ` (${getText( elBgImageFit )})` : '' ) );
				break;
			case 'KeyC': 		// radial
				elRadial.click();
				setCanvasMsg( 'Radial ' + onOff( elRadial ) );
				break;
			case 'KeyD': 		// display information
				toggleInfo();
				break;
			case 'KeyE': 		// shuffle queue
				if ( playlist.children.length > 0 ) {
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

	setCurrentCover();

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

	// helper functions
	const isEnabled = ( prop ) => ! randomProperties.find( item => item.value == prop ).disabled;
	const randomInt = ( n=2 ) => Math.random() * n | 0;

	let props = []; // properties that need to be updated

	elMode.selectedIndex = randomInt( elMode.options.length );

	if ( isEnabled('nobg') )
		elBackground.selectedIndex = randomInt( elBackground.options.length );

	if ( isEnabled('imgfit') )
		elBgImageFit.selectedIndex = randomInt( elBgImageFit.options.length );

	if ( isEnabled('peaks') ) {
		elShowPeaks.dataset.active = randomInt(); // 0 or 1
		props.push( elShowPeaks );
	}

	if ( isEnabled('leds') ) {
		elLedDisplay.dataset.active = randomInt();
		props.push( elLedDisplay );
	}

	if ( isEnabled('lumi') ) {
		// always disable lumi when leds are active and background is set to image
		elLumiBars.dataset.active = elBackground.value > 1 && isSwitchOn( elLedDisplay ) ? 0 : randomInt();
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
 * Populate UI visualization modes combo box
 */
function populateVisualizationModes() {
	const mode = elMode.value;

	while ( elMode.firstChild )
		elMode.removeChild( elMode.firstChild );

	for ( const item of modeOptions ) {
		if ( ! item.disabled )
			elMode[ elMode.options.length ] = new Option( item.text, item.value );
	}

	// restore previously selected mode
	if ( mode !== '' ) {
		elMode.value = mode;
		setProperty( elMode, true );
	}
}

/**
 * Populate UI gradient selection combo box
 */
function populateGradients() {
	let grad = elGradient.value;

	while ( elGradient.firstChild )
		elGradient.removeChild( elGradient.firstChild );

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

	elVolume.addEventListener( 'wheel', e => {
		e.preventDefault();
		changeVolume( Math.sign( e.deltaY || 0 ) );
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
  	  elSpin ].forEach( el => el.addEventListener( 'change', () => setProperty( el, true ) ) );

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
	audioMotion.canvas.addEventListener( 'click', () =>	toggleInfo() );

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

	// Enabled visualization modes

	const elEnabledModes = $('#enabled_modes');

	modeOptions.forEach( mode => {
		elEnabledModes.innerHTML += `<label><input type="checkbox" class="enabledMode" data-mode="${mode.value}" ${mode.disabled ? '' : 'checked'}> ${mode.text}</label>`;
	});

	$$('.enabledMode').forEach( el => {
		el.addEventListener( 'click', event => {
			if ( ! el.checked ) {
				const count = modeOptions.filter( item => ! item.disabled ).length;
				if ( count < 2 ) {
					notie.alert({ text: 'At least one Mode must be enabled!' });
					event.preventDefault();
					return false;
				}
			}
			modeOptions.find( item => item.value == el.dataset.mode ).disabled = ! el.checked;
			populateVisualizationModes();
			savePreferences('mode');
		});
	});

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
			savePreferences('grad');
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
			savePreferences('prop');
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
				savePreferences('sens');
			});
		}
		else {
			el.addEventListener( 'change', () => {
				if ( el.dataset.preset == elSensitivity.value ) // current preset has been changed
					setProperty( elSensitivity );
				savePreferences('sens');
			});
		}
	});

	// On-screen display options
	for ( const el of [ elInfoTimeout, elTrackTimeout, elEndTimeout, elShowCover ] )
		el.addEventListener( 'change', () => savePreferences('osd') );

	$('#reset_osd').addEventListener( 'click', () => {
		setInfoOptions( infoDisplayDefaults );
		savePreferences('osd');
	});
}

/**
 * Load preferences from localStorage
 */
function loadPreferences() {
	// Load last used settings
	const lastConfig    = localStorage.getItem( 'last-config' ),
		  isLastSession = ( lastConfig !== null );

	if ( isLastSession )
		presets['last'] = JSON.parse( lastConfig );
	else // if no data found from last session, use the defaults
		presets['last'] = JSON.parse( JSON.stringify( presets['default'] ) );

	// Load custom preset
	const customPreset = localStorage.getItem( 'custom-preset' );
	if ( customPreset !== null )
		presets['custom'] = JSON.parse( customPreset );
	else
		presets['custom'] = JSON.parse( JSON.stringify( presets['last'] ) );

	// Load disabled modes preference
	const disabledModes = localStorage.getItem( 'disabled-modes' );
	if ( disabledModes !== null ) {
		JSON.parse( disabledModes ).forEach( mode => {
			modeOptions.find( item => item.value == mode ).disabled = true;
		});
	}

	// Load disabled gradients preference
	const disabledGradients = localStorage.getItem( 'disabled-gradients' );
	if ( disabledGradients !== null ) {
		JSON.parse( disabledGradients ).forEach( key => {
			gradients[ key ].disabled = true;
		});
	}

	// Load disabled random properties preference
	const disabledProperties = localStorage.getItem( 'disabled-properties' );
	if ( disabledProperties !== null ) {
		JSON.parse( disabledProperties ).forEach( prop => {
			randomProperties.find( item => item.value == prop ).disabled = true;
		});
	}

	// Sensitivity presets
	const elMinSens = $$('.min-db');
	for ( let i = -60; i >= -110; i -= 5 )
		elMinSens.forEach( el => el[ el.options.length ] = new Option( i ) );

	const elMaxSens = $$('.max-db');
	for ( let i = 0; i >= -40; i -= 5 )
		elMaxSens.forEach( el => el[ el.options.length ] = new Option( i ) );

	const sensitivityPresets = JSON.parse( localStorage.getItem( 'sensitivity-presets' ) ) || sensitivityDefaults;

	sensitivityPresets.forEach( ( preset, index ) => {
		elMinSens[ index ].value = preset.min;
		elMaxSens[ index ].value = preset.max;
	});

	// On-screen display options
	const displayOptions = Object.assign( {}, infoDisplayDefaults ); // clone defaults so they don't get modified
	// merge saved options (if any) with defaults and set UI fields
	setInfoOptions( Object.assign( displayOptions, JSON.parse( localStorage.getItem( 'display-options' ) ) || {} ) );

	return isLastSession;
}

/**
 * Save Config Panel preferences to localStorage
 *
 * @param [pref] {string} preference to save; if undefined save all preferences (default)
 */
function savePreferences( pref ) {
	if ( ! pref || pref == 'mode' ) {
		const disabledModes = modeOptions.filter( item => item.disabled ).map( item => item.value );
		localStorage.setItem( 'disabled-modes', JSON.stringify( disabledModes ) );
	}

	if ( ! pref || pref == 'grad' ) {
		const disabledGradients = Object.keys( gradients ).filter( key => gradients[ key ].disabled );
		localStorage.setItem( 'disabled-gradients', JSON.stringify( disabledGradients ) );
	}

	if ( ! pref || pref == 'prop' ) {
		const disabledProperties = randomProperties.filter( item => item.disabled ).map( item => item.value );
		localStorage.setItem( 'disabled-properties', JSON.stringify( disabledProperties ) );
	}

	if ( ! pref || pref == 'sens' ) {
		let sensitivityPresets = [];
		for ( const i of [0,1,2] ) {
			sensitivityPresets.push( {
				min: $(`.min-db[data-preset="${i}"]`).value,
				max: $(`.max-db[data-preset="${i}"]`).value
			});
		}
		localStorage.setItem( 'sensitivity-presets', JSON.stringify( sensitivityPresets ) );
	}

	if ( ! pref || pref == 'osd' ) {
		const displayOptions = {
			info  : elInfoTimeout.value,
			track : elTrackTimeout.value,
			end   : elEndTimeout.value,
			covers: elShowCover.checked
		}
		localStorage.setItem( 'display-options', JSON.stringify( displayOptions ) );
	}
}

/**
 * Populate a select HTML element
 */
function populateSelect( element, options ) {
	for ( const item of options )
		element[ element.options.length ] = new Option( item.text, item.value );
}

/**
 * Set on-screen display options UI fields
 */
function setInfoOptions( options ) {
	elInfoTimeout.value  = options.info;
	elTrackTimeout.value = options.track;
	elEndTimeout.value   = options.end;
	elShowCover.checked  = options.covers;
}

/**
 * Helper functions
 */
function getText( el ) {
	return el[ el.selectedIndex ].text;
}

function onOff( el ) {
	return isSwitchOn( el ) ? 'ON' : 'OFF';
}

function isSwitchOn( el ) {
	return el.dataset.active == '1';
}

/**
 * Initialization function
 */
(function() {

	// Log all JS errors to our UI console
	window.addEventListener( 'error', event => consoleLog( `Unexpected ${event.error}`, true ) );

	consoleLog( `audioMotion.js v${_VERSION} initializing...` );
	consoleLog( `User agent: ${window.navigator.userAgent}` );

	$('#version').innerText = _VERSION;

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

	audioMotion = new AudioMotionAnalyzer( $('#analyzer'), {
		onCanvasDraw: displayCanvasMsg,
		onCanvasResize: showCanvasInfo
	});

	consoleLog( `AudioContext sample rate is ${audioMotion.audioCtx.sampleRate}Hz` );

	// Initialize and connect audio elements

	audioElement = [ $('#player0'),	$('#player1') ];

	currAudio = 0;
	nextAudio = 1;

	for ( const i of [0,1] ) {
		clearAudioElement( i );
		audioElement[ i ].addEventListener( 'play', audioOnPlay );
		audioElement[ i ].addEventListener( 'ended', audioOnEnded );
		audioElement[ i ].addEventListener( 'error', audioOnError );

		audioMotion.connectInput( audioElement[ i ] );
	}

	// Setup configuration panel
	doConfigPanel();

	// Populate combo boxes

	populateVisualizationModes();

	for ( let i = 9; i < 16; i++ )
		elFFTsize[ elFFTsize.options.length ] = new Option( 2**i );

	for ( const i of [20,30,40,50,60,100,250,500,1000,2000] )
		elRangeMin[ elRangeMin.options.length ] = new Option( ( i >= 1000 ? ( i / 1000 ) + 'k' : i ) + 'Hz', i );

	for ( const i of [1000,2000,4000,8000,12000,16000,22000] )
		elRangeMax[ elRangeMax.options.length ] = new Option( ( i / 1000 ) + 'kHz', i );

	populateSelect(	elSensitivity, [
		{ value: '0', text: 'Low' },
		{ value: '1', text: 'Normal' },
		{ value: '2', text: 'High' }
	]);

	populateSelect(	elBarSpace, [
		{ value: '1.5',  text: 'Legacy' },
		{ value: '0.1',  text: 'Narrow' },
		{ value: '0.25', text: 'Regular' },
		{ value: '0.5',  text: 'Wide' },
		{ value: '0.75', text: 'Extra wide' }
	]);

	populateSelect( elRandomMode, [
		{ value: '0',   text: 'Off' },
		{ value: '1',   text: 'On track change' },
		{ value: '2',   text: '5 seconds' },
		{ value: '6',   text: '15 seconds' },
		{ value: '12',  text: '30 seconds' },
		{ value: '24',  text: '1 minute' },
		{ value: '48',  text: '2 minutes' },
		{ value: '120', text: '5 minutes' }
	]);

	populateSelect(	elReflex, [
		{ value: '0', text: 'Off' },
		{ value: '1', text: 'On' },
		{ value: '2', text: 'Mirrored' }
	]);

	populateSelect(	elBackground, [
		{ value: '0', text: 'Gradient default' },
		{ value: '1', text: 'Black' },
		{ value: '2', text: 'Album cover' }
	]);

	populateSelect( elBgImageFit, [
		{ value: '0', text: 'Adjust' },
		{ value: '1', text: 'Center' },
		{ value: '3', text: 'Pulse' },
		{ value: '2', text: 'Repeat' },
		{ value: '4', text: 'Zoom In' },
		{ value: '5', text: 'Zoom Out' }
	]);

	elBgImageDim.min  = '0.1';
	elBgImageDim.max  = '1';
	elBgImageDim.step = '0.1';

	elLineWidth.min   = '1';
	elLineWidth.max   = '5';

	elFillAlpha.min   = '0';
	elFillAlpha.max   = '0.5';
	elFillAlpha.step  = '0.1';

	elSmoothing.min   = '0';
	elSmoothing.max   = '0.9';
	elSmoothing.step  = '0.1';

	elSpin.min        = '0';
	elSpin.max        = '3';
	elSpin.step       = '1';

	// Set UI event listeners
	setUIEventListeners();

	// Clear canvas messages
	setCanvasMsg();

	// Register custom gradients
	Object.keys( gradients ).forEach( key => {
		if ( gradients[ key ].bgColor && gradients[ key ].colorStops )
			audioMotion.registerGradient( key, { bgColor: gradients[ key ].bgColor, colorStops: gradients[ key ].colorStops } );
	});
	populateGradients();

	// Load last used settings
	consoleLog( `Loading ${ isLastSession ? 'last session' : 'default' } settings` );
	loadPreset( 'last', false, true );

	// Set audio source to built-in player
	setSource();

	// Initialize volume button
	setVolume(1);

	// Load saved playlists
	loadSavedPlaylists();

	// initialize file explorer
	fileExplorer.create(
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

	consoleLog( 'Initialization complete!' );
})();
