const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
//if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
//  app.quit();
//}

let serverPort;
const server = require('./server');

const isMac = process.platform === 'darwin';

const template = [
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
	// { role: 'editMenu' }
/*
	{
		label: 'Edit',
		submenu: [
			{ role: 'undo' },
			{ role: 'redo' },
			{ type: 'separator' },
			{ role: 'cut' },
			{ role: 'copy' },
			{ role: 'paste' },
			...(isMac ? [
				{ role: 'pasteAndMatchStyle' },
				{ role: 'delete' },
				{ role: 'selectAll' },
				{ type: 'separator' },
				{
					label: 'Speech',
					submenu: [
						{ role: 'startSpeaking' },
						{ role: 'stopSpeaking' }
					]
				}
			] : [
				{ role: 'delete' },
				{ type: 'separator' },
				{ role: 'selectAll' }
			])
		]
	},
*/
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
					const { dialog } = require('electron');
					dialog.showMessageBoxSync({
						type: 'info',
						title: 'About',
						message: `audioMotion version ${ app.getVersion() }\nCopyright © 2018-2021 Henrique Avila Vianna`
					});
				}
			}
		]
	}
];

const menu = Menu.buildFromTemplate( template );
Menu.setApplicationMenu( menu );

const createWindow = () => {
	const iconPath = path.resolve( __dirname, 'audioMotion.ico' );
	const mainWindow = new BrowserWindow({
		width: 1400,
		height: 800,
		resizable: true,
		icon: iconPath,
		webPreferences: {
//			devTools: false,
//			preload: path.join( __dirname, 'preload.js' )
		}
	});

	mainWindow.on( 'enter-html-full-screen', () => mainWindow.setMenuBarVisibility(false) );
	mainWindow.on( 'leave-html-full-screen', () => mainWindow.setMenuBarVisibility(true) );

	mainWindow.loadURL( `http://localhost:${serverPort}/` );

	mainWindow.webContents.setWindowOpenHandler( ({ url }) => {
		if ( url.startsWith('https:') )
			shell.openExternal( url );
		return { action: 'deny' };
	});
};

app.on( 'ready', () => {
	// start server
	server.listen( 0, function() {
		serverPort = this.address().port;
		console.log( `\nListening on port ${serverPort}` );
		createWindow();
	});
});

app.on( 'window-all-closed', () => {
	if ( process.platform !== 'darwin' ) {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if ( BrowserWindow.getAllWindows().length === 0 ) {
		createWindow();
	}
});
