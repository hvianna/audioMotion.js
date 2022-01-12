/**
 * audioMotion.js
 * High-resolution real-time spectrum analyzer and music player
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * @author    Henrique Vianna <hvianna@gmail.com>
 * @copyright (c) 2018-2022 Henrique Avila Vianna
 * @license   AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const { app, BrowserWindow, dialog, Menu, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
//if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
//  app.quit();
//}

let mainWindow;

let serverPort;
const server = require('./server');

const isMac = process.platform === 'darwin';

const KEY_BG_PATH     = 'backgroundsPath',
	  KEY_WINDOW_SIZE = 'windowBounds';

// load user preferences (for storage location see app.getPath('userData') )
const defaults = {};
defaults[ KEY_WINDOW_SIZE ] = { width: 1280, height: 800 };
const config = new Store( {	name: 'user-preferences', defaults } );

const menuTemplate = [
	// { role: 'appMenu' }
	...(isMac ? [{
		label: app.name,
		submenu: [
			{ role: 'about' },
			{ type: 'separator' },
			{ role: 'services' },
			{ type: 'separator' },
			{ role: 'hide' },
			{ role: 'hideOthers' },
			{ role: 'unhide' },
			{ type: 'separator' },
			{ role: 'quit' }
		]
	}] : []),
	// { role: 'fileMenu' }
	{
		label: 'File',
		submenu: [
			isMac ? { role: 'close' } : { role: 'quit' }
		]
	},
	{
		label: 'Preferences',
		submenu: [
			{
				label: 'Select backgrounds folder (requires restart)',
				click: () => {
					const backgroundsPath = dialog.showOpenDialogSync( mainWindow, {
						title: 'Select backgrounds folder',
						buttonLabel: 'Select folder',
						properties: ['openDirectory']
					});

					if ( backgroundsPath ) {
						config.set( KEY_BG_PATH, backgroundsPath[0] );
						app.relaunch();
						app.exit();
					}
				}
			},
			{
				label: 'Disable backgrounds folder',
				id: 'disableBackgrounds',
				enabled: config.has( KEY_BG_PATH ),
				click: function () {
					const yesNo = dialog.showMessageBoxSync( mainWindow, {
						type: 'question',
						title: 'Are you sure?',
						message: 'Do you really want to disable the backgrounds folder?',
						detail: 'The current images will no longer be available in the Background selection.\nThis will take effect the next time you run audioMotion.',
						buttons: [ 'Yes', 'Cancel' ]
					});
					if ( yesNo === 0 ) {
						config.delete( KEY_BG_PATH );
						menu.getMenuItemById('disableBackgrounds').enabled = false;
					}
				}
			}
		]
	},
	// { role: 'viewMenu' }
	{
		label: 'View',
		submenu: [
			{ role: 'reload' },
			{ role: 'forceReload' },
			{ role: 'toggleDevTools' },
			{ type: 'separator' },
			{ role: 'resetZoom' },
			{ role: 'zoomIn' },
			{ role: 'zoomOut' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' }
		]
	},
	// { role: 'windowMenu' }
	{
		label: 'Window',
		submenu: [
			{ role: 'minimize' },
			{ role: 'zoom' },
			...(isMac ? [
				{ type: 'separator' },
				{ role: 'front' },
				{ type: 'separator' },
				{ role: 'window' }
			] : [
				{ role: 'close' }
			])
		]
	},
	{
		role: 'help',
		submenu: [
			{
				label: "User's Manual",
				click: async () => {
					await shell.openExternal('https://audiomotion.me/users-manual');
				}
			},
			{
				label: 'Project on GitHub',
				click: async () => {
					await shell.openExternal('https://github.com/hvianna/audioMotion.js');
				}
			},
			{
				label: 'Website',
				click: async () => {
					await shell.openExternal('https://audiomotion.me');
				}
			},
			{
				label: 'About',
				click: () => {
					dialog.showMessageBoxSync( mainWindow, {
						type: 'info',
						title: 'About',
						message: `audioMotion version ${ app.getVersion() }\nCopyright © 2018-2021 Henrique Avila Vianna`
					});
				}
			}
		]
	}
];

const menu = Menu.buildFromTemplate( menuTemplate );
Menu.setApplicationMenu( menu );


const createWindow = () => {
  	const { width, height } = config.get( KEY_WINDOW_SIZE );
	const iconPath = path.resolve( __dirname, 'audioMotion.ico' );

	mainWindow = new BrowserWindow({
		width,
		height,
		resizable: true,
		icon: iconPath,
		webPreferences: {
//			devTools: false,
//			preload: path.join( __dirname, 'preload.js' )
		}
	});

	mainWindow.on( 'enter-html-full-screen', () => mainWindow.setMenuBarVisibility(false) );
	mainWindow.on( 'leave-html-full-screen', () => mainWindow.setMenuBarVisibility(true) );

	// save window dimensions on resize
	mainWindow.on( 'resize', () => {
		const { width, height } = mainWindow.getBounds();
		config.set( KEY_WINDOW_SIZE, { width, height } );
	});

	mainWindow.loadURL( `http://localhost:${serverPort}/` );

	// links clicked on the app page open in external browser
	mainWindow.webContents.setWindowOpenHandler( ({ url }) => {
		if ( url.startsWith('https:') )
			shell.openExternal( url );
		return { action: 'deny' };
	});
};

app.on( 'ready', () => {
	const backgroundsPath = config.get( KEY_BG_PATH );
	// start server
	server.create( { backgroundsPath } )
		.then( ( { port, serverSignature } ) => {
			serverPort = port;
			console.log( `\n${ serverSignature }\n${ ('=').repeat( serverSignature.length ) }` );
			console.log( `\nListening on port ${ serverPort }` );
			createWindow();
		})
		.catch( err => {
			console.log( err );
		});
});

app.on( 'window-all-closed', () => {
	if ( process.platform !== 'darwin' ) {
		app.quit();
	}
});

app.on( 'activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if ( BrowserWindow.getAllWindows().length === 0 ) {
		createWindow();
	}
});
