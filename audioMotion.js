/**
 * audioMotion.js
 * A real-time graphic spectrum analyzer and audio player using Web Audio and Canvas APIs
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * Copyright (C) 2018-2019 Henrique Vianna <hvianna@gmail.com>
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

var _VERSION = '19.1-dev.3';


/**
 * Global variables
 */
var	// playlist and index to the current song
	playlist, playlistPos,
	// HTML elements from the UI
	elFFTsize, elRangeMin, elRangeMax, elSmoothing,	elGradient, elShowScale, elLogScale, elHighSens, elShowPeaks, elPlaylists,
	// configuration options we need to check inside the draw function - for better performance
	cfgSource, cfgShowScale, cfgLogScale, cfgShowPeaks,
	// peak value, hold time and fall acceleration for each frequency (arrays)
	peaks, hold, accel,
	// frequency range and scale related variables
	posx, iMin, iMax, deltaX, bandWidth,
	// Web Audio API related variables
	audioCtx, analyser, audioElement, bufferLength, dataArray, sourcePlayer, sourceMic,
	// canvas related variables
	canvas, canvasCtx, pixelRatio, canvasMsg, canvasMsgPos, canvasMsgTimer, blackBg,
	// gradients
	gradients = {
		aurora1:  { name: 'Aurora 1', bgColor: '#0e172a', colorStops: [
					{ stop: .1, color: 'hsl( 120, 100%, 50% )' },
					{ stop:  1, color: 'hsl( 216, 100%, 50% )' }
				  ] },
		aurora3:  { name: 'Aurora 3', bgColor: '#0e172a', colorStops: [
					{ stop: .1, color: '#0f0' },
					{ stop: .6, color: '#008ebc' },
//					{ stop: .5, color: '#00c8ff' },
					{ stop:  1, color: '#110d5e' }
				  ] },
		borealis:  { name: 'Borealis', bgColor: '#0d1526', colorStops: [
					{ stop: .1, color: '#0f0' },
					{ stop: .5, color: '#00adcc' },
					{ stop:  1, color: '#8f29a3' }
				  ] },
		classic:  { name: 'Classic', bgColor: '#111', colorStops: [
					{ stop: .1, color: 'hsl( 0, 100%, 50% )' },
					{ stop: .6, color: 'hsl( 60, 100%, 50% )' },
					{ stop:  1, color: 'hsl( 120, 100%, 50% )' }
				  ] },
		dusk:     { name: 'Dusk', bgColor: '#0e172a', colorStops: [
					{ stop: .2, color: 'hsl( 55, 100%, 50% )' },
					{ stop:  1, color: 'hsl( 16, 100%, 50% )' }
				  ] },
		pacific:  { name: 'Pacific Dream', bgColor: '#051319', colorStops: [
				 	{ stop: .1, color: '#34e89e' },
				 	{ stop: 1, color: '#0f3443' }
				  ]},
		prism:    { name: 'Prism', bgColor: '#00041a' },
		rainbow:  { name: 'Rainbow', bgColor: '#111' },
		shahabi:  { name: 'Shahabi', bgColor: '#190011', colorStops: [
				 	{ stop: .1, color: '#66ff00' },
				 	{ stop: 1, color: '#a80077' }
				  ] },

		brady:    { name: 'Brady Brady Fun Fun', bgColor: '#001319', colorStops: [
				 	{ stop: .1, color: '#ffff1c' },
				 	{ stop: 1, color: '#00c3ff' }
				  ]},
		summer:   { name: 'Summer', bgColor: '#041919', colorStops: [
				 	{ stop: .1, color: '#fdbb2d' },
				 	{ stop: 1, color: '#22c1c3' }
				  ]},
		sunset:   { name: 'Sunset', bgColor: '#021119', colorStops: [
				 	{ stop: .1, color: '#f56217' },
				 	{ stop: 1, color: '#0b486b' }
				  ]},
		hunt2:    { name: 'Hunt 2', bgColor: '#0d0619', colorStops: [
				 	{ stop: .1, color: '#ffaf7b' },
				 	{ stop: .5, color: '#d76d77' },
				 	{ stop: 1, color: '#3a1c71' }
				  ]},

	};


