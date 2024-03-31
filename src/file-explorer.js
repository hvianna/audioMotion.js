/**
 * audioMotion
 * File explorer module
 *
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2024 Henrique Vianna <hvianna@gmail.com>
 */

const defaultRoot           = '/music',
	  isElectron            = 'electron' in window,
	  isWindows             = isElectron && /Windows/.test( navigator.userAgent ),
	  supportsFileSystemAPI = !! window.showDirectoryPicker, // does browser support File System API?
	  openFolderMsg         = 'Click to open a new root folder',
	  noFileServerMsg       = 'No music found on server and no browser support for File System API';

const MODE_NODE = 1,  // Electron app or custom node.js file server
	  MODE_WEB  = 0,  // standard web server
	  MODE_FILE = -1; // local access via file://

let currentPath       = [],    // array of { dir: <string>, scrollTop: <number>, handle: <FileSystemHandle> }
	currentDirHandle,          // for File System API accesses
	dblClickCallback,
	enterDirCallback,
	fileExtensions    = /.*/,
	mounts            = [],
	nodeServer        = false, // using our custom server? (node server or Electron app)
	ui_path,
	ui_files,
	serverMode,
	hasServerMedia    = false, // music directory found on server
	useFileSystemAPI  = false; // use FileSystem API (default on file:// mode or no media found on server)

/**
 * Updates the file explorer user interface
 *
 * @param {object} directory content returned by the node server or parseDirectory()
 * @param {number} scrollTop scroll position for the filelist container
 */
