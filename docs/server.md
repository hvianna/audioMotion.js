# Self-hosting audioMotion

If you'd like to host the audioMotion app in your own web server:

+ Clone the [project from GitHub](https://github.com/hvianna/audioMotion.js) or download the latest version of the source code from the [Releases page](https://github.com/hvianna/audioMotion.js/releases/).
+ Copy the `public` folder to the document root of your web server - you can rename it to anything you want;
+ Add your music files to the `music` folder (or create an **alias** to map the `/music` URL to another folder - see [configuration examples](#server-configuration-examples) below);
+ Add image and video files to the `backgrounds` folder, to be used as [background options](users-manual.md#background) in the player Settings.

?> Directory listing must be enabled for the file explorer to work - the included `.htaccess` file should do the trick if you're using an Apache-compatible web server.

!> **Playlists, Presets and Custom gradients** are saved to the browser's storage and will only be accessible in the same browser they were saved.
The storage is also tied to the server **address and port**, so if any of those change, data saved on a different address/port won't be accessible.

## config.json file <!-- {docsify-ignore} -->

A _config.json_ file in the same directory as audioMotion's _index.html_ allows you to configure some server options.
You can use the **config.json.dist** file included in the `public` directory as a reference (copy it or rename it to _config.json_).

| option | values (default in bold) | description |
|--------|---------------------------------|-------------|
| **defaultAccessMode** | **`"local"`** \| `"server"` | Initial (first run) file access mode - user's device or /music directory on server
| **enableLocalAccess** | **`true`** \| `false` | Whether or not to enable access to local device (*true* allows user to switch between local or server)


## Server configuration examples <!-- {docsify-ignore} -->

The examples below configure audioMotion to run at server port 8000 and map the /music URL to a different directory.

### Apache: <!-- {docsify-ignore} -->

```apache2.conf
Listen 8000

<VirtualHost *:8000>
    DocumentRoot "/mnt/HD/HD_a2/web/audioMotion/"
</VirtualHost>

Alias "/music" "/mnt/HD/HD_a2/MUSIC"

<Directory "/mnt/HD/HD_a2/MUSIC">
    Options +Indexes +FollowSymLinks
</Directory>
```

### Lighttpd: <!-- {docsify-ignore} -->

```lighttpd.conf
$SERVER["socket"] == ":8000" {
    server.document-root = "/mnt/HD/HD_a2/web/audioMotion/"
    dir-listing.activate = "enable"
    alias.url += ( "/music/" => "/mnt/HD/HD_a2/MUSIC/" )
}
```

### Nginx: <!-- {docsify-ignore} -->

*To do...*

