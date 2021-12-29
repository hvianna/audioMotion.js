/**
 * audioMotion.js custom file server
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2021 Henrique Vianna <hvianna@gmail.com>
 */

'use strict';

(async function() {
	const VERSION = '21.11';

	const serverSignature = `audioMotion.js server v${VERSION}`;

	const fs           = require('fs'),
		  os           = require('os'),
		  path         = require('path'),
		  express      = require('express'),
		  serveIndex   = require('serve-index'),
		  semver       = require('semver');

	const imageExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i;
	const audioExtensions = /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/i;

	const BG_DIR = '/backgrounds'; // path to backgrounds folder (should start with a slash)

	// ANSI escape sequences for console colors - thanks https://stackoverflow.com/a/41407246
	const ANSI_RED   = '\x1b[31m',
		  ANSI_GREEN = '\x1b[32m',
		  ANSI_RESET = '\x1b[0m';

	let musicPath       = os.homedir(),
		backgroundsPath = '';

	function getDir( directoryPath, showHidden = false ) {
		let dirs = [],
			files = [],
			entries = [];

		try {
			entries = fs.readdirSync( path.normalize( directoryPath ), { withFileTypes: true } );
		}
		catch( e ) {
			return false;
		}

		entries.forEach( entry => {
			if ( entry.name[0] != '.' || showHidden ) {
				if ( entry.isDirectory() )
					dirs.push( entry.name );
				else if ( entry.isFile() )
					files.push( entry.name );
			}
		});

		let collator = new Intl.Collator(); // for case-insensitive string sorting
		return { dirs: dirs.sort( collator.compare ), files: files.sort( collator.compare ) }
	}

	// helper function - find image files with given pattern in an array of filenames
	function findImg( arr, pattern ) {
		const regexp = new RegExp( `${pattern}.*${imageExtensions.source}`, 'i' );
		return arr.find( el => el.match( regexp ) );
	}

	/* main */

	console.log( `\n\t${serverSignature}\n\t${ ('=').repeat( serverSignature.length ) }` );

	if ( ! semver.gte( process.version, '10.10.0' ) ) {
		console.log( `\n\n\t${ANSI_RED}%s${ANSI_RESET}`, `ERROR: the minimum required version of node.js is v10.10.0 and you're running ${process.version}` );
		process.exit(0);
	}

	try {
		fs.accessSync( musicPath, fs.constants.R_OK ); // check if music folder is readable
	}
	catch (err) {
		showHelp();
		console.log( `\n\t${ANSI_RED}%s${ANSI_RESET}`, `ERROR: no access to music folder at ${musicPath}` );
		process.exit(0);
	}

	// Express web server setup

	const server     = express(),
		  pathPublic = path.join( __dirname, '../public' );

	// helper function to return directory index in a simple template compatible with our parseWebIndex() function
	const indexTemplate = ( locals, callback ) => {
		let htmlString = '<ul>';

		for ( const file of locals.fileList )
			htmlString += `<li><a href="${ locals.directory }${ file.name}">${ file.name }</a></li>`;

		htmlString += '</ul>';

		callback( false, htmlString );
	}

	// set custom route for backgrounds folder
	if ( backgroundsPath ) {
		server.use( BG_DIR, express.static( backgroundsPath ), serveIndex( backgroundsPath, { template: indexTemplate } ) );
		console.log( `\n\t${BG_DIR} folder mounted on ${ backgroundsPath }` );
	}

	// set route for /music folder
	server.use( '/music', express.static( musicPath ), ( req, res ) => {

		let files = getDir( musicPath + decodeURI( req.url ).replace( /%23/g, '#' ) ),
			imgs  = [];

		if ( files === false )
			res.status(404).send( 'Not found!' );
		else {
			files.files = files.files.filter( file => {
				if ( file.match( imageExtensions ) )
					imgs.push( file );
				return ( file.match( audioExtensions ) !== null );
			});
			files.cover = findImg( imgs, 'cover' ) || findImg( imgs, 'folder' ) || findImg( imgs, 'front' ) || imgs[0];
			res.send( files );
		}
	});

	console.log( `\n\t/music folder mounted on ${musicPath}` );

	// set server root
	server.use( express.static( pathPublic ), serveIndex( pathPublic, { template: indexTemplate } ) );

	// route for custom server detection
	server.get( '/serverInfo', ( req, res ) => {
		res.send( serverSignature );
	})

	// route for retrieving a directory's cover picture
	server.get( '/getCover/:path', ( req, res ) => {
		const path    = musicPath + decodeURI( req.params.path ).replace( /^\/music/, '' ).replace( /%23/g, '#' ),
			  entries = getDir( path );

		if ( entries === false )
			res.status(404).send( 'Not found!' );
		else {
			const imgs = entries.files.filter( file => file.match( imageExtensions ) !== null );
			res.send( findImg( imgs, 'cover' ) || findImg( imgs, 'folder' ) || findImg( imgs, 'front' ) || imgs[0] );
		}
	});

	module.exports = server;
})();