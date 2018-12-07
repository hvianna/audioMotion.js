audioMotion.js
==============

[![GitHub release](https://img.shields.io/github/release/hvianna/audioMotion.js.svg) ![GitHub Release Date](https://img.shields.io/github/release-date/hvianna/audioMotion.js.svg)](https://github.com/hvianna/audioMotion.js/releases/latest)

A real-time graphic spectrum analyzer and audio player using Web Audio and Canvas APIs.

## Features

* Beautiful high-resolution (retina / HiDPI ready) graphic spectrum analyzer with fullscreen display
* Customizable logarithmic frequency scale, for improved visualization of specific ranges
* Customizable WebAudio API parameters (FFT size, sensitivity and time-smoothing)
* HTML5 audio player with playlist support
* Visualize audio input from your microphone (or "stereo mix", if your soundcard supports it)

## Demo

https://hvianna.github.io/audioMotion.js/

## Usage

On the demo website you can load individual songs from your PC and try the pre-configured demo playlists.

In order to use your own playlists and get the best out of audioMotion, you'll need to set up a local web server.<br>
<sub>(Note: on Firefox, as of version 63, you *may be* able to load playlists and music files stored *inside audioMotion's folder,* but everything else will require the files to be loaded via HTTP protocol, that's why you need a web server).</sub>

The easiest way to do this is by using [Docker](https://www.docker.com/). Once you have Docker installed and running, simply open a command prompt in the folder where you downloaded audioMotion.js to, and run:

`docker-compose up -d`

and you should be able to access the player at `localhost:8000` in your browser.

The provided configuration file maps the folder "music" in your user directory to the web server document root, so audioMotion can access files inside it as "music/song.mp3", for example. This should work for the default "Music" folder on Windows. If you want to map a different folder or drive, edit the line below in `docker-compose.yml`:

```
    - ~/music:/usr/local/apache2/htdocs/music/
```

and change `~/music` for your desired local path, for example `j:\media\music` or `/j/media/music`. On Windows, if you're using a drive other than C: you might need to add it to the shared drives in Docker's configuration.

## Playlists

The `playlists.cfg` file is where you register all the playlists you want available inside audioMotion. This is a plain text file with one playlist per line, in the format `playlist title | playlist path and filename` (that's a "pipe" character between the title and the path). You can edit the playlists.cfg file in any plain text editor, like Windows' Notepad.

Example of playlists.cfg contents:

```
Pink Floyd albums | music/Rock/Pink Floyd/all-albums.m3u
Soundtrack mix | music/OST/best.m3u
Vince Guaraldi | music/jazz/vince guaraldi/playlist.m3u
Herbie Hancock | music/jazz/herbie hancock/playlist.m3u
```

Playlists themselves are also plain text files, containing one song per line. File extension must be `.m3u` or `.m3u8` for audioMotion.js to recognize it as a playlist.

You can use a music player software that supports [M3U](https://en.wikipedia.org/wiki/M3U) playlists, like [foobar2000](https://www.foobar2000.org/) or [VLC](https://www.videolan.org/vlc/), to arrange your songs more easily and generate the playlist. Just make sure the playlist entries do not contain absolute paths or drive letters - they should be relative to the location of the playlist file itself, or audioMotion won't be able to load the songs. And remember all files must be located below your mapped "music" folder.

Example of an m3u playlist file:

```
(1971) Meddle\05 Seamus.flac
(1971) Meddle\06 Echoes.flac
(1973) The Dark Side of the Moon\01 Speak To Me - Breathe.flac
(1973) The Dark Side of the Moon\02 On The Run.flac
(1973) The Dark Side of the Moon\03 Time.flac
```

Note that you can use either Windows-style backslashes `\` or Linux-style forward slashes `/` in your pathnames. See the provided playlist files inside the `demo` folder for more examples.

As for the audio files themselves, audioMotion.js should be able to play most mainstream formats, like mp3, ogg, m4a and flac, but codec support may vary, depending on your web browser and operating system.

## Configuration options

Below you'll find a brief description of the configuration options. Your preferences will be saved in browser cookies and restored the next time you open audioMotion.

![config-bar](img/configuration-bar.png "Analyzer configuration options")

### FFT Size

The number of samples used for the FFT performed by the analyzer. Larger values will provide greater detail on lower frequencies, but will require more CPU power. Default is 8192 samples.

### Range

The lowest and highest frequencies you want to see in the graphic spectrum analyzer. You can use this to zoom in a specific frequency range. Default is 20Hz - 16KHz.

### Smoothing

Average constant used to smooth values between analysis frames. Lower values make the analyzer react faster to changes, and may look better with faster tempo songs. Increase it if the animation looks too "jumpy". Default is 0.5.

### Gradient

Several options of color gradients for the analyzer bars. Default is "Classic".

### LOG switch (Logarithmic scale)

The logarithmic scale allocates more canvas space for lower frequencies, resulting in improved visualization of beats, bass and vocals. Default on.

Turn this option off to make audioMotion.js use a linear distribution of frequencies in the horizontal axis. Combine it with a narrower frequency range and lower FFT size for a more classic-looking analyzer, with wider bars (see screenshot 2 below).

### SCALE switch (Toggle scale)

This option toggles the display of the frequency scale. Default on.

Clicking on the canvas will also toggle the scale on and off. Useful when you're on fullscreen mode.

### SENS switch (Sensitivity)

Turn this option on to increase the analyzer sensitivity and improve the visualization of songs too quiet. Default off.

### PEAK switch (Show peaks)

Turn this option on to hold volume peaks on screen for a short time. Default on.

## Screenshots

audioMotion.js user interface
![screenshot1](img/screenshot1.png "audioMotion.js user interface")

Full screen view: Linear scale, 20Hz-5KHz range, 1024-sample FFT, dusk gradient
![screenshot2](img/screenshot2.png "Full screen view: Linear scale, 20Hz-5KHz range, 1024-sample FFT, dusk gradient")

Full screen view: Logarithmic scale, 20Hz-16KHz range, 8192-sample FFT, classic gradient
![screenshot3](img/screenshot3.png "Full screen view: Logarithmic scale, 20Hz-16KHz range, 8192-sample FFT, classic gradient")

## References and acknowledgments

* audioMotion.js was largely inspired by [Soniq Viewer for iOS](https://itunes.apple.com/us/app/soniq-viewer/id448343005), by Yuji Koike
* [WebAudio API documentation @MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
* [WebAudio API Specification](https://webaudio.github.io/web-audio-api/)
* [HTML Canvas Reference @W3Schools](https://www.w3schools.com/tags/ref_canvas.asp)
* [What does the FFT data in the Web Audio API correspond to?](https://stackoverflow.com/a/14789992/2370385)
* [HTML5 check if audio is playing?](https://stackoverflow.com/a/46117824/2370385)
* [Unlocking Web Audio — the smarter way](https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09)
* [cookies.js](https://github.com/madmurphy/cookies.js) licensed under [GPL 3.0](http://www.gnu.org/licenses/gpl-3.0-standalone.html)
* Icons by [icons8](https://icons8.com) licensed under [Creative Commons Attribution-NoDerivs 3.0 Unported](https://creativecommons.org/licenses/by-nd/3.0/).

## Song credits

Songs included in the demo playlists:

* Albinoni — Adagio in G minor, Arr for alto saxophone and piano by David Hernando Vitores ([source](https://commons.wikimedia.org/wiki/File:Tomaso_Giovanni_Albinoni_-_Adagio_in_G_minor_-_Arr_for_alto_saxophone_and_piano_-_David_Hernando_Vitores.ogg))<br>Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.en)
* Brazilian National Anthem - Choral ([source](http://www.dominiopublico.gov.br/pesquisa/DetalheObraForm.do?select_action=&co_obra=2480)) - Public domain
* "The Factory" by Multifaros ([source](https://archive.org/details/The_Factory-3613)) - Licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/)
* "Funky Chunk" by Kevin MacLeod ([incompetech.com](https://incompetech.com)) - Licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/)
* "Spell" by Rolemusic ([source](https://archive.org/details/Straw_Fields-8753)) - Licensed under [CC BY-NC-SA 3.0 US](http://creativecommons.org/licenses/by-nc-sa/3.0/us/)
* "We Come Together" by LukHash ([source](https://archive.org/details/ShMusic-DigitalMemories/)) - Licensed under [CC BY-NC-ND 3.0](http://creativecommons.org/licenses/by-nc-nd/3.0/)
* Test tones created with [Audacity](https://www.audacityteam.org/).

## License

audioMotion.js is licensed under the [GNU Affero General Public License, version 3 or later](https://www.gnu.org/licenses/agpl.html).