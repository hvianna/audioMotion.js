/**
 * audioMotion.js
 * A real-time graphic spectrum analyzer and audio player using Web Audio and Canvas APIs
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * Copyright (C) 2018 Henrique Vianna <hvianna@gmail.com>
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

var _VERSION = '18.12-dev';


/**
 * Global variables
 */
var playlist, playlistPos,
	cfgSource, cfgFFTsize, cfgRangeMin, cfgRangeMax, cfgSmoothing,
	cfgGradient, cfgShowScale, cfgLogScale, cfgHighSens, cfgShowPeaks, cfgPlaylists,
	bufferLength, dataArray,
	posx, peaks, hold, gravity,
	iMin, iMax, deltaX, bandWidth,
	audioCtx, analyser, audioElement, sourcePlayer, sourceMic,
	canvas, canvasCtx, gradients, pixelRatio;

/**
 * Default options
 */
var defaults = {
	fftSize		: 4,		// index of #fft_size select element
	freqMin		: 0,		// index of #freq_min select element
	freqMax		: 4,		// index of #freq_max select element
	smoothing	: 0.5,		// 0 to 0.9 - smoothing time constant
	gradient	: 0,		// index of #gradient select element
	showScale 	: true,		// true to show x-axis scale
	logScale	: true,		// true to use logarithmic scale
	highSens	: false,	// true for high sensitivity
	showPeaks 	: true		// true to show peaks
}


/**
 * Display the canvas in full-screen mode
 */
function fullscreen() {
	if ( canvas.requestFullscreen )
		canvas.requestFullscreen();
	else if ( canvas.webkitRequestFullscreen )
		canvas.webkitRequestFullscreen();
	else if ( canvas.mozRequestFullScreen )
		canvas.mozRequestFullScreen();
	else if ( canvas.msRequestFullscreen )
		canvas.msRequestFullscreen();
}

/**
 * Adjust the analyser's sensitivity
 */
function setSensitivity() {
	if ( cfgHighSens.checked ) {
		analyser.minDecibels = -100; // WebAudio API defaults
		analyser.maxDecibels = -30;
	}
	else {
		analyser.minDecibels = -85;
		analyser.maxDecibels = -25;
	}
	docCookies.setItem( 'highSens', Number( cfgHighSens.checked ), Infinity );
}

/**
 * Set the smoothing time constant
 */
function setSmoothing() {
	analyser.smoothingTimeConstant = document.getElementById('smoothing').value;
	consoleLog( 'smoothingTimeConstant is ' + analyser.smoothingTimeConstant );
	docCookies.setItem( 'smoothing', analyser.smoothingTimeConstant, Infinity );
}

/**
 * Set the size of the FFT performed by the analyser node
 */
function setFFTsize() {

	analyser.fftSize = cfgFFTsize[ cfgFFTsize.selectedIndex ].value;

	// update all variables that depend on the FFT size
	bufferLength = analyser.frequencyBinCount;
	dataArray = new Uint8Array( bufferLength );

	peaks = new Array( bufferLength ).fill(0);
	hold = new Array( bufferLength ).fill(30);
	gravity = new Array( bufferLength ).fill(0);

	consoleLog( 'FFT size is ' + analyser.fftSize + ' samples' );
	docCookies.setItem( 'fftSize', cfgFFTsize.selectedIndex, Infinity );

	preCalcPosX();
}

/**
 * Save desired frequency range
 */
function setFreqRange() {

	docCookies.setItem( 'freqMin', cfgRangeMin.selectedIndex, Infinity );
	docCookies.setItem( 'freqMax', cfgRangeMax.selectedIndex, Infinity );

	preCalcPosX();
}

/**
 * Save scale preferences
 */
function setScale() {

	docCookies.setItem( 'showScale', Number( cfgShowScale.checked ), Infinity );
	docCookies.setItem( 'logScale', Number( cfgLogScale.checked ), Infinity );

	preCalcPosX();
}

/**
 * Save show peaks preference
 */
function setShowPeaks() {

	docCookies.setItem( 'showPeaks', Number( cfgShowPeaks.checked ), Infinity );
}

