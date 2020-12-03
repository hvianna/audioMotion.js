# Building audioMotion

These steps require [node.js](https://nodejs.org) installed in your computer.


## Building the web app

The source code is read from the [src/](../src) directory and bundled with [webpack](https://webpack.js.org/) to generate the files `audioMotion.js` and `styles.css`
into the [public/](../public) folder.

Install the required npm packages:

```
npm install
```

Build it with:

```
npm run build
```


## Creating binaries

audioMotion binaries use [pkg](https://www.npmjs.com/package/pkg) to package both the server and the web app files into a single, self-contained executable.

To generate your own binaries, first install **pkg** globally:

```
npm install -g pkg
```

Then package the application with:

```
npm run pack
```

This will create executable files for Windows, Linux and macOS in the `bin/` folder.

Please refer to the [pkg documentation](https://github.com/vercel/pkg#readme) for building to other available platforms.