function updateUI( content, scrollTop ) {

	ui_path.innerHTML = '';
	ui_files.innerHTML = '';
	ui_files.style.backgroundImage = '';

	const addListItem = ( item, type ) => {
		const li = document.createElement('li'),
			  fileName = item.name || item;

		li.dataset.type = fileName.match(/\.(m3u|m3u8)$/) !== null && type == 'file' ? 'list' : type;
		li.dataset.path = fileName;
		li.innerText = fileName;
		li.handle = item.handle; // for File System API accesses

		ui_files.append( li );
	}
	const setBgImage = src => ui_files.style.backgroundImage = 'linear-gradient( #fff9 0%, #fff9 100% )' + ( src ? `, url('${ src }')` : '' );

	if ( mounts.length == 0 )
		ui_path.innerHTML = noFileServerMsg;

	// breadcrumbs
	currentPath.forEach( ( { dir }, index ) => {
		ui_path.innerHTML += `<li data-depth="${ currentPath.length - index - 1 }">${dir}</li> ${ isWindows ? '\\' : dir == '/' ? '' : '/' } `;
	});

	// mounting points
	mounts.forEach( mount => {
		ui_files.innerHTML += `<li data-type="mount" ${ useFileSystemAPI && ! currentDirHandle ? 'class="full-panel"' : '' } data-path="${mount}">[ ${mount} ]</li>`;
	});

	// link to parent directory
	if ( currentPath.length > 1 )
		ui_files.innerHTML += '<li data-type="dir" data-path="..">[ parent folder ]</li>';

	// current directory contents
	if ( content ) {
		const { cover, dirs, files } = content;

		if ( dirs )
			dirs.forEach( dir => addListItem( dir, 'dir' ) );

		if ( files )
			files.forEach( file => addListItem( file, 'file' ) );

		if ( cover && cover.handle )
			cover.handle.getFile().then( fileBlob => setBgImage( URL.createObjectURL( fileBlob ) ) );
		else
			setBgImage( cover ? makePath( cover ) : '' );
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
		handle = ! target || typeof target == 'string' ? null : target;

	if ( handle )
		target = handle.name;

	if ( target ) {
		if ( target == '..' ) {
			prev = currentPath.pop(); // remove last directory from currentPath; `prev` is used to restore scrollTop
			const parent = currentPath[ currentPath.length - 1 ];
			if ( parent && parent.handle )
				handle = parent.handle;
		}
		else
			currentPath.push( { dir: target, scrollTop: ui_files.scrollTop, handle } );
	}

	ui_files.innerHTML = '<li>Loading...</li>';

	url = makePath();

	return new Promise( async resolve => {

		const parseContent = content => {
			if ( content !== false ) {
				if ( ! nodeServer || useFileSystemAPI )
					content = parseDirectory( content );
				updateUI( content, scrollTop || ( prev && prev.scrollTop ) );
				if ( enterDirCallback )
					enterDirCallback( currentPath );
				resolve( true );
			}
			resolve( false );
		}

		if ( currentDirHandle ) { // File System API
			if ( handle )
				currentDirHandle = handle;

			let content = [];
			for await ( const p of currentDirHandle.entries() )
				content.push( p );
			parseContent( content );
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

	const parent = currentPath[ currentPath.length - 1 ];
	if ( parent && parent.handle ) {
		currentDirHandle = parent.handle;
		prev = null;
	}

	enterDir( prev, prev && prev.scrollTop );
}

/* ******************* Public functions: ******************* */

/**
 * Convert special characters into URL-safe codes
 *
 * @param {string} uri
 * @returns {string}
 */
export function encodeChars( uri ) {
	return uri.replace( /[#%&]/g, m => ( { '#':'%23', '%':'%25', '&':'%26' }[ m ] ) );
}

/**
 * Decode URL-encoded characters
 *
 * @param {string} encoded uri
 * @returns {string}
 */
export function decodeChars( uri ) {
	return uri.replace( /%2[356]/g, m => ( { '%23':'#', '%25':'%', '%26':'&' }[ m ] ) );
}

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

 	// convert special characters into their URL-safe codes
	fullPath = encodeChars( fullPath );

	if ( isElectron ) {
		fullPath = fullPath.replace( /\//g, '%2f' );
		if ( ! noPrefix )
			fullPath = ( fileName ? '/getFile/' : '/getDir/' ) + fullPath;
	}
	else if ( serverMode == MODE_WEB && fullPath[0] == '/' )
		fullPath = fullPath.slice(1); // make path relative to page origin

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
			contents.push( { file: makePath( entry.dataset.path ), handle: entry.handle, type: entry.dataset.type } );
	});
	return contents;
}

/**
 * Resolve a given filename and return the corresponding FileSystemFileHandle
 *
 * @param {string} path to filename (must be relative to currentPath)
 * @returns {FileSystemFileHandle}
 */
export async function getHandle( pathname ) {
	const workPath   = [ ...currentPath ],
		  targetPath = pathname.split('/');

	let handle = workPath[ workPath.length - 1 ].handle;

	while ( targetPath.length > 1 ) {
		const dirName = targetPath.shift();
		if ( dirName == '..' ) {
			workPath.pop();
			handle = workPath[ workPath.length - 1 ].handle;
		}
		else {
			handle = await handle.getDirectoryHandle( dirName );
			workPath.push( { handle } );
		}
	}

	return await handle.getFileHandle( targetPath.shift() );
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
 * @returns {array} an array of { url, file } objects representing the full path and the filename only, for each link found in the listing
 */
export function parseWebIndex( content ) {

	const entries = content.match( /href="[^"]*"[^>]*>[^<]*<\/a>/gi ); // locate links

	let listing = [];

	for ( const entry of entries ) {
		const link  = entry.match( /href="([^"]*)"[^>]*>\s*([^<]*)<\/a>/i )[1],
			  isDir = link.slice(-1) == '/',
			  // we can only rely on the last directory name being present, because of webserver differences (absolute or relative links)
			  url   = link.slice( link.lastIndexOf( '/', isDir ? link.length - 2 : undefined ) + 1 ),
			  // extract dir/file names from the url to avoid encoded html-entities like `&#x26;` (also removes final slash from dir name)
			  file  = decodeURIComponent( url.slice( 0, isDir ? -1 : undefined ) );

		listing.push( { url, file } );
	}

	return listing;
}

/**
 * Parses filenames from standard web server or File System API directory listing
 *
 * @param {string}   content HTML body of a web server directory listing
 * @returns {object} folder/cover image, list of directories, list of files
 */
export function parseDirectory( content ) {

	const coverExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i;

	let files = [],
		dirs  = [],
		imgs  = [];

	// helper function
	const findImg = ( arr, pattern ) => {
		const regexp = new RegExp( `${pattern}.*${coverExtensions.source}`, 'i' );
		return arr.find( el => ( el.name || el ).match( regexp ) );
	}

	if ( useFileSystemAPI ) {
		for ( const [ name, handle ] of content ) {
			if ( handle instanceof FileSystemDirectoryHandle )
				dirs.push( { name, handle } );
			else if ( handle instanceof FileSystemFileHandle ) {
				if ( name.match( coverExtensions ) )
					imgs.push( { name, handle } );
				if ( name.match( fileExtensions ) )
					files.push( { name, handle } );
			}
		}
	}
	else {
		for ( const { url, file } of parseWebIndex( content ) ) {
			if ( url.slice( -1 ) == '/' ) {
				if ( ! file.match( /(parent directory|\.\.)/i ) ) {
					dirs.push( file );
				}
			}
			else {
				if ( file.match( coverExtensions ) )
					imgs.push( file );
				if ( file.match( fileExtensions ) )
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
 * Set or change the file extensions recognized by the file explorer
 *
 * @param {array}
 */
export function setFileExtensions( validExtensions ) {
	fileExtensions = new RegExp( '\\.(' + validExtensions.join('|') + ')$', 'i' );
}

/**
 * Set current path
 *
 * @param {array} path	array of { dir: <string>, scrollTop: <number>, handle?: FileSystemDirectoryHandle }
 * @returns {boolean}
 */
export async function setPath( path ) {
	if ( ! path )
		return false;

	const savedPath = [ ...currentPath ],
		  finalDir  = path[ path.length - 1 ];

	currentPath = path;

	if ( finalDir && finalDir.handle )
		currentDirHandle = finalDir.handle;

	const success = await enterDir();

	if ( ! success )
		currentPath = savedPath;

	return success;
}

/**
 * Switch between server and local mode
 *
 * @param {object} new path
 */
export function switchMode( newPath ) {
	useFileSystemAPI = ! useFileSystemAPI;

	currentPath = [];
	currentDirHandle = null;
	mounts = [ useFileSystemAPI ? openFolderMsg : defaultRoot ];

	if ( newPath )
		setPath( newPath );
	else
		updateUI();
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
				if ( useFileSystemAPI ) {
					try {
						currentDirHandle = await window.showDirectoryPicker({ startIn: 'music' });
						currentPath = []; // not cleared if directory picker is cancelled by user
						enterDir( currentDirHandle );
					}
					catch (e) {
						// avoid console error when user cancels the directory picker window
					}
				}
				else {
					currentPath = [];
					enterDir( item.dataset.path );
				}
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

	if ( options.fileExtensions )
		setFileExtensions( options.fileExtensions );

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
				else {
					// no response for our custom query, so it's probably running on a standard web server
					serverMode = MODE_WEB;
				}

				if ( serverMode == MODE_NODE && isElectron ) {
					const response = await fetch( '/getMounts' );
					mounts = await response.json();
					setPath( await getHomePath() ); // on Electron start at user's home by default
				}
				else {
					// web or custom server
					mounts = [ options.rootPath || defaultRoot ];
					hasServerMedia = await enterDir( mounts[0] );

					if ( options.forceFileSystemAPI && supportsFileSystemAPI || ! hasServerMedia ) {
						// local file system requested or no music directory on server - use File System API if supported
						currentPath = [];
						if ( supportsFileSystemAPI ) {
							mounts = [ openFolderMsg ];
							useFileSystemAPI = true;
						}
						else
							mounts = [];
						updateUI();
					}
				}
				resolve( { serverMode, useFileSystemAPI, hasServerMedia, filelist: ui_files, serverSignature: serverMode == MODE_WEB ? 'Standard web server' : content } );
			})
			.catch( err => {
				// if the fetch fails, it's probably running in file:// mode
				clearTimeout( startUpTimer );
				serverMode = MODE_FILE;
				if ( supportsFileSystemAPI ) {
					mounts = [ openFolderMsg ];
					useFileSystemAPI = true;
				}
				else
					mounts = [];
				updateUI();
				resolve( { serverMode, useFileSystemAPI, filelist: ui_files } );
			});
	});

}
