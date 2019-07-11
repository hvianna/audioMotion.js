/**
 * audioMotion.js
 * high-resolution real-time audio spectrum analyzer and music player
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

var _VERSION = '19.7-dev.2';

import * as audioMotion from './audioMotion-analyzer.js';
import * as fileExplorer from './file-explorer.js';
import * as mm from 'music-metadata-browser';

import Sortable, { MultiDrag } from 'sortablejs';
Sortable.mount( new MultiDrag() );

import notie from 'notie';
import './notie.css';

import './styles.css';

// playlist, index to the current song, indexes to current and next audio elements
var playlist, playlistPos, currAudio, nextAudio;

// HTML elements from the UI
var elMode, elFFTsize, elRangeMin, elRangeMax, elSmoothing, elGradient, elShowScale,
	elHighSens, elShowPeaks, elPlaylists, elBlackBg, elCycleGrad, elLedDisplay,
	elRepeat, elShowSong, elSource, elNoShadow, elLoRes, elFPS;

// audio sources
var	audioElement, sourcePlayer, sourceMic, cfgSource;

// on-screen messages
var	canvasMsg;

// flag for skip track in progress
var skipping = false;

/**
 * Configuration presets
 */
var presets = {
		default: {
			mode        : 0,	    // discrete frequencies mode
			fftSize     : 8192,		// FFT size
			freqMin     : 20,		// lowest frequency
			freqMax     : 22000,	// highest frequency
			smoothing   : 0.5,		// 0 to 0.9 - smoothing time constant
			gradient    : 'prism',
			blackBg     : 0,
			cycleGrad   : 1,
			ledDisplay  : 0,
			showScale   : 1,
			highSens    : 0,
			showPeaks   : 1,
			showSong    : 1,
			repeat      : 0,
			noShadow    : 1,
			loRes       : 0,
			showFPS     : 0
		},

		fullres: {
			mode        : 0,
			fftSize     : 8192,
			freqMin     : 20,
			freqMax     : 22000,
			smoothing   : 0.5
		},

		octave: {
			mode        : 4,		// 1/6th octave bands mode
			fftSize     : 8192,
			freqMin     : 30,
			freqMax     : 16000,
			smoothing   : 0.5
		},

		ledbars: {
			mode        : 2,		// 1/12th octave bands mode
			fftSize     : 8192,
			freqMin     : 30,
			freqMax     : 16000,
			smoothing   : 0.5,
			blackBg     : 0,
			ledDisplay  : 1,
			showScale   : 0
		}
	};

// additional gradient definitions
var	gradients = {
		apple:    { name: 'Apple ][', bgColor: '#111', colorStops: [
					{ pos: .1667, color: '#61bb46' },
					{ pos: .3333, color: '#fdb827' },
					{ pos: .5, color: '#f5821f' },
					{ pos: .6667, color: '#e03a3e' },
					{ pos: .8333, color: '#963d97' },
					{ pos: 1, color: '#009ddc' }
				  ] },
		aurora:   { name: 'Aurora', bgColor: '#0e172a', colorStops: [
					{ pos: .1, color: 'hsl( 120, 100%, 50% )' },
					{ pos:  1, color: 'hsl( 216, 100%, 50% )' }
				  ] },
		borealis:  { name: 'Borealis', bgColor: '#0d1526', colorStops: [
					{ pos: .1, color: 'hsl( 120, 100%, 50% )' },
					{ pos: .5, color: 'hsl( 189, 100%, 40% )' },
					{ pos:  1, color: 'hsl( 290, 60%, 40% )' }
				  ] },
		candy:    { name: 'Candy', bgColor: '#0d0619', colorStops: [
					{ pos: .1, color: '#ffaf7b' },
					{ pos: .5, color: '#d76d77' },
					{ pos: 1, color: '#3a1c71' }
				  ] },
		classic:  { name: 'Classic' },
		dusk:     { name: 'Dusk', bgColor: '#0e172a', colorStops: [
					{ pos: .2, color: 'hsl( 55, 100%, 50% )' },
					{ pos:  1, color: 'hsl( 16, 100%, 50% )' }
				  ] },
		miami:    { name: 'Miami', bgColor: '#110a11', colorStops: [
					{ pos: .024, color: 'rgb( 251, 198, 6 )' },
					{ pos: .283, color: 'rgb( 224, 82, 95 )' },
					{ pos: .462, color: 'rgb( 194, 78, 154 )' },
					{ pos: .794, color: 'rgb( 32, 173, 190 )' },
					{ pos: 1, color: 'rgb( 22, 158, 95 )' }
				  ] },
		orient:   { name: 'Orient', bgColor: '#100', colorStops: [
					{ pos: .1, color: '#f00' },
					{ pos: 1, color: '#600' }
				  ] },
		outrun:   { name: 'Outrun', bgColor: '#101', colorStops: [
					{ pos: 0, color: 'rgb( 255, 223, 67 )' },
					{ pos: .182, color: 'rgb( 250, 84, 118 )' },
					{ pos: .364, color: 'rgb( 198, 59, 243 )' },
					{ pos: .525, color: 'rgb( 133, 80, 255 )' },
					{ pos: .688, color: 'rgb( 74, 104, 247 )' },
					{ pos: 1, color: 'rgb( 35, 210, 255 )' }
				  ] },
		pacific:  { name: 'Pacific Dream', bgColor: '#051319', colorStops: [
					{ pos: .1, color: '#34e89e' },
					{ pos: 1, color: '#0f3443' }
				  ] },
		prism:    { name: 'Prism' },
		rainbow:  { name: 'Rainbow' },
		shahabi:  { name: 'Shahabi', bgColor: '#060613', colorStops: [
					{ pos: .1, color: '#66ff00' },
					{ pos: 1, color: '#a80077' }
				  ] },
		summer:   { name: 'Summer', bgColor: '#041919', colorStops: [
					{ pos: .1, color: '#fdbb2d' },
					{ pos: 1, color: '#22c1c3' }
				  ] },
		sunset:   { name: 'Sunset', bgColor: '#021119', colorStops: [
					{ pos: .1, color: '#f56217' },
					{ pos: 1, color: '#0b486b' }
				  ] },
		tiedye:   { name: 'Tie Dye', bgColor: '#111', colorStops: [
					{ pos: .038, color: 'rgb( 15, 209, 165 )' },
					{ pos: .208, color: 'rgb( 15, 157, 209 )' },
					{ pos: .519, color: 'rgb( 133, 13, 230 )' },
					{ pos: .731, color: 'rgb( 230, 13, 202 )' },
					{ pos: .941, color: 'rgb( 242, 180, 107 )' }
				  ] },
	};


