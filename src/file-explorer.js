/**
 * File explorer functions for audioMotion.js
 */

// Globals

var drives = [],
	currentPath = [],
	nodeServer = false,
	ui_path,
	ui_files,
	startUpTimer;


//const mm = require('music-metadata-browser');
//const path = require('path');

/**
 * Generates a full path with escaped slashes for use with server requests
 */
function makePath( fileName ) {

	var fullPath = '';

	currentPath.forEach( entry => {
		fullPath += entry.dir + '/';
	})

	if ( fileName )
		fullPath += fileName;

	if ( nodeServer )
		fullPath = fullPath.replace(/[\\\/]/g,'%2f');

	return fullPath;
}


function updateFileExplorerUI( content, scrollTop ) {

//	ui_cover.src = '';
	ui_path.innerHTML = '';
	ui_files.innerHTML = '';

	currentPath.forEach( ( entry, index ) => {
		if ( entry.dir == '' )
			entry.dir = 'root';
		ui_path.innerHTML += `<li data-depth="${ currentPath.length - index - 1 }">${entry.dir}</li> / `;
	});

	drives.forEach( drive => {
		ui_files.innerHTML += `<li data-type="drive" data-path="${drive}">[ ${drive} ]</li>`;
	});

	if ( currentPath.length > 1 )
		ui_files.innerHTML += '<li data-type="dir" data-path="..">[ parent folder ]</li>';

	if ( content ) {
		if ( content.dirs ) {
			content.dirs.forEach( dir => {
				ui_files.innerHTML += `<li data-type="dir" data-path="${dir}">${dir}</li>`;
			});
		}
		if ( content.files ) {
			content.files.forEach( file => {
				ui_files.innerHTML += `<li data-type="${ file.match(/\.(m3u|m3u8)$/) !== null ? 'list' : 'file' }" data-path="${file}">${file}</li>`;
			});
		}
/*
		if ( content.cover )
			if ( nodeServer )
				UI_cover.src = '/getFile/' + makePath( content.cover );
			else
				UI_cover.src = makePath( content.cover );
*/
	}

	if ( scrollTop )
		ui_files.scrollTop = scrollTop;
	else
		ui_files.scrollTop = 0;
}

function enterDir( target, scrollTop ) {

	var prev, url;

	if ( target !== undefined ) {
		if ( target[1] == ':' )
			currentPath = [ { dir: target, scrollTop: 0 } ];
		else
			if ( target == '..' )
				prev = currentPath.pop();
			else
				currentPath.push( { dir: target, scrollTop: ui_files.scrollTop } );
	}

	if ( nodeServer )
		url = '/getDir/' + makePath();
	else
		url = makePath();

	fetch( url )
		.then( function( response ) {
			if ( response.status == 200 ) {
				if ( nodeServer )
					return response.json();
				else
					return response.text();
			}
			else {
				consoleLog( 'Cannot access directory: ' + url, true );
				if ( startUpTimer ) {
					clearTimeout( startUpTimer );
					ui_path.innerHTML = 'Cannot access /music directory. Check the documentation for help.';
				}
			}
		})
		.then( function( content ) {
			if ( ! nodeServer )
				content = parseWebDirectory( content );
			updateFileExplorerUI( content, scrollTop || ( prev && prev.scrollTop ) );
		})
		.catch( function( err ) {
			console.log( 'Error on getDir ', err );
		});
}


/**
 * Parses file and directory names from a standard web server directory listing
 */
function parseWebDirectory( content ) {

	var files = [],
		dirs = [],
		cover;

	var entries = content.match( /href="[^"]*"[^>]*>[^<]*<\/a>/gi );
	for ( let e of entries ) {
		let info = e.match( /href="([^"]*)"[^>]*>\s*([^<]*)<\/a>/i );
		if ( info[1].substring( info[1].length - 1 ) == '/' ) {
			if ( ! info[2].match( /parent directory/i ) ) {
				if ( info[2].substring( info[2].length - 1 ) == '/' )
					dirs.push( info[2].substring( 0, info[2].length - 1 ) );
				else
					dirs.push( info[2] );
			}
		}
		else {
			if ( info[2].match( /(folder|cover)\.(jpg|jpeg|png|gif|bmp)$/i ) )
				cover = info[2]
			else if ( info[2].match( /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/ ) )
				files.push( info[2] );
		}
	}

	return { cover: cover, dirs: dirs, files: files }
}


