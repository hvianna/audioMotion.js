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

var _VERSION = '19.3-dev.4';


/**
 * Global variables
 */
var	// playlist, index to the current song, indexes to current and next audio elements
	playlist, playlistPos, currAudio, nextAudio,
	// HTML elements from the UI
	elMode, elFFTsize, elRangeMin, elRangeMax, elSmoothing, elGradient, elShowScale,
	elHighSens, elShowPeaks, elPlaylists, elBlackBg, elCycleGrad, elRepeat, elShowSong, elSource,
	// configuration options we need to check inside the draw loop - for better performance
	cfgSource, cfgShowScale, cfgShowPeaks, cfgBlackBg,
	// data for drawing the analyzer bars and scale related variables
	analyzerBars, fMin, fMax, deltaX, bandWidth, barWidth,
	// Web Audio API related variables
	audioCtx, analyzer, audioElement, bufferLength, dataArray, sourcePlayer, sourceMic,
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
		fullfft: {
			mode        : 0,	    // visualization mode (0, 1, 2)
			fftSize     : 8192,		// FFT size
			freqMin     : 20,		// lowest frequency
			freqMax     : 22000,	// highest frequency
			smoothing   : 0.5		// 0 to 0.9 - smoothing time constant
		},

		octave: {
			mode        : 2,		// 1/12th octave bands
			fftSize     : 8192,
			freqMin     : 30,
			freqMax     : 16000,
			smoothing   : 0.5
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
 * Adjust the analyzer's sensitivity
 */
function setSensitivity() {
	if ( elHighSens.dataset.active == '1' ) {
		analyzer.minDecibels = -100; // WebAudio API defaults
		analyzer.maxDecibels = -30;
	}
	else {
		analyzer.minDecibels = -85;
		analyzer.maxDecibels = -25;
	}
	updateLastConfig();
}

/**
 * Set the smoothing time constant
 */
function setSmoothing() {
	analyzer.smoothingTimeConstant = elSmoothing.value;
	consoleLog( 'smoothingTimeConstant is ' + analyzer.smoothingTimeConstant );
	updateLastConfig();
}

/**
 * Set the size of the FFT performed by the analyzer node
 */
function setFFTsize() {

	analyzer.fftSize = elFFTsize.value;

	// update all variables that depend on the FFT size
	bufferLength = analyzer.frequencyBinCount;
	dataArray = new Uint8Array( bufferLength );

	consoleLog( 'FFT size is ' + analyzer.fftSize + ' samples' );
	updateLastConfig();

	preCalcPosX();
}

/**
 * Set desired frequency range
 */
function setFreqRange() {
	while ( Number( elRangeMax.value ) <= Number( elRangeMin.value ) )
		elRangeMax.selectedIndex++;
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

	fMin = elRangeMin.value;
	fMax = elRangeMax.value;

	var i, freq;

	cfgShowScale = ( elShowScale.dataset.active == '1' );

	deltaX = Math.log10( fMin );
	bandWidth = canvas.width / ( Math.log10( fMax ) - deltaX );

	analyzerBars = [];

	if ( elMode.value == '0' ) {
	// full frequencies
 		var pos, lastPos = -1;
		iMin = Math.floor( fMin * analyzer.fftSize / audioCtx.sampleRate ),
		iMax = Math.round( fMax * analyzer.fftSize / audioCtx.sampleRate );
		barWidth = 1;

		for ( i = iMin; i <= iMax; i++ ) {
			freq = i * audioCtx.sampleRate / analyzer.fftSize; // frequency represented in this bin
			pos = Math.round( bandWidth * ( Math.log10( freq ) - deltaX ) ); // avoid fractionary pixel values

			// only add this bar if it doesn't overlap the previous one on screen
			if ( pos > lastPos ) {
				analyzerBars.push( { posX: pos, dataIdx: i, nBins: 1, freq: freq, peak: 0, hold: 0, accel: 0 } );
				lastPos = pos;
			}
		}
	}
	else {
	// octave bands
		// generate a table of frequencies based on an equal-tempered scale
		var root24 = 2 ** ( 1 / 24 ); // for 1/24th-octave bands
		var c0 = 440 * root24 ** -114;
		var temperedScale = [];
		var prevBin = 0;

		i = 0;
		while ( ( freq = c0 * root24 ** i ) <= fMax ) {
			if ( freq >= fMin && i % elMode.value == 0 )
				temperedScale.push( freq );
			i++;
		}

		// canvas space will be divided by the number of frequencies we have to display
		barWidth = Math.floor( canvas.width / temperedScale.length ) - 1;
		var barSpace = Math.round( canvas.width - barWidth * temperedScale.length ) / ( temperedScale.length - 1 );

		temperedScale.forEach( function( freq, index ) {
			// which FFT bin represents this frequency?
			var bin = Math.round( freq * analyzer.fftSize / audioCtx.sampleRate );

			var idx = [];
			// start from the last used FFT bin
			if ( prevBin > 0 && prevBin + 1 <= bin )
				idx = prevBin + 1;
			else
				idx = bin;

			prevBin = nextBin = bin;
			// check if there's another band after this one
			if ( temperedScale[ index + 1 ] !== undefined ) {
				nextBin = Math.round( temperedScale[ index + 1 ] * analyzer.fftSize / audioCtx.sampleRate );
				// and consider half the bins in-between for this band (may be the same bin for low frequencies)
				if ( nextBin - bin > 0 )
					prevBin += Math.round( ( nextBin - bin ) / 2 );
			}

			analyzerBars.push( {
				posX: index * ( barWidth + barSpace ),
				dataIdx: idx,
				nBins: prevBin - idx + 1,
				freq: freq,
				peak: 0,
				hold: 0,
				accel: 0
			} );
		} );
	}

	drawScale();
}

/**
 * Draws the x-axis scale
 */
function drawScale() {

	var bands = [ 16, 31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 ];

	canvasCtx.fillStyle = '#000';
	canvasCtx.fillRect( 0, canvas.height - 20 * pixelRatio, canvas.width, 20 * pixelRatio );

	if ( ! cfgShowScale )
		return;

	canvasCtx.fillStyle = '#fff';
	canvasCtx.font = ( 10 * pixelRatio ) + 'px sans-serif';
	canvasCtx.textAlign = 'center';

	bands.forEach( function( freq ) {
		var posX = bandWidth * ( Math.log10( freq ) - deltaX );
		canvasCtx.fillText( freq >= 1000 ? ( freq / 1000 ) + 'k' : freq, posX, canvas.height - 5 * pixelRatio );
	});

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
 * Load a song into the currently active audio element
 */
function loadSong( n ) {
	if ( playlist[ n ] !== undefined ) {
		playlistPos = n;
		audioElement[ currAudio ].src = playlist[ playlistPos ].file;
		document.getElementById('playlist').selectedIndex = playlistPos;
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
	if ( playlistPos < playlist.length - 1 )
		audioElement[ nextAudio ].src = playlist[ playlistPos + 1 ].file;
	else
		audioElement[ nextAudio ].src = playlist[ 0 ].file;
}

/**
 * Play a song from the playlist
 */
function playSong( n ) {

	var gradIdx;

	if ( cfgSource == 'mic' )
		return;

	if ( loadSong( n ) )
		audioElement[ currAudio ].play();
}

/**
 * Player controls
 */
function playPause() {
	if ( cfgSource == 'mic' )
		return;
	if ( isPlaying() )
		audioElement[ currAudio ].pause();
	else if ( audioElement[ currAudio ].src != '' )
		audioElement[ currAudio ].play();
}

function stop() {
	if ( cfgSource == 'mic' )
		return;
	audioElement[ currAudio ].pause();
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

function playNextSong( play ) {
	if ( cfgSource == 'mic' || playlistPos > playlist.length - 1 )
		return;

	if ( playlistPos < playlist.length - 1 )
		playlistPos++;
	else if ( elRepeat.dataset.active == '1' )
		playlistPos = 0;
	else return;

	play = play || isPlaying();

	currAudio = ! currAudio | 0;
	nextAudio = ! currAudio | 0;

	sourcePlayer[ nextAudio ].disconnect( analyzer );
	sourcePlayer[ currAudio ].connect( analyzer );

	audioElement[ nextAudio ].style.display = 'none';
	audioElement[ currAudio ].style.display = 'block';

	if ( play ) {
		audioElement[ currAudio ].play();
		if ( elCycleGrad.dataset.active == '1' ) {
			gradIdx = elGradient.selectedIndex;
			if ( gradIdx < elGradient.options.length - 1 )
				gradIdx++;
			else
				gradIdx = 0;
			elGradient.selectedIndex = gradIdx;
		}
	}

	document.getElementById('playlist').selectedIndex = playlistPos;

	loadNextSong();
}

/**
 * Check if audio is playing
 */
function isPlaying() {
	return audioElement[ currAudio ]
		&& audioElement[ currAudio ].currentTime > 0
		&& !audioElement[ currAudio ].paused
		&& !audioElement[ currAudio ].ended;
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
		if ( audioElement[ currAudio ].duration ) {
			canvasCtx.textAlign = 'right';
			canvasCtx.fillText( playlist[ playlistPos ].file.substring( playlist[ playlistPos ].file.lastIndexOf('.') + 1 ).toUpperCase(), canvas.width - 35 * pixelRatio, canvas.height - 120 * pixelRatio );
			curTime = Math.floor( audioElement[ currAudio ].currentTime / 60 ) + ':' + ( "0" + Math.floor( audioElement[ currAudio ].currentTime % 60 ) ).slice(-2);
			duration = Math.floor( audioElement[ currAudio ].duration / 60 ) + ':' + ( "0" + Math.floor( audioElement[ currAudio ].duration % 60 ) ).slice(-2);
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

	var grad = elGradient.value;

	if ( cfgBlackBg )	// use black background
		canvasCtx.fillStyle = '#000';
	else 				// use background color defined by gradient
		canvasCtx.fillStyle = gradients[ grad ].bgColor;
	// clear the canvas
	canvasCtx.fillRect( 0, 0, canvas.width, canvas.height );

	// get a new array of data from the FFT
	analyzer.getByteFrequencyData( dataArray );

	analyzerBars.forEach( function( bar ) {

		var barHeight;

		if ( bar.nBins == 1 ) 	// dataIdx it's a single FFT bin
			barHeight = dataArray[ bar.dataIdx ] / 255 * canvas.height;
		else { 											// if it's a range of bins we need to calculate the average
			var sum = 0;
			for ( var i = bar.dataIdx, c = bar.nBins; c--; i++ )
				sum += dataArray[ i ];
			barHeight = ( sum / bar.nBins ) / 255 * canvas.height;
		}

		if ( barHeight > bar.peak ) {
			bar.peak = barHeight;
			bar.hold = 30; // hold peak dot for 30 frames (0.5s) before starting to fall down
			bar.accel = 0;
		}

		canvasCtx.fillStyle = gradients[ grad ].gradient;

		canvasCtx.fillRect( bar.posX, canvas.height, barWidth, -barHeight );
		if ( cfgShowPeaks && bar.peak > 0 ) {
			canvasCtx.fillRect( bar.posX, canvas.height - bar.peak, barWidth, 2 );
// debug/calibration - show frequency for each bar
//			canvasCtx.font = '15px sans-serif';
//			canvasCtx.fillText( bar.freq, bar.posX, canvas.height - bar.peak - 5 );
		}
		if ( bar.peak > 0 ) {
			if ( bar.hold )
				bar.hold--;
			else {
				bar.accel++;
				bar.peak -= bar.accel;
			}
		}
	} );

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
				audioElement[ currAudio ].pause();
			sourcePlayer[ currAudio ].disconnect( analyzer );
			sourceMic.connect( analyzer );
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
			sourceMic.disconnect( analyzer );
		sourcePlayer[ currAudio ].connect( analyzer );
		consoleLog( 'Audio source set to built-in player' );
	}

}

/**
 * Load a music file from the user's computer
 */
function loadLocalFile( obj ) {

	var reader = new FileReader();

	reader.onload = function() {
		audioElement[ currAudio ].src = reader.result;
		audioElement[ currAudio ].play();
	};

	reader.readAsDataURL( obj.files[0] );
}

/**
 * Load a configuration preset
 */
function loadPreset( name ) {

	if ( ! presets[ name ] ) // check invalid preset name
		return;

	if ( presets[ name ].hasOwnProperty( 'mode' ) )
		elMode.value = presets[ name ].mode;

	if ( presets[ name ].hasOwnProperty( 'fftSize' ) )
		elFFTsize.value = presets[ name ].fftSize;

	if ( presets[ name ].hasOwnProperty( 'freqMin' ) )
		elRangeMin.value = presets[ name ].freqMin;

	if ( presets[ name ].hasOwnProperty( 'freqMax' ) )
		elRangeMax.value = presets[ name ].freqMax;

	if ( presets[ name ].hasOwnProperty( 'smoothing' ) )
		elSmoothing.value = presets[ name ].smoothing;

	if ( presets[ name ].hasOwnProperty( 'showScale' ) )
		elShowScale.dataset.active = Number( presets[ name ].showScale );

	if ( presets[ name ].hasOwnProperty( 'gradient' ) && gradients[ presets[ name ].gradient ] )
		elGradient.value = presets[ name ].gradient;

	if ( presets[ name ].hasOwnProperty( 'highSens' ) )
		elHighSens.dataset.active = Number( presets[ name ].highSens );

	if ( presets[ name ].hasOwnProperty( 'showPeaks' ) )
		elShowPeaks.dataset.active = Number( presets[ name ].showPeaks );

	if ( presets[ name ].hasOwnProperty( 'blackBg' ) )
		elBlackBg.dataset.active = Number( presets[ name ].blackBg );

	if ( presets[ name ].hasOwnProperty( 'cycleGrad' ) )
		elCycleGrad.dataset.active = Number( presets[ name ].cycleGrad );

	if ( presets[ name ].hasOwnProperty( 'repeat' ) )
		elRepeat.dataset.active = Number( presets[ name ].repeat );

	if ( presets[ name ].hasOwnProperty( 'showSong' ) )
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
		smoothing	: analyzer.smoothingTimeConstant,
		gradient	: elGradient.value,
		mode        : elMode.value,
		showScale 	: elShowScale.dataset.active == '1',
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

	var gradIdx = elGradient.selectedIndex,
		modeIdx = elMode.selectedIndex;

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
		case 86: // V key - toggle visualization mode
			if ( modeIdx == elMode.options.length - 1 )
				elMode.selectedIndex = 0;
			else
				elMode.selectedIndex = modeIdx + 1;
			setScale();
			break;
	}
}


/**
 * Event handler for 'play' on audio elements
 */
function audioOnPlay() {
	if ( playlist.length == 0 && audioElement[ currAudio ].src == '' ) {
		consoleLog( 'Playlist is empty', true );
		audioElement[ currAudio ].pause();
	}
	else if ( elShowSong.dataset.active == '1' ) {
		canvasMsg.showSongInfo = true;
		canvasMsg.timer = 600;
		canvasMsg.fade = 180;
	}
}


/**
 * Event handler for 'ended' on audio elements
 */
function audioOnEnded() {
	// song ended, skip to next one if available
	if ( playlistPos < playlist.length - 1 || elRepeat.dataset.active == '1' )
		playNextSong( true );
	else
		loadSong( 0 );
}


/**
 * Error event handler for audio elements
 */
function audioOnError( e ) {
	consoleLog( 'Error loading ' );// + this.src, true );
	console.log( e );
}

/**
 * Initialization
 */
function initialize() {

	playlist = [];
	playlistPos = 0;

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

	audioElement = [
		document.getElementById('player0'),
		document.getElementById('player1')
	];

	currAudio = 0;
	nextAudio = 1;

	audioElement[0].style.display = 'block';
	audioElement[1].style.display = 'none';

	audioElement[0].addEventListener( 'play', audioOnPlay );
	audioElement[1].addEventListener( 'play', audioOnPlay );

	audioElement[0].addEventListener( 'ended', audioOnEnded );
	audioElement[1].addEventListener( 'ended', audioOnEnded );

	audioElement[0].addEventListener( 'error', audioOnError );
	audioElement[1].addEventListener( 'error', audioOnError );

	analyzer = audioCtx.createAnalyser();
	sourcePlayer = [
		audioCtx.createMediaElementSource( audioElement[0] ),
		audioCtx.createMediaElementSource( audioElement[1] )
	];

	sourcePlayer[0].connect( analyzer );
	analyzer.connect( audioCtx.destination );

	// Canvas

	canvas = document.getElementById('canvas');
	canvasCtx = canvas.getContext('2d');
	canvasMsg = { timer: 0 };

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
	elMode      = document.getElementById('mode');
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
		presets['last'].showScale = true;
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
 * Initialize when window finished loading
 */

window.onload = initialize;
