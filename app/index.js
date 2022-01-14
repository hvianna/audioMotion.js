/**
 * audioMotion
 * High-resolution real-time audio spectrum analyzer and music player
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

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const debounce = require('debounce');

const aboutText = `audioMotion version ${ app.getVersion() }\nCopyright © 2018-2022 Henrique Avila Vianna`;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
//if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
//  app.quit();
//}

let mainWindow;

let serverPort;
const server = require('./server');

const isMac = process.platform === 'darwin';

const KEY_BG_PATH     = 'backgroundsPath',
	  KEY_WINDOW_SIZE = 'windowBounds',
	  KEY_STORAGE     = 'localStorage';

// load user preferences (for storage location see app.getPath('userData') )
const defaults = {};
defaults[ KEY_WINDOW_SIZE ] = { width: 1280, height: 800 };
const config = new Store( {	name: 'user-preferences', defaults } );

// create app menu
const menuTemplate = [
	...( isMac ? [{ role: 'appMenu' }] : [] ),
	{ role: 'fileMenu' },
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
						app.quit(); // make sure beforeunload events are executed
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
	{ role: 'viewMenu' },
	{ role: 'windowMenu' },
	{
		role: 'help',
		submenu: [
			{
				label: "User's Manual",
				accelerator: 'F1',
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
						message: aboutText
					});
				}
			}
		]
	}
];

const menu = Menu.buildFromTemplate( menuTemplate );
Menu.setApplicationMenu( menu );

// save window size and position to the user-preferences file
const saveWindowBounds = e => config.set( KEY_WINDOW_SIZE, e.sender.getBounds() );

// create app browser window
const createWindow = () => {
  	const { width, height, x, y } = config.get( KEY_WINDOW_SIZE );
	const iconPath = path.resolve( __dirname, 'audioMotion.ico' );

	mainWindow = new BrowserWindow({
		width, height, x, y,
		resizable: true,
		icon: iconPath,
		webPreferences: {
//			devTools: false,
			preload: path.join( __dirname, 'preload.js' )
		}
	});

	mainWindow.on( 'enter-html-full-screen', () => mainWindow.setMenuBarVisibility(false) );
	mainWindow.on( 'leave-html-full-screen', () => mainWindow.setMenuBarVisibility(true) );

	mainWindow.on( 'move', debounce( saveWindowBounds, 200 ) );
	mainWindow.on( 'resize', debounce( saveWindowBounds, 200 ) );

	mainWindow.loadURL( `http://localhost:${ serverPort }/` );

	// links clicked on the app page open in external browser
	mainWindow.webContents.setWindowOpenHandler( ({ url }) => {
		if ( url.startsWith('https:') )
			shell.openExternal( url );
		return { action: 'deny' };
	});

	// receive localStorage data from renderer on app close
	mainWindow.webContents.on( 'ipc-message-sync', ( e, channel, ...args ) => {
		if ( channel === 'send-storage' )
			config.set( KEY_STORAGE, args );
	});
};

// handle renderer request to get storage data saved on file
ipcMain.handle( 'get-storage', () => config.get( KEY_STORAGE ) );

// app event listeners

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
	if ( ! isMac )
		app.quit();
});

app.on( 'activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if ( BrowserWindow.getAllWindows().length === 0 )
		createWindow();
});
