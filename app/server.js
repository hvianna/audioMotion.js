/**
 * audioMotion.js custom file server
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2021 Henrique Vianna <hvianna@gmail.com>
 */

'use strict';

(async function() {
	const { app }      = require('electron'),
		  fs           = require('fs'),
		  path         = require('path'),
		  express      = require('express'),
		  serveIndex   = require('serve-index'),
		  mounts       = require('./getMounts.js');

	const serverSignature = `audioMotion.js server v${ app.getVersion() }`;

	const imageExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i;
	const audioExtensions = /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/i;

	const BG_DIR = '/backgrounds'; // path to backgrounds folder (should start with a slash)

	let backgroundsPath = '';

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
		return arr.find( el => regexp.test( el ) );
	}

	/* main */

	console.log( `\n${serverSignature}\n${ ('=').repeat( serverSignature.length ) }` );

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
			if ( ! error )
				res.send( mounts );
		});
	});

	// retrieve a file
	server.get( '/getFile/:path', ( req, res ) => {
		const file = req.params.path;
		// check for allowed file types
		if ( /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8|jpg|jpeg|png|gif|bmp)$/.test( file ) )
			res.sendFile( file );
		else
			res.sendStatus(403);
	});

	module.exports = server;
})();
