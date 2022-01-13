/**
 * Preload module
 *
 * Used to transfer localStorage data between the renderer and main processes,
 * to keep the data persistent for any server port we use.
 */

const { contextBridge, ipcRenderer } = require('electron');

// send localStorage data to main process before renderer window closes
// thanks https://stackoverflow.com/a/62941138
window.addEventListener( 'beforeunload', () => {
	ipcRenderer.sendSync( 'send-storage', JSON.stringify( localStorage ) );
	localStorage.clear(); // so it doesn't get saved also on app data for every server port
});

// exposes a method for the renderer to request data from the main process
// thanks https://stackoverflow.com/a/69917666
contextBridge.exposeInMainWorld( 'electron', {
	api: ( channel, data ) => ipcRenderer.invoke( channel, data )
});