function resetPath( depth ) {

	var prev;

	while ( depth > 0 ) {
		prev = currentPath.pop();
		depth--;
	}

	enterDir( undefined, prev && prev.scrollTop );
}


function getSongMetadata( target ) {

	var fullPath = makePath( target );

	mm.fetchFromUrl( fullPath )
		.then( function( content ) {
			let artist, title, album, codec, samplerate, bitdepth, cover = '';

			if ( content ) {
				artist = content.common.artist || '',
				title = content.common.title || target,
				album = content.common.album ? content.common.album + ( content.common.year ? ' (' + content.common.year + ')' : '' ) : '',
//				codec = content.format.codec || content.format.container || path.extname( target ).substring(1),
				codec = content.format.codec || content.format.container || target.substring( target.lastIndexOf('.') + 1 ),
				samplerate = content.format.sampleRate || '',
				bitdepth = content.format.bitsPerSample || '',
				cover = content.common.picture ? 'get' : '';
			}
			else {
				title = target;
				codec = target.substring( target.lastIndexOf('.') + 1 );
			}

			let el = document.createElement('li');
			el.innerHTML = title;
			el.dataset.artist = artist;
			el.dataset.title = title;
			el.dataset.album = album;
			el.dataset.codec = codec;
			el.dataset.samplerate = samplerate;
			el.dataset.bitdepth = bitdepth;
			el.dataset.cover = cover;
			el.dataset.path = fullPath;
			UI_playlist.appendChild( el );
		});
}


function initFileExplorer() {

	ui_path = document.getElementById('path');
	ui_files = document.getElementById('file_explorer');

	startUpTimer = setTimeout( () => {
		ui_path.innerHTML = 'Waiting for server...';
	}, 5000 );

	ui_path.innerHTML = 'Initializing... please wait...';

	ui_path.addEventListener( 'click', function( e ) {
		if ( e.target && e.target.localName == 'li' ) {
			resetPath( e.target.dataset.depth );
		}
	});

	ui_files.addEventListener( 'click', function( e ) {
		if ( e.target && e.target.localName == 'li' ) {
			if ( e.target.dataset.type == 'file' )
				addToPlaylist( { file: makePath( e.target.dataset.path ), common: {} } );
//				getMetadata( e.target.dataset.path );
			else
				enterDir( e.target.dataset.path );
		}
	});

	document.getElementById('add_folder').addEventListener( 'click', function() {
		for ( let i = 0; i < ui_files.children.length; i++ ) {
			if ( ui_files.children[ i ].dataset.type == 'file' )
				addToPlaylist( { file: makePath( ui_files.children[ i ].dataset.path ), common: {} } );
			else if ( ui_files.children[ i ].dataset.type == 'list' )
				loadPlaylist( makePath( ui_files.children[ i ].dataset.path ) );
		}
	});

//  	dragula( [ document.getElementById('UI_playlist') ] );

	fetch( '/getDrives' )
		.then( function( response ) {
//			console.log( response );
			if ( response.status == 200 ) {
				return response.json();
			}
			else {
//				ui_path.innerHTML = 'Fatal error! Server query failed with status ' + response.status;
			}
		})
		.then( function( content ) {
			clearTimeout( startUpTimer );
			if ( content ) {
				nodeServer = true;
				drives = content;
				enterDir( drives[0] );
			}
			else {
//				ui_path.innerHTML = 'Fatal error! No valid content received from server';
				consoleLog( 'Running in standard web server mode.' );
				drives = [ '/music' ];
				enterDir( drives[0] );
			}
		})
		.catch( function( err ) {
			clearTimeout( startUpTimer );
			consoleLog( 'No server found. Running in local mode only.', true );
			ui_path.innerHTML = 'No server found. File navigation is unavailable. Playlists may work only on Firefox.';
			ui_files.style.display = 'none';
			document.getElementById('local_file').style.display = 'block';
		});

}

window.addEventListener( 'load', initFileExplorer );
