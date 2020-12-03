# Legacy features

## playlists.cfg file

Up to version 19.5 audioMotion required a `playlists.cfg` file where you should register several playlists to load music files from.
The file explorer introduced in version 19.7 made this file obsolete, but its functionality is still supported for legacy users. Below is the original documentation.

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
