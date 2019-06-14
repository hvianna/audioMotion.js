/*
  Returns a list of drives on a Windows machine
  from https://medium.com/quasar-framework/building-an-electron-file-explorer-with-quasar-and-vue-7bf94f1bbf6

  used by server.js
*/

const exec = require('child_process').exec
const fs = require('fs')
const path = require('path')

exports.getWindowsDrives = function( callback ) {
  if (!callback) {
    throw new Error('getWindowsDrives called with no callback')
  }
  if (process.platform !== 'win32') {
    throw new Error('getWindowsDrives called but process.plaform !== \'win32\'')
  }
  let drives = []
  exec('wmic LOGICALDISK LIST BRIEF', (error, stdout) => {
    if (error) {
      callback(error, drives)
      return
    }
    // get the drives
    let parts = stdout.split('\n')
    if (parts.length) {
      // first part is titles; get rid of it
      parts.splice(0, 1)
      for (let index = 0; index < parts.length; ++index) {
        let drive = parts[index].slice(0, 2)
        if (drive.length && drive[drive.length - 1] === ':') {
          try {
            // if stat fails, it'll throw an exception
            fs.statSync(drive + path.sep)
            drives.push(drive)
          }
          catch (e) {
//            console.error(`Cannot stat windows drive: ${drive}`, e)
          }
        }
      }
      callback(null, drives)
    }
  })
}

