/**
 * audioMotion custom file server
 * Copyright (C) 2019 Henrique Vianna <hvianna@gmail.com>
 */

const _VERSION = '19.6';

// libraries
const path = require('path');
const express = require('express')
const open = require('open')
const drives = require('./getWindowsDrives.js')
const dir = require('./dir.js')

var port = 8000;
var host = 'localhost'
var launchClient = true;

console.log( `\naudioMotion.js file server ver. ${_VERSION}` );

// processes command line arguments
process.argv = process.argv.slice(2)
process.argv.forEach( ( arg, index ) => {
	if ( arg == '-h' || arg == '--help' ) {
		console.log( `\nCommand line parameters:\n\n\t-p <port> : change server listening port (default: ${port})\n\t-s        : start server only (do not launch client)\n\t-e        : allow external connections (by default, only localhost)\n\n` )
		process.exit(0)
	}
	else if ( arg == '-p' && process.argv[ index + 1 ] > 0 )
		port = process.argv[ index + 1 ]
	else if ( arg == '-s' )
		launchClient = false
	else if ( arg == '-e' )
		host = ''
})

// start Express web server
const server = express()
server.use( express.static( path.join( __dirname, '../public' ) ) )
server.listen( port, host, () => {
	console.log( `\n\nServer listening on port ${port} ${ host ? 'for localhost connections only (run with -e to allow external connections)' : '' }` )
	if ( launchClient ) {
		open( `http://localhost:${port}` )
		console.log( '\nLaunching client in browser...' )
	}
	console.log( '\n\nPress Ctrl+C to exit.' )
})

/* Server routes */

// retrieve list of drives / paths
server.get( '/getDrives', function (req, res) {
	if ( process.platform === 'win32' ) {
		drives.getWindowsDrives( ( error, drives ) => {
			if ( ! error )
				res.send( drives )
		})
	}
	else
		res.send( ['/'] )
})

// retrieve a directory listing
server.get( '/getDir/:path', function (req, res) {
	var files = dir.files( req.params.path );
	files.files = files.files.filter( function (file) {
		if ( file.toLowerCase().match(/(folder|cover)\.(jpg|jpeg|png|gif|bmp)$/) )
			files.cover = file
		return file.match(/\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8)$/) !== null
	});
	res.send( files )
})

// retrieve a file
server.get( '/getFile/:path', function (req, res) {
	// check for allowed file types
	if ( req.params.path.match( /\.(mp3|flac|m4a|aac|ogg|wav|m3u|m3u8|jpg|jpeg|png|gif|bmp)$/ ) !== null )
		res.sendFile( req.params.path )
	else
		res.sendStatus(403)
})