/**
 * Display the canvas in full-screen mode
 */
function fullscreen() {
	audioMotion.toggleFullscreen();
	document.getElementById('btn_fullscreen').blur();
}

/**
 * Adjust the analyzer's sensitivity
 */
function setSensitivity() {
	audioMotion.setSensitivity( elHighSens.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set the smoothing time constant
 */
function setSmoothing() {
	audioMotion.setSmoothing( elSmoothing.value );
	consoleLog( 'smoothingTimeConstant is ' + audioMotion.analyzer.smoothingTimeConstant );
	updateLastConfig();
}

/**
 * Set the size of the FFT performed by the analyzer node
 */
function setFFTsize() {
	audioMotion.setFFTSize( elFFTsize.value );
	consoleLog( 'FFT size is ' + audioMotion.analyzer.fftSize + ' samples' );
	updateLastConfig();
}

/**
 * Set desired frequency range
 */
function setFreqRange() {
	while ( Number( elRangeMax.value ) <= Number( elRangeMin.value ) )
		elRangeMax.selectedIndex++;
	audioMotion.setFreqRange( elRangeMin.value, elRangeMax.value );
	updateLastConfig();
}

/**
 * Set Gradient
 */
function setGradient() {
	audioMotion.setGradient( elGradient.value );
	updateLastConfig();
}

/**
 * Set visualization mode
 */
function setMode() {
	audioMotion.setMode( elMode.value );
	updateLastConfig();
}

/**
 * Set scale preferences
 */
function setScale() {
	audioMotion.toggleScale( elShowScale.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set scale preferences
 */
function setLedDisplay() {
	audioMotion.toggleLeds( elLedDisplay.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set show peaks preference
 */
function setShowPeaks() {
	audioMotion.togglePeaks( elShowPeaks.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set background color preference
 */
function setBlackBg() {
	audioMotion.toggleBgColor( elBlackBg.dataset.active == '0' );
	updateLastConfig();
}

/**
 * Set display of current frame rate
 */
function setFPS() {
	audioMotion.toggleFPS( elFPS.dataset.active == '1' );
	updateLastConfig();
}


/**
 * Clear audio element
 */
function clearAudioElement( n = currAudio ) {
	audioElement[ n ].removeAttribute('src');
	audioElement[ n ].dataset.file = '';
	audioElement[ n ].dataset.artist = '';
	audioElement[ n ].dataset.title = '';
	audioElement[ n ].dataset.album = '';
	audioElement[ n ].dataset.codec = '';
	audioElement[ n ].dataset.quality = '';
	audioElement[ n ].dataset.duration = '';
}

/**
 * Clear the playlist
 */
function clearPlaylist() {

	while ( playlist.hasChildNodes() )
		playlist.removeChild( playlist.firstChild );

	if ( ! isPlaying() ) {
		playlistPos = 0;
		clearAudioElement(0);
		clearAudioElement(1);
	}
	else {
		playlistPos = -1;
		clearAudioElement( ! currAudio | 0 );
	}

	updatePlaylistUI();
}

/**
 * Load playlists from localStorage and legacy playlists.cfg file
 */
function loadSavedPlaylists( keyName ) {

	var list, item, n = 0,
		playlists = localStorage.getItem('playlists');

	while ( elPlaylists.hasChildNodes() )
		elPlaylists.removeChild( elPlaylists.firstChild );

	item = new Option( 'Select a playlist and click action to the right', '' );
	item.disabled = true;
	item.selected = true;
	elPlaylists.options[ elPlaylists.options.length ] = item;

	if ( playlists ) {
		playlists = JSON.parse( playlists );

		Object.keys( playlists ).forEach( key => {
			item = new Option( playlists[ key ], key );
			item.dataset.isLocal = '1';
			if ( key == keyName )
				item.selected = true;
			elPlaylists.options[ elPlaylists.options.length ] = item;
		});
	}

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
				list = content.split(/[\r\n]+/);
				for ( let i = 0; i < list.length; i++ ) {
					if ( list[ i ].charAt(0) != '#' && list[ i ].trim() != '' ) { // not a comment or blank line?
						item = list[ i ].split(/\|/);
						if ( item.length == 2 ) {
							elPlaylists.options[ elPlaylists.options.length ] = new Option( item[0].trim(), item[1].trim() );
							n++;
						}
					}
				}
				if ( n )
					consoleLog( `${n} playlists loaded from playlists.cfg` );
				else
					consoleLog( 'No playlists found in playlists.cfg', true );
			}
		})
		.catch( e => {} );
}

/**
 * Add a song or playlist to the current playlist
 */
function addToPlaylist( file ) {

	var ext = file.substring( file.lastIndexOf('.') + 1 ).toLowerCase();

	if ( ['m3u','m3u8'].includes( ext ) )
		loadPlaylist( file );
	else
		addSongToPlaylist( file );
}

/**
 * Add audio metadata to a playlist item or audio element
 */
function addMetadata( metadata, target ) {
	if ( metadata.dataset ) { 	// just copy metadata from element dataset (playlist item)
		target.dataset.artist   = metadata.dataset.artist || '';
		target.dataset.title    = metadata.dataset.title || '';
		target.dataset.album    = metadata.dataset.album || '';
		target.dataset.codec    = metadata.dataset.codec || '';
		target.dataset.quality  = metadata.dataset.quality || '';
		target.dataset.duration = metadata.dataset.duration || '';
	}
	else {						// parse metadata read from file
		target.dataset.artist   = metadata.common.artist || target.dataset.artist;
		target.dataset.title    = metadata.common.title || target.dataset.title;
		target.dataset.album    = metadata.common.album ? metadata.common.album + ( metadata.common.year ? ' (' + metadata.common.year + ')' : '' ) : '';
		target.dataset.codec    = metadata.format ? metadata.format.codec || metadata.format.container : target.dataset.codec;

		if ( metadata.format && metadata.format.bitsPerSample )
			target.dataset.quality = ( metadata.format.sampleRate / 1000 ).toFixed() + 'KHz / ' + metadata.format.bitsPerSample + 'bits';
		else if ( metadata.format.bitrate )
			target.dataset.quality = ( metadata.format.bitrate / 1000 ) + 'K ' + metadata.format.codecProfile || '';
		else
			target.dataset.quality = '';

		if ( metadata.format && metadata.format.duration )
			target.dataset.duration = Math.floor( metadata.format.duration / 60 ) + ':' + ( '0' + Math.round( metadata.format.duration % 60 ) ).slice(-2);
		else
			target.dataset.duration = '';
	}
}

/**
 * Add a song to the playlist
 */
function addSongToPlaylist( uri, content = {} ) {

	var el = document.createElement('li');

	el.dataset.artist = content.artist || '';
	el.dataset.title = content.title || uri.substring( Math.max( uri.lastIndexOf('/'), uri.lastIndexOf('\\') ) + 1 ).replace( /%23/g, '#' );
	el.dataset.codec = uri.substring( uri.lastIndexOf('.') + 1 ).toUpperCase();
	uri = uri.replace( /#/g, '%23' ); // replace any '#' character in the filename for its URL-safe code (for content coming from playlist files)
	el.dataset.file = uri;

	el.innerText = ( el.dataset.artist ? el.dataset.artist + ' / ' : '' ) + el.dataset.title;
	playlist.appendChild( el );

	var len = playlist.children.length;
	if ( len == 1 && ! isPlaying() )
		loadSong(0);
	if ( playlistPos > len - 3 )
		loadNextSong();

	mm.fetchFromUrl( uri, { skipCovers: true } )
		.then( metadata => {
			if ( metadata ) {
				addMetadata( metadata, el ); // add metadata to playlist item
				el.innerHTML = ( el.dataset.artist ? el.dataset.artist + ' / ' : '' ) + el.dataset.title;

				for ( let i in [0,1] ) {
					if ( audioElement[ i ].dataset.file == el.dataset.file )
						addMetadata( el, audioElement[ i ] ); // transfer metadata to audio element
				}
			}
		});
}

/**
 * Load a playlist file into the current playlist
 */
function loadPlaylist( path ) {

	var tmplist, ext, songInfo,
		n = 0;

	if ( ! path )
		return;

	ext = path.substring( path.lastIndexOf('.') + 1 ).toLowerCase();

	if ( ['m3u','m3u8'].includes( ext ) ) {
		fetch( path )
			.then( response => {
				if ( response.status == 200 )
					return response.text();
				else
					consoleLog( `Fetch returned error code ${response.status} for URI ${path}`, true );
			})
			.then( content => {
				tmplist = content.split(/[\r\n]+/);
				path = path.substring( 0, Math.max( path.lastIndexOf('/'), path.lastIndexOf('\\') ) + 1 );
				for ( var i = 0; i < tmplist.length; i++ ) {
					if ( tmplist[ i ].charAt(0) != '#' && tmplist[ i ].trim() != '' ) { // not a comment or blank line?
						n++;
						if ( ! songInfo ) { // if no previous #EXTINF tag, extract info from the filename
							songInfo = tmplist[ i ].substring( Math.max( tmplist[ i ].lastIndexOf('/'), tmplist[ i ].lastIndexOf('\\') ) + 1 );
							songInfo = songInfo.substring( 0, songInfo.lastIndexOf('.') ).replace( /_/g, ' ' );
						}
						if ( tmplist[ i ].substring( 0, 4 ) != 'http' && tmplist[ i ][1] != ':' && tmplist[ i ][0] != '/' )
							tmplist[ i ] = path + tmplist[ i ];
						let t = songInfo.indexOf(' - ');
						if ( t == -1 )
							addSongToPlaylist( tmplist[ i ], { title: songInfo } );
						else
							addSongToPlaylist( tmplist[ i ], { artist: songInfo.substring( 0, t ), title: songInfo.substring( t + 3 ) } );
						songInfo = '';
					}
					else if ( tmplist[ i ].substring( 0, 7 ) == '#EXTINF' )
						songInfo = tmplist[ i ].substring( tmplist[ i ].indexOf(',') + 1 || 8 ); // info will be saved for the next iteration
				}
				consoleLog( `Loaded ${n} files into the playlist` );
			})
			.catch( e => consoleLog( e, true ) );
	}
	else { // try to load playlist from localStorage
		tmplist = localStorage.getItem( 'pl_' + path );
		if ( tmplist ) {
			tmplist = JSON.parse( tmplist );
			tmplist.forEach( item => {
				n++;
				songInfo = item.substring( Math.max( item.lastIndexOf('/'), item.lastIndexOf('\\') ) + 1 );
				songInfo = songInfo.substring( 0, songInfo.lastIndexOf('.') ).replace( /_/g, ' ' );
				addSongToPlaylist( item, { title: songInfo } )
			});
			consoleLog( `Loaded ${n} files into the playlist` );
		}
		else
			consoleLog( `Unrecognized playlist file: ${path}`, true );
	}
}

/**
 * Save/update an existing playlist
 */
function savePlaylist( index ) {

	if ( elPlaylists[ index ].value == '' )
		storePlaylist();
	else if ( ! elPlaylists[ index ].dataset.isLocal )
		notie.alert({ type: 2, text: 'This is a server playlist which cannot be overwritten.<br>Click "Save as..." to create a new local playlist.', time: 5 });
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
		notie.alert({ type: 2, text: 'Play queue is empty!' });
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
		var safename = name;

		if ( ! update ) {
			safename = safename.normalize('NFD').replace( /[\u0300-\u036f]/g, '' ); // remove accents
			safename = safename.toLowerCase().replace( /[^a-z0-9]/g, '_' );

			var playlists = localStorage.getItem('playlists');

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

		var songs = [];
		playlist.childNodes.forEach( item => songs.push( item.dataset.file ) );

		localStorage.setItem( 'pl_' + safename, JSON.stringify( songs ) );
		notie.alert({ type: 2, text: `Saving playlist` });
	}
}

/**
 * Delete a playlist from localStorage
 */
function deletePlaylist( index ) {
	if ( elPlaylists[ index ].value ) {
		notie.confirm({
			text: `Do you really want to DELETE the "${elPlaylists[ index ].innerText}" playlist?<br>THIS CANNOT BE UNDONE!`,
			submitText: 'Delete',
			submitCallback: () => {
				var keyName = elPlaylists[ index ].value;
				var playlists = localStorage.getItem('playlists');

				if ( playlists ) {
					playlists = JSON.parse( playlists );
					delete playlists[ keyName ];
					localStorage.setItem( 'playlists', JSON.stringify( playlists ) );
				}

				localStorage.removeItem( `pl_${keyName}` );
				notie.alert({ type: 2, text: 'Playlist deleted!' });
				loadSavedPlaylists();
			},
			cancelCallback: () => {
				notie.alert({ text: 'Canceled' })
			},
		});
	}
}

/**
 * Update the playlist shown to the user
 */
function updatePlaylistUI() {

	var current = playlist.querySelector('.current');
	if ( current )
		current.classList.remove('current');

	if ( playlist.children[ playlistPos ] ) {
		playlist.children[ playlistPos ].classList.add('current');
		playlist.children[ playlistPos ].scrollIntoViewIfNeeded();
	}
}

/**
 * Shuffle the playlist
 */
function shufflePlaylist() {

	var temp, r;

	for ( var i = playlist.children.length - 1; i > 0; i-- ) {
		r = Math.floor( Math.random() * ( i + 1 ) );
		temp = playlist.replaceChild( playlist.children[ r ], playlist.children[ i ] );
		playlist.insertBefore( temp, playlist.children[ r ] );
	}

	playSong(0);
}

/**
 * Return the index of an element inside its parent
 */
function getIndex( node ) {
	if ( ! node )
		return;
	var i = 0;
	while ( node = node.previousElementSibling )
		i++;
	return i;
}

/**
 * Load a song into the currently active audio element
 */
function loadSong( n ) {
	if ( playlist.children[ n ] ) {
		playlistPos = n;
		audioElement[ currAudio ].src = playlist.children[ playlistPos ].dataset.file;
		audioElement[ currAudio ].dataset.file = playlist.children[ playlistPos ].dataset.file;
		addMetadata( playlist.children[ playlistPos ], audioElement[ currAudio ] );

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
	var n;
	audioElement[ nextAudio ].pause();
	if ( playlistPos < playlist.children.length - 1 )
		n = playlistPos + 1;
	else
		n = 0;
	audioElement[ nextAudio ].src = playlist.children[ n ].dataset.file;
	audioElement[ nextAudio ].dataset.file = playlist.children[ n ].dataset.file;
	addMetadata( playlist.children[ n ], audioElement[ nextAudio ] );
	skipping = false; // finished skipping track
}

/**
 * Play a song from the playlist
 */
function playSong( n ) {

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
	else
		audioElement[ currAudio ].play();
}

function stop() {
	if ( cfgSource == 'mic' )
		return;
	audioElement[ currAudio ].pause();
	setCanvasMsg();
	loadSong( 0 );
}

function playPreviousSong() {
	if ( cfgSource == 'mic' )
		return;
	if ( isPlaying() ) {
		if ( audioElement[ currAudio ].currentTime > 2 )
			audioElement[ currAudio ].currentTime = 0;
		else if ( playlistPos > 0 )
			playSong( playlistPos - 1 );
		else
			setCanvasMsg( 'Already at first song' );
	}
	else
		loadSong( playlistPos - 1 );
}

function playNextSong( play ) {

	if ( skipping || cfgSource == 'mic' || playlistPos > playlist.children.length - 1 )
		return;

	skipping = true;

	var gradIdx;

	if ( playlistPos < playlist.children.length - 1 )
		playlistPos++;
	else if ( elRepeat.dataset.active == '1' )
		playlistPos = 0;
	else {
		setCanvasMsg( 'Already at last song' );
		skipping = false;
		return;
	}

	play = play || isPlaying();

	currAudio = ! currAudio | 0;
	nextAudio = ! currAudio | 0;

	audioElement[ nextAudio ].style.display = 'none';
	audioElement[ currAudio ].style.display = 'block';

	if ( play ) {
		audioElement[ currAudio ].play()
		.then( () => {
			loadNextSong();
		})
		.catch( err => {
			consoleLog( err, true );
			loadNextSong();
		});
		if ( elCycleGrad.dataset.active == '1' ) {
			gradIdx = elGradient.selectedIndex;
			if ( gradIdx < elGradient.options.length - 1 )
				gradIdx++;
			else
				gradIdx = 0;
			elGradient.selectedIndex = gradIdx;
			audioMotion.setGradient( elGradient.value );
		}
	}
	else
		loadNextSong();

	updatePlaylistUI();
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
 * Draws outlined text on canvas
 */
function outlineText( text, x, y, maxWidth ) {
	var canvasCtx = audioMotion.canvasCtx;
	if ( elNoShadow.dataset.active == '1') {
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
 * Display message on canvas
 */
function displayCanvasMsg( canvas, canvasCtx, pixelRatio ) {

	// if it's less than 50ms from the end of the song, start the next one (for improved gapless playback)
	if ( audioElement[ currAudio ].duration - audioElement[ currAudio ].currentTime < .05 )
		playNextSong( true );

	if ( canvasMsg.timer < 1 )
		return;
	else if ( ! --canvasMsg.timer ) {
		setCanvasMsg(); // clear messages
		return;
	}

	var	fontSize    = canvas.height / 17, // base font size - all the following measures are relative to this
		leftPos     = fontSize,
		rightPos    = canvas.width - fontSize,
		centerPos   = canvas.width / 2,
		topLine     = fontSize * 1.4,
		bottomLine1 = canvas.height - fontSize * 4,
		bottomLine2 = canvas.height - fontSize * 2.8,
		bottomLine3 = canvas.height - fontSize * 1.6,
		maxWidth    = canvas.width - fontSize * 7,    // maximum width for artist and song name
		maxWidthTop = canvas.width / 3 - fontSize;    // maximum width for messages shown at the top of screen

	canvasCtx.lineWidth = 4 * pixelRatio;
	canvasCtx.lineJoin = 'round';

	if ( canvasMsg.timer > canvasMsg.fade ) {
		canvasCtx.fillStyle = '#fff';
		canvasCtx.strokeStyle = canvasCtx.shadowColor = '#000';
	}
	else {
		canvasCtx.fillStyle = 'rgba( 255, 255, 255, ' + ( canvasMsg.timer / canvasMsg.fade ) + ')';
		canvasCtx.strokeStyle = canvasCtx.shadowColor = 'rgba( 0, 0, 0, ' + ( canvasMsg.timer / canvasMsg.fade ) + ')';
	}

	canvasCtx.font = 'bold ' + ( fontSize * .7 ) + 'px sans-serif';
	canvasCtx.textAlign = 'center';

	if ( canvasMsg.msg != 'all' && canvasMsg.msg != 'song' ) {
		outlineText( canvasMsg.msg, centerPos, topLine );
	}
	else {
		if ( canvasMsg.msg == 'all' ) {
			outlineText( 'Gradient: ' + gradients[ elGradient.value ].name, centerPos, topLine, maxWidthTop );
			outlineText( 'Auto gradient is ' + ( elCycleGrad.dataset.active == '1' ? 'ON' : 'OFF' ), centerPos, topLine * 1.8 );

			canvasCtx.textAlign = 'left';
			outlineText( elMode[ elMode.selectedIndex ].text, leftPos, topLine, maxWidthTop );

			canvasCtx.textAlign = 'right';
			outlineText( 'Repeat is ' + ( elRepeat.dataset.active == '1' ? 'ON' : 'OFF' ), rightPos, topLine, maxWidthTop );
		}

		// codec and quality
		canvasCtx.textAlign = 'right';
		outlineText( audioElement[ currAudio ].dataset.codec, rightPos, bottomLine1 );
		outlineText( audioElement[ currAudio ].dataset.quality, rightPos, bottomLine1 + fontSize );

		// artist name
		canvasCtx.textAlign = 'left';
		outlineText( audioElement[ currAudio ].dataset.artist.toUpperCase(), leftPos, bottomLine1, maxWidth );

		// album title
		canvasCtx.font = 'bold italic ' + ( fontSize * .7 ) + 'px sans-serif';
		outlineText( audioElement[ currAudio ].dataset.album, leftPos, bottomLine3, maxWidth );

		// song title
		canvasCtx.font = 'bold ' + fontSize + 'px sans-serif';
		outlineText( audioElement[ currAudio ].dataset.title, leftPos, bottomLine2, maxWidth );

		// time
		if ( audioElement[ currAudio ].duration || audioElement[ currAudio ].dataset.duration ) {
			if ( ! audioElement[ currAudio ].dataset.duration ) {
				audioElement[ currAudio ].dataset.duration = Math.floor( audioElement[ currAudio ].duration / 60 ) + ':' + ( '0' + Math.round( audioElement[ currAudio ].duration % 60 ) ).slice(-2);
				if ( playlist.children[ playlistPos ] )
					playlist.children[ playlistPos ].dataset.duration = audioElement[ currAudio ].dataset.duration;
			}
			canvasCtx.textAlign = 'right';
			outlineText( Math.floor( audioElement[ currAudio ].currentTime / 60 ) + ':' + ( "0" + Math.floor( audioElement[ currAudio ].currentTime % 60 ) ).slice(-2) + ' / ' +
						 audioElement[ currAudio ].dataset.duration, rightPos, bottomLine3 );
		}
	}
}

/**
 * Set message for on-screen display
 */
function setCanvasMsg( msg, timer = 120, fade = 60 ) {
	if ( ! msg )
		canvasMsg = { timer: 0 };
	else
		canvasMsg = { msg: msg, timer: timer, fade: fade };
}


/**
 * Output messages to the UI "console"
 */
function consoleLog( msg, error ) {
	var elConsole = document.getElementById( 'console' );
	if ( error ) {
		msg = '<span class="error"><i class="icons8-warn"></i> ' + msg + '</span>';
		document.getElementById( 'show_console' ).className = 'warning';
	}
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
			sourceMic.connect( audioMotion.analyzer );
		}
		else { // if sourceMic is not set yet, ask user's permission to use the microphone
			navigator.mediaDevices.getUserMedia( { audio: true, video: false } )
			.then( function( stream ) {
				sourceMic = audioMotion.audioCtx.createMediaStreamSource( stream );
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
			sourceMic.disconnect( audioMotion.analyzer );
		consoleLog( 'Audio source set to built-in player' );
	}

}

/**
 * Load a music file from the user's computer
 */
function loadLocalFile( obj ) {

	var el = audioElement[ currAudio ];
	var reader = new FileReader();

	reader.readAsDataURL( obj.files[0] );

	reader.onload = function() {
		clearAudioElement();
		el.src = reader.result;
		el.play();
		mm.parseBlob( obj.files[0], { skipCovers: true } ).then( metadata => addMetadata( metadata, el ) );
	};
}

/**
 * Load a configuration preset
 */
function loadPreset( name, alert ) {

	if ( ! presets[ name ] ) // check invalid preset name
		return;

	var thisPreset = presets[ name ];

	if ( thisPreset.hasOwnProperty( 'mode' ) )
		elMode.value = thisPreset.mode;

	if ( thisPreset.hasOwnProperty( 'fftSize' ) )
		elFFTsize.value = thisPreset.fftSize;

	if ( thisPreset.hasOwnProperty( 'freqMin' ) )
		elRangeMin.value = thisPreset.freqMin;

	if ( thisPreset.hasOwnProperty( 'freqMax' ) )
		elRangeMax.value = thisPreset.freqMax;

	if ( thisPreset.hasOwnProperty( 'smoothing' ) )
		elSmoothing.value = thisPreset.smoothing;

	if ( thisPreset.hasOwnProperty( 'showScale' ) )
		elShowScale.dataset.active = Number( thisPreset.showScale );

	if ( thisPreset.hasOwnProperty( 'highSens' ) )
		elHighSens.dataset.active = Number( thisPreset.highSens );

	if ( thisPreset.hasOwnProperty( 'showPeaks' ) )
		elShowPeaks.dataset.active = Number( thisPreset.showPeaks );

	if ( thisPreset.hasOwnProperty( 'blackBg' ) )
		elBlackBg.dataset.active = Number( thisPreset.blackBg );

	if ( thisPreset.hasOwnProperty( 'cycleGrad' ) )
		elCycleGrad.dataset.active = Number( thisPreset.cycleGrad );

	if ( thisPreset.hasOwnProperty( 'ledDisplay' ) )
		elLedDisplay.dataset.active = Number( thisPreset.ledDisplay );

	if ( thisPreset.hasOwnProperty( 'repeat' ) )
		elRepeat.dataset.active = Number( thisPreset.repeat );

	if ( thisPreset.hasOwnProperty( 'showSong' ) )
		elShowSong.dataset.active = Number( thisPreset.showSong );

	if ( thisPreset.hasOwnProperty( 'noShadow' ) )
		elNoShadow.dataset.active = Number( thisPreset.noShadow );

	if ( thisPreset.hasOwnProperty( 'loRes' ) )
		elLoRes.dataset.active = Number( thisPreset.loRes );

	if ( thisPreset.hasOwnProperty( 'showFPS' ) )
		elFPS.dataset.active = Number( thisPreset.showFPS );

	if ( thisPreset.hasOwnProperty( 'gradient' ) && gradients[ thisPreset.gradient ] )
		elGradient.value = thisPreset.gradient;

	audioMotion.setOptions( {
		mode       : elMode.value,
		fftSize    : elFFTsize.value,
		minFreq    : elRangeMin.value,
		maxFreq    : elRangeMax.value,
		smoothing  : elSmoothing.value,
		showScale  : ( elShowScale.dataset.active == '1' ),
		highSens   : ( elHighSens.dataset.active == '1' ),
		showPeaks  : ( elShowPeaks.dataset.active == '1' ),
		showBgColor: ( elBlackBg.dataset.active == '0' ),
		showLeds   : ( elLedDisplay.dataset.active == '1' ),
		loRes      : ( elLoRes.dataset.active == '1' ),
		showFPS    : ( elFPS.dataset.active == '1' ),
		gradient   : elGradient.value
	} );

	if ( alert )
		notie.alert({ text: 'Preset loaded!' });
}

/**
 * Save / update a configuration
 */
function saveConfig( config ) {

	var settings = {
		fftSize		: elFFTsize.value,
		freqMin		: elRangeMin.value,
		freqMax		: elRangeMax.value,
		smoothing	: audioMotion.analyzer.smoothingTimeConstant,
		gradient	: elGradient.value,
		mode        : elMode.value,
		showScale 	: elShowScale.dataset.active == '1',
		highSens	: elHighSens.dataset.active == '1',
		showPeaks 	: elShowPeaks.dataset.active == '1',
		blackBg     : elBlackBg.dataset.active == '1',
		cycleGrad   : elCycleGrad.dataset.active == '1',
		ledDisplay  : elLedDisplay.dataset.active == '1',
		repeat      : elRepeat.dataset.active == '1',
		showSong    : elShowSong.dataset.active == '1',
		noShadow    : elNoShadow.dataset.active == '1',
		loRes       : elLoRes.dataset.active == '1',
		showFPS     : elFPS.dataset.active == '1'
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
	notie.alert({ text: 'Custom preset saved!' });
}

/**
 * Process keyboard shortcuts
 */
function keyboardControls( event ) {

	if ( event.target.tagName != 'BODY' )
		return;

	var gradIdx = elGradient.selectedIndex,
		modeIdx = elMode.selectedIndex;

	switch ( event.code ) {
		case 'Delete': 		// delete selected songs from the playlist
		case 'Backspace':	// for Mac
			playlist.querySelectorAll('.selected').forEach( e => {
				e.remove();
			});
			var current = getIndex( playlist.querySelector('.current') );
			if ( current !== undefined )
				playlistPos = current;	// update playlistPos if current song hasn't been deleted
			else if ( playlistPos > playlist.children.length - 1 )
				playlistPos = playlist.children.length - 1;
			else
				playlistPos--;
			loadNextSong();
			event.preventDefault();
			break;
		case 'Space': 		// play / pause
			setCanvasMsg( isPlaying() ? 'Pause' : 'Play' );
			playPause();
			break;
		case 'ArrowLeft': 	// previous song
		case 'KeyJ':
			playPreviousSong();
			break;
		case 'ArrowUp': 	// gradient
		case 'ArrowDown':
		case 'KeyG':
			if ( event.code == 'ArrowUp' || ( event.code == 'KeyG' && event.shiftKey ) ) {
				if ( gradIdx == 0 )
					elGradient.selectedIndex = elGradient.options.length - 1;
				else
					elGradient.selectedIndex = gradIdx - 1;
			}
			else {
				if ( gradIdx == elGradient.options.length - 1 )
					elGradient.selectedIndex = 0;
				else
					elGradient.selectedIndex = gradIdx + 1;
			}
			setGradient();
			setCanvasMsg( 'Gradient: ' + gradients[ elGradient.value ].name );
			break;
		case 'ArrowRight': 	// next song
		case 'KeyK':
			playNextSong();
			break;
		case 'KeyA': 		// toggle auto gradient change
			elCycleGrad.click();
			setCanvasMsg( 'Auto gradient ' + ( elCycleGrad.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyB': 		// toggle black background
			elBlackBg.click();
			setCanvasMsg( 'Background ' + ( elBlackBg.dataset.active == '1' ? 'OFF' : 'ON' ) );
			break;
		case 'KeyD': 		// display information
			if ( canvasMsg.msg ) {
				if ( canvasMsg.msg == 'all' )
					setCanvasMsg();
				else
					setCanvasMsg( 'all', 300 );
			}
			else
				setCanvasMsg( 'song', 300 );
			break;
		case 'KeyF': 		// toggle fullscreen
			fullscreen();
			break;
		case 'KeyH': 		// toggle fps display
			elFPS.click();
			break;
		case 'KeyI': 		// toggle info display on track change
			elShowSong.click();
			setCanvasMsg( 'Song info display ' + ( elShowSong.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyL': 		// toggle LED display effect
			elLedDisplay.click();
			setCanvasMsg( 'LED effect ' + ( elLedDisplay.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyM': 		// visualization mode
		case 'KeyV':
			if ( event.shiftKey ) {
				if ( modeIdx == 0 )
					elMode.selectedIndex = elMode.options.length - 1;
				else
					elMode.selectedIndex = modeIdx - 1;
			}
			else {
				if ( modeIdx == elMode.options.length - 1 )
					elMode.selectedIndex = 0;
				else
					elMode.selectedIndex = modeIdx + 1;
			}
			setMode();
			setCanvasMsg( 'Mode: ' + elMode[ elMode.selectedIndex ].text );
			break;
		case 'KeyN': 		// toggle sensitivity
			elHighSens.click();
			setCanvasMsg( ( elHighSens.dataset.active == '1' ? 'HIGH' : 'LOW' ) + ' sensitivity' );
			break;
		case 'KeyO': 		// toggle resolution
			elLoRes.click();
			setCanvasMsg( ( elLoRes.dataset.active == '1' ? 'LOW' : 'HIGH' ) + ' Resolution' );
			break;
		case 'KeyP': 		// toggle peaks display
			elShowPeaks.click();
			setCanvasMsg( 'Peaks ' + ( elShowPeaks.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyR': 		// toggle playlist repeat
			elRepeat.click();
			setCanvasMsg( 'Playlist repeat ' + ( elRepeat.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyS': 		// toggle scale
			elShowScale.click();
			setCanvasMsg( 'Scale ' + ( elShowScale.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyT': 		// toggle text shadow
			elNoShadow.click();
			setCanvasMsg( ( elNoShadow.dataset.active == '1' ? 'Flat' : 'Shadowed' ) + ' text mode' );
			break;
		case 'KeyU': 		// shuffle playlist
			if ( playlist.children.length > 0 ) {
				shufflePlaylist();
				setCanvasMsg( 'Shuffled playlist' );
			}
			break;
	}
}


/**
 * Event handler for 'play' on audio elements
 */
function audioOnPlay( event ) {
	if ( elShowSong.dataset.active == '1' )
		setCanvasMsg( 'song', 600, 180 );
	if ( ! audioElement[ currAudio ].attributes.src ) {
		if ( playlist.children.length == 0 ) {
			consoleLog( 'No song loaded', true );
			audioElement[ currAudio ].pause();
		}
		else
			playSong( playlistPos );
	}
}

/**
 * Event handler for 'ended' on audio elements
 */
function audioOnEnded() {
	if ( skipping )
		return;
	if ( playlistPos < playlist.children.length - 1 || elRepeat.dataset.active == '1' )
		playNextSong( true );
	else {
		loadSong( 0 );
		setCanvasMsg('Play queue ended');
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
 * Toggle low resolution mode
 */
function setLoRes() {
	audioMotion.toggleLoRes( elLoRes.dataset.active == '1' );
	consoleLog( `Lo-res mode ${audioMotion.loRes ? 'ON' : 'OFF'} - pixel ratio is ${audioMotion.pixelRatio}` );
	consoleLog( `Canvas size is ${audioMotion.canvas.width} x ${audioMotion.canvas.height} pixels` );
	consoleLog( `Fullscreen resolution: ${audioMotion.fsWidth} x ${audioMotion.fsHeight} pixels` );
	updateLastConfig();
}


/**
 * Initialization function
 */
(function() {

	consoleLog( 'audioMotion ver. ' + _VERSION );
	consoleLog( 'Initializing...' );

	// Initialize play queue and set event listeners
	playlist = document.getElementById('playlist');
	playlist.addEventListener( 'dblclick', e => {
		if ( e.target && e.target.dataset.file )
			playSong( getIndex( e.target ) );
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

	// Add event listeners for config panel selectors
	document.getElementById('panel_selector').addEventListener( 'click', event => {
		document.querySelectorAll('#panel_selector li').forEach( e => {
			e.className = '';
			document.getElementById( e.dataset.panel ).style.display = 'none';
		});
		let el = document.getElementById( event.target.dataset.panel || event.target.parentElement.dataset.panel );
		el.style.display = 'block';
		if ( event.target.nodeName == 'LI' )
			event.target.className = 'active';
		else
			event.target.parentElement.className = 'active';
	});
	document.getElementById('show_filelist').click();

	// Create audioMotion analyzer

	try {
		audioMotion.create(
			document.getElementById('analyzer'),
			{
				drawCallback: displayCanvasMsg
			}
		);
	}
	catch( err ) {
		consoleLog( `Fatal error: ${err}`, true );
		return false;
	}

	consoleLog( `Audio context sample rate is ${audioMotion.audioCtx.sampleRate}Hz` );

	// Create audio elements

	audioElement = [
		document.getElementById('player0'),
		document.getElementById('player1')
	];

	currAudio = 0;
	nextAudio = 1;

	audioElement[0].style.display = 'block';
	audioElement[1].style.display = 'none';

	sourcePlayer = [];

	for ( let i in [0,1] ) {
		clearAudioElement( i );
		audioElement[ i ].addEventListener( 'play', audioOnPlay );
		audioElement[ i ].addEventListener( 'ended', audioOnEnded );
		audioElement[ i ].addEventListener( 'error', audioOnError );

		sourcePlayer.push( audioMotion.audioCtx.createMediaElementSource( audioElement[ i ] ) );
		sourcePlayer[ i ].connect( audioMotion.analyzer );
	}

	// Set UI elements

	elFFTsize   = document.getElementById('fft_size');
	elRangeMin  = document.getElementById('freq_min');
	elRangeMax  = document.getElementById('freq_max');
	elSmoothing = document.getElementById('smoothing');
	elMode      = document.getElementById('mode');
	elGradient  = document.getElementById('gradient');
	elShowScale = document.getElementById('show_scale');
	elHighSens  = document.getElementById('sensitivity');
	elShowPeaks = document.getElementById('show_peaks');
	elBlackBg   = document.getElementById('black_bg');
	elCycleGrad = document.getElementById('cycle_grad');
	elLedDisplay= document.getElementById('led_display');
	elRepeat    = document.getElementById('repeat');
	elShowSong  = document.getElementById('show_song');
	elNoShadow  = document.getElementById('no_shadow');
	elLoRes     = document.getElementById('lo_res');
	elFPS       = document.getElementById('fps');
	elSource    = document.getElementById('source');
	elPlaylists = document.getElementById('playlists');

	// Add event listeners to the custom checkboxes
	var switches = document.querySelectorAll('.switch');
	for ( let i = 0; i < switches.length; i++ ) {
		switches[ i ].addEventListener( 'click', e => {
			if ( e.target.className.match( /switch/ ) ) // check for clicks on child nodes
				e.target.dataset.active = Number( ! Number( e.target.dataset.active ) );
			else
				e.target.parentElement.dataset.active = Number( ! Number( e.target.parentElement.dataset.active ) );
		});
	}

	elShowScale. addEventListener( 'click', setScale );
	elHighSens.  addEventListener( 'click', setSensitivity );
	elShowPeaks. addEventListener( 'click', setShowPeaks );
	elBlackBg.   addEventListener( 'click', setBlackBg );
	elCycleGrad. addEventListener( 'click', updateLastConfig );
	elLedDisplay.addEventListener( 'click', setLedDisplay );
	elRepeat.    addEventListener( 'click', updateLastConfig );
	elShowSong.  addEventListener( 'click', updateLastConfig );
	elNoShadow.  addEventListener( 'click', updateLastConfig );
	elLoRes.     addEventListener( 'click', setLoRes );
	elFPS.       addEventListener( 'click', setFPS );

	// Add event listeners to UI config elements

	elMode.      addEventListener( 'change', setMode );
	elFFTsize.   addEventListener( 'change', setFFTsize );
	elRangeMin.  addEventListener( 'change', setFreqRange );
	elRangeMax.  addEventListener( 'change', setFreqRange );
	elGradient.  addEventListener( 'change', setGradient );
	elSource.    addEventListener( 'change', setSource );
	elSmoothing. addEventListener( 'change', setSmoothing );

	document.getElementById('load_preset').addEventListener( 'click', () => loadPreset( document.getElementById('preset').value, true ) );
	document.getElementById('btn_save').addEventListener( 'click', updateCustomPreset );
	document.getElementById('btn_prev').addEventListener( 'click', playPreviousSong );
	document.getElementById('btn_play').addEventListener( 'click', playPause );
	document.getElementById('btn_stop').addEventListener( 'click', stop );
	document.getElementById('btn_next').addEventListener( 'click', () => playNextSong() );
	document.getElementById('btn_shuf').addEventListener( 'click', shufflePlaylist );
	document.getElementById('btn_fullscreen').addEventListener( 'click', fullscreen );
	document.getElementById('load_playlist').addEventListener( 'click', () => loadPlaylist( elPlaylists.value ) );
	document.getElementById('save_playlist').addEventListener( 'click', () => savePlaylist( elPlaylists.selectedIndex ) );
	document.getElementById('create_playlist').addEventListener( 'click', () => storePlaylist() );
	document.getElementById('delete_playlist').addEventListener( 'click', () =>	deletePlaylist( elPlaylists.selectedIndex ) );
	document.getElementById('btn_clear').addEventListener( 'click', clearPlaylist );

	// clicks on canvas also toggle scale on/off
	audioMotion.canvas.addEventListener( 'click', () =>	elShowScale.click() );

	setCanvasMsg();

	// Register custom gradients
	Object.keys( gradients ).forEach( key => {
		if ( gradients[ key ].bgColor && gradients[ key ].colorStops )
			audioMotion.registerGradient( key, { bgColor: gradients[ key ].bgColor, colorStops: gradients[ key ].colorStops } );

		// add the option to the html select element for the user interface
		if ( elGradient.options.length < Object.keys( gradients ).length )
			elGradient.options[ elGradient.options.length ] = new Option( gradients[ key ].name, key );
	});

	// Load / initialize configuration options
	var settings;

	settings = localStorage.getItem( 'last-config' );
	if ( settings !== null )
		presets['last'] = JSON.parse( settings );
	else // if no data found from last session, use the defaults
		presets['last'] = JSON.parse( JSON.stringify( presets['default'] ) );

	settings = localStorage.getItem( 'custom-preset' );
	if ( settings !== null )
		presets['custom'] = JSON.parse( settings );
	else
		presets['custom'] = JSON.parse( JSON.stringify( presets['last'] ) );

	loadPreset('last');

	consoleLog( `Device pixel ratio: ${window.devicePixelRatio}` );
	consoleLog( `Lo-res mode ${audioMotion.loRes ? 'ON' : 'OFF'} - pixel ratio is ${audioMotion.pixelRatio}` );
	consoleLog( `Canvas size is ${audioMotion.canvas.width} x ${audioMotion.canvas.height} pixels` );
	consoleLog( `Fullscreen resolution: ${audioMotion.fsWidth} x ${audioMotion.fsHeight} pixels` );
	consoleLog( `User agent: ${window.navigator.userAgent}` );

	// Set audio source to built-in player
	setSource();

	// Load saved playlists
	loadSavedPlaylists();

	// initialize file explorer
	fileExplorer.create(
		document.getElementById('file_explorer'),
		{
			dblClick: file => {
				addToPlaylist( file );
				if ( ! isPlaying() )
					playSong( playlist.children.length - 1 );
			},
			defaultPath: '/music'
		}
	).then( ([ status, filelist ]) => {
		if ( status == -1 ) {
			consoleLog( 'No server found. Running in local mode.', true );
			document.getElementById('local_file_panel').style.display = 'block';
			document.getElementById('local_file').addEventListener( 'change', e => loadLocalFile( e.target ) );
			document.querySelectorAll('#playlist_panel, #files_panel .button-column, #file_explorer p').forEach( e => e.style.display = 'none' );
			filelist.style.display = 'none';
		}
		else {
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
							addToPlaylist( fileExplorer.makePath( item.dataset.path ) );
							item.remove();
						});
					}
				}
			});
		}

		document.getElementById('btn_add_selected').addEventListener( 'mousedown', () => {
			fileExplorer.getFolderContents('.selected').forEach( entry => addToPlaylist( entry.file ) );
		});
		document.getElementById('btn_add_folder').addEventListener( 'click', () => {
			fileExplorer.getFolderContents().forEach( entry => addToPlaylist( entry.file ) );
		});
	});

	// Add event listener for keyboard controls
	window.addEventListener( 'keyup', keyboardControls );

	// Start / resume AudioContext on user gesture (autoplay policy)
	window.addEventListener( 'click', () => {
		if ( audioMotion.audioCtx.state == 'suspended' ) {
			audioMotion.audioCtx.resume()
			.then( () => {
				consoleLog( 'AudioContext started' );
			})
			.catch( err => {
				consoleLog( `Failed starting AudioContext: ${err}`, true );
			});
		}
	});

})();

/**
 * scrollIntoViewIfNeeded() polyfill
 * by Hubert Sablonnière - https://gist.github.com/hsablonniere/2581101
 */
if (!Element.prototype.scrollIntoViewIfNeeded) {
	Element.prototype.scrollIntoViewIfNeeded = function (centerIfNeeded) {
		centerIfNeeded = arguments.length === 0 ? true : !!centerIfNeeded;

		var parent = this.parentNode,
			parentComputedStyle = window.getComputedStyle(parent, null),
			parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue('border-top-width')),
			parentBorderLeftWidth = parseInt(parentComputedStyle.getPropertyValue('border-left-width')),
			overTop = this.offsetTop - parent.offsetTop < parent.scrollTop,
			overBottom = (this.offsetTop - parent.offsetTop + this.clientHeight - parentBorderTopWidth) > (parent.scrollTop + parent.clientHeight),
			overLeft = this.offsetLeft - parent.offsetLeft < parent.scrollLeft,
			overRight = (this.offsetLeft - parent.offsetLeft + this.clientWidth - parentBorderLeftWidth) > (parent.scrollLeft + parent.clientWidth),
			alignWithTop = overTop && !overBottom;

		if ((overTop || overBottom) && centerIfNeeded) {
			parent.scrollTop = this.offsetTop - parent.offsetTop - parent.clientHeight / 2 - parentBorderTopWidth + this.clientHeight / 2;
		}

		if ((overLeft || overRight) && centerIfNeeded) {
			parent.scrollLeft = this.offsetLeft - parent.offsetLeft - parent.clientWidth / 2 - parentBorderLeftWidth + this.clientWidth / 2;
		}

		if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
			this.scrollIntoView(alignWithTop);
		}
	};
}