/**
 * Configuration presets
 */
var presets = {
	log: {
		fftSize     : 8192,		// FFT size
		freqMin     : 20,		// lowest frequency
		freqMax     : 16000,	// highest frequency
		smoothing   : 0.5,		// 0 to 0.9 - smoothing time constant
		gradient    : null,		// gradient name (null to not change current selection)
		showScale   : true,		// true to show x-axis scale
		logScale    : true,		// true to use logarithmic scale
		highSens    : false,	// true for high sensitivity
		showPeaks   : true		// true to show peaks
	},
	linear: {
		fftSize     : 4096,
		freqMin     : 20,
		freqMax     : 2000,
		smoothing   : 0.5,
		gradient    : null,
		showScale   : false,
		logScale    : false,
		highSens    : false,
		showPeaks   : true
	}
};


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
	if ( elHighSens.dataset.active == '1' ) {
		analyser.minDecibels = -100; // WebAudio API defaults
		analyser.maxDecibels = -30;
	}
	else {
		analyser.minDecibels = -85;
		analyser.maxDecibels = -25;
	}
	updateLastConfig();
}

/**
 * Set the smoothing time constant
 */
function setSmoothing() {
	analyser.smoothingTimeConstant = elSmoothing.value;
	consoleLog( 'smoothingTimeConstant is ' + analyser.smoothingTimeConstant );
	updateLastConfig();
}

/**
 * Set the size of the FFT performed by the analyser node
 */
function setFFTsize() {

	analyser.fftSize = elFFTsize.value;

	// update all variables that depend on the FFT size
	bufferLength = analyser.frequencyBinCount;
	dataArray = new Uint8Array( bufferLength );

	consoleLog( 'FFT size is ' + analyser.fftSize + ' samples' );
	updateLastConfig();

	preCalcPosX();
}

/**
 * Save desired frequency range
 */
function setFreqRange() {
	updateLastConfig();
	preCalcPosX();
}

/**
 * Save scale preferences
 */
function setScale() {
	updateLastConfig();
	preCalcPosX();
}

/**
 * Save show peaks preference
 */
