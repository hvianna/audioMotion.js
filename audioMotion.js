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

var _VERSION = '19.1-RC';


/**
 * Global variables
 */
var	// playlist and index to the current song
	playlist, playlistPos,
	// HTML elements from the UI
	elFFTsize, elRangeMin, elRangeMax, elSmoothing,	elGradient, elShowScale, elLogScale,
	elHighSens, elShowPeaks, elPlaylists, elBlackBg, elCycleGrad, elRepeat, elShowSong, elSource,
	// configuration options we need to check inside the draw loop - for better performance
	cfgSource, cfgShowScale, cfgLogScale, cfgShowPeaks, cfgBlackBg,
	// data for drawing the analyzer bars and scale related variables
	analyzerBars, deltaX, bandWidth,
	// Web Audio API related variables
	audioCtx, analyser, audioElement, bufferLength, dataArray, sourcePlayer, sourceMic,
	// canvas related variables
	canvas, canvasCtx, pixelRatio, canvasMsg,
	// gradient definitions
	gradients = {
		aurora:   { name: 'Aurora', bgColor: '#0e172a', colorStops: [
					{ stop: .1, color: 'hsl( 120, 100%, 50% )' },
					{ stop:  1, color: 'hsl( 216, 100%, 50% )' }
				  ] },
		borealis:  { name: 'Borealis', bgColor: '#0d1526', colorStops: [
					{ stop: .1, color: 'hsl( 120, 100%, 50% )' },
					{ stop: .5, color: 'hsl( 189, 100%, 40% )' },
					{ stop:  1, color: 'hsl( 290, 60%, 40% )' }
				  ] },
		candy:    { name: 'Candy', bgColor: '#0d0619', colorStops: [
				 	{ stop: .1, color: '#ffaf7b' },
				 	{ stop: .5, color: '#d76d77' },
				 	{ stop: 1, color: '#3a1c71' }
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
		miami:    { name: 'Miami', bgColor: '#111', colorStops: [
				    { stop: .024, color: 'rgb( 251, 198, 6 )' },
				    { stop: .283, color: 'rgb( 224, 82, 95 )' },
				    { stop: .462, color: 'rgb( 194, 78, 154 )' },
				    { stop: .794, color: 'rgb( 32, 173, 190 )' },
				    { stop: 1, color: 'rgb( 22, 158, 95 )' }
				  ] },
		outrun:   { name: 'Outrun', bgColor: '#111', colorStops: [
					{ stop: 0, color: 'rgb( 255, 223, 67 )' },
					{ stop: .182, color: 'rgb( 250, 84, 118 )' },
					{ stop: .364, color: 'rgb( 198, 59, 243 )' },
					{ stop: .525, color: 'rgb( 133, 80, 255 )' },
					{ stop: .688, color: 'rgb( 74, 104, 247 )' },
					{ stop: 1, color: 'rgb( 35, 210, 255 )' }
		          ] },
		pacific:  { name: 'Pacific Dream', bgColor: '#051319', colorStops: [
				 	{ stop: .1, color: '#34e89e' },
				 	{ stop: 1, color: '#0f3443' }
				  ] },
		prism:    { name: 'Prism', bgColor: '#111' },
		rainbow:  { name: 'Rainbow', bgColor: '#111' },
		shahabi:  { name: 'Shahabi', bgColor: '#060613', colorStops: [
				 	{ stop: .1, color: '#66ff00' },
				 	{ stop: 1, color: '#a80077' }
				  ] },
		summer:   { name: 'Summer', bgColor: '#041919', colorStops: [
				 	{ stop: .1, color: '#fdbb2d' },
				 	{ stop: 1, color: '#22c1c3' }
				  ] },
		sunset:   { name: 'Sunset', bgColor: '#021119', colorStops: [
				 	{ stop: .1, color: '#f56217' },
				 	{ stop: 1, color: '#0b486b' }
				  ] },
		tiedye:   { name: 'Tie Dye', bgColor: '#111', colorStops: [
					{ stop: .038, color: 'rgb( 15, 209, 165 )' },
					{ stop: .208, color: 'rgb( 15, 157, 209 )' },
					{ stop: .519, color: 'rgb( 133, 13, 230 )' },
					{ stop: .731, color: 'rgb( 230, 13, 202 )' },
					{ stop: .941, color: 'rgb( 242, 180, 107 )' }
		          ] },
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
			showScale   : true,		// true to show x-axis scale
			logScale    : true		// true to use logarithmic scale
		},

		linear: {
			fftSize     : 4096,
			freqMin     : 20,
			freqMax     : 2000,
			smoothing   : 0.7,
			showScale   : false,
			logScale    : false
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
 * Set desired frequency range
 */
function setFreqRange() {
	updateLastConfig();
	preCalcPosX();
}

/**
 * Set scale preferences
 */
function setScale() {
	updateLastConfig();
	preCalcPosX();
}

/**
 * Set show peaks preference
 */
function setShowPeaks() {
	cfgShowPeaks = ( elShowPeaks.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set background color preference
 */
function setBlackBg() {
	cfgBlackBg = ( elBlackBg.dataset.active == '1' );
	updateLastConfig();
}


/**
 * Pre-calculate the actual X-coordinate on screen for each frequency
 */
function preCalcPosX() {

	var freq, pos,
		lastPos = -1,
		fMin = elRangeMin.value,
		fMax = elRangeMax.value,
		iMin = Math.floor( fMin * analyser.fftSize / audioCtx.sampleRate ),
		iMax = Math.round( fMax * analyser.fftSize / audioCtx.sampleRate );

	cfgShowScale = ( elShowScale.dataset.active == '1' );
	cfgLogScale = ( elLogScale.dataset.active == '1' );

	analyzerBars = [];

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
		freq = i * audioCtx.sampleRate / analyser.fftSize; // find which frequency is represented in this bin
		if ( cfgLogScale )
			pos = Math.round( bandWidth * ( Math.log10( freq ) - deltaX ) ); // avoid fractionary pixel values
		else
			pos = Math.round( bandWidth * ( i - deltaX ) );

		// only add this bar if it doesn't overlap the previous one on screen
		if ( pos > lastPos ) {
			analyzerBars.push( { posX: pos, dataIdx: i, freq: freq, peak: 0, hold: 0, accel: 0 } );
			lastPos = pos;
		}
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
 * Load a playlist file into the current playlist
 */
function loadPlaylist() {

	var path = elPlaylists.value,
		tmplist, ext, songInfo, t,
		n = 0;

	// fix for suspended audio context on Safari
	if ( audioCtx.state == 'suspended' )
		audioCtx.resume();

	if ( ! path )
		return;

	ext = path.substring( path.lastIndexOf('.') + 1 ).toLowerCase();

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
						if ( ! songInfo ) { // if no previous #EXTINF tag, extract info from the filename
							songInfo = tmplist[ i ].substring( Math.max( tmplist[ i ].lastIndexOf('/'), tmplist[ i ].lastIndexOf('\\') ) + 1 );
							songInfo = songInfo.substring( 0, songInfo.lastIndexOf('.') ).replace( /_/g, ' ' );
						}
						if ( tmplist[ i ].substring( 0, 4 ) != 'http' )
							tmplist[ i ] = path + tmplist[ i ];
						tmplist[ i ] = tmplist[ i ].replace( /#/g, '%23' ); // replace any '#' character in the filename for its URL-safe code
						t = songInfo.indexOf(' - ');
						if ( t == -1 )
							playlist.push( { file: tmplist[ i ], artist: '', song: songInfo } );
						else
							playlist.push( { file: tmplist[ i ], artist: songInfo.substring( 0, t ), song: songInfo.substring( t + 3 ) } );
						songInfo = '';
					}
					else if ( tmplist[ i ].substring( 0, 7 ) == '#EXTINF' )
						songInfo = tmplist[ i ].substring( tmplist[ i ].indexOf(',') + 1 || 8 ); // info will be saved for the next iteration
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
	else
		consoleLog( 'Unrecognized playlist file - ' + path, true );
}

/**
 * Update the playlist shown to the user
 */
function updatePlaylistUI() {

	var	elPlaylist = document.getElementById('playlist');

	while ( elPlaylist.hasChildNodes() )
		elPlaylist.removeChild( elPlaylist.firstChild );

	for ( var i = 0; i < playlist.length; i++ ) {
		if ( playlist[ i ].artist )
			elPlaylist.appendChild( new Option( playlist[ i ].artist + ' - ' + playlist[ i ].song ) );
		else
			elPlaylist.appendChild( new Option( playlist[ i ].song ) );
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

	if ( ! isPlaying() ) {
		playlistPos = 0;
		loadSong(0);
	}
}

/**
 * Load a song into the audio element
 */
function loadSong( n ) {
	if ( playlist[ n ] !== undefined ) {
		playlistPos = n;
		audioElement.src = playlist[ playlistPos ].file;
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

	var gradIdx;

	if ( cfgSource == 'mic' )
		return;

	if ( loadSong( n ) ) {
		audioElement.play();
		if ( elCycleGrad.dataset.active == '1' ) {
			gradIdx = elGradient.selectedIndex;
			if ( gradIdx < elGradient.options.length - 1 )
				gradIdx++;
			else
				gradIdx = 0;
			elGradient.selectedIndex = gradIdx;
		}
	}
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
	canvasMsg = { timer: 0 };
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
 * Display message on canvas
 */
function displayCanvasMsg() {

	var curTime, duration;

	if ( canvasMsg.timer > canvasMsg.fade ) {
		canvasCtx.fillStyle = '#fff';
		canvasCtx.shadowColor = '#000';
	}
	else {
		canvasCtx.fillStyle = 'rgba( 255, 255, 255, ' + ( canvasMsg.timer / canvasMsg.fade ) + ')';
		canvasCtx.shadowColor = 'rgba( 0, 0, 0, ' + ( canvasMsg.timer / canvasMsg.fade ) + ')';
	}

	canvasCtx.font = 'bold ' + ( 25 * pixelRatio ) + 'px sans-serif';

	if ( canvasMsg.showGradient ) {
		canvasCtx.textAlign = 'center';
		canvasCtx.fillText( 'Gradient: ' + gradients[ elGradient.value ].name, canvas.width / 2, 50 * pixelRatio );
	}

	if ( canvasMsg.showSongInfo && playlist.length ) {
		canvasCtx.shadowOffsetX = canvasCtx.shadowOffsetY = 2 * pixelRatio;
		// file type and time
		if ( audioElement.duration ) {
			canvasCtx.textAlign = 'right';
			canvasCtx.fillText( playlist[ playlistPos ].file.substring( playlist[ playlistPos ].file.lastIndexOf('.') + 1 ).toUpperCase(), canvas.width - 35 * pixelRatio, canvas.height - 120 * pixelRatio );
			curTime = Math.floor( audioElement.currentTime / 60 ) + ':' + ( "0" + Math.floor( audioElement.currentTime % 60 ) ).slice(-2);
			duration = Math.floor( audioElement.duration / 60 ) + ':' + ( "0" + Math.floor( audioElement.duration % 60 ) ).slice(-2);
			canvasCtx.fillText( curTime + ' / ' + duration, canvas.width - 35 * pixelRatio, canvas.height - 70 * pixelRatio );
		}
		// artist and song name
		canvasCtx.textAlign = 'left';
		canvasCtx.fillText( playlist[ playlistPos ].artist.toUpperCase(), 35 * pixelRatio, canvas.height - 120 * pixelRatio, canvas.width - 230 * pixelRatio );
		canvasCtx.font = 'bold ' + ( 35 * pixelRatio ) + 'px sans-serif';
		canvasCtx.fillText( playlist[ playlistPos ].song, 35 * pixelRatio, canvas.height - 70 * pixelRatio, canvas.width - 230 * pixelRatio );
		canvasCtx.shadowOffsetX = canvasCtx.shadowOffsetY = 0;
	}
}

/**
 * Redraw the canvas
 * this is called 60 times per second by requestAnimationFrame()
 */
function draw() {

	var barWidth, barHeight,
		grad = elGradient.value;

	if ( cfgBlackBg )	// use black background
		canvasCtx.fillStyle = '#000';
	else 				// use background color defined by gradient
		canvasCtx.fillStyle = gradients[ grad ].bgColor;
	// clear the canvas
	canvasCtx.fillRect( 0, 0, canvas.width, canvas.height );

	// get a new array of data from the FFT
	analyser.getByteFrequencyData( dataArray );

	// for log scale, bar width is always 1; for linear scale we show wider bars when possible
	barWidth = ( ! cfgLogScale && bandWidth >= 2 ) ? Math.floor( bandWidth ) - 1 : 1;

	for ( var i = 0; i < analyzerBars.length; i++ ) {
		barHeight = dataArray[ analyzerBars[ i ].dataIdx ] / 255 * canvas.height;

		if ( barHeight > analyzerBars[ i ].peak ) {
			analyzerBars[ i ].peak = barHeight;
			analyzerBars[ i ].hold = 30; // hold peak dot for 30 frames (0.5s) before starting to fall down
			analyzerBars[ i ].accel = 0;
		}

		canvasCtx.fillStyle = gradients[ grad ].gradient;

		canvasCtx.fillRect( analyzerBars[ i ].posX, canvas.height, barWidth, -barHeight );
		if ( cfgShowPeaks && analyzerBars[ i ].peak > 0 ) {
			canvasCtx.fillRect( analyzerBars[ i ].posX, canvas.height - analyzerBars[ i ].peak, barWidth, 2 );
// debug/calibration - show frequency for each bar
//			canvasCtx.font = '15px sans-serif';
//			canvasCtx.fillText( analyzerBars[ i ].freq, analyzerBars[ i ].posX, canvas.height - analyzerBars[ i ].peak - 5 );
		}
		if ( analyzerBars[ i ].peak > 0 ) {
			if ( analyzerBars[ i ].hold )
				analyzerBars[ i ].hold--;
			else {
				analyzerBars[ i ].accel++;
				analyzerBars[ i ].peak -= analyzerBars[ i ].accel;
			}
		}
	}

	if ( cfgShowScale )
		drawScale();

	if ( canvasMsg.timer > 0 ) {
		displayCanvasMsg();
		if ( ! --canvasMsg.timer )
			canvasMsg = { timer: 0 }; // clear messages
	}

	// schedule next canvas update
	requestAnimationFrame( draw );
}

/**
 * Output messages to the UI "console"
 */
function consoleLog( msg, error ) {
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
 * Load a music file from the user's computer
 */
function loadLocalFile( obj ) {

	var reader = new FileReader();

	reader.onload = function() {
		audioElement.src = reader.result;
		audioElement.play();
	};

	reader.readAsDataURL( obj.files[0] );
}

/**
 * Load a configuration preset
 */
function loadPreset( name ) {

	if ( ! presets[ name ] ) // check invalid preset name
		return;

	elRangeMin.value = presets[ name ].freqMin;
	elRangeMax.value = presets[ name ].freqMax;
	elLogScale.dataset.active = Number( presets[ name ].logScale );
	elShowScale.dataset.active = Number( presets[ name ].showScale );
	elFFTsize.value = presets[ name ].fftSize;
	elSmoothing.value = presets[ name ].smoothing;

	if ( presets[ name ].gradient && gradients[ presets[ name ].gradient ] )
		elGradient.value = presets[ name ].gradient;

	if ( presets[ name ].highSens )
		elHighSens.dataset.active = Number( presets[ name ].highSens );

	if ( presets[ name ].showPeaks )
		elShowPeaks.dataset.active = Number( presets[ name ].showPeaks );

	if ( presets[ name ].blackBg )
		elBlackBg.dataset.active = Number( presets[ name ].blackBg );

	if ( presets[ name ].cycleGrad )
		elCycleGrad.dataset.active = Number( presets[ name ].cycleGrad );

	if ( presets[ name ].repeat )
		elRepeat.dataset.active = Number( presets[ name ].repeat );

	if ( presets[ name ].showSong )
		elShowSong.dataset.active = Number( presets[ name ].showSong );

	setFFTsize();
	setSmoothing();
	setSensitivity();
	setShowPeaks();
	setBlackBg();
}

/**
 * Save / update a configuration
 */
function saveConfig( config ) {

	var settings = {
		fftSize		: elFFTsize.value,
		freqMin		: elRangeMin.value,
		freqMax		: elRangeMax.value,
		smoothing	: analyser.smoothingTimeConstant,
		gradient	: elGradient.value,
		showScale 	: elShowScale.dataset.active == '1',
		logScale	: elLogScale.dataset.active == '1',
		highSens	: elHighSens.dataset.active == '1',
		showPeaks 	: elShowPeaks.dataset.active == '1',
		blackBg     : elBlackBg.dataset.active == '1',
		cycleGrad   : elCycleGrad.dataset.active == '1',
		repeat      : elRepeat.dataset.active == '1',
		showSong    : elShowSong.dataset.active == '1'
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
	document.getElementById('preset').value = 'custom';
}

/**
 * Process keyboard shortcuts
 */
function keyboardControls( event ) {

	if ( event.target.tagName.toLowerCase() != 'body' && event.target.className != 'fullscreen-button' )
		return;

	var gradIdx = elGradient.selectedIndex;

	switch ( event.keyCode ) {
		case 32: // space bar - play/pause
			playPause();
			break;
		case 37: // arrow left - previous song
		case 74: // J (alternative)
			playPreviousSong();
			break;
		case 38: // arrow up - previous gradient
		case 73: // I (alternative)
			if ( gradIdx == 0 )
				elGradient.selectedIndex = elGradient.options.length - 1;
			else
				elGradient.selectedIndex = gradIdx - 1;
			canvasMsg.showGradient = true;
			canvasMsg.timer = Math.max( canvasMsg.timer, 120 );
			canvasMsg.fade = 60;
			break;
		case 39: // arrow right - next song
		case 75: // K (alternative)
			playNextSong();
			break;
		case 40: // arrow down - next gradient
		case 77: // M (alternative)
			if ( gradIdx == elGradient.options.length - 1 )
				elGradient.selectedIndex = 0;
			else
				elGradient.selectedIndex = gradIdx + 1;
			canvasMsg.showGradient = true;
			canvasMsg.timer = Math.max( canvasMsg.timer, 120 );
			canvasMsg.fade = 60;
			break;
		case 66: // B key - toggle black background
			elBlackBg.click();
			break;
		case 68: // D key - display information
			if ( canvasMsg.showSongInfo && canvasMsg.timer ) // if info is already been displayed, then hide it
				canvasMsg = { timer: 0 };
			else
				canvasMsg = {
					showGradient: true,
					showSongInfo: true,
					timer: 300,
					fade: 60
				};
			break;
		case 83: // S key - toggle scale
			elShowScale.click();
			break;
	}
}

/**
 * Initialization
 */
function initialize() {

	playlist = [];
	playlistPos = 0;
	canvasMsg = { timer: 0 };

	consoleLog( 'audioMotion.js version ' + _VERSION );
	consoleLog( 'Initializing...' );

	// Create audio context

	var AudioContext = window.AudioContext || window.webkitAudioContext;

	try {
		audioCtx = new AudioContext();
	}
	catch( err ) {
		consoleLog( 'Could not create audio context. Web Audio API not supported?', true );
		consoleLog( 'Aborting.', true );
		return false;
	}

	consoleLog( 'Audio context sample rate is ' + audioCtx.sampleRate + 'Hz' );

	audioElement = document.getElementById('player');

	audioElement.addEventListener( 'play', function() {
		if ( playlist.length == 0 && audioElement.src == '' ) {
			consoleLog( 'Playlist is empty', true );
			audioElement.pause();
		}
		else if ( elShowSong.dataset.active == '1' ) {
			canvasMsg.showSongInfo = true;
			canvasMsg.timer = 600;
			canvasMsg.fade = 180;
		}
	});

	audioElement.addEventListener( 'ended', function() {
		// song ended, skip to next one if available
		if ( playlistPos < playlist.length - 1 )
			playSong( playlistPos + 1 );
		else if ( elRepeat.dataset.active == '1' )
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

	Object.keys( gradients ).forEach( function( key ) {
		grad = canvasCtx.createLinearGradient( 0, 0, 0, canvas.height );
		if ( gradients[ key ].hasOwnProperty( 'colorStops' ) ) {
			for ( i = 0; i < gradients[ key ].colorStops.length; i++ )
				grad.addColorStop( gradients[ key ].colorStops[ i ].stop, gradients[ key ].colorStops[ i ].color );
		}
		// rainbow gradients are easily created iterating over the hue value
		else if ( key == 'prism' ) {
			for ( i = 0; i <= 240; i += 60 )
				grad.addColorStop( i/240, 'hsl( ' + i + ', 100%, 50% )' );
		}
		else if ( key == 'rainbow' ) {
			grad = canvasCtx.createLinearGradient( 0, 0, canvas.width, 0 ); // this one is a horizontal gradient
			for ( i = 0; i <= 360; i += 60 )
				grad.addColorStop( i/360, 'hsl( ' + i + ', 100%, 50% )' );
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
	elBlackBg   = document.getElementById('black_bg');
	elBlackBg.addEventListener( 'click', setBlackBg );
	elCycleGrad = document.getElementById('cycle_grad');
	elCycleGrad.addEventListener( 'click', updateLastConfig );
	elRepeat    = document.getElementById('repeat');
	elRepeat.addEventListener( 'click', updateLastConfig );
	elShowSong  = document.getElementById('show_song');
	elShowSong.addEventListener( 'click', updateLastConfig );

	var settings;

	settings = localStorage.getItem( 'last-config' );
	if ( settings !== null )
		presets['last'] = JSON.parse( settings );
	else { // if no data found from last session, use 'log' preset as base
		presets['last'] = JSON.parse( JSON.stringify( presets['log'] ) );
		// set additional default options
		presets['last'].gradient = 'prism';
		presets['last'].cycleGrad = true;
		presets['last'].highSens = false;
		presets['last'].showPeaks = true;
		presets['last'].showSong = true;
	}

	settings = localStorage.getItem( 'custom-preset' );
	if ( settings !== null )
		presets['custom'] = JSON.parse( settings );
	else
		presets['custom'] = JSON.parse( JSON.stringify( presets['last'] ) );

	loadPreset('last');

	// Set audio source to built-in player
	elSource = document.getElementById('source');
	setSource();

	// Load playlists from playlists.cfg
	elPlaylists = document.getElementById('playlists');
	loadPlaylistsCfg();

	// Add event listener for keyboard controls
	window.addEventListener( 'keyup', keyboardControls );

	// Start canvas animation
	requestAnimationFrame( draw );
}


/**
 * localStorage polyfill
 * from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Local_storage
 */
if (!window.localStorage) {
	window.localStorage = {
		getItem: function (sKey) {
			if (!sKey || !this.hasOwnProperty(sKey)) { return null; }
			return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
		},
		key: function (nKeyId) {
			return unescape(document.cookie.replace(/\s*\=(?:.(?!;))*$/, "").split(/\s*\=(?:[^;](?!;))*[^;]?;\s*/)[nKeyId]);
		},
		setItem: function (sKey, sValue) {
			if(!sKey) { return; }
			document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
			this.length = document.cookie.match(/\=/g).length;
		},
		length: 0,
		removeItem: function (sKey) {
			if (!sKey || !this.hasOwnProperty(sKey)) { return; }
			document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
			this.length--;
		},
		hasOwnProperty: function (sKey) {
			return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
		}
	};
	window.localStorage.length = (document.cookie.match(/\=/g) || window.localStorage).length;
}

/**
 * Initialize when window finished loading
 */

window.onload = initialize;
