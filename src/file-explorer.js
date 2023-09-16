/**
 * audioMotion
 * File explorer module
 *
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2023 Henrique Vianna <hvianna@gmail.com>
 */

const defaultRoot   = '/music',
	  isElectron    = 'electron' in window,
	  isWindows     = isElectron && /Windows/.test( navigator.userAgent ),
	  openFolderMsg = 'Click to open a folder';

const MODE_NODE  = 1,  // Electron app or custom node.js file server
	  MODE_WEB   = 0,  // standard web server with /music URL mapping
	  MODE_LOCAL = -1; // local via File System API

let mounts = [],
	currentPath = [], // array of { dir: <string>, scrollTop: <number> }
	currentDirHandle, // for File System API
	nodeServer = false,
	ui_path,
	ui_files,
	enterDirCallback,
	dblClickCallback,
	serverMode;

/**
 * Updates the file explorer user interface
 *
 * @param {object} directory content returned by the node server or parseWebDirectory()
 * @param {number} scrollTop scroll position for the filelist container
 */
function updateUI( content, scrollTop ) {

	ui_path.innerHTML = '';
	ui_files.innerHTML = '';

	const addListItem =( item, type ) => {
		const li = document.createElement('li'),
			  fileName = item.name || item;

		li.dataset.type = fileName.match(/\.(m3u|m3u8)$/) !== null && type == 'file' ? 'list' : type;
		li.dataset.path = fileName;
		li.innerText = fileName;
		li.handle = item.handle; // for File System API accesses

		ui_files.append( li );
	}

	// breadcrumbs
	currentPath.forEach( ( { dir }, index ) => {
		ui_path.innerHTML += `<li data-depth="${ currentPath.length - index - 1 }">${dir}</li> ${ isWindows ? '\\' : dir == '/' ? '' : '/' } `;
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
		if ( content.dirs )
			content.dirs.forEach( dir => addListItem( dir, 'dir' ) );

		if ( content.files )
			content.files.forEach( file => addListItem( file, 'file' ) );

		ui_files.style.backgroundImage = 'linear-gradient( #fff9 0%, #fff9 100% )' + ( content.cover ? `, url('${makePath( content.cover )}')` : '' );
	}

	// restore scroll position when provided (returning from subdirectory)
	ui_files.scrollTop = scrollTop || 0;
}

/**
 * Enters a subdirectory
 *
 * @param {string} [target]    directory name (if empty will open the current path)
 * @param {number} [scrollTop] scrollTop attribute for the filelist container
 * @returns {Promise<boolean>} A promise that resolves to true if the directory change was successful, or false otherwise
 */
function enterDir( target, scrollTop ) {

	let prev,
		url,
		handle = target instanceof FileSystemDirectoryHandle ? target : null;

	if ( handle )
		target = handle.name;

	if ( target ) {
		if ( target == '..' ) {
			prev = currentPath.pop();
			if ( prev.handle )
				handle = prev.handle;
		}
		else
			currentPath.push( { dir: target, scrollTop: ui_files.scrollTop, handle } );
	}

	ui_files.innerHTML = '<li>Loading...</li>';

	url = makePath();

	return new Promise( async resolve => {

		const parseContent = content => {
			if ( content !== false ) {
				if ( ! nodeServer )
					content = parseWebDirectory( content );
				updateUI( content, scrollTop || ( prev && prev.scrollTop ) );
				if ( enterDirCallback )
					enterDirCallback( currentPath );
				resolve( true );
			}
			resolve( false );
		}

		if ( currentDirHandle ) {
			if ( ! target ) {
				// get entries of the current directory
				let content = [];
				for await ( const p of currentDirHandle.entries() )
					content.push( p );
				parseContent( content );
			}
			else if ( handle ) {
				let content = [];
				for await ( const p of handle.entries() )
					content.push( p );
				parseContent( content );
			}
/*
			else {
				currentDirHandle.getDirectoryHandle( target )
					.then( async handle => {
						currentDirHandle = handle;
						let content = [];
						for await ( const p of currentDirHandle.entries() )
							content.push( p );
						parseContent( content );
					})
					.catch( e => {
						console.log( e );
						resolve( false );
					});
			}
*/
		}
		else {
			fetch( url )
				.then( response => {
					if ( response.status == 200 ) {
						if ( nodeServer )
							return response.json();
						else
							return response.text();
					}
					return false;
				})
				.then( content => parseContent( content ) )
				.catch( () => resolve( false ) );
		}
	});
}

/**
 * Climbs up the current path (breadcrumbs navigation)
 *
 * @param {number} depth  how many levels to climb up
 */
function resetPath( depth ) {

	let prev;

	while ( depth > 0 ) {
		prev = currentPath.pop();
		depth--;
	}

	enterDir( prev && prev.handle, prev && prev.scrollTop );
}

/* ******************* Public functions: ******************* */

/**
 * Generates full path for a file or directory
 *
 * @param {string} fileName
 * @param {boolean} if `true` does not prefix path with server route
 * @returns {string} full path to filename
 */
export function makePath( fileName, noPrefix ) {

	let fullPath = '';

	currentPath.forEach( ( { dir } ) => {
		fullPath += dir + ( dir == '/' ? '' : '/' ); // avoid extra slash after the root directory
	});

	if ( fileName )
		fullPath += fileName;

	fullPath = fullPath.replace( /#/g, '%23' ); // replace any '#' character in the filename for its URL-safe code

	if ( isElectron ) {
		fullPath = fullPath.replace( /\//g, '%2f' );
		if ( ! noPrefix )
			fullPath = ( fileName ? '/getFile/' : '/getDir/' ) + fullPath;
	}

	return fullPath;
}

/**
 * Returns current folder's file list
 *
 * @param {string} [selector='li']  optional CSS selector
 * @returns {array} list of music files and playlists only
 */
export function getFolderContents( selector = 'li' ) {

	let contents = [];

	ui_files.querySelectorAll( selector ).forEach( entry => {
		if ( ['file', 'list'].includes( entry.dataset.type ) )
			contents.push( { file: makePath( entry.dataset.path ), type: entry.dataset.type } );
	});
	return contents;
}

/**
 * Returns user's home path (for Electron only)
 *
 * @returns {array} array of { dir: <string>, scrollTop: <number> }
 */
export async function getHomePath() {

	const response = await fetch( '/getHomeDir' ),
		  homeDir  = await response.text();

	let homePath = [];
	for ( const dir of homeDir.split( isWindows ? '\\' : '/' ) )
		homePath.push( { dir, scrollTop: 0 } );

	return homePath;
}

/**
 * Returns current path object
 *
 * @returns {array} array of { dir: <string>, scrollTop: <number> }
 **/
export function getPath() {
	return currentPath;
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
		return arr.find( el => ( el.name || el ).match( regexp ) );
	}

	if ( serverMode == MODE_LOCAL ) {
		for ( const [ name, handle ] of content ) {
			if ( handle instanceof FileSystemDirectoryHandle )
				dirs.push( { name, handle } );
			else if ( handle instanceof FileSystemFileHandle ) {
				if ( name.match( imageExtensions ) )
					imgs.push( { name, handle } );
				else if ( name.match( audioExtensions ) )
					files.push( { name, handle } );
			}
		}
	}
	else {
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
	}

	const cover = findImg( imgs, 'cover' ) || findImg( imgs, 'folder' ) || findImg( imgs, 'front' ) || imgs[0];
	const customSort = ( a, b ) => {
		const collator = new Intl.Collator(), // for case-insensitive sorting - https://stackoverflow.com/a/40390844/2370385
			  isObject = typeof a == 'object';

		return collator.compare( ...( isObject ? [ a.name, b.name ] : [ a, b ] ) );
	}

	return { cover, dirs: dirs.sort( customSort ), files: files.sort( customSort ) }
}

/**
 * Update the contents of the current directory
 */
export function refresh() {
	enterDir( null, ui_files.scrollTop );
}

/**
 * Set current path
 *
 * @param {array} path	array of { dir: <string>, scrollTop: <number> }
 * @returns {boolean}
 */
export async function setPath( path ) {
	if ( ! path )
		return false;

	const savedPath = [ ...currentPath ];

	currentPath = path;

	const success = await enterDir();

	if ( ! success )
		currentPath = savedPath;

	return success;
}


/**
 * Constructor function
 *
 * @param {Element} container  DOM element where the file explorer should be inserted
 * @param {object} [options]   { onDblClick, onEnterDir, rootPath }
 * @returns {Promise<array>}   A promise with the server status and the filelist's DOM element
 */
export function create( container, options = {} ) {

	let startUpTimer;

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

	ui_path.addEventListener( 'click', async function( e ) {
		if ( e.target && e.target.nodeName == 'LI' ) {
			resetPath( e.target.dataset.depth );
		}
	});

	ui_files.addEventListener( 'click', async function( e ) {
		const item = e.target;
		if ( item && item.nodeName == 'LI' ) {
			if ( item.dataset.type == 'dir' )
				enterDir( item.handle || item.dataset.path );
			else if ( item.dataset.type == 'mount' ) {
				currentPath = [];
				if ( serverMode == MODE_LOCAL ) {
					currentDirHandle = await window.showDirectoryPicker({ startIn: 'music' });
					enterDir( currentDirHandle );
				}
				else
					enterDir( item.dataset.path );
			}
		}
	});

	ui_files.addEventListener( 'dblclick', function( e ) {
		const item = e.target;
		if ( item && item.nodeName == 'LI' ) {
			if ( dblClickCallback && ['file','list'].includes( item.dataset.type ) )
				dblClickCallback( { file: makePath( item.dataset.path ), handle: item.handle }, e );
		}
	});

	if ( typeof options.onDblClick == 'function' )
		dblClickCallback = options.onDblClick;

	if ( typeof options.onEnterDir == 'function' )
		enterDirCallback = options.onEnterDir;

	return new Promise( resolve => {
		fetch( '/serverInfo' )
			.then( response => {
				return response.text();
			})
			.then( async content => {
				clearTimeout( startUpTimer );
				if ( content.startsWith('audioMotion') ) {
					nodeServer = true;
					serverMode = MODE_NODE;
				}
				else { // no response for our custom query, so it's probably running on a standard web server
					serverMode = MODE_WEB;
				}
				if ( serverMode == MODE_NODE && isElectron ) {
					const response = await fetch( '/getMounts' );
					mounts = await response.json();
					setPath( await getHomePath() ); // on Electron start at user's home by default
				}
				else {
					mounts = [ options.rootPath || defaultRoot ];
					if ( await enterDir( mounts[0] ) === false ) {
						mounts = [ openFolderMsg ];
						serverMode = MODE_LOCAL;
//						ui_path.innerHTML = '';
//						ui_files.innerHTML = '';
						updateUI();
					}
				}
				resolve([ serverMode, ui_files, serverMode ? content : 'Standard web server' ]);
			})
			.catch( err => {
				clearTimeout( startUpTimer );
				mounts = [ openFolderMsg ];
				serverMode = MODE_LOCAL;
//				ui_path.innerHTML = 'No file server found.';
				updateUI();
				resolve([ serverMode, ui_files ]);
			});
	});

}
