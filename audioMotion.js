/**
 * audioMotion.js
 * A real-time graphic spectrum analyzer and audio player using WebAudio API and canvas
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
var _VERSION = '18.11-RC';


/**
 * Default options - set your preferences here
 */
var defaults = {
	fftSize		: 4,		// 0 to 6 for [ 512, 1024, 2048, 4096, 8192, 16384, 32768] - number of FFT samples
	freqMin		: 0,		// 0 to 5 for [ 20, 40, 50, 100, 500, 1k  ] - lowest frequency represented in the x-axis
	freqMax		: 4,		// 0 to 5 for [ 1k, 2k, 5k, 10k, 16k, 22k ] - highest frequency represented in the x-axis
	smoothing	: 0.5,		// 0 to 0.9 in .1 steps - smoothing time constant
	gradient	: 0,		// 0 to 3 for [ classic, aurora, dusk, rainbow ] - color gradient used for the analyzer bars
	showScale 	: true,		// true or false - show x-axis scale?
	logScale	: true,		// true or false - use logarithmic scale?
	highSens	: false,	// true or false - high sensitivity?
	showPeaks 	: true,		// true or false - show peaks?
	playlist	: 'demo/playlist.m3u'	// path or URL of default playlist to load
}


/**
 * Global variables
 */
var playlist, playlistPos,
	cfgSource, cfgFFTsize, cfgRangeMin, cfgRangeMax, cfgSmoothing,
	cfgGradient, cfgShowScale, cfgLogScale, cfgHighSens, cfgShowPeaks,
	bufferLength, dataArray,
	posx, peaks, hold, gravity,
	iMin, iMax, deltaX, bandWidth,
	audioCtx, analyser, audioElement, sourcePlayer, sourceMic,
	c, canvasCtx, gradients, pixelRatio;


/**
 * Display the canvas in full-screen mode
 */
function fullscreen() {
	if ( c.requestFullscreen )
		c.requestFullscreen();
	else if ( c.webkitRequestFullscreen )
		c.webkitRequestFullscreen();
	else if ( c.mozRequestFullScreen )
		c.mozRequestFullScreen();
	else if ( c.msRequestFullscreen )
		c.msRequestFullscreen();
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
}

/**
 * Set the smoothing time constant
 */
function setSmoothing() {
	analyser.smoothingTimeConstant = document.getElementById('smoothing').value;
	consoleLog( 'smoothingTimeConstant is ' + analyser.smoothingTimeConstant );
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

	preCalcPosX();
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
		bandWidth = c.width / ( Math.log10( fMax ) - deltaX );
	}
	else {
		deltaX = iMin;
		bandWidth = c.width / ( iMax - iMin + 1 );
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
	canvasCtx.fillRect( 0, c.height - 20 * pixelRatio, c.width, 20 * pixelRatio );

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
			canvasCtx.fillText( label, posX > 10 * pixelRatio ? posX - label.length * 2.75 * pixelRatio : posX, c.height - 5 * pixelRatio );
		}
		else
			canvasCtx.fillRect( posX, c.height - 5 * pixelRatio, 1, -10 * pixelRatio );

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
 * Load a song or playlist file into the current playlist
 */
