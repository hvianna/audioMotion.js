/**
 * Returns mount points on Linux or drives on Windows
 * Based on https://medium.com/quasar-framework/building-an-electron-file-explorer-with-quasar-and-vue-7bf94f1bbf6
 */

const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');

exports.getMounts = function( callback ) {
	if ( ! callback )
		throw new Error('getMounts called with no callback!');

	const isWin = process.platform == 'win32',
		  isMac = process.platform == 'darwin';

	let mounts = [];

	exec( isWin ? 'wmic logicaldisk get name' : isMac ? 'df -hnT notmpfs' : 'df -hx tmpfs', ( error, stdout ) => {
		if ( error ) {
			callback( error, mounts );
			return;
		}

		let lines = stdout.split('\n');

		if ( lines.length ) {
			// first line is titles; get rid of it
			lines.splice(0, 1);
			for ( const line of lines ) {
				let mount = ( isWin ? line.slice(0, 2) : line.slice( line.lastIndexOf(' ') ) ).trim();
				if ( mount.length ) {
					try {
						// if stat works, add the mount point to the list
						fs.statSync( mount + path.sep );
						mounts.push( mount );
					}
					catch (e) {} // fail silently
				}
			}
			callback( null, mounts );
		}
	});
}
