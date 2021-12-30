/**
 * audioMotion.js file explorer module
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2021 Henrique Vianna <hvianna@gmail.com>
 */

const defaultRoot = '/music',
	  isElectron  = /electron/i.test( navigator.userAgent );

let mounts = [],
	currentPath = [], // array of { dir: <string>, scrollTop: <number> }
	nodeServer = false,
	ui_path,
	ui_files,
//	enterDirCallback,
	dblClickCallback;

/**
 * Updates the file explorer user interface
 *
 * @param {object} directory content returned by the node server or parseWebDirectory()
 * @param {number} scrollTop scroll position for the filelist container
 */
function updateUI( content, scrollTop ) {

	ui_path.innerHTML = '';
	ui_files.innerHTML = '';

	// breadcrumbs
	currentPath.forEach( ( { dir }, index ) => {
		if ( dir == '' )
			dir = 'root';
		ui_path.innerHTML += `<li data-depth="${ currentPath.length - index - 1 }">${dir}</li> / `;
	});

	// mounting points
	mounts.forEach( mount => {
		ui_files.innerHTML += `<li data-type="mount" data-path="${mount}">[ ${mount} ]</li>`;
	});

	// link to parent directory
	if ( currentPath.length > 1 )
		ui_files.innerHTML += '<li data-type="dir" data-path="..">[ parent folder ]</li>';

	// current directory contents
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
		ui_files.style.backgroundImage = 'linear-gradient( #fff9 0%, #fff9 100% )' + ( content.cover ? `, url('${makePath( content.cover )}')` : '' );
	}

	// restore scroll position when provided (returning from subdirectory)
	ui_files.scrollTop = scrollTop || 0;
}

/**
 * Enters a subdirectory
 *
 * @param {string} [target]    directory name (if undefined will open the current path)
 * @param {number} [scrollTop] scrollTop attribute for the filelist container
 * @returns {Promise<boolean>} A promise that resolves to true if the directory change was successful, or false otherwise
 */
function enterDir( target, scrollTop ) {

	var prev, url;

	if ( target !== undefined ) {
		if ( target == '..' )
			prev = currentPath.pop();
		else
			currentPath.push( { dir: target, scrollTop: ui_files.scrollTop } );
	}

	ui_files.innerHTML = '<li>Loading...</li>';

	url = makePath();

	return new Promise( resolve => {
		fetch( url )
			.then( response => {
				if ( response.status == 200 ) {
					if ( nodeServer )
						return response.json();
					else
						return response.text();
				}
				else
					resolve( false );
			})
			.then( content => {
				if ( ! nodeServer )
					content = parseWebDirectory( content );
				updateUI( content, scrollTop || ( prev && prev.scrollTop ) );
//				if ( enterDirCallback )
//					enterDirCallback( url, content );
				resolve( true );
			})
			.catch( err => {
				console.log( `Error accessing directory. ${err}` );
				resolve( false );
			});
	});
}

/**
 * Parses the list of files off a web server directory index
 *
 * @param {string}  content HTML body of a web server directory listing
 * @returns {array} an array of objects representing each link found in the listing, with its full uri and filename only
 */
export function parseWebIndex( content ) {

	const entries = content.match( /href="[^"]*"[^>]*>[^<]*<\/a>/gi ); // locate links

	let listing = [];

	for ( const entry of entries ) {
		const [ , uri, file ] = entry.match( /href="([^"]*)"[^>]*>\s*([^<]*)<\/a>/i );
		listing.push( { uri, file } );
	}

	return listing;
}

/**
 * Parses file and directory names from a standard web server directory listing
 *
 * @param {string}   content HTML body of a web server directory listing
 * @returns {object} folder/cover image, list of directories, list of files
 */
export function parseWebDirectory( content ) {

	const imageExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i;
	const audioExtensions = /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/i;

	let files = [],
		dirs  = [],
		imgs  = [];

	// helper function
	const findImg = ( arr, pattern ) => {
		const regexp = new RegExp( `${pattern}.*${imageExtensions.source}`, 'i' );
		return arr.find( el => el.match( regexp ) );
	}

	for ( const { uri, file } of parseWebIndex( content ) ) {
		if ( uri.substring( uri.length - 1 ) == '/' ) {
			if ( ! file.match( /parent directory/i ) ) {
				if ( file.substring( file.length - 1 ) == '/' )
					dirs.push( file.substring( 0, file.length - 1 ) );
				else
					dirs.push( file );
			}
		}
		else {
			if ( file.match( imageExtensions ) )
				imgs.push( file );
			else if ( file.match( audioExtensions ) )
				files.push( file );
		}
	}

	const cover = findImg( imgs, 'cover' ) || findImg( imgs, 'folder' ) || findImg( imgs, 'front' ) || imgs[0];
	const collator = new Intl.Collator(); // for case-insensitive sorting - https://stackoverflow.com/a/40390844/2370385

	return { cover, dirs: dirs.sort( collator.compare ), files: files.sort( collator.compare ) }
}

