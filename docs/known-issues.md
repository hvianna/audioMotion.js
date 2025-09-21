# Known issues

### Browser requirements

**audioMotion** requires at least Chrome/Chromium 80, Firefox 74 or Safari 13.1.

### File System Access API

Playing music and loading backgrounds from your local device relies on the [File System Access API](https://caniuse.com/native-filesystem-api), which
full specification is currently implemented **only on Chromium-based browsers.**

This feature should work by default on Chrome, Opera and Edge; on **Brave**, you'll need to enable it in `chrome://flags/#file-system-access-api` (copy and paste it in the address bar).

### Firefox users

On **Firefox**, [Fill Opacity](advanced.md#fill-opacity) may not work properly with [Radial](settings.md#effects-switches) analyzer, due to [this bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1164912).

### Safari users

Visualization of **live streams** currently DO NOT work on **Safari**, as documented in [this bug report](https://bugs.webkit.org/show_bug.cgi?id=195043).
