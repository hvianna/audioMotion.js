/**
 * audioMotion.js
 * High-resolution real-time spectrum analyzer and music player
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * @author    Henrique Vianna <hvianna@gmail.com>
 * @copyright (c) 2018-2019 Henrique Avila Vianna
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

var _VERSION = '19.12-attract';

import AudioMotionAnalyzer from 'audiomotion-analyzer';
import * as fileExplorer from './file-explorer.js';
import * as mm from 'music-metadata-browser';
import './scrollIntoViewIfNeeded-polyfill.js';

import Sortable, { MultiDrag } from 'sortablejs';
Sortable.mount( new MultiDrag() );

import notie from 'notie';
import './notie.css';

import './styles.css';

// AudioMotionAnalyzer object
var audioMotion;

// playlist, index to the current song, indexes to current and next audio elements
var playlist, playlistPos, currAudio, nextAudio;

// HTML elements from the UI
var elMode, elFFTsize, elRangeMin, elRangeMax, elSmoothing, elGradient, elShowScale,
	elMinDb, elMaxDb, elShowPeaks, elPlaylists, elBlackBg, elCycleGrad, elLedDisplay,
	elRepeat, elShowSong, elSource, elNoShadow, elLoRes, elFPS, elLumiBars, elRandomMode;

// audio sources
var	audioElement, sourcePlayer, sourceMic, cfgSource;

// on-screen messages
var	canvasMsg;

// flag for skip track in progress
var skipping = false;

// for sensitivity presets (keyboard shortcut)
var sensitivity = 1;

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
			randomMode  : 0,
			ledDisplay  : 0,
			lumiBars    : 0,
			maxDb       : -25,
			minDb       : -85,
			showScale   : 1,
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
		cool:     { name: 'Cool', bgColor: '#0b202b', colorStops: [
					'hsl( 208, 0%, 100% )',
					'hsl( 208, 100%, 35% )'
				  ] },
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
function setSensitivity( value ) {
	if ( value !== undefined ) {
		switch ( value ) {
			case 0:
				elMinDb.value = -70;
				elMaxDb.value = -20;
				break;
			case 1:
				elMinDb.value = -85;
				elMaxDb.value = -25;
				break;
			case 2:
				elMinDb.value = -100;
				elMaxDb.value = -30;
		}
	}
	audioMotion.setSensitivity( elMinDb.value, elMaxDb.value );
	updateLastConfig();
}

/**
 * Set the smoothing time constant
 */
function setSmoothing() {
	audioMotion.smoothing = elSmoothing.value;
	document.getElementById('smoothingValue').innerText = elSmoothing.value;
	consoleLog( 'smoothingTimeConstant is ' + audioMotion.smoothing );
	updateLastConfig();
}

/**
 * Set the size of the FFT performed by the analyzer node
 */
function setFFTsize() {
	audioMotion.fftSize = elFFTsize.value;
	consoleLog( 'FFT size is ' + audioMotion.fftSize + ' samples' );
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
	audioMotion.gradient = elGradient.value;
	updateLastConfig();
}

/**
 * Set visualization mode
 */
function setMode() {
	audioMotion.mode = elMode.value;
	updateLastConfig();
}

/**
 * Set scale display preference
 */
