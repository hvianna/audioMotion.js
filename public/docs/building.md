# Building audioMotion

These steps require [Node.js](https://nodejs.org) installed in your computer.

First, [clone the project](https://github.com/hvianna/audioMotion.js) from GitHub or download the latest version of the source code from the [Releases page](https://github.com/hvianna/audioMotion.js/releases/latest).

Move to the project's directory and install the required npm packages:

```
cd audioMotion.js
npm install
```

The web app is bundled with [webpack](https://webpack.js.org/), from source code located in the `src/` directory.

If you make any changes to the source files, you'll need to rebuild the app, by running:

```
npm run build
```

This will generate the files `audioMotion.js`, `vendors.js` and `styles.css` into the [public/](../public) folder.

To test the app locally, run:

```
npm start
```

And then access `localhost:8080` on your browser.