/**
 * Pre-calculate the actual X-coordinate on screen for each frequency
 */
function preCalcPosX() {

	var freq,
		posant = -1,
		fMin = cfgRangeMin[ cfgRangeMin.selectedIndex ].value,
		fMax = cfgRangeMax[ cfgRangeMax.selectedIndex ].value;

	// indexes corresponding to the frequency range we want to visualize in the data array returned by the FFT
	iMin = Math.floor( fMin * analyser.fftSize / audioCtx.sampleRate );
	iMax = Math.round( fMax * analyser.fftSize / audioCtx.sampleRate );

	if ( cfgLogScale.checked ) {
		deltaX = Math.log10( fMin );
		bandWidth = canvas.width / ( Math.log10( fMax ) - deltaX );
	}
	else {
		deltaX = iMin;
		bandWidth = canvas.width / ( iMax - iMin + 1 );
	}

	for ( var i = 0; i < bufferLength; i++ ) {
		// find which frequency is represented in this bin
		freq = i * audioCtx.sampleRate / analyser.fftSize;

		// for a sharper look, we avoid fractionary pixel values
		if ( cfgLogScale.checked )
			posx[ i ] = Math.round( bandWidth * ( Math.log10( freq ) - deltaX ) );
		else
			posx[ i ] = Math.round( bandWidth * ( i - deltaX ) );

		// ignore overlapping positions for improved performance
		if ( posx[ i ] == posant )
			posx[ i ] = -1;
		else
			posant = posx[ i ];
	}

	drawScale();
}

/**
 * Draws the x-axis scale
 */
function drawScale() {

	var bands, freq, incr, label, posX;

	canvasCtx.font = ( 10 * pixelRatio ) + 'px sans-serif';
	canvasCtx.fillStyle = '#000';
	canvasCtx.fillRect( 0, canvas.height - 20 * pixelRatio, canvas.width, 20 * pixelRatio );

	if ( ! cfgShowScale.checked )
		return;

	canvasCtx.fillStyle = '#fff';

	bands = [0, 20, 30, 40, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 20000, 25000];
	freq = 0;

	if ( cfgLogScale.checked )
		incr = 10;
	else
		incr = 500;

	while ( freq <= bands[ bands.length - 1 ] ) {

		if ( cfgLogScale.checked ) {
			posX = bandWidth * ( Math.log10( freq ) - deltaX );
			if ( freq == 100 || freq == 1000 )
				incr *= 10;
		}
		else {
			posX = bandWidth * ( freq * analyser.fftSize / audioCtx.sampleRate - deltaX );
			if ( freq == 1000 )
				incr = 1000;
		}

		if ( bands.indexOf( freq ) != -1 ) {
			if ( freq >= 1000 )
				label = freq / 1000 + 'k';
			else
				label = String( freq );
			canvasCtx.fillText( label, posX > 10 * pixelRatio ? posX - label.length * 2.75 * pixelRatio : posX, canvas.height - 5 * pixelRatio );
		}
		else
			canvasCtx.fillRect( posX, canvas.height - 5 * pixelRatio, 1, -10 * pixelRatio );

		freq += incr;
	}
}

/**
 * Clear the playlist
 */
function clearPlaylist() {
	playlist = [];
	playlistPos = 0;
	updatePlaylistUI();
}

/**
 * Read contents from playlists.cfg
 */
function loadPlaylistsCfg() {

	var list, item, n = 0;

	cfgPlaylists = document.getElementById('playlists');

	fetch( 'playlists.cfg' )
		.then( function( response ) {
			if ( response.status == 200 )
				return response.text();
			else
				consoleLog( 'No playlists.cfg file found', true );
		})
		.then( function( content ) {
			list = content.split(/[\r\n]+/);
			for ( var i = 0; i < list.length; i++ ) {
				if ( list[ i ].charAt(0) != '#' && list[ i ].trim() != '' ) { // not a comment or blank line?
					item = list[ i ].split(/\|/);
					if ( item.length == 2 ) {
						cfgPlaylists.options[ cfgPlaylists.options.length ] = new Option( item[0].trim(), item[1].trim() );
						n++;
					}
				}
			}
			if ( n )
				consoleLog( n + ' playlists found in playlists.cfg' );
			else
				consoleLog( 'No playlists found in playlists.cfg', true );
		})
		.catch( function( err ) {
			consoleLog( 'Could not read from playlists.cfg', true );
		});
}

