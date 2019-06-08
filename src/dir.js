/*
	reads entries from a directory in the local filesystem
	used by server.js
*/

const fs = require('fs');

exports.files = function( directoryPath ) {
	let dirs = [];
	let files = [];

	let entries = fs.readdirSync( directoryPath );

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
