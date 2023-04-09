/**
 * Preload module
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exposes a method for the renderer to request data from the main process
// thanks https://stackoverflow.com/a/69917666
contextBridge.exposeInMainWorld( 'electron', {
	api: ( channel, ...args ) => ipcRenderer.invoke( channel, ...args )
});