/**
 * Load a song or playlist file into the current playlist
 */
function loadPlaylist() {

	var path = cfgPlaylists[ cfgPlaylists.selectedIndex ].value,
		tmplist, ext,
		n = 0;

	if ( ! path )
		return;

	ext = path.substring( path.lastIndexOf('.') + 1 );

	if ( ext == 'm3u' || ext == 'm3u8' ) {
		fetch( path )
			.then( function( response ) {
				if ( response.status == 200 )
					return response.text();
				else
					consoleLog( 'Fetch returned error code ' + response.status, true );
			})
			.then( function( content ) {
				tmplist = content.split(/[\r\n]+/);
				path = path.substring( 0, path.lastIndexOf('/') + 1 );
				for ( var i = 0; i < tmplist.length; i++ ) {
					if ( tmplist[ i ].charAt(0) != '#' && tmplist[ i ].trim() != '' ) { // not a comment or blank line?
						n++;
						if ( tmplist[ i ].substring( 0, 4 ) != 'http' )
							playlist.push( path + tmplist[ i ] );
						else
							playlist.push( tmplist[ i ] );
					}
				}
				consoleLog( 'Loaded ' + n + ' files into the playlist' );
				updatePlaylistUI();
				if ( ! isPlaying() )
					loadSong( 0 );
			})
			.catch( function( err ) {
				consoleLog( err, true );
			});
	}
	else {
		playlist.push( path ); // single file
		consoleLog( 'Loaded 1 file into the playlist' );
		updatePlaylistUI();
		if ( ! isPlaying() )
			loadSong( 0 );
	}

}

/**
 * Update the playlist shown to the user
 */
function updatePlaylistUI() {

	var	elPlaylist = document.getElementById('playlist'),
		songname;

	while ( elPlaylist.hasChildNodes() )
		elPlaylist.removeChild( elPlaylist.firstChild );

	for ( var i = 0; i < playlist.length; i++ ) {
		songname = playlist[ i ].substring( playlist[ i ].lastIndexOf('/') + 1 );
		songname = songname.substring( 0, songname.lastIndexOf('.') ).replace( /_/g, ' ' );
		elPlaylist.appendChild( new Option( songname ) );
	}

	elPlaylist.selectedIndex = playlistPos;
}

/**
 * Shuffle the playlist
 */
function shufflePlaylist() {

	var temp, r;

	for ( var i = playlist.length - 1; i > 0; i-- ) {
		r = Math.floor( Math.random() * ( i + 1 ) );
		temp = playlist[ i ];
		playlist[ i ] = playlist[ r ];
		playlist[ r ] = temp;
		if ( isPlaying() ) {
			if ( playlistPos == i )
				playlistPos = r;
			else if ( playlistPos == r )
				playlistPos = i;
		}
	}

	updatePlaylistUI();
}

/**
 * Load a song into the audio element
 */
function loadSong( n ) {
	if ( playlist[ n ] !== undefined ) {
		playlistPos = n;
		audioElement.src = playlist[ playlistPos ];
		document.getElementById('playlist').selectedIndex = playlistPos;
		return true;
	}
	else
		return false;
}

/**
 * Play a song from the playlist
 */
function playSong( n ) {
	if ( cfgSource == 'mic' )
		return;
	if ( loadSong( n ) )
		audioElement.play();
}

/**
 * Player controls
 */
function playPause() {
	if ( cfgSource == 'mic' )
		return;
	if ( isPlaying() )
		audioElement.pause();
	else if ( audioElement.src != '' )
		audioElement.play();
}

function stop() {
	if ( cfgSource == 'mic' )
		return;
	audioElement.pause();
	loadSong( 0 );
}

