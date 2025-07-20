/**
 * audioMotion
 * File explorer module
 *
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2025 Henrique Vianna <hvianna@gmail.com>
 */

const defaultRoot           = '/music',
	  supportsFileSystemAPI = !! window.showDirectoryPicker, // does browser support File System API?
	  openFolderMsg         = 'Click to open a new root folder',
	  noFileServerMsg       = 'No music found on server and no browser support for File System API',
	  MAX_BREADCRUMBS_HEIGHT= 40;

// CSS classes
const CLASS_BREADCRUMB = 'breadcrumb',
	  CLASS_FILELIST   = 'filelist',
	  CLASS_LOADING    = 'loading',
	  CLASS_LOCAL      = 'local',
	  CLASS_SERVER     = 'server';

let currentPath       = [],    // array of { dir: <string>, scrollTop: <number>, handle: <FileSystemHandle> }
	currentDirHandle,          // for File System API accesses
	dblClickCallback,
	enterDirCallback,
	fileExtensions    = /.*/,
	mounts            = [],
	serverHasMedia    = false, // music directory found on server
	ui_path,
	ui_files,
	useFileSystemAPI  = false, // use FileSystem API (default on file:// mode or no media found on server)
	webServer         = false; // is web server available?

/**
 * Updates the file explorer user interface
 *
 * @param {object} directory content returned by parseDirectory()
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
		li.dataset.subs = + !! item.subs; // used to show the 'subs' badge in the file list
		li.innerText    = fileName;
		li.handle       = item.handle;    // for File System API accesses
		li.dirHandle    = item.dirHandle;
		li.subs         = item.subs;

		ui_files.append( li );
	}
	const setBgImage = src => ui_files.style.backgroundImage = 'linear-gradient( #fff9 0%, #fff9 100% )' + ( src ? `, url('${ src }')` : '' );

	if ( mounts.length == 0 )
		ui_path.innerHTML = noFileServerMsg;

	// breadcrumbs
	currentPath.forEach( ( { dir }, index ) => {
		ui_path.innerHTML += `<li data-depth="${ currentPath.length - index - 1 }">${dir}</li> ${ dir == '/' ? '' : '/' } `;
		let i = 0;
		while ( ui_path.getBoundingClientRect().height > MAX_BREADCRUMBS_HEIGHT && i < ui_path.children.length - 1 ) {
			ui_path.children[ i ].innerText = '..';
			i++;
		}
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
			setBgImage( cover ? makePath( cover.name ) : '' );
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
async function enterDir( target, scrollTop ) {

	let handle      = ! target || typeof target == 'string' ? null : target,
		savedHandle = currentDirHandle,
		savedPath   = [ ...currentPath ],
		previousDir;

	const container = ui_path.parentElement;

	if ( handle )
		target = handle.name;

	if ( target ) {
		if ( target == '..' ) {
			previousDir = currentPath.pop(); // remove last directory from currentPath; `previousDir` is used to restore scrollTop
			const parent = currentPath[ currentPath.length - 1 ];
			if ( parent && parent.handle )
				handle = parent.handle;
		}
		else
			currentPath.push( { dir: target, scrollTop: ui_files.scrollTop, handle } );
	}

	container.classList.add( CLASS_LOADING );
	container.classList.toggle( CLASS_LOCAL, useFileSystemAPI );
	container.classList.toggle( CLASS_SERVER, webServer && ! useFileSystemAPI );

	if ( currentDirHandle && handle )
		currentDirHandle = handle;

	const content = await getDirectoryContents( makePath(), currentDirHandle );

	container.classList.remove( CLASS_LOADING );

	if ( content !== false ) {
		updateUI( content, scrollTop || ( previousDir && previousDir.scrollTop ) );
		if ( enterDirCallback )
			enterDirCallback( currentPath );
		return true;
	}
	else {
		currentPath = savedPath;
		currentDirHandle = savedHandle;
		return false;
		// in case of error we don't `updateUI()`, to keep the current directory contents in the explorer
	}
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
 * @returns {string} full path to filename
 */
export function makePath( fileName ) {

	let fullPath = '';

	currentPath.forEach( ( { dir } ) => {
		fullPath += dir + ( dir == '/' ? '' : '/' ); // avoid extra slash after the root directory
	});

	if ( fileName )
		fullPath += fileName;

 	// convert special characters into their URL-safe codes
	fullPath = encodeChars( fullPath );

	if ( webServer && fullPath[0] == '/' )
		fullPath = fullPath.slice(1); // make path relative to page origin

	return fullPath;
}

/**
 * Returns current folder's file list
 *
 * @param {string} [selector='li']  optional CSS selector
 * @returns {array} list of music files and playlists only
 */
export function getCurrentFolderContents( selector = 'li' ) {

	let contents = [];

	ui_files.querySelectorAll( selector ).forEach( entry => {
		const { path, type } = entry.dataset,
			  { handle, dirHandle, subs } = entry;

		if ( ['file', 'list'].includes( type ) )
			contents.push( { file: makePath( path ), handle, dirHandle, subs, type } );
	});
	return contents;
}

/**
 * Returns the contents of a given directory
 *
 * @param {string} URL of the directory to read in webserver mode
 * @param {FileSystemDirectoryHandle} handle of the directory to read in filesystem mode (takes precedence, if defined)
 * @returns {array|false} Directory entries; `false` in case of access error
 */
