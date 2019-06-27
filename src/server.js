/**
 * audioMotion custom file server
 * https://github.com/hvianna/audioMotion.js
 * Copyright (C) 2019 Henrique Vianna <hvianna@gmail.com>
 */

const _VERSION = '19.6'

const serverSignature = `audioMotion server version ${_VERSION}`

const fs = require('fs')
const path = require('path')
const express = require('express')
const open = require('open')
const readlineSync = require('readline-sync')

var port = 8000
var host = 'localhost'
var launchClient = true
var musicPath = ''

function showHelp() {
	console.log( `
	Usage:

	audioMotion -m "${ process.platform == 'win32' ? 'c:\\users\\john\\music' : '/home/john/music' }"

	-m <path> : path to music directory (required)
	-p <port> : change server listening port (default: ${port})
	-s        : start server only (do not launch client)
	-e        : allow external connections (by default, only localhost)

	` )
}

function getDir( directoryPath ) {
	let dirs = [];
	let files = [];

	let entries = fs.readdirSync( path.normalize( directoryPath ) );

	entries.forEach( function ( entry ) {
		try {
			let stats = fs.statSync( directoryPath + '/' + entry )
			if ( stats.isDirectory() )
				dirs.push( entry );
			else if ( stats.isFile() )
				files.push( entry );
		}
		catch ( e ) {}
	});

	// case insensitive sorting - https://stackoverflow.com/a/40390844/2370385
	return { dirs: dirs.sort( Intl.Collator().compare ), files: files.sort( Intl.Collator().compare ) }
}

console.log( `\n${serverSignature}` );

// processes command line arguments
process.argv = process.argv.slice(2)
process.argv.forEach( ( arg, index ) => {
	if ( arg == '-h' || arg == '--help' ) {
		showHelp()
		process.exit(0)
	}
	else if ( arg == '-m' && process.argv[ index + 1 ] )
		musicPath = path.normalize( process.argv[ index + 1 ] )
	else if ( arg == '-p' && process.argv[ index + 1 ] > 0 )
		port = process.argv[ index + 1 ]
	else if ( arg == '-s' )
		launchClient = false
	else if ( arg == '-e' )
		host = ''
})

if ( ! musicPath ) {
	console.log( '\n\n\tMusic folder not defined.\n\tUse the command-line argument -m <path> to set the folder upon launching audioMotion.' )
	musicPath = readlineSync.questionPath(
		`\n\tPlease enter full path to music folder (e.g. ${ process.platform == 'win32' ? 'c:\\users\\john\\music' : '/home/john/music' }):\n\t> `, {
		isDirectory: true,
		defaultInput: '/:' // invalid path to avoid using current directory if user just presses enter
	})
}

try {
	fs.accessSync( musicPath, fs.constants.R_OK ) // check if music folder is readable
}
catch (err) {
	showHelp()
	console.error( `\n\nERROR: no access to music folder at ${musicPath}` )
	process.exit(0)
}

// start Express web server
const server = express()
server.use( express.static( path.join( __dirname, '../public' ) ) )

server.use( '/music', express.static( musicPath ), ( req, res ) => {
	let files = getDir( musicPath + decodeURI( req.url ).replace( /%23/g, '#' ) );
	files.files = files.files.filter( file => {
		if ( file.match( /(folder|cover)\.(jpg|jpeg|png|gif|bmp)$/i ) )
			files.cover = file
		return file.match( /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/i ) !== null
	})
	res.send( files )
})

server.listen( port, host, () => {
	console.log( `\n\n\tListening on port ${port} ${ host ? 'for localhost connections only' : 'accepting external connections!' }` )
	console.log( `\n\t/music mounting point is ${musicPath}` )
	if ( launchClient ) {
		open( `http://localhost:${port}` )
		console.log( '\n\tLaunching client in browser...' )
	}
	console.log( '\n\nPress Ctrl+C to exit.' )
})

/* route for custom server detection */
server.get( '/serverInfo', ( req, res ) => {
	res.send( serverSignature )
})
