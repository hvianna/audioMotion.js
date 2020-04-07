---
layout: default
title: Building audioMotion
parent: Documentation
nav_order: 3
---

# building audioMotion

These steps require [node.js](https://nodejs.org) installed in your computer.


## Building the web app

The source code is read from [src/](../src) and bundled with [webpack](https://webpack.js.org/) to generate the files `audioMotion.js` and `styles.css` into the [public/](../public) folder.

Install the required npm packages:

```
npm install
```

Build it with:

```
npm run build
```


## Building binaries

The provided binaries are compiled with [pkg](https://www.npmjs.com/package/pkg) and include both the server and the web app in a single, self-contained executable file.

If you want to build your own binaries, first install pkg:

```
npm install -g pkg
```

After that, `npm run pkg` will build binaries for the standard targets: Windows, Linux and macOS. Please refer to pkg documentation for building to other available platforms.