export async function getDirectoryContents( path, dirHandle ) {

	let content;

	try {
		if ( supportsFileSystemAPI && dirHandle instanceof FileSystemDirectoryHandle ) {
			// File System Access API
			content = [];
			for await ( const [ name, handle ] of dirHandle.entries() ) // entries() iterator returns an array
				content.push( { name, handle, dirHandle } ); // we convert it to our own fileObj
		}
		else {
			// Web server
			const response = await fetch( path );
			content = response.ok ? await response.json() : false;
		}
	}
	catch( e ) {
		content = false;
	}

	return content === false ? false : parseDirectory( content, path );
}

/**
 * Resolve a pathname and return the filesystem handles for the file and its directory
 *
 * @param {string} path to filename (must be relative to currentPath)
 * @returns {object} { handle, dirHandle }
 */
export async function getHandles( pathname ) {
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
			try {
				handle = await handle.getDirectoryHandle( dirName );
			}
			catch( e ) {
				return {}; // directory not found - abort and return empty object
			}
			workPath.push( { handle } );
		}
	}

	const filename  = targetPath.shift(),
		  dirHandle = handle;

	try {
		handle = await handle.getFileHandle( filename );
	}
	catch( e ) {
		handle = undefined; // requested file not found
	}

	return { handle, dirHandle }
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
		const [, link, name ] = entry.match( /href="([^"]*)"[^>]*>\s*([^<]*)<\/a>/i ),
			  isDir = link.slice(-1) == '/',
			  // we can only rely on the last directory name being present, because of webserver differences (absolute or relative links)
			  url   = link.slice( link.lastIndexOf( '/', isDir ? link.length - 2 : undefined ) + 1 ),
			  // extract dir/file names from the url to avoid encoded html-entities like `&#x26;`
			  file  = decodeURIComponent( url.slice( 0, isDir ? -1 : undefined ) );

		if ( ! isDir || ! name.match( /^(parent directory|\.\.)/i ) ) // do not include entries to parent directory
			listing.push( { url, file } );
	}

	return listing;
}

/**
 * Parses filenames from standard web server or File System API directory listing
 *
 * @param {string|array} HTML body of a web directory listing OR array of file system entries
 * @param [{string}] directory path (if undefined, considers the current directory)
 * @returns {object} folder/cover image, list of directories, list of files
 */
export function parseDirectory( content, path ) {

    let {dirs, files, imgs, subs} = content;

	// attach subtitle entries to their respective media files
	for ( const sub of subs ) {
		const { name, handle }     = sub,
			  [, basename,, lang ] = name.match( /(.*?)(\.([a-z]{0,3}))?\.vtt$/i ) || [],
			  fileEntry = files.find( el => el.name.startsWith( basename ) );

		if ( fileEntry )
			fileEntry.subs = { src: path ? path + name : makePath( name ), lang, handle };
	}

	// helper function
	const findImg = (arr, pattern) => {
		const regexp = new RegExp(pattern, 'i');
		return arr.find(el => (el.name || el).match(regexp));
	};

	const cover = findImg( imgs, 'cover' ) || findImg( imgs, 'folder' ) || findImg( imgs, 'front' ) || imgs[0];

	// case-insensitive sorting with international charset support - thanks https://stackoverflow.com/a/40390844/2370385
	const collator = new Intl.Collator(),
		  customSort = ( a, b ) => collator.compare( a.name, b.name );

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
	const finalDir    = path && path[ path.length - 1 ],
		  savedHandle = currentDirHandle,
		  savedPath   = [ ...currentPath ];

	currentPath = path;

	if ( finalDir && finalDir.handle )
		currentDirHandle = finalDir.handle;

	const success = !! path && await enterDir();

	if ( ! success ) {
		currentDirHandle = savedHandle;
		currentPath = savedPath;
		// if the dir was not found and the saved path or handle were empty (no lastDir or called by switchMode()),
		// enter the defaultRoot (on server mode) or just update the UI to show the "open new folder" button
		if ( ! useFileSystemAPI && ! currentPath.length )
			enterDir( mounts[0] );
		else if ( useFileSystemAPI && ! currentDirHandle )
			updateUI();
	}

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

	setPath( newPath );
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
	ui_path.className = CLASS_BREADCRUMB;
	container.append( ui_path );

	ui_files = document.createElement('ul');
	ui_files.className = CLASS_FILELIST;
	container.append( ui_files );

	startUpTimer = setTimeout( () => {
		// if it's taking too long, add a message to let the user know we're still waiting
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
				dblClickCallback( { file: makePath( item.dataset.path ), handle: item.handle, dirHandle: item.dirHandle, subs: item.subs }, e );
		}
	});

	if ( typeof options.onDblClick == 'function' )
		dblClickCallback = options.onDblClick;

	if ( typeof options.onEnterDir == 'function' )
		enterDirCallback = options.onEnterDir;

	if ( options.fileExtensions )
		setFileExtensions( options.fileExtensions );

	return new Promise( resolve => {
		fetch( '.', { method: 'HEAD' } ) // check for web server
			.then( async response => {
				clearTimeout( startUpTimer );
				webServer = true;
				mounts = [ options.rootPath || defaultRoot ];
				serverHasMedia = await enterDir( mounts[0] );

				if ( options.forceFileSystemAPI && supportsFileSystemAPI || ! serverHasMedia ) {
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
				resolve( { webServer, useFileSystemAPI, serverHasMedia, filelist: ui_files } );
			})
			.catch( err => {
				// if the fetch fails, it must be running in file:// mode
				clearTimeout( startUpTimer );
				if ( supportsFileSystemAPI ) {
					mounts = [ openFolderMsg ];
					useFileSystemAPI = true;
				}
				else
					mounts = [];
				updateUI();
				resolve( { webServer, useFileSystemAPI, filelist: ui_files } );
			});
	});

}