function playPreviousSong() {
	if ( cfgSource == 'mic' )
		return;
	if ( isPlaying() )
		playSong( playlistPos - 1 );
	else
		loadSong( playlistPos - 1 );
}

function playNextSong() {
	if ( cfgSource == 'mic' )
		return;
	if ( isPlaying() )
		playSong( playlistPos + 1 );
	else
		loadSong( playlistPos + 1 );
}

/**
 * Check if audio is playing
 */
function isPlaying() {
	return audioElement
		&& audioElement.currentTime > 0
		&& !audioElement.paused
		&& !audioElement.ended;
//		&& audioElement.readyState > 2;
}


/**
 * Redraw the canvas
 * this is called 60 times per second by requestAnimationFrame()
 */
function draw() {

	var barWidth, barHeight,
		grad = cfgGradient.selectedIndex;

	// clear the canvas, using the background color stored in the selected gradient option
	canvasCtx.fillStyle = cfgGradient[ grad ].value;
	canvasCtx.fillRect( 0, 0, canvas.width, canvas.height );

	// get a new array of data from the FFT
	analyser.getByteFrequencyData( dataArray );

	// in the linear scale each frequency gets an equal portion of the canvas,
	// so we show wider bars when possible
	barWidth = ( ! cfgLogScale.checked && bandWidth >= 2 ) ? Math.floor( bandWidth ) - 1 : 1;

	for ( var i = iMin; i <= iMax; i++ ) {
		barHeight = dataArray[i] / 255 * canvas.height;

		if ( barHeight > peaks[i] ) {
			peaks[i] = barHeight;
			hold[i] = 30; // hold peak dot for 30 frames (0.5s) before starting to fall down
			gravity[i] = 0;
		}

		canvasCtx.fillStyle = gradients[ grad ];

		if ( posx[ i ] >= 0 ) {	// ignore negative positions
			canvasCtx.fillRect( posx[ i ], canvas.height, barWidth, -barHeight );
			if ( cfgShowPeaks.checked && peaks[i] > 0 ) {
				canvasCtx.fillRect( posx[ i ], canvas.height - peaks[i], barWidth, 2 );
// debug/calibration - show frequency for each bar (warning: super slow!)
//				canvasCtx.fillText( String( i * audioCtx.sampleRate / analyser.fftSize ), posx[ i ], canvas.height - peaks[i] - 5 );
			}
			if ( peaks[i] > 0 ) {
				if ( hold[i] )
					hold[i]--;
				else {
					peaks[i] -= gravity[i];
					gravity[i] += .5;
				}
			}
		}
	}

	if ( cfgShowScale.checked )
		drawScale();

	// schedule next canvas update
	requestAnimationFrame( draw );
}

/**
 * Output messages to the UI "console"
 */
function consoleLog( msg, error = false ) {
	var elConsole = document.getElementById( 'console' );
	if ( error )
		msg = '<span class="error"><i class="fas fa-exclamation-triangle"></i> ' + msg + '</span>';
	elConsole.innerHTML += msg + '<br>';
	elConsole.scrollTop = elConsole.scrollHeight;
}

/**
 * Change audio input source
 */
function setSource() {

	cfgSource = document.getElementById('source');
	cfgSource = cfgSource[ cfgSource.selectedIndex ].value;

	if ( cfgSource == 'mic' ) {
		if ( typeof sourceMic == 'object' ) {
			if ( isPlaying() )
				audioElement.pause();
			sourceMic.connect( analyser );
		}
		else { // if sourceMic is not set yet, ask user's permission to use the microphone
			navigator.mediaDevices.getUserMedia( { audio: true, video: false } )
			.then( function( stream ) {
				sourceMic = audioCtx.createMediaStreamSource( stream );
				consoleLog( 'Audio source set to microphone' );
				setSource(); // recursive call, sourceMic is now set
			})
			.catch( function( err ) {
				consoleLog( 'Could not change audio source', true );
				cfgSource = document.getElementById('source');
				cfgSource.selectedIndex = 0;
				cfgSource = cfgSource[0].value;
			});
		}
	}
	else {
		sourcePlayer.connect( analyser );
		consoleLog( 'Audio source set to built-in player' );
	}

}

