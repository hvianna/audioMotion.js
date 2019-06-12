/**
 * audioMotion file explorer module
 */

var drives = [],
	currentPath = [],
	nodeServer = false,
	ui_path,
	ui_files,
	startUpTimer;


/**
 * Generates full path for a file or directory
 */
function makePath( fileName, isDir = false ) {

	var fullPath = '';

	currentPath.forEach( entry => {
		fullPath += entry.dir + '/';
	})

	if ( fileName )
		fullPath += fileName;

	if ( nodeServer ) {
		fullPath = fullPath.replace(/[\\\/]/g,'%2f'); // escape slashes for use with the custom server queries
		if ( isDir )
			fullPath = '/getDir/' + fullPath;
		else
			fullPath = '/getFile/' + fullPath;
	}

	return fullPath;
}


function updateUI( content, scrollTop ) {

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

	url = makePath( '', true );

	fetch( url )
		.then( function( response ) {
			if ( response.status == 200 ) {
				if ( nodeServer )
					return response.json();
				else
					return response.text();
			}
			else {
//				consoleLog( 'Cannot access directory: ' + url, true );
				if ( startUpTimer ) {
					clearTimeout( startUpTimer );
					ui_path.innerHTML = 'Cannot access /music directory. Check the documentation for help.';
				}
			}
		})
		.then( function( content ) {
			if ( ! nodeServer )
				content = parseWebDirectory( content );
			updateUI( content, scrollTop || ( prev && prev.scrollTop ) );
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

/*
	Public functions:
*/

export function getSelectedFiles() {

	var contents = [];

	ui_files.getElementsByClassName('selected').forEach( entry => {
		let type = entry.dataset.type;
		if ( type == 'file' || type == 'list' )
			contents.push( { file: makePath( entry.dataset.path ), type: type } );
	});
	return contents;
}

export function getFolderContents() {

	var contents = [];

	ui_files.childNodes.forEach( entry => {
		let type = entry.dataset.type;
		if ( type == 'file' || type == 'list' )
			contents.push( { file: makePath( entry.dataset.path ), type: type } );
	});
	return contents;
}

/**
 * Constructor function
 *
 * container: DOM element where the file explorer should be inserted
 * options: object {
 *		defaultPath: string - start path when running in standard web server mode (defaults to '/')
 * }
 */
export function create( container, options ) {

	ui_path = document.createElement('ul');
	ui_path.className = 'breadcrumb';
	container.appendChild( ui_path );

	ui_files = document.createElement('ul');
	ui_files.className = 'filelist';
	ui_files.id = 'file_explorer';
	container.appendChild( ui_files );

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
			if ( e.target.dataset.type == 'dir' || e.target.dataset.type == 'drive' )
				enterDir( e.target.dataset.path );
			else
				e.target.classList.toggle('selected');
		}
	});

	return new Promise( resolve => {
		fetch( '/getDrives' )
			.then( function( response ) {
				if ( response.status == 200 ) {
					return response.json();
				}
			})
			.then( function( content ) {
				clearTimeout( startUpTimer );
				if ( content ) {
					nodeServer = true;
					drives = content;
					enterDir( drives[0] );
					resolve(1);
				}
				else {
					// no response for our custom query, so it's probably running on a standard web server
					drives = [ options.defaultPath || '/' ];
					enterDir( drives[0] );
					resolve(0);
				}
			})
			.catch( function( err ) {
				clearTimeout( startUpTimer );
				ui_path.innerHTML = 'No server found. File navigation is unavailable.';
				ui_files.style.display = 'none';
				resolve(-1);
			});
	});

}