/**
 * Climbs up the current path (breadcrumbs navigation)
 *
 * @param {number} depth  how many levels to climb up
 */
function resetPath( depth ) {

	var prev;

	while ( depth > 0 ) {
		prev = currentPath.pop();
		depth--;
	}

	enterDir( undefined, prev && prev.scrollTop );
}

/* ******************* Public functions: ******************* */

/**
 * Generates full path for a file or directory
 *
 * @param {string} fileName
 * @returns {string} full path to filename
 */
export function makePath( fileName ) {

	var fullPath = '';

	currentPath.forEach( ( { dir } ) => {
		fullPath += dir + ( dir == '/' ? '' : '/' ); // avoid extra slash after the root directory
	});

	if ( fileName )
		fullPath += fileName;

	fullPath = fullPath.replace( /#/g, '%23' ); // replace any '#' character in the filename for its URL-safe code

	if ( isElectron )
		fullPath = ( fileName ? '/getFile/' : '/getDir/' ) + fullPath.replace( /\//g, '%2f' );

	return fullPath;
}

/**
 * Returns current folder's file list
 *
 * @param {string} [selector='li']  optional CSS selector
 * @returns {array} list of music files and playlists only
 */
export function getFolderContents( selector = 'li' ) {

	var contents = [];

	ui_files.querySelectorAll( selector ).forEach( entry => {
		if ( ['file', 'list'].includes( entry.dataset.type ) )
			contents.push( { file: makePath( entry.dataset.path ), type: entry.dataset.type } );
	});
	return contents;
}

/**
 * Constructor function
 *
 * @param {Element} container  DOM element where the file explorer should be inserted
 * @param {object} [options]   { dblClick: callback function, rootPath: starting path (defaults to '/music') }
 * @returns {Promise<array>}   A promise with the server status and the filelist's DOM element
 */
export function create( container, options = {} ) {

	var startUpTimer;

	ui_path = document.createElement('ul');
	ui_path.className = 'breadcrumb';
	container.append( ui_path );

	ui_files = document.createElement('ul');
	ui_files.className = 'filelist';
	container.append( ui_files );

	startUpTimer = setTimeout( () => {
		ui_path.innerHTML = 'Waiting for server...';
	}, 5000 );

	ui_path.innerHTML = 'Initializing... please wait...';

	ui_path.addEventListener( 'click', function( e ) {
		if ( e.target && e.target.nodeName == 'LI' ) {
			resetPath( e.target.dataset.depth );
		}
	});

	ui_files.addEventListener( 'click', function( e ) {
		if ( e.target && e.target.nodeName == 'LI' ) {
			if ( e.target.dataset.type == 'dir' )
				enterDir( e.target.dataset.path );
			else if ( e.target.dataset.type == 'mount' ) {
				currentPath = [];
				enterDir( e.target.dataset.path );
			}
		}
	});

	if ( typeof options.dblClick == 'function' )
		dblClickCallback = options.dblClick;

//	if ( typeof options.onEnterDir == 'function' )
//		enterDirCallback = options.onEnterDir;

	ui_files.addEventListener( 'dblclick', function( e ) {
		if ( e.target && e.target.nodeName == 'LI' ) {
			if ( dblClickCallback && ['file','list'].includes( e.target.dataset.type ) )
				dblClickCallback( makePath( e.target.dataset.path ), e );
		}
	});

	return new Promise( resolve => {
		fetch( '/serverInfo' )
			.then( response => {
				return response.text();
			})
			.then( async content => {
				clearTimeout( startUpTimer );
				let status;
				if ( content.startsWith('audioMotion') ) {
					nodeServer = true;
					status = 1;
				}
				else { // no response for our custom query, so it's probably running on a standard web server
					status = 0;
				}
				if ( status == 1 && isElectron ) {
					const response = await fetch( '/getMounts' );
					mounts = await response.json();
				}
				else
					mounts = [ options.rootPath || defaultRoot ];
				if ( await enterDir( mounts[0] ) === false ) {
					ui_path.innerHTML = `Cannot access media folder (${mounts[0]}) on server!`;
					ui_files.innerHTML = '';
					status = -1;
				}
				resolve([ status, ui_files, status ? content : 'Standard web server' ]);
			})
			.catch( err => {
				clearTimeout( startUpTimer );
				ui_path.innerHTML = 'No file server found.';
				resolve([ -1, ui_files ]);
			});
	});

}
