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


## playlists.cfg file

> Up to version 19.5, audioMotion required a `playlists.cfg` file where you should register several playlists to load music files from.
> The file explorer introduced in version 19.7 made this file obsolete, but its functionality is still supported for legacy users. Below is the original documentation.

The `playlists.cfg` file must be located in the same directory as the `index.html` file.
It is a plain text file with one playlist per line, in the format `playlist title | /path/to/playlist-file.ext` (that's a "pipe" character between the title and the path).
You can edit the playlists.cfg file in any plain text editor, like Windows' Notepad.

Example of playlists.cfg contents:

```
Pink Floyd albums | music/Rock/Pink Floyd/all-albums.m3u
Soundtrack mix | music/OST/best.m3u
Vince Guaraldi | music/jazz/vince guaraldi/playlist.m3u
Herbie Hancock | music/jazz/herbie hancock/playlist.m3u
```

Playlists themselves are also plain text files, containing one song per line. File extension must be `.m3u` or `.m3u8` for audioMotion to recognize it as a playlist.
The [Extended M3U](https://en.wikipedia.org/wiki/M3U#Extended_M3U) #EXTINF directive is also supported to provide track information (artist and song name).

You can use a music player software that supports M3U playlists, like [foobar2000](https://www.foobar2000.org/) or [VLC](https://www.videolan.org/vlc/), to arrange your songs more easily and generate the playlist.
On foobar2000, as of version 1.4.1, EXTM3U support can be enabled via *Preferences* > *Advanced* > *Tools* > *Write EXTM3U playlists*.

Make sure playlist entries do not contain absolute paths or drive letters - all paths should be relative to the location of the playlist file itself.
And remember all files must be located below your mapped "music" folder so audioMotion can read them.

Example of an m3u playlist file:

```
(1971) Meddle\05 Seamus.flac
(1971) Meddle\06 Echoes.flac
(1973) The Dark Side of the Moon\01 Speak To Me - Breathe.flac
(1973) The Dark Side of the Moon\02 On The Run.flac
(1973) The Dark Side of the Moon\03 Time.flac
```

Note that you can use either Windows-style backslashes `\` or Linux-style forward slashes `/` in your pathnames.
