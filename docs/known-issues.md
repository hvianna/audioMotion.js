# Known issues

+ Access to files on local device only works on Chromium-based browsers, due to currently limited [support for File System Access API](https://caniuse.com/native-filesystem-api);<br>
  it should work on Chrome and Edge by default, on Brave you'll need to enable it in `chrome://flags/#file-system-access-api`
+ On **Firefox**, [Fill Opacity](users-manual.md#line-width-and-fill-opacity) may not work properly with [Radial](users-manual.md#switches) analyzer, due to [this bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1164912);
+ Visualization of live streams currently don't work on **Safari**, as documented in [this bug report](https://bugs.webkit.org/show_bug.cgi?id=195043).