/**
 * Save gradient preference
 */
function setGradient() {

	docCookies.setItem( 'gradient', cfgGradient.selectedIndex, Infinity );
}


/**
 * Initialization
 */
function initialize() {

	playlist = [];
	playlistPos = 0;

	posx = [];

	consoleLog( 'audioMotion.js version ' + _VERSION );
	consoleLog( 'Initializing...' );

	// create audio context

	try {
		audioCtx = new ( window.AudioContext || window.webkitAudioContext )();
	}
	catch( err ) {
		consoleLog( 'Could not create audio context. WebAudio API not supported?', true );
		consoleLog( 'Aborting.' );
		return false;
	}

	consoleLog( 'Audio context sample rate is ' + audioCtx.sampleRate + 'Hz' );

	audioElement = document.getElementById('player');

	audioElement.addEventListener( 'play', function() {
		if ( playlist.length == 0 && audioElement.src == '' ) {
			consoleLog( 'Playlist is empty', true );
			audioElement.pause();
		}
	});

	audioElement.addEventListener( 'ended', function() {
		// song ended, skip to next one if available
		if ( playlistPos < playlist.length - 1 )
			playSong( playlistPos + 1 );
		else if ( document.getElementById('repeat').checked )
			playSong( 0 );
		else
			loadSong( 0 );
	});

	audioElement.addEventListener( 'error', function() {
		consoleLog( 'Error loading ' + this.src, true );
	});

	analyser = audioCtx.createAnalyser();
	sourcePlayer = audioCtx.createMediaElementSource( audioElement );
	sourcePlayer.connect( analyser );
	analyser.connect( audioCtx.destination );

	// fix for iOS suspended audio context
	window.addEventListener( 'touchstart', function() {
		if ( audioCtx.state == 'suspended' )
			audioCtx.resume();
	});

	// canvas

	canvas = document.getElementById('canvas');

	pixelRatio = window.devicePixelRatio; // for Retina / HiDPI devices

	// Adjust canvas width and height to match the display's resolution
	canvas.width = window.screen.width * pixelRatio;
	canvas.height = window.screen.height * pixelRatio;

	// Always consider landscape orientation
	if ( canvas.height > canvas.width ) {
		var tmp = canvas.width;
		canvas.width = canvas.height;
		canvas.height = tmp;
	}

	consoleLog( 'Canvas size is ' + canvas.width + 'x' + canvas.height + ' pixels' );

	canvasCtx = canvas.getContext('2d');
	canvasCtx.fillStyle = '#000';
	canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

	// create gradients

	gradients = [];

	var gradinfo = [
		// gradient name, background color, and color stops
		{ name: 'Classic', bg: '#111', colorstops: [
				{ stop: .1, color: 'hsl( 0, 100%, 50% )' },
				{ stop: .6, color: 'hsl( 60, 100%, 50% )' },
				{ stop:  1, color: 'hsl( 120, 100%, 50% )' }
		] },
		{ name: 'Aurora 1', bg: '#0e172a', colorstops: [
				{ stop: .1, color: 'hsl( 120, 100%, 50% )' },
				{ stop:  1, color: 'hsl( 216, 100%, 50% )' }
		] },
		{ name: 'Aurora 2', bg: '#0e172a', colorstops: [
				{ stop: .1, color: 'hsl( 120, 100%, 50% )' },
				{ stop:  1, color: 'hsla( 320, 100%, 50%, .4 )' }
		] },
		{ name: 'Aurora 3', bg: '#0e172a', colorstops: [
				{ stop: .1, color: 'hsl( 120, 100%, 50% )' },
				{ stop: .7, color: 'hsla( 189, 100%, 50%, .8 )' },
				{ stop:  1, color: 'hsla( 245, 80%, 50%, .4 )' }
		] },
		{ name: 'Aurora 4', bg: '#0e172a', colorstops: [
				{ stop: .1, color: 'hsl( 120, 100%, 50% )' },
				{ stop: .5, color: 'hsl( 189, 100%, 40% )' },
				{ stop:  1, color: 'hsl( 290, 60%, 40% )' }
		] },
		{ name: 'Dusk', bg: '#0e172a', colorstops: [
				{ stop: .2, color: 'hsl( 55, 100%, 50% )' },
				{ stop:  1, color: 'hsl( 16, 100%, 50% )' }
		] }
	];

	var grad, i, j;

	cfgGradient = document.getElementById('gradient');

	for ( i = 0; i < gradinfo.length; i++ ) {
		grad = canvasCtx.createLinearGradient( 0, 0, 0, canvas.height );
		for ( j = 0; j < gradinfo[ i ].colorstops.length; j++ )
			grad.addColorStop( gradinfo[ i ].colorstops[ j ].stop, gradinfo[ i ].colorstops[ j ].color );
		// add the option to the html select element
		// we'll know which gradient to use by the selectedIndex - bg color is stored in the option value
		cfgGradient.options[ i ] = new Option( gradinfo[ i ].name, gradinfo[ i ].bg );
		// push the actual gradient into the gradients array
		gradients.push( grad );
	}

	// Rainbow gradients are easily created iterating over the hue value

	grad = canvasCtx.createLinearGradient( 0, 0, 0, canvas.height );
	for ( i = 0; i <= 230; i += 15 )
		grad.addColorStop( i/230, `hsl( ${i}, 100%, 50% )` );
	gradients.push( grad );
	cfgGradient.options[ cfgGradient.options.length ] = new Option( 'Rainbow', '#111' );

	grad = canvasCtx.createLinearGradient( 0, 0, canvas.width, 0 );
	for ( i = 0; i <= 360; i += 15 )
		grad.addColorStop( i/360, `hsl( ${i}, 100%, 50% )` );
	gradients.push( grad );
	cfgGradient.options[ cfgGradient.options.length ] = new Option( 'Rainbow 2', '#111' );


	// visualizer configuration

	var cookie;

	cookie = docCookies.getItem( 'freqMin' );
	cfgRangeMin = document.getElementById('freq_min');
	cfgRangeMin.selectedIndex = ( cookie !== null ) ? cookie : defaults.freqMin;

	cookie = docCookies.getItem( 'freqMax' );
	cfgRangeMax = document.getElementById('freq_max');
	cfgRangeMax.selectedIndex = ( cookie !== null ) ? cookie : defaults.freqMax;

	cookie = docCookies.getItem( 'logScale' );
	cfgLogScale = document.getElementById('log_scale');
	cfgLogScale.checked = ( cookie !== null ) ? Number( cookie ) : defaults.logScale;

	cookie = docCookies.getItem( 'showScale' );
	cfgShowScale = document.getElementById('show_scale');
	cfgShowScale.checked = ( cookie !== null ) ? Number( cookie ) : defaults.showScale;

	cookie = docCookies.getItem( 'fftSize' );
	cfgFFTsize = document.getElementById('fft_size');
	cfgFFTsize.selectedIndex = ( cookie !== null ) ? cookie : defaults.fftSize;
	setFFTsize();

	cookie = docCookies.getItem( 'smoothing' );
	cfgSmoothing = document.getElementById('smoothing');
	cfgSmoothing.value = ( cookie !== null ) ? cookie : defaults.smoothing;
	setSmoothing();

	cookie = docCookies.getItem( 'gradient' );
	cfgGradient.selectedIndex = ( cookie !== null ) ? cookie : defaults.gradient;

	cookie = docCookies.getItem( 'highSens' );
	cfgHighSens = document.getElementById('sensitivity');
	cfgHighSens.checked = ( cookie !== null ) ? Number( cookie ) : defaults.highSens;
	setSensitivity();

	cookie = docCookies.getItem( 'showPeaks' );
	cfgShowPeaks = document.getElementById('show_peaks');
	cfgShowPeaks.checked = ( cookie !== null ) ? Number( cookie ) : defaults.showPeaks;

	// set audio source to built-in player
	setSource();

	// load playlists from playlists.cfg
	loadPlaylistsCfg();

	// start canvas animation
	requestAnimationFrame( draw );
}


/**
 * Initialize when window finished loading
 */

window.onload = initialize;