function setScale() {
	audioMotion.showScale = ( elShowScale.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set LED display mode preference
 */
function setLedDisplay() {
	audioMotion.showLeds = ( elLedDisplay.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set lumi bars preference
 */
function setLumiBars() {
	audioMotion.lumiBars = ( elLumiBars.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set show peaks preference
 */
function setShowPeaks() {
	audioMotion.showPeaks = ( elShowPeaks.dataset.active == '1' );
	updateLastConfig();
}

/**
 * Set background color preference
 */
function setBlackBg() {
	audioMotion.showBgColor = ( elBlackBg.dataset.active == '0' );
	updateLastConfig();
}

/**
 * Set display of current frame rate
 */
function setFPS() {
	audioMotion.showFPS = ( elFPS.dataset.active == '1' );
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
	audioElement[ n ].load();
}

/**
 * Clear the playlist
 */
function clearPlaylist() {

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

	var playlists = localStorage.getItem('playlists');

	while ( elPlaylists.hasChildNodes() )
		elPlaylists.removeChild( elPlaylists.firstChild );

	var item = new Option( 'Select a playlist and click action to the right', '' );
	item.disabled = true;
	item.selected = true;
	elPlaylists.options[ elPlaylists.options.length ] = item;

	if ( playlists ) {
		playlists = JSON.parse( playlists );

		Object.keys( playlists ).forEach( key => {
			let item = new Option( playlists[ key ], key );
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
				var n = 0;
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
function addBatchToQueue( files, autoplay = false ) {
	const promises = files.map( entry => addToPlaylist( entry.file, autoplay ) );
	Promise.all( promises ).then( added => {
		const total = added.reduce( ( sum, val ) => sum + val, 0 );
		notie.alert({ text: `${total} song${ total > 1 ? 's' : '' } added to the queue`, time: 5 });
	});
}

/**
 * Add a song or playlist to the current playlist
 */
function addToPlaylist( file, autoplay = false ) {

	var ext = file.substring( file.lastIndexOf('.') + 1 ).toLowerCase(),
		ret;

	if ( ['m3u','m3u8'].includes( ext ) )
		ret = loadPlaylist( file );
	else
		ret = new Promise( resolve => {
			addSongToPlaylist( file );
			resolve(1);
		});

	// when promise resolved, if autoplay requested start playing the first added song
	ret.then( n => {
		if ( autoplay && ! isPlaying() )
			playSong( playlist.children.length - n );
	});

	return ret;
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
			target.dataset.quality = Math.floor( metadata.format.sampleRate / 1000 ) + 'KHz / ' + metadata.format.bitsPerSample + 'bits';
		else if ( metadata.format.bitrate )
			target.dataset.quality = Math.floor( metadata.format.bitrate / 1000 ) + 'K ' + metadata.format.codecProfile || '';
		else
			target.dataset.quality = '';

		if ( metadata.format && metadata.format.duration )
			target.dataset.duration = formatHHMMSS( metadata.format.duration );
		else
			target.dataset.duration = '';
	}
}

/**
 * Add a song to the playlist
 */
function addSongToPlaylist( uri, content = {} ) {

	var newEl = document.createElement('li');

	newEl.dataset.artist = content.artist || '';

	newEl.dataset.title = content.title ||
		uri.substring( Math.max( uri.lastIndexOf('/'), uri.lastIndexOf('\\') ) + 1 ).replace( /%23/g, '#' ) ||
		uri.substring( uri.lastIndexOf('//') + 2 );

	newEl.dataset.codec = uri.substring( uri.lastIndexOf('.') + 1 ).toUpperCase();

	uri = uri.replace( /#/g, '%23' ); // replace any '#' character in the filename for its URL-safe code (for content coming from playlist files)
	newEl.dataset.file = uri;

	playlist.appendChild( newEl );

	var len = playlist.children.length;
	if ( len == 1 && ! isPlaying() )
		loadSong(0);
	if ( playlistPos > len - 3 )
		loadNextSong();

	fetch( uri ).then( response => {
		return response.body;
	}).then( stream => {
		mm.parseReadableStream( stream, '', { skipCovers: true } ).then( metadata => {
			if ( metadata ) {
				addMetadata( metadata, newEl ); // add metadata to playlist item
				audioElement.forEach( el => {
					if ( el.dataset.file == newEl.dataset.file )
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

	if ( ! path )
		return;

	var ext = path.substring( path.lastIndexOf('.') + 1 ).toLowerCase(),
		n = 0,
		songInfo;

	return new Promise( resolve => {
		if ( ['m3u','m3u8'].includes( ext ) ) {
			fetch( path )
				.then( response => {
					if ( response.status == 200 )
						return response.text();
					else
						consoleLog( `Fetch returned error code ${response.status} for URI ${path}`, true );
				})
				.then( content => {
					path = path.substring( 0, Math.max( path.lastIndexOf('/'), path.lastIndexOf('\\') ) + 1 );
					content.split(/[\r\n]+/).forEach( line => {
						if ( line.charAt(0) != '#' && line.trim() != '' ) { // not a comment or blank line?
							n++;
							if ( ! songInfo ) { // if no previous #EXTINF tag, extract info from the filename
								songInfo = line.substring( Math.max( line.lastIndexOf('/'), line.lastIndexOf('\\') ) + 1 );
								songInfo = songInfo.substring( 0, songInfo.lastIndexOf('.') ).replace( /_/g, ' ' );
							}
							if ( line.substring( 0, 4 ) != 'http' && line[1] != ':' && line[0] != '/' )
								line = path + line;
							let t = songInfo.indexOf(' - ');
							if ( t == -1 )
								addSongToPlaylist( line, { title: songInfo } );
							else
								addSongToPlaylist( line, { artist: songInfo.substring( 0, t ), title: songInfo.substring( t + 3 ) } );
							songInfo = '';
						}
						else if ( line.substring( 0, 7 ) == '#EXTINF' )
							songInfo = line.substring( line.indexOf(',') + 1 || 8 ); // info will be saved for the next iteration
					});
					resolve( n );
				})
				.catch( e => {
					consoleLog( e, true );
					resolve( n );
				});
		}
		else { // try to load playlist from localStorage
			var list = localStorage.getItem( 'pl_' + path );
			if ( list ) {
				list = JSON.parse( list );
				list.forEach( item => {
					n++;
					songInfo = item.substring( Math.max( item.lastIndexOf('/'), item.lastIndexOf('\\') ) + 1 );
					songInfo = songInfo.substring( 0, songInfo.lastIndexOf('.') ).replace( /_/g, ' ' );
					addSongToPlaylist( item, { title: songInfo } )
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
				var keyName = elPlaylists[ index ].value;
				var playlists = localStorage.getItem('playlists');

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
	if ( playlistPos < playlist.children.length - 1 )
		n = playlistPos + 1;
	else
		n = 0;
	audioElement[ nextAudio ].src = playlist.children[ n ].dataset.file;
	audioElement[ nextAudio ].load();
	audioElement[ nextAudio ].dataset.file = playlist.children[ n ].dataset.file;
	addMetadata( playlist.children[ n ], audioElement[ nextAudio ] );
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
	if ( cfgSource == 'mic' )
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

function playPreviousSong() {
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
		return true;

	skipping = true;

	if ( playlistPos < playlist.children.length - 1 )
		playlistPos++;
	else if ( elRepeat.dataset.active == '1' )
		playlistPos = 0;
	else {
		setCanvasMsg( 'Already at last song' );
		skipping = false;
		return false;
	}

	play |= isPlaying();

	currAudio = nextAudio;
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
			playNextSong( true );
		});
	}
	else
		loadNextSong();

	updatePlaylistUI();
	return true;
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
 * Format time in seconds to hh:mm:ss
 */
function formatHHMMSS( time ) {
	var str = '',
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
 *      fade    : <number>, // fade out time (in frames)
 *		msg     : <string>, // custom message to be displayed at the top
 *      msgTimer: <number>  // countdown timer (in frames) to display custom message
 * 		                    // (fade for custom message is always 60 frames)
 * }
 */
function displayCanvasMsg() {

	var canvas = audioMotion.canvas,
		canvasCtx = audioMotion.canvasCtx,
		timeLeft = audioElement[ currAudio ].duration - audioElement[ currAudio ].currentTime,
		fontSize = canvas.height / 17, // base font size
		alpha = 1;

	if ( playlistPos == playlist.children.length - 1 && timeLeft <= 15 ) {
		if ( timeLeft > 12 ) // fade-in
			alpha = ( 15 - timeLeft ) / 3;
		else if ( timeLeft < 3 ) // fade-out
			alpha = timeLeft / 3;

		canvasCtx.fillStyle = `rgba( 255, 255, 255, ${alpha} )`;
		canvasCtx.strokeStyle = canvasCtx.shadowColor = `rgba( 0, 0, 0, ${alpha} )`;
		canvasCtx.font = 'bold ' + ( fontSize + fontSize * ( 15 - timeLeft ) / 7 ) + 'px Orbitron,sans-serif';
		canvasCtx.textAlign = 'center';
		outlineText( 'audioMotion.me', canvas.width >> 1, canvas.height >> 1 );
	}
	// if song is less than 100ms from the end, skip to the next track for improved gapless playback
	else if ( timeLeft < .1 )
		playNextSong( true );

	if ( ( canvasMsg.timer || canvasMsg.msgTimer ) < 1 )
		return;

	var	leftPos     = fontSize,
		rightPos    = canvas.width - fontSize,
		centerPos   = canvas.width / 2,
		topLine     = fontSize * 1.4,
		bottomLine1 = canvas.height - fontSize * 4,
		bottomLine2 = canvas.height - fontSize * 2.8,
		bottomLine3 = canvas.height - fontSize * 1.6,
		maxWidth    = canvas.width - fontSize * 7,    // maximum width for artist and song name
		maxWidthTop = canvas.width / 3 - fontSize;    // maximum width for messages shown at the top of screen

	canvasCtx.lineWidth = 4 * audioMotion.pixelRatio;
	canvasCtx.lineJoin = 'round';
	canvasCtx.font = 'bold ' + ( fontSize * .7 ) + 'px sans-serif';
	canvasCtx.textAlign = 'center';

	// Display custom message if any and info level 2 is not set
	if ( canvasMsg.msgTimer > 0 && canvasMsg.info != 2 ) {
		alpha = canvasMsg.msgTimer < 60 ? canvasMsg.msgTimer / 60 : 1;
		canvasCtx.fillStyle = `rgba( 255, 255, 255, ${alpha} )`;
		canvasCtx.strokeStyle = canvasCtx.shadowColor = `rgba( 0, 0, 0, ${alpha} )`;
		outlineText( canvasMsg.msg, centerPos, topLine );
		canvasMsg.msgTimer--;
	}

	// Display song and config info
	if ( canvasMsg.timer > 0 ) {
		var	leftPos     = fontSize,
			rightPos    = canvas.width - fontSize,
			bottomLine1 = canvas.height - fontSize * 4,
			bottomLine2 = canvas.height - fontSize * 2.8,
			bottomLine3 = canvas.height - fontSize * 1.6,
			maxWidth    = canvas.width - fontSize * 7,    // maximum width for artist and song name
			maxWidthTop = canvas.width / 3 - fontSize;    // maximum width for messages shown at the top

		alpha = canvasMsg.timer < canvasMsg.fade ? canvasMsg.timer / canvasMsg.fade : 1;
		canvasCtx.fillStyle = `rgba( 255, 255, 255, ${alpha} )`;
		canvasCtx.strokeStyle = canvasCtx.shadowColor = `rgba( 0, 0, 0, ${alpha} )`;

		// display additional information (level 2) at the top
		if ( canvasMsg.info == 2 ) {
			outlineText( 'Gradient: ' + gradients[ elGradient.value ].name, centerPos, topLine, maxWidthTop );
			outlineText( 'Auto gradient is ' + ( elCycleGrad.dataset.active == '1' ? 'ON' : 'OFF' ), centerPos, topLine * 1.8 );

			canvasCtx.textAlign = 'left';
			outlineText( elMode[ elMode.selectedIndex ].text, leftPos, topLine, maxWidthTop );
			outlineText( 'Random mode is ' + ( elRandomMode.dataset.active == '1' ? 'ON' : 'OFF' ), leftPos, topLine * 1.8 );

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
				audioElement[ currAudio ].dataset.duration =
					audioElement[ currAudio ].duration === Infinity ? 'LIVE' : formatHHMMSS( audioElement[ currAudio ].duration );

				if ( playlist.children[ playlistPos ] )
					playlist.children[ playlistPos ].dataset.duration = audioElement[ currAudio ].dataset.duration;
			}
			canvasCtx.textAlign = 'right';

			outlineText( formatHHMMSS( audioElement[ currAudio ].currentTime ) + ' / ' + audioElement[ currAudio ].dataset.duration, rightPos, bottomLine3 );
		}

		if ( --canvasMsg.timer < 1 )
			canvasMsg.info = 0;
	}
}

/**
 * Set message for on-screen display
 */
function setCanvasMsg( msg, timer = 2, fade = 1 ) {
	if ( ! msg )
		canvasMsg = { timer: 0, msgTimer: 0 }; // clear all canvas messages
	else {
		if ( typeof msg == 'number' ) {
			canvasMsg.info = msg; // set info level 1 or 2
			canvasMsg.timer = timer * 60;
			canvasMsg.fade = fade * 60;
		}
/*
		else {
			canvasMsg.msg = msg;  // set custom message
			if ( canvasMsg.info == 2 )
				canvasMsg.info = 1;
			canvasMsg.msgTimer = timer * 60;
		}
*/
	}
}

/**
 * Display information about canvas size changes
 */
function showCanvasInfo( reason ) {
	if ( ['lores','user'].includes( reason ) )
		consoleLog( `Lo-res mode ${ audioMotion.loRes ? 'ON' : 'OFF' } - pixelRatio is ${ audioMotion.pixelRatio }` );

	if ( reason == 'user' )
		consoleLog( `Canvas size set to ${ audioMotion.canvas.width } x ${ audioMotion.canvas.height } pixels` );
	else if ( ['lores','resize'].includes( reason ) )
		consoleLog( `Canvas resized to ${ audioMotion.canvas.width } x ${ audioMotion.canvas.height } pixels ${ audioMotion.isFullscreen ? '(fullscreen)' : '' }` )
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
			.then( stream => {
				sourceMic = audioMotion.audioCtx.createMediaStreamSource( stream );
				consoleLog( 'Audio source set to microphone' );
				setSource(); // recursive call, sourceMic is now set
			})
			.catch( err => {
				consoleLog( `Could not change audio source - ${err}`, true );
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

	reader.onload = () => {
		clearAudioElement();
		el.src = reader.result;
		el.play();
		mm.parseBlob( obj.files[0], { skipCovers: true } ).then( metadata => addMetadata( metadata, el ) ).catch( e => {} );
	};
}

/**
 * Load a configuration preset
 */
function loadPreset( name, alert ) {

	if ( ! presets[ name ] ) // check invalid preset name
		return;

	var thisPreset = presets[ name ];

	if ( thisPreset.hasOwnProperty( 'mode' ) ) {
		if ( thisPreset.mode == 24 )      // for compatibility with legacy saved presets (version =< 19.7)
			elMode.value = 8;
		else if ( thisPreset.mode == 12 ) // ditto
			elMode.value = 7;
		else
			elMode.value = thisPreset.mode;
	}

	if ( thisPreset.hasOwnProperty( 'fftSize' ) )
		elFFTsize.value = thisPreset.fftSize;

	if ( thisPreset.hasOwnProperty( 'freqMin' ) )
		elRangeMin.value = thisPreset.freqMin;

	if ( thisPreset.hasOwnProperty( 'freqMax' ) )
		elRangeMax.value = thisPreset.freqMax;

	if ( thisPreset.hasOwnProperty( 'smoothing' ) )
		document.getElementById('smoothingValue').innerText = elSmoothing.value = thisPreset.smoothing;

	if ( thisPreset.hasOwnProperty( 'showScale' ) )
		elShowScale.dataset.active = Number( thisPreset.showScale );

	if ( thisPreset.hasOwnProperty( 'highSens' ) ) { // legacy option (version =< 19.5)
		sensitivity = thisPreset.highSens ? 2 : 1;
		setSensitivity( sensitivity );
	}

	if ( thisPreset.hasOwnProperty( 'minDb' ) )
		elMinDb.value = thisPreset.minDb;

	if ( thisPreset.hasOwnProperty( 'maxDb' ) )
		elMaxDb.value = thisPreset.maxDb;

	if ( thisPreset.hasOwnProperty( 'showPeaks' ) )
		elShowPeaks.dataset.active = Number( thisPreset.showPeaks );

	if ( thisPreset.hasOwnProperty( 'blackBg' ) )
		elBlackBg.dataset.active = Number( thisPreset.blackBg );

	if ( thisPreset.hasOwnProperty( 'cycleGrad' ) )
		elCycleGrad.dataset.active = Number( thisPreset.cycleGrad );

	if ( thisPreset.hasOwnProperty( 'randomMode' ) )
		elRandomMode.dataset.active = Number( thisPreset.randomMode );

	if ( thisPreset.hasOwnProperty( 'ledDisplay' ) )
		elLedDisplay.dataset.active = Number( thisPreset.ledDisplay );

	if ( thisPreset.hasOwnProperty( 'lumiBars' ) )
		elLumiBars.dataset.active = Number( thisPreset.lumiBars );

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
		minDecibels: elMinDb.value,
		maxDecibels: elMaxDb.value,
		showScale  : ( elShowScale.dataset.active == '1' ),
		showPeaks  : ( elShowPeaks.dataset.active == '1' ),
		showBgColor: ( elBlackBg.dataset.active == '0' ),
		showLeds   : ( elLedDisplay.dataset.active == '1' ),
		lumiBars   : ( elLumiBars.dataset.active == '1' ),
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
		smoothing	: audioMotion.smoothing,
		gradient	: elGradient.value,
		mode        : elMode.value,
		minDb       : elMinDb.value,
		maxDb       : elMaxDb.value,
		showScale 	: elShowScale.dataset.active == '1',
		showPeaks 	: elShowPeaks.dataset.active == '1',
		blackBg     : elBlackBg.dataset.active == '1',
		cycleGrad   : elCycleGrad.dataset.active == '1',
		randomMode  : elRandomMode.dataset.active == '1',
		ledDisplay  : elLedDisplay.dataset.active == '1',
		lumiBars    : elLumiBars.dataset.active == '1',
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
			setCanvasMsg( 'Previous track', 1 );
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
			setCanvasMsg( 'Next track', 1 );
			playNextSong();
			break;
		case 'KeyA': 		// toggle auto gradient / random mode
			if ( elCycleGrad.dataset.active == '1' ) {
				if ( elRandomMode.dataset.active == '1' ) {
					elCycleGrad.dataset.active = '0';
					elRandomMode.dataset.active = '0';
					setCanvasMsg( 'Auto gradient OFF / Random mode OFF' );
				}
				else {
					elRandomMode.dataset.active = '1';
					setCanvasMsg( 'Random mode ON' );
				}
			}
			else {
				elCycleGrad.dataset.active = '1';
				setCanvasMsg( 'Auto gradient ON' );
			}
			updateLastConfig();
			break;
		case 'KeyB': 		// toggle black background
			elBlackBg.click();
			setCanvasMsg( 'Background ' + ( elBlackBg.dataset.active == '1' ? 'OFF' : 'ON' ) );
			break;
		case 'KeyD': 		// display information
			if ( canvasMsg.info == 2 )
				setCanvasMsg();
			else
				setCanvasMsg( ( canvasMsg.info | 0 ) + 1, 5 );
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
		case 'KeyN': 		// increase or reduce sensitivity
			if ( event.shiftKey ) {
				if ( sensitivity > 0 )
					sensitivity--;
				else
					sensitivity = 2;
			}
			else {
				if ( sensitivity < 2 )
					sensitivity++;
				else
					sensitivity = 0;
			}
			setSensitivity( sensitivity );
			setCanvasMsg( `${ ['LOW','NORMAL','HIGH'][ sensitivity ] } sensitivity` );
			break;
		case 'KeyO': 		// toggle resolution
			elLoRes.click();
			setCanvasMsg( ( elLoRes.dataset.active == '1' ? 'LOW' : 'HIGH' ) + ' Resolution' );
			break;
		case 'KeyP': 		// toggle peaks display
			elShowPeaks.click();
			setCanvasMsg( 'Peaks ' + ( elShowPeaks.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyQ': 		// shuffle queue
			if ( playlist.children.length > 0 ) {
				shufflePlaylist();
				setCanvasMsg( 'Shuffle' );
			}
			break;
		case 'KeyR': 		// toggle playlist repeat
			elRepeat.click();
			setCanvasMsg( 'Queue repeat ' + ( elRepeat.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyS': 		// toggle scale
			elShowScale.click();
			setCanvasMsg( 'Scale ' + ( elShowScale.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
		case 'KeyT': 		// toggle text shadow
			elNoShadow.click();
			setCanvasMsg( ( elNoShadow.dataset.active == '1' ? 'Flat' : 'Shadowed' ) + ' text mode' );
			break;
		case 'KeyU': 		// toggle lumi bars
			elLumiBars.click();
			setCanvasMsg( 'Luminance bars ' + ( elLumiBars.dataset.active == '1' ? 'ON' : 'OFF' ) );
			break;
	}
}


/**
 * Event handler for 'play' on audio elements
 */
function audioOnPlay() {
	if ( ! audioElement[ currAudio ].attributes.src ) {
		playSong( playlistPos );
		return;
	}

	if ( audioElement[ currAudio ].currentTime == 0 ) {
		// select random mode
		if ( elRandomMode.dataset.active == '1' ) {
			elMode.selectedIndex        = Math.random() * elMode.options.length | 0;
			elLedDisplay.dataset.active = Math.random() * 2 | 0;
			elLumiBars.dataset.active   = Math.random() * 2 | 0;
			audioMotion.mode     = elMode.value;
			audioMotion.showLeds = elLedDisplay.dataset.active == '1';
			audioMotion.lumiBars = elLumiBars.dataset.active == '1';
		}
		// cycle (or random) gradient
		if ( elCycleGrad.dataset.active == '1' ) {
			let gradIdx = elRandomMode.dataset.active == '1' ? Math.random() * elGradient.options.length | 0 : elGradient.selectedIndex;
			if ( gradIdx < elGradient.options.length - 1 )
				gradIdx++;
			else
				gradIdx = 0;
			elGradient.selectedIndex = gradIdx;
			audioMotion.gradient = elGradient.value;
		}
	}

	if ( elShowSong.dataset.active == '1' )
		setCanvasMsg( 1, 10, 3 ); // display song info (level 1) for 10 seconds, with 3-second fade out
}

/**
 * Event handler for 'ended' on audio elements
 */
function audioOnEnded() {
	if ( ! playNextSong( true ) ) {
		loadSong( 0 );
		setCanvasMsg( 'Queue ended', 600 );
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
	audioMotion.loRes = ( elLoRes.dataset.active == '1' );
	updateLastConfig();
}


/**
 * Initialization function
 */
(function() {

	consoleLog( `audioMotion.js ver. ${_VERSION} initializing...` );
	consoleLog( `User agent: ${window.navigator.userAgent}` );

	// Initialize play queue and set event listeners
	playlist = document.getElementById('playlist');
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
		audioMotion = new AudioMotionAnalyzer(
			document.getElementById('analyzer'),
			{
				onCanvasDraw: displayCanvasMsg,
				onCanvasResize: showCanvasInfo
			}
		);
	}
	catch( err ) {
		consoleLog( `Fatal error: ${err}`, true );
		return false;
	}

	consoleLog( `AudioContext sample rate is ${audioMotion.audioCtx.sampleRate}Hz` );

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

	for ( let i of [0,1] ) {
		clearAudioElement( i );
		audioElement[ i ].addEventListener( 'play', audioOnPlay );
		audioElement[ i ].addEventListener( 'ended', audioOnEnded );
		audioElement[ i ].addEventListener( 'error', audioOnError );

		sourcePlayer.push( audioMotion.audioCtx.createMediaElementSource( audioElement[ i ] ) );
		sourcePlayer[ i ].connect( audioMotion.analyzer );
	}

	// Set UI elements

	elFFTsize     = document.getElementById('fft_size');
	elRangeMin    = document.getElementById('freq_min');
	elRangeMax    = document.getElementById('freq_max');
	elSmoothing   = document.getElementById('smoothing');
	elMode        = document.getElementById('mode');
	elGradient    = document.getElementById('gradient');
	elShowScale   = document.getElementById('show_scale');
	elMinDb       = document.getElementById('min_db');
	elMaxDb       = document.getElementById('max_db');
	elShowPeaks   = document.getElementById('show_peaks');
	elBlackBg     = document.getElementById('black_bg');
	elCycleGrad   = document.getElementById('cycle_grad');
	elRandomMode  = document.getElementById('random_mode');
	elLedDisplay  = document.getElementById('led_display');
	elLumiBars    = document.getElementById('lumi_bars');
	elRepeat      = document.getElementById('repeat');
	elShowSong    = document.getElementById('show_song');
	elNoShadow    = document.getElementById('no_shadow');
	elLoRes       = document.getElementById('lo_res');
	elFPS         = document.getElementById('fps');
	elSource      = document.getElementById('source');
	elPlaylists   = document.getElementById('playlists');

	// Populate combo boxes

	elMode[0] = new Option( 'Discrete frequencies', 0 );
	elMode[1] = new Option( 'Area fill', 10 );

	['Full','Half','1/3rd','1/4th','1/6th','1/8th','1/12th','1/24th'].forEach( ( text, i ) => {
		elMode[ elMode.options.length ] = new Option( `${text} octave bands`, 8 - i );
	});

	for ( let i = 9; i < 16; i++ )
		elFFTsize[ elFFTsize.options.length ] = new Option( 2**i );

	for ( let i of [20,30,40,50,60,100,250,500,1000,2000] )
		elRangeMin[ elRangeMin.options.length ] = new Option( i >= 1000 ? ( i / 1000 ) + 'k' : i, i );

	for ( let i of [1000,2000,4000,8000,12000,16000,22000] )
		elRangeMax[ elRangeMax.options.length ] = new Option( ( i / 1000 ) + 'k', i );

	for ( let i = -60; i >= -110; i -= 5 )
		elMinDb[ elMinDb.options.length ] = new Option( i );

	for ( let i = 0; i >= -40; i -= 5 )
		elMaxDb[ elMaxDb.options.length ] = new Option( i );


	// Add event listeners to the custom checkboxes
	document.querySelectorAll('.switch').forEach( el => {
		el.addEventListener( 'click', e => {
			if ( e.target.classList.contains('switch') ) // check for clicks on child nodes
				e.target.dataset.active = Number( ! Number( e.target.dataset.active ) );
			else
				e.target.parentElement.dataset.active = Number( ! Number( e.target.parentElement.dataset.active ) );
		});
	});

	elShowScale.  addEventListener( 'click', setScale );
	elShowPeaks.  addEventListener( 'click', setShowPeaks );
	elBlackBg.    addEventListener( 'click', setBlackBg );
	elCycleGrad.  addEventListener( 'click', updateLastConfig );
	elRandomMode. addEventListener( 'click', updateLastConfig );
	elLedDisplay. addEventListener( 'click', setLedDisplay );
	elLumiBars.   addEventListener( 'click', setLumiBars );
	elRepeat.     addEventListener( 'click', updateLastConfig );
	elShowSong.   addEventListener( 'click', updateLastConfig );
	elNoShadow.   addEventListener( 'click', updateLastConfig );
	elLoRes.      addEventListener( 'click', setLoRes );
	elFPS.        addEventListener( 'click', setFPS );

	// Add event listeners to UI config elements

	elMode.       addEventListener( 'change', setMode );
	elFFTsize.    addEventListener( 'change', setFFTsize );
	elRangeMin.   addEventListener( 'change', setFreqRange );
	elRangeMax.   addEventListener( 'change', setFreqRange );
	elGradient.   addEventListener( 'change', setGradient );
	elSource.     addEventListener( 'change', setSource );
	elSmoothing.  addEventListener( 'change', setSmoothing );
	elMinDb.      addEventListener( 'change', () => setSensitivity() );
	elMaxDb.      addEventListener( 'change', () => setSensitivity() );

	document.getElementById('load_preset').addEventListener( 'click', () => loadPreset( document.getElementById('preset').value, true ) );
	document.getElementById('btn_save').addEventListener( 'click', updateCustomPreset );
	document.getElementById('btn_prev').addEventListener( 'click', playPreviousSong );
	document.getElementById('btn_play').addEventListener( 'click', () => playPause() );
	document.getElementById('btn_stop').addEventListener( 'click', stop );
	document.getElementById('btn_next').addEventListener( 'click', () => playNextSong() );
	document.getElementById('btn_shuf').addEventListener( 'click', shufflePlaylist );
	document.getElementById('btn_fullscreen').addEventListener( 'click', fullscreen );
	document.getElementById('load_playlist').addEventListener( 'click', () => {
		loadPlaylist( elPlaylists.value ).then( n => notie.alert({ text: `${n} song${ n > 1 ? 's' : '' } added to the queue`, time: 5 }) );
	});
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

	consoleLog( `Display resolution: ${audioMotion.fsWidth} x ${audioMotion.fsHeight} pixels` );
	consoleLog( `Display pixel ratio: ${window.devicePixelRatio}` );

	loadPreset('last');

	// Set audio source to built-in player
	setSource();

	// Load saved playlists
	loadSavedPlaylists();

	// initialize file explorer
	fileExplorer.create(
		document.getElementById('file_explorer'),
		{
			dblClick: ( file, event ) => {
				addBatchToQueue( [ { file } ], true );
				event.target.classList.remove( 'selected', 'sortable-chosen' );
			}
		}
	).then( ([ status, filelist, serversignature ]) => {
		if ( status == -1 ) {
			consoleLog( 'No server found. File explorer will not be available.', true );
			document.getElementById('local_file_panel').style.display = 'block';
			document.getElementById('local_file').addEventListener( 'change', e => loadLocalFile( e.target ) );
			document.getElementById('load_remote_url').addEventListener( 'click', () => {
				let el = document.getElementById('remote_url');
				if ( el.value )
					addToPlaylist( el.value, true );
				el.value = '';
			});

			document.querySelectorAll('#files_panel .button-column, .file_explorer p').forEach( e => e.style.display = 'none' );
			filelist.style.display = 'none';
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
							addToPlaylist( fileExplorer.makePath( item.dataset.path ) );
							item.remove();
						});
					}
				}
			});
		}

		document.getElementById('btn_add_selected').addEventListener( 'mousedown', () => addBatchToQueue( fileExplorer.getFolderContents('.selected') ) );
		document.getElementById('btn_add_folder').addEventListener( 'click', () => addBatchToQueue(	fileExplorer.getFolderContents() ) );
	});

	// Add event listener for keyboard controls
	window.addEventListener( 'keyup', keyboardControls );

	// Unlock AudioContext on user gesture (autoplay policy)
	window.addEventListener( 'click', () => {
		if ( audioMotion.audioCtx.state == 'suspended' ) {
			audioMotion.audioCtx.resume()
				.then( () => consoleLog( 'AudioContext started' ) )
				.catch( err => consoleLog( `Failed starting AudioContext: ${err}`, true ) );

			audioElement[ nextAudio ].load(); // unlock next audio element - required on iOS Safari
		}
	});

	// notie options
	notie.setOptions({
		positions: { alert: 'bottom' }
	});

	consoleLog( 'Initialization complete!' );
})();
