/**
 * audioMotion
 * Custom file server for the web app
 *
 * See docs/webapp.md for more information
 *
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019-2023 Henrique Vianna <hvianna@gmail.com>
 */

const package_json = require('../package.json'),
	  serverSignature = `audioMotion web app server v${ package_json.version }`;

const fs           = require('fs'),
	  path         = require('path'),
	  express      = require('express'),
	  serveIndex   = require('serve-index'),
	  open         = require('open'),
	  readlineSync = require('readline-sync'),
	  semver       = require('semver');

const imageExtensions = /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i;
const audioExtensions = /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/i;

const BG_DIR = '/backgrounds'; // path to backgrounds folder (should start with a slash)

// ANSI escape sequences for console colors - thanks https://stackoverflow.com/a/41407246
const ANSI_RED   = '\x1b[31m',
	  ANSI_GREEN = '\x1b[32m',
	  ANSI_RESET = '\x1b[0m';

let port            = 8000,
	host            = 'localhost',
	launchClient    = true,
	musicPath       = '',
	backgroundsPath = '';

function showHelp() {
	console.log( `
	Usage:

	npm run server -- -m "${ process.platform == 'win32' ? 'c:\\users\\john\\music' : '/home/john/music' }"

	-b <path> : path to folder with background images and videos
	-e        : allow external connections (by default, only localhost)
	-m <path> : path to music folder
	-p <port> : change server listening port (default: ${port})
	-s        : start server only (do not launch client)

	` );
}

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

console.log( `\n\t${serverSignature}\n\t${ ('=').repeat( serverSignature.length ) }` );

if ( ! semver.gte( process.version, '10.10.0' ) ) {
	console.log( `\n\n\t${ANSI_RED}%s${ANSI_RESET}`, `ERROR: the minimum required version of node.js is v10.10.0 and you're running ${process.version}` );
	process.exit(0);
}

// processes command line arguments

process.argv = process.argv.slice(2);

process.argv.forEach( ( arg, index ) => {
	if ( arg == '-h' || arg.endsWith('-help') ) {
		showHelp();
		process.exit(0);
	}
	else if ( arg == '-m' && process.argv[ index + 1 ] )
		musicPath = path.normalize( process.argv[ index + 1 ] );
	else if ( arg == '-b' && process.argv[ index + 1 ] )
		backgroundsPath = path.normalize( process.argv[ index + 1 ] );
	else if ( arg == '-p' && process.argv[ index + 1 ] > 0 )
		port = process.argv[ index + 1 ];
	else if ( arg == '-s' )
		launchClient = false;
	else if ( arg == '-e' )
		host = '';
});

if ( ! musicPath ) {
	console.log( '\n\tMusic folder not defined.\n\tUse the command-line argument -m <path> to set the folder upon launching audioMotion.' );
	musicPath = readlineSync.questionPath(
		`\n\t${ANSI_GREEN}Please enter full path to music folder (e.g. ${ process.platform == 'win32' ? 'c:\\users\\john\\music' : '/home/john/music' })\n\tor just press Enter to use your home directory:\n\t> ${ANSI_RESET}`, {
		isDirectory: true,
		defaultInput: '~'
	});
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

	let entries = getDir( musicPath + decodeURI( req.url ).replace( /%23/g, '#' ) ),
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

console.log( `\n\t/music folder mounted on ${musicPath}` );

// set server root
server.use( express.static( pathPublic ), serveIndex( pathPublic, { template: indexTemplate } ) );

// start server
server.listen( port, host, () => {
	console.log( `\n\n\t${ANSI_GREEN}%s${ANSI_RESET}`, `Listening on port ${port} ${ host ? 'for localhost connections only' : 'accepting external connections!' }` );
	if ( launchClient ) {
		open( `http://localhost:${port}` );
		console.log( '\n\tLaunching client in browser...' );
	}
	console.log( '\n\n\tPress Ctrl+C to terminate.' );
})

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
		const imgs = entries.files.filter( file => imageExtensions.test( file ) );
		res.send( findImg( imgs, 'cover' ) || findImg( imgs, 'folder' ) || findImg( imgs, 'front' ) || imgs[0] );
	}
});
