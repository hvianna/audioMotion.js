audioMotion.js
==============

A real-time graphic spectrum analyzer and audio player using WebAudio API and canvas.

## Features

* Beautiful high-resolution graphic spectrum analyzer with fullscreen display
* Customizable logarithmic scale, for improved visualization of specific frequency ranges
* Customizable WebAudio API parameters (FFT size, sensitivity and time-smoothing)
* HTML5 audio player with playlist support
* You can also visualize audio input from your microphone, or "stereo mix" if your soundcard supports it
* Native JavaScript, with no external libraries or dependencies

## Demo

https://hvianna.github.io/audioMotion.js/

## Usage

Since JavaScript can't read files directly from the client's hard disk, you'll need to set up a local web server in order to actually play your own music. The easiest way to do this is by using [Docker](https://www.docker.com/). Once you have Docker installed and running, simply open a command prompt in the folder where you downloaded audioMotion.js to and run:

`docker-compose up -d`

and you should be able to access the player at `localhost:8000` in your browser.

The provided configuration file maps the folder "music" in your user directory to the web server document root, so audioMotion can access files inside it as "music/song.mp3", for example. This should work for the default "Music" folder on Windows. If you want to map a different folder or drive, edit the line below in `docker-compose.yml`:

```
    - ~/music:/usr/local/apache2/htdocs/music/
```

and change `~/music` for your desired local path, for example `j:\media\music` or `/j/media/music`. On Windows, if you're using a drive other than C: you might need to add it to the shared drives in Docker's configuration.

You can add your own playlists to the `playlists.cfg` file, so you can easily load songs into audioMotion.

## Playlists formats