function loadPlaylist() {

	var path = document.getElementById('playlist-path').value.trim(),
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
				if ( audioElement.src == '' )
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
		if ( audioElement.src == '' )
			loadSong( 0 );
	}

	document.getElementById('playlist-path').value = '';
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
		if ( playlistPos == i )
			playlistPos = r;
		else if ( playlistPos == r )
			playlistPos = i;
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
		grad = cfgGradient[ cfgGradient.selectedIndex ].value;

	// clear the canvas
	if ( grad == 0 || grad == 3 )
		canvasCtx.fillStyle = '#111';
	else
		canvasCtx.fillStyle = '#0e172a';
	canvasCtx.fillRect( 0, 0, c.width, c.height );

	// get a new array of data from the FFT
	analyser.getByteFrequencyData( dataArray );

	// in the linear scale each frequency gets an equal portion of the canvas,
	// so we show wider bars when possible
	barWidth = ( ! cfgLogScale.checked && bandWidth > 1 ) ? Math.floor( bandWidth ) - 1 : 1;

	for ( var i = iMin; i <= iMax; i++ ) {
		barHeight = dataArray[i] / 255 * c.height;

		if ( barHeight > peaks[i] ) {
			peaks[i] = barHeight;
			hold[i] = 30; // hold peak dot for 30 frames (0.5s) before starting to fall down
			gravity[i] = 0;
		}

		canvasCtx.fillStyle = gradients[ grad ];

		if ( posx[ i ] >= 0 ) {	// ignore negative positions
			canvasCtx.fillRect( posx[ i ], c.height, barWidth, -barHeight );
			if ( cfgShowPeaks.checked && peaks[i] > 0 ) {
				canvasCtx.fillRect( posx[ i ], c.height - peaks[i], barWidth, 2 );
// debug/calibration - show frequency for each bar (warning: super slow!)
//				canvasCtx.fillText( String( i * audioCtx.sampleRate / analyser.fftSize ), posx[ i ], c.height - peaks[i] - 5 );
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
		else { // if sourceMic is not set yet, ask user's permission to the microphone
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

	audioElement.addEventListener( 'ended', function() {
		// song ended, skip to next one if available
		if ( playlistPos < playlist.length - 1 )
			playSong( playlistPos + 1 );
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

	c = document.getElementById('c');

	pixelRatio = window.devicePixelRatio; // for Retina / HiDPI devices

	// Adjust canvas width and height to match the display's resolution
	c.width = window.screen.width * pixelRatio;
	c.height = window.screen.height * pixelRatio;

	// Always consider landscape orientation
	if ( c.height > c.width ) {
		var tmp = c.width;
		c.width = c.height;
		c.height = tmp;
	}

	consoleLog( 'Canvas size is ' + c.width + 'x' + c.height + ' pixels' );

	canvasCtx = c.getContext('2d');
	canvasCtx.fillStyle = '#000';
	canvasCtx.fillRect(0, 0, c.width, c.height);

	// create gradients

	gradients = [];
	var grad;

	// Classic
	grad = canvasCtx.createLinearGradient( 0, 0, 0, c.height );
	grad.addColorStop( .1, 'hsl( 0, 100%, 50% )' );
	grad.addColorStop( .6, 'hsl( 60, 100%, 50% )' );
	grad.addColorStop( 1, 'hsl( 120, 100%, 50% )' );
	gradients.push( grad );

	// Aurora
	grad = canvasCtx.createLinearGradient( 0, 0, 0, c.height );
	grad.addColorStop( .1, 'hsl( 120, 100%, 50% )' );
	grad.addColorStop( 1, 'hsl( 216, 100%, 50% )' ); // 268
	gradients.push( grad );

	// Dusk
	grad = canvasCtx.createLinearGradient( 0, 0, 0, c.height );
	grad.addColorStop( .2, 'hsl(55, 100%, 50%)' );
	grad.addColorStop( 1, 'hsl(16, 100%, 50%)' );
	gradients.push( grad );

	// Rainbow
	grad = canvasCtx.createLinearGradient( 0, 0, 0, c.height );
	for ( var i = 0; i <= 230; i += 15 )
		grad.addColorStop( i/230, `hsl( ${i}, 100%, 50% )` );
	gradients.push( grad );


	// visualizer configuration

	cfgRangeMin = document.getElementById('freq_min');
	cfgRangeMin.selectedIndex = defaults.freqMin;

	cfgRangeMax = document.getElementById('freq_max');
	cfgRangeMax.selectedIndex = defaults.freqMax;

	cfgLogScale = document.getElementById('log_scale');
	cfgLogScale.checked = defaults.logScale;

	cfgShowScale = document.getElementById('show_scale');
	cfgShowScale.checked = defaults.showScale;

	cfgFFTsize = document.getElementById('fft_size');
	cfgFFTsize.selectedIndex = defaults.fftSize;
	setFFTsize();

	cfgSmoothing = document.getElementById('smoothing');
	cfgSmoothing.value = defaults.smoothing;
	setSmoothing();

	cfgGradient = document.getElementById('gradient');
	cfgGradient.selectedIndex = defaults.gradient;

	cfgHighSens = document.getElementById('sensitivity');
	cfgHighSens.checked = defaults.highSens;
	setSensitivity();

	cfgShowPeaks = document.getElementById('show_peaks');
	cfgShowPeaks.checked = defaults.showPeaks;

	setSource();

	document.getElementById('playlist-path').value = defaults.playlist;
	loadPlaylist();

	// start canvas animation
	requestAnimationFrame( draw );
}


/**
 * Initialize when window finished loading
 */

window.onload = initialize;
