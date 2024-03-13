/**
 * audioMotion
 * Server module for Electron app
 *
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2023 Henrique Vianna <hvianna@gmail.com>
 */

'use strict';

const { app }      = require('electron'),
	  fs           = require('fs'),
	  path         = require('path'),
	  express      = require('express'),
	  serveIndex   = require('serve-index'),
	  mounts       = require('./getMounts.js');

const serverSignature = `audioMotion server v${ app.getVersion() }`;

const imageExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i;
const audioExtensions = /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/i;

const LINE_BREAK = process.platform == 'win32' ? '\r\n' : '\n';

/**
 * Helper functions
 */

// convert a string in the format 'hh:mm:ss' to seconds
const timeInSeconds = time => {
	if ( time == 'LIVE' || time == Infinity )
		return -1;

	let parts = time.split(':'),
		len   = parts.length - 1;

	return parts.reduce( ( prev, val, idx ) => prev + ( val | 0 ) * 60 ** ( len - idx ), 0 );
}

// find image files with given pattern in an array of filenames
const findImg = ( arr, pattern ) => {
	const regexp = new RegExp( `${pattern}.*${imageExtensions.source}`, 'i' );
	return arr.find( el => regexp.test( el ) );
}

/**
 * Get the contents of a directory
 *
 * @param {string} directoryPath
 * @param {boolean} [showHidden]
 * @returns {object} { dirs, files }
 */
function getDir( directoryPath, showHidden ) {
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

	const collator = new Intl.Collator(); // for case-insensitive string sorting
	dirs.sort( collator.compare );
	files.sort( collator.compare );

	return { dirs, files }
}

/**
 * Save a playlist file to the filesystem
 *
 * @param {object} req Original server request object
 * @param {boolean} [isUpdate] If `true` overwrites existing file
 * @returns {object} { file, error } Full path of the actual saved file, or error message
 */
function savePlaylist( req, isUpdate ) {
	const playlist = req.body.contents;

	let { dir, name, ext } = path.parse( path.normalize( req.params.path ) );

	// make sure file extension is valid
	if ( ! ['.m3u','.m3u8'].includes( ext.toLowerCase() ) )
		ext += '.m3u8';

	let file = path.join( dir, name + ext ),
		incr = 0;

	// when not updating a playlist, make sure we don't overwrite an existing file
	if ( ! isUpdate ) {
		try {
			while ( true ) {
				fs.accessSync( file, fs.constants.F_OK );
				file = path.join( dir, `${ name }_${ ++incr }${ ext }` );
			}
		}
		catch ( e ) {
			// file doesn't exist - carry on!
		}
	}

	let text = '#EXTM3U' + LINE_BREAK; // M3U format header

	for ( const { file, artist, title, duration } of playlist ) {
		if ( title )
			text += `#EXTINF:${ duration ? timeInSeconds( duration ) + ',' : '' }${ artist ? artist + ' - ' : '' }${ title }` + LINE_BREAK;
		text += ( file.startsWith('http') ? file : path.normalize( file ) ) + LINE_BREAK; // normalize slashes for Windows when needed
	}

	try {
		fs.writeFileSync( file, text );
		return { file };
	}
	catch ( error ) {
		return { error };
	}
}

/**
 * Creates the server (exported function)
 *
 * @param {object} options { backgroundsPath }
 * @returns {Promise} which resolves with { port, serverSignature }
 */
function create( options ) {

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

	// set custom route for backgrounds folder, if provided
	const { backgroundsPath } = options || {};
	if ( backgroundsPath )
		server.use( '/getBackground', express.static( backgroundsPath ), serveIndex( backgroundsPath, { template: indexTemplate } ) );

	// parse JSON bodies (for POST requests)
	server.use( express.json() );

	// save a playlist file (must be declared before the static server root for POST to work?)
	server.post( '/savePlist/:path', ( req, res ) => {
		res.json( savePlaylist( req ) );
	});

	// update an existing playlist file
	server.put( '/savePlist/:path', ( req, res ) => {
		res.json( savePlaylist( req, true ) );
	});

	// set server root (static files for web client)
	server.use( express.static( pathPublic ), serveIndex( pathPublic, { template: indexTemplate } ) );

	// route for custom server detection
	server.get( '/serverInfo', ( req, res ) => {
		res.send( serverSignature );
	});

	// retrieve a directory's cover picture
	server.get( '/getCover/:path', ( req, res ) => {
		const path    = decodeURI( req.params.path ).replace( /%23/g, '#' ),
			  entries = getDir( path );

		if ( entries === false )
			res.status(404).send( 'Not found!' );
		else {
			const images = entries.files.filter( file => imageExtensions.test( file ) );
			res.send( findImg( images, 'cover' ) || findImg( images, 'folder' ) || findImg( images, 'front' ) || images[0] );
		}
	});

	// retrieve a directory
	server.get( '/getDir/:path', ( req, res ) => {
		let entries = getDir( decodeURI( req.params.path ).replace( /%23/g, '#' ) ),
			images  = [];

		if ( entries === false )
			res.status(404).send( 'Not found!' );
		else {
			entries.files = entries.files.filter( file => {
				if ( imageExtensions.test( file ) )
					images.push( file );
				return audioExtensions.test( file );
			});
			if ( entries.files.length )
				entries.cover = findImg( images, 'cover' ) || findImg( images, 'folder' ) || findImg( images, 'front' ) || images[0];
			res.send( entries );
		}
	});

	// retrieve mount points (or drives on Windows)
	server.get( '/getMounts', ( req, res ) => {
		mounts.getMounts( ( error, mounts ) => {
			res.send( mounts );
		});
	});

	// retrieve a file
	server.get( '/getFile/:path', ( req, res ) => {
		const file = path.normalize( req.params.path );
		// check for allowed file types
		if ( audioExtensions.test( file ) || imageExtensions.test( file ) )
			res.sendFile( file );
		else
			res.sendStatus(403);
	});

	// return user's home directory
	server.get( '/getHomeDir', ( req, res ) => {
		const homedir = require('os').homedir();
		res.send( homedir );
	});

	// start server and return promise
	return new Promise( resolve => {
		server.listen( 0, function() {
			resolve( { port: this.address().port, serverSignature } );
		});
	});

}

module.exports = { create };
