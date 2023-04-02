# Building audioMotion

These steps require [Node.js](https://nodejs.org) installed in your computer.

Install the required npm packages:

```
npm install
```


## Building the web app

The source code is read from the [src/](../src) directory and bundled with [webpack](https://webpack.js.org/).

Build it with:

```
npm run build
```

This will generate the files `audioMotion.js` and `styles.css` into the [public/](../public) folder.


## Making the binaries

```
npm run package
```

Uses electron-forge to create the native application files in the `out/` folder.

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


## Legacy binaries

Up to version 21.11, audioMotion used [pkg](https://www.npmjs.com/package/pkg) to package the Node.js runtime, the file server and the web app files into a single executable.

These versions run in the web browser, but using a custom file server to provide access to music files in your hard drive.

See the [Running as a Web App](webapp.md#custom-file-server) page for more information on using the custom file server. The same command line options apply to the executable.

If you wish to generate these legacy binaries, you'll need to install **pkg** globally:

```
npm install -g pkg
```

Then package the application with:

```
npm run pkg
```

This will create executable files for Windows, Linux and macOS in the `bin/` folder.

Please refer to the [pkg documentation](https://github.com/vercel/pkg#readme) for building to other available platforms.