function setShowPeaks() {
	cfgShowPeaks = ( elShowPeaks.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Pre-calculate the actual X-coordinate on screen for each frequency
 */
function preCalcPosX() {

	var freq,
		lastPos = -1,
		fMin = elRangeMin.value,
		fMax = elRangeMax.value;

	cfgShowScale = ( elShowScale.dataset.active == '1' );
	cfgLogScale = ( elLogScale.dataset.active == '1' );

	// indexes corresponding to the frequency range we want to visualize in the data array returned by the FFT
	iMin = Math.floor( fMin * analyser.fftSize / audioCtx.sampleRate );
	iMax = Math.round( fMax * analyser.fftSize / audioCtx.sampleRate );

	// clear / initialize peak data
	peaks = new Array();
	hold = new Array();
	accel = new Array();

	if ( cfgLogScale ) {
		// if using the log scale, we divide the canvas space by log(fmax) - log(fmin)
		deltaX = Math.log10( fMin );
		bandWidth = canvas.width / ( Math.log10( fMax ) - deltaX );
	}
	else {
		// in the linear scale, we simply divide it by the number of frequencies we have to display
		deltaX = iMin;
		bandWidth = canvas.width / ( iMax - iMin + 1 );
	}

	for ( var i = iMin; i <= iMax; i++ ) {
		if ( cfgLogScale ) {
			freq = i * audioCtx.sampleRate / analyser.fftSize; // find which frequency is represented in this bin
			posx[ i ] = Math.round( bandWidth * ( Math.log10( freq ) - deltaX ) ); // avoid fractionary pixel values
		}
		else
			posx[ i ] = Math.round( bandWidth * ( i - deltaX ) );

		// ignore overlapping positions for improved performance
		if ( posx[ i ] == lastPos )
			posx[ i ] = -1;
		else
			lastPos = posx[ i ];
	}

	drawScale();
}

/**
 * Draws the x-axis scale
 */
function drawScale() {

	var bands, freq, incr, label, posX;

	canvasCtx.fillStyle = '#000';
	canvasCtx.fillRect( 0, canvas.height - 20 * pixelRatio, canvas.width, 20 * pixelRatio );

	if ( ! cfgShowScale )
		return;

	canvasCtx.fillStyle = '#fff';
	canvasCtx.font = ( 10 * pixelRatio ) + 'px sans-serif';
	canvasCtx.textAlign = 'center';

	bands = [0, 30, 40, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 20000, 25000];
	freq = 0;

	if ( cfgLogScale )
		incr = 10;
	else
		incr = 500;

	while ( freq <= bands[ bands.length - 1 ] ) {

		if ( cfgLogScale ) {
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
			canvasCtx.fillText( label, posX, canvas.height - 5 * pixelRatio );
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
						elPlaylists.options[ elPlaylists.options.length ] = new Option( item[0].trim(), item[1].trim() );
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

	var path = elPlaylists.value,
		tmplist, ext,
		n = 0;

	// fix for suspended audio context on Safari
	if ( audioCtx.state == 'suspended' )
		audioCtx.resume();

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
		grad = elGradient.value;

	if ( blackBg )	// use black background
		canvasCtx.fillStyle = '#000';
	else 			// use background color defined by gradient
		canvasCtx.fillStyle = gradients[ grad ].bgColor;
	// clear the canvas
	canvasCtx.fillRect( 0, 0, canvas.width, canvas.height );

	// get a new array of data from the FFT
	analyser.getByteFrequencyData( dataArray );

	// for log scale, bar width is always 1; for linear scale we show wider bars when possible
	barWidth = ( ! cfgLogScale && bandWidth >= 2 ) ? Math.floor( bandWidth ) - 1 : 1;

	for ( var i = iMin; i <= iMax; i++ ) {
		barHeight = dataArray[ i ] / 255 * canvas.height;

		if ( peaks[ i ] === undefined || barHeight > peaks[ i ] ) {
			peaks[ i ] = barHeight;
			hold[ i ] = 30; // hold peak dot for 30 frames (0.5s) before starting to fall down
			accel[ i ] = 0;
		}

		canvasCtx.fillStyle = gradients[ grad ].gradient;

		if ( posx[ i ] >= 0 ) {	// ignore negative positions
			canvasCtx.fillRect( posx[ i ], canvas.height, barWidth, -barHeight );
			if ( cfgShowPeaks && peaks[ i ] > 0 ) {
				canvasCtx.fillRect( posx[ i ], canvas.height - peaks[ i ], barWidth, 2 );
// debug/calibration - show frequency for each bar (warning: super slow!)
//				canvasCtx.fillText( String( i * audioCtx.sampleRate / analyser.fftSize ), posx[ i ], canvas.height - peaks[i] - 5 );
			}
			if ( peaks[ i ] > 0 ) {
				if ( hold[ i ] )
					hold[ i ]--;
				else {
					accel[ i ]++;
					peaks[ i ] -= accel[ i ];
				}
			}
		}
	}

	if ( cfgShowScale )
		drawScale();

	// display message on canvas
	if ( canvasMsgTimer > 0 ) {
		if ( canvasMsgTimer > 60 )
			canvasCtx.fillStyle = '#fff';
		else 	// during the last 60 frames decrease opacity for fade-out effect
			canvasCtx.fillStyle = `rgba( 255, 255, 255, ${ canvasMsgTimer / 60 })`;
		if ( canvasMsgPos == 'top' ) {
			canvasCtx.font = `bold ${ 25 * pixelRatio }px sans-serif`;
			canvasCtx.textAlign = 'center';
			canvasCtx.fillText( canvasMsg, canvas.width / 2, 50 * pixelRatio );
		}
		else {
			canvasCtx.font = `bold ${ 35 * pixelRatio }px sans-serif`;
			canvasCtx.textAlign = 'left';
			canvasCtx.fillText( canvasMsg, 70 * pixelRatio, canvas.height - 70 * pixelRatio );
		}
		canvasMsgTimer--;
	}

	// schedule next canvas update
	requestAnimationFrame( draw );
}

/**
 * Output messages to the UI "console"
 */
function consoleLog( msg, error = false ) {
	var elConsole = document.getElementById( 'console' );
	if ( error )
		msg = '<span class="error"><i class="icons8-warn"></i> ' + msg + '</span>';
	elConsole.innerHTML += msg + '<br>';
	elConsole.scrollTop = elConsole.scrollHeight;
}

/**
 * Change audio input source
 */
function setSource() {

	cfgSource = elSource.value;

	if ( cfgSource == 'mic' ) {
		if ( typeof sourceMic == 'object' ) {
			if ( isPlaying() )
				audioElement.pause();
			sourcePlayer.disconnect( analyser );
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
				elSource.selectedIndex = 0; // revert to player
				cfgSource = 'player';
			});
		}
	}
	else {
		if ( typeof sourceMic == 'object' )
			sourceMic.disconnect( analyser );
		sourcePlayer.connect( analyser );
		consoleLog( 'Audio source set to built-in player' );
	}

}

/**
 * Save gradient preference
 */
function setGradient() {
	updateLastConfig();
}

/**
 * Load a music file from the user's computer
 */
function loadLocalFile( obj ) {

	var reader = new FileReader();

	reader.onload = function() {
		audioElement.src = reader.result;
		audioElement.play();
	}

	reader.readAsDataURL( obj.files[0] );
}

/**
 * Load a configuration preset
 */
function loadPreset( name ) {

	if ( ! Object.keys( presets ).includes( name ) )
		return;

	elRangeMin.value = presets[ name ].freqMin;
	elRangeMax.value = presets[ name ].freqMax;

	elLogScale.dataset.active = Number( presets[ name ].logScale );
	elShowScale.dataset.active = Number( presets[ name ].showScale );

	elFFTsize.value = presets[ name ].fftSize;
	setFFTsize();

	elSmoothing.value = presets[ name ].smoothing;
	setSmoothing();

	if ( presets[ name ].gradient )
		elGradient.value = presets[ name ].gradient;

	elHighSens.dataset.active = Number( presets[ name ].highSens );
	setSensitivity();

	elShowPeaks.dataset.active = Number( presets[ name ].showPeaks );
	setShowPeaks();
}

/**
 * Save / update a configuration cookie
 */
function saveConfigCookie( cookie ) {

	var config = {
		fftSize		: elFFTsize.value,
		freqMin		: elRangeMin.value,
		freqMax		: elRangeMax.value,
		smoothing	: analyser.smoothingTimeConstant,
		gradient	: elGradient.value,
		showScale 	: elShowScale.dataset.active == 1,
		logScale	: elLogScale.dataset.active == 1,
		highSens	: elHighSens.dataset.active == 1,
		showPeaks 	: elShowPeaks.dataset.active == 1
	}

	docCookies.setItem( cookie, JSON.stringify( config ), Infinity );
}

/**
 * Update last used configuration
 */
function updateLastConfig() {
	saveConfigCookie( 'last-config' );
}

/**
 * Update custom preset
 */
function updateCustomPreset() {
	saveConfigCookie( 'custom-preset' );
	document.getElementById('preset').value = 'custom';
}

/**
 * Set message to be displayed on canvas
 */
function setCanvasMsg( msg, pos, secs ) {
	canvasMsg = msg;
	canvasMsgPos = pos;
	canvasMsgTimer = secs * 60;
}

/**
 * Keyboard controls
 */
function keyboardControls( event ) {

	var key = event.which || event.keyCode;

	var gradIdx = elGradient.selectedIndex;
//	console.log( event );
//	console.log( key );

	switch ( key ) {
		case 32: // space bar - play/pause
			playPause();
			break;
		case 37: // arrow left  - previous song
			playPreviousSong();
			break;
		case 38: // arrow up - previous gradient
			if ( gradIdx == 0 )
				elGradient.selectedIndex = elGradient.options.length - 1;
			else
				elGradient.selectedIndex = gradIdx - 1;
			setCanvasMsg( gradients[ elGradient.value ].name, 'top', 2 );
			break;
		case 39: // arrow right - next song
			playNextSong();
			break;
		case 40: // arrow down - next gradient
			if ( gradIdx == elGradient.options.length - 1 )
				elGradient.selectedIndex = 0;
			else
				elGradient.selectedIndex = gradIdx + 1;
			setCanvasMsg( gradients[ elGradient.value ].name, 'top', 2 );
			break;
		case 78: // N key - show song name
			setCanvasMsg( document.getElementById( 'playlist' ).value, 'bottom', 2 );
			break;
		case 83: // S key - toggle scale
			elShowScale.click();
			break;
		case 66: // B key - toggle black background
			blackBg = ! blackBg;
			break;
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
		else if ( document.getElementById('repeat').dataset.active == '1' )
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

	// Canvas

	canvas = document.getElementById('canvas');
	canvasCtx = canvas.getContext('2d');

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

	// Create gradients

	elGradient  = document.getElementById('gradient');

	var grad, i;

	Object.keys( gradients ).forEach((key) => {
		grad = canvasCtx.createLinearGradient( 0, 0, 0, canvas.height );
		if ( gradients[ key ].hasOwnProperty( 'colorStops' ) ) {
			for ( i = 0; i < gradients[ key ].colorStops.length; i++ )
				grad.addColorStop( gradients[ key ].colorStops[ i ].stop, gradients[ key ].colorStops[ i ].color );
		}
		// rainbow gradients are easily created iterating over the hue value
		else if ( key == 'prism' ) {
			for ( i = 0; i <= 230; i += 15 )
				grad.addColorStop( i/230, `hsl( ${i}, 100%, 50% )` );
		}
		else if ( key == 'rainbow' ) {
			grad = canvasCtx.createLinearGradient( 0, 0, canvas.width, 0 ); // this one is a horizontal gradient
			for ( i = 0; i <= 360; i += 15 )
				grad.addColorStop( i/360, `hsl( ${i}, 100%, 50% )` );
		}
		// add the option to the html select element for the user interface
		elGradient.options[ elGradient.options.length ] = new Option( gradients[ key ].name, key );
		// save the actual gradient back into the gradients array
		gradients[ key ].gradient = grad;
	});

	// Add event listeners to the custom checkboxes

	var switches = document.querySelectorAll('.switch');
	for ( i = 0; i < switches.length; i++ ) {
		switches[ i ].addEventListener( 'click', function( e ) {
			e.target.dataset.active = Number( ! Number( e.target.dataset.active ) );
		});
	}

	// Load / initialize configuration options

	elFFTsize   = document.getElementById('fft_size');
	elRangeMin  = document.getElementById('freq_min');
	elRangeMax  = document.getElementById('freq_max');
	elSmoothing = document.getElementById('smoothing');
	elLogScale  = document.getElementById('log_scale');
	elLogScale.addEventListener( 'click', setScale );
	elShowScale = document.getElementById('show_scale');
	elShowScale.addEventListener( 'click', setScale );
	// clicks on canvas also toggle scale on/off
	canvas.addEventListener( 'click', function() {
		elShowScale.click();
	});
	elHighSens  = document.getElementById('sensitivity');
	elHighSens.addEventListener( 'click', setSensitivity );
	elShowPeaks = document.getElementById('show_peaks');
	elShowPeaks.addEventListener( 'click', setShowPeaks );

	var cookie;

	cookie = docCookies.getItem( 'last-config' );
	if ( cookie !== null )
		presets['last'] = JSON.parse( cookie );
	else { // if no data found from last session, use 'log' preset as default
		presets['last'] = JSON.parse( JSON.stringify( presets['log'] ) );
		presets['last'].gradient = 'prism';
	}

	cookie = docCookies.getItem( 'custom-preset' );
	if ( cookie !== null )
		presets['custom'] = JSON.parse( cookie );
	else
		presets['custom'] = JSON.parse( JSON.stringify( presets['last'] ) );

	loadPreset('last');

	// set audio source to built-in player
	elSource = document.getElementById('source');
	setSource();

	// load playlists from playlists.cfg
	elPlaylists = document.getElementById('playlists');
	loadPlaylistsCfg();

	// add event listener for keyboard controls
	window.addEventListener( 'keyup', keyboardControls );

	// start canvas animation
	requestAnimationFrame( draw );
}


/**
 * Initialize when window finished loading
 */

window.onload = initialize;
