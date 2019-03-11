Changelog
=========

## version 19.2

### Changed:

+ Improved playback of gapless tracks


## version 19.1

### Added:

+ :sunglasses: New gradients;
+ Configuration presets;
+ Keyboard shortcuts (especially useful while on fullscreen mode);
+ Option to cycle through gradients on each track change;
+ On-screen display of song information via keyboard shortcut and, optionally, on each track change;
+ Support for the [#EXTINF directive](https://en.wikipedia.org/wiki/M3U#Extended_M3U) in playlists.

### Changed:

+ User preferences are now stored in local storage for browsers that implement it, instead of cookies;
+ Refactored some ES6-specific code to increase browser compatibility (especially on smart TVs);
+ Minor redesign of the UI and improved layout on smaller screens;
+ Renamed some of the gradients and ordered them alphabetically in the list.

### Fixed:

+ A bug where shuffling the playlist wouldn't properly load the first song;
+ Error when trying to load a song with a **#** character in its filename.


## version 18.12

### Added:

+ You can now load a song from your PC;
+ Clicking on canvas now toggles scale on/off.

### Changed:

+ Improved selection of audio source;
+ Improved layout on smaller screens;
+ General improvements in the UI;
+ New icons;
+ Some code clean-up and optimizations.

### Fixed:

+ *Should* **really** work on Safari now (including macOS).


## version 18.11

First official release.