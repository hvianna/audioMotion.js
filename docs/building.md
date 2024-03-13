# Building audioMotion

These steps require [Node.js](https://nodejs.org) installed in your computer.

First, [clone the project](https://github.com/hvianna/audioMotion.js) from GitHub or download the latest version of the source code from the [Releases page](https://github.com/hvianna/audioMotion.js/releases/latest).

Move to the project's directory and install the required npm packages:

```shell
cd audioMotion.js
npm install
```


## Building the web app

The source code is in the `src/` directory, and it must be bundled with [webpack](https://webpack.js.org/).

If you make any changes to the source files, you'll need to rebuild the app, by running:

```shell
npm run build
```

This will generate the files `audioMotion.js`, `vendors.js` and `styles.css` into the [public/](../public) folder.


## Making the binaries

!> This section refers to the native application built with Electron, which development is currently on hold.

Source code specific to the Electron app is in the `app/` directory.

After building the web app, you can generate the full application with:

```
npm run package
```

This uses Electron Forge to create the native application files in the `out/` folder.

You can then generate the binaries / executables with:

```
npm run make
```

This will create a distributable installer in the `out/make/` folder.

The project's `package.json` includes configurations for generating distributables for Windows, Linux (Debian and RedHat), and macOS.

Platform requirements:

Maker    | Target platform | Platform required for building
---------|-----------------|-------------------------------
squirrel | Windows         | Windows machine, or Linux or macOS machine with `mono` and `wine` installed
deb      | Debian          | Linux or macOS machine with the `fakeroot` and `dpkg` packages installed
rpm      | RedHat          | Linux machine with the `rpm` or `rpm-build` packages installed
dmg      | macOS           | macOS machine with Xcode installed

Please refer to Electron Forge's [Makers documentation](https://www.electronforge.io/config/makers) for additional information and other available platforms.

