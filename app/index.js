const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
//if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
//  app.quit();
//}

const server = require('./server');

console.log( server.port );

const createWindow = () => {
  const iconPath = path.resolve( __dirname, 'audioMotion.ico' );
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    resizable: true,
    icon: iconPath,
    webPreferences: {
//      devTools: false,
    }
  });

  mainWindow.loadURL( `http://localhost:${ server.port }/` );
};

app.on( 'ready', createWindow );

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
