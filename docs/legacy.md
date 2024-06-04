# Legacy features

## Custom file server

> Up to version 21.11, a custom file server written in Node.js was used to allow the web app to access files stored in the local device.

audioMotion's custom file server allows the web app to access music files from a selected folder in your hard disk.

You'll need [Node.js](https://nodejs.org) installed in your computer to run the server.

Install the required packages (first time only) with:

```
npm install
```

And then start the server by running:

```
npm run server -- -m /path/to/music
```

Where `/path/to/music` is the full path to your music folder (in Windows machines the path will look like `c:\user\myUser\music`).

You should then be able to access audioMotion at `localhost:8000` on your web browser.

By default, the server will only accept connections from *localhost*. If you'd like other computers in your network to access the web app, you can start the server with the `-e` argument:

```
npm run server -- -e -m /path/to/music
```

The complete command line options are:

```
-b <path> : path to folder with background images and videos
-e        : allow external connections (by default, only localhost)
-m <path> : path to music folder
-p <port> : change server listening port (default is 8000)
-s        : start server only (do not launch client)
```

!> **WARNING:**<br>
Please be aware that using the `-e` flag will expose the contents of the mounted folders to anyone in your network (and potentially to the entire internet!) &mdash; use it only if you're in a trusted network and behind a firewall!


## Running via Docker

> I'm no longer actively maintaining this, but it should still work.

If you use Docker, you can simply open a command prompt in audioMotion's directory and run:

`docker-compose up -d`

and you should be able to access audioMotion via HTTP by entering `localhost:8000` in your browser.

The provided configuration file maps the folder "music" in your user directory to the web server document root, so audioMotion can access files inside it as "music/song.mp3", for example.
This should work for the default "Music" folder on Windows. If you want to map a different folder or drive, edit the line below in `docker-compose.yml`:

```
    - ~/music:/usr/local/apache2/htdocs/music/
```

and change `~/music` for your desired local path, for example `j:\media\music` or `/j/media/music`. **Do not** change the path after the colon.

On Windows, if you're using a drive other than C: you might need to add it to the shared drives in Docker's configuration.

