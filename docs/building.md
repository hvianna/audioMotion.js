building audioMotion
====================

These steps require [node.js](https://nodejs.org) installed in your computer.


## Building the client

The audioMotion client is located in the [public/](../public) folder. The JavaScript source code is read from [src/](../src) and bundled into a single `audioMotion.js` file using [webpack](https://webpack.js.org/).

To rebuild the client, run:

```
npm run build
```


## Building binaries

The provided binaries are compiled with [pkg](https://www.npmjs.com/package/pkg) and include both the server and the client in a single, self-contained executable file.

If you want to build your own binaries, first install pkg:

```
npm install -g pkg
```

After that, `npm run pkg` will build binaries for the standard targets: Windows, Linux and macOS. Please refer to pkg documentation for building to other available platforms.