The `playlists.cfg` file is where you register all the playlists you want available inside audioMotion. This is a plain text file with one playlist per line, in the format `playlist title | playlist path and filename` (that's a "pipe" character between the title and the path). You can edit the playlists.cfg file in any plain text editor, like Windows' Notepad.

Example of playlists.cfg file:

```
Pink Floyd albums | music/Rock/Pink Floyd/all-albums.m3u
Soundtrack mix | music/OST/best.m3u
Vince Guaraldi | music/jazz/vince guaraldi/playlist.m3u
Herbie Hancock | music/jazz/herbie hancock/playlist.m3u
```

Playlists themselves are also plain text files, containing one song per line. File extension must be `.m3u` or `.m3u8` for audioMotion.js to recognize it as a playlist.

You can use a music player software that supports m3u playlists, like [foobar2000](https://www.foobar2000.org/) or [VLC](https://www.videolan.org/vlc/), to arrange your songs more easily and generate the playlist. Just make sure the playlist entries do not contain absolute paths or drive letters - they should be relative to the location of the playlist file itself, or audioMotion won't be able to load the songs. And remember all files must be located below your mapped "music" folder.

Example of playlist file:

```
(1971) Meddle\05 Seamus.flac
(1971) Meddle\06 Echoes.flac
(1973) The Dark Side of the Moon\01 Speak To Me - Breathe.flac
(1973) The Dark Side of the Moon\02 On The Run.flac
(1973) The Dark Side of the Moon\03 Time.flac
```

Note that you can use both Windows-style backslashes `\` and Linux-style forward slashes `/` in your pathnames. See the provided playlist files inside the `demo` folder for more examples.

As for the audio files themselves, codec support may depend on your web browser and operating system, but you should be able to play most mainstream formats, like mp3, ogg, m4a and flac.

## Configuration options

Below is a brief description of the configuration options. You can change the default values in the `defaults` array at the very beginning of [`audioMotion.js`](https://github.com/hvianna/audioMotion.js/blob/master/audioMotion.js#L26) file.

### FFT Size

The number of samples used for the FFT performed by the analyzer. Larger values will provide greater detail on lower frequencies, but will require more CPU power. Default is 8192 samples.

### Range

The lowest and highest frequencies you want to see in the graphic spectrum analyzer. You can use this to zoom in a specific frequency range. Default is 20Hz - 16KHz.

### Smoothing

Average constant used to smooth values between analysis frames. Lower values may produce better	results for faster tempo songs. Default is 0.5.

### Gradient

Several options of color gradients for the analyzer bars. Default is "Classic".

### Logarithmic scale

The logarithmic scale allocates more canvas space for lower frequencies, resulting in improved visualization of beats, bass and vocals. Default checked.

Unchecking this option will use a linear distribution of frequencies in the horizontal axis. Select a narrower frequency range and lower FFT size for a more classic-looking analyzer, with wider bars (see screenshot 2 below).

### Show scale

This option toggles the display of the frequency scale. Default checked.

### High sensitivity

Check this option to increase the analyzer sensitivity and improve the visualization of low volume songs. Default unchecked.

### Show peaks

Check this option to retain each frequency peak value on screen for a short time. Default checked.

## Screenshots

![screenshot1](img/screenshot1.png "audioMotion.js visualizer interface")
audioMotion.js visualizer interface

![screenshot2](img/screenshot2.png "Full screen view: Linear scale, 20Hz-5KHz range, 1024-sample FFT, dusk gradient")
Full screen view: Linear scale, 20Hz-5KHz range, 1024-sample FFT, dusk gradient

![screenshot3](img/screenshot3.png "Full screen view: Logarithmic scale, 20Hz-16KHz range, 8192-sample FFT, classic gradient")
Full screen view: Logarithmic scale, 20Hz-16KHz range, 8192-sample FFT, classic gradient

## References and acknowledgments

* audioMotion.js was largely inspired by [Soniq Viewer for iOS](https://itunes.apple.com/us/app/soniq-viewer/id448343005), by Yuji Koike
* [WebAudio API documentation @MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
* [WebAudio API Specification](https://webaudio.github.io/web-audio-api/)
* [What does the FFT data in the Web Audio API correspond to?](https://stackoverflow.com/a/14789992/2370385)
* [HTML5 check if audio is playing?](https://stackoverflow.com/a/46117824/2370385)
* [Unlocking Web Audio — the smarter way](https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09)
* Icons provided by [Font Awesome](https://fontawesome.com/)

## Song credits

Songs included in the demo playlist:

* Albinoni's Adagio in G minor, Arr for alto saxophone and piano by David Hernando Vitores ([source](https://commons.wikimedia.org/wiki/File:Tomaso_Giovanni_Albinoni_-_Adagio_in_G_minor_-_Arr_for_alto_saxophone_and_piano_-_David_Hernando_Vitores.ogg))

  Licensed under [Creative Commons: Attribution-Share Alike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/deed.en)

* Brazilian National Anthem - Choral ([source](http://www.dominiopublico.gov.br/pesquisa/DetalheObraForm.do?select_action=&co_obra=2480))
  
  Public domain
  
* "The Factory" by Multifaros ([source](https://archive.org/details/The_Factory-3613))

  Licensed under [Creative Commons: By Attribution 3.0 License](http://creativecommons.org/licenses/by/3.0/)
  
* "Funky Chunk" by Kevin MacLeod ([incompetech.com](https://incompetech.com))

  Licensed under [Creative Commons: By Attribution 3.0 License](http://creativecommons.org/licenses/by/3.0/)
  
* "Spell" by Rolemusic ([source](https://archive.org/details/Straw_Fields-8753))

  Licensed under [Creative Commons: Attribution-Noncommercial-Share Alike 3.0 United States](http://creativecommons.org/licenses/by-nc-sa/3.0/us/)
  
* "We Come Together" by LukHash ([source](https://archive.org/details/ShMusic-DigitalMemories/))

  Licensed under [Creative Commons: Attribution-Noncommercial-No Derivative Works 3.0](http://creativecommons.org/licenses/by-nc-nd/3.0/)

Test tones created with [Audacity](https://www.audacityteam.org/).

## License

audioMotion.js is licensed under the [GNU Affero General Public License, version 3 or later](https://www.gnu.org/licenses/agpl.html).