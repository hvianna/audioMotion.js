# Self-hosting the app

If you'd like to host audioMotion in your own web server:

+ Clone the [project from GitHub](https://github.com/hvianna/audioMotion.js) or download the latest version of the source code from the [Releases page](https://github.com/hvianna/audioMotion.js/releases/).
+ Copy the `public` folder to the document root of your web server - you can rename it to anything you want;
+ Add your music files to the `music` folder (or create an **alias** to map the `/music` URL to another folder - see [configuration examples](#server-configuration-examples) below);
+ Add image and video files to the `backgrounds` folder, to be used as [Background](settings.md#background) options.

You can also run the app locally with Node.js - see the [Building audioMotion](building.md) section.

?> Directory listing must be enabled for the file explorer to work - the included `.htaccess` file should be enough if you're using an Apache-compatible web server.

!> **Playlists, Presets and Custom gradients** are saved to the browser's storage and will only be accessible in the same browser they were saved.
The storage is also tied to the server **address and port**, so if any of those change, data saved on a different address/port won't be accessible.

## config.yaml file

A **config.yaml** file in the same directory as audioMotion's _index.html_ allows you to configure some server options.

| option | possible values<br>(default in bold) | description |
|--------|--------------------------|-------------|
| **defaultAccessMode** | **`local`** \| `server` | Initial (first run) file access mode - user's device or /music directory on server
| **enableLocalAccess** | **`true`** \| `false` | Whether to enable access to local device (*true* allows user to switch between local or server)
| **frontPanel**        | **`open`** \| `close` | Initial state of the Front Panel - behaves like the [collapse/expand front panel button](user-interface.md#main-function-buttons)
| **preserveFilenames** | `true` \| **`false`** | Whether to preserve filenames as is in the play queue (can also be toggled via [General Settings](configuration.md#general-settings))

The `config.yaml.example` file included in the `public/` folder can be used as a template.

## URL parameters

The following URL parameters can also be used when accessing audioMotion:

| parameter | possible values | description |
|-----------|-----------------|-------------|
| **debug** | *none* | If present in the URL, starts the console in [debug mode](console.md#debug), which may help identify issues during the initialization stage
| **mode**  | `local` \| `server` | Starts audioMotion in the desired access mode (local access must be enabled on the server)
| **frontPanel** | `open` \| `close` | Same as the corresponding `config.yaml` option, but overrides the server configuration

Use an **&** character to separate multiple parameters. Example usage:

[https://audiomotion.app?debug&mode=server&frontPanel=close](https://audiomotion.app?debug&mode=server&frontPanel=close)

## Server configuration examples

The examples below configure the server to use port 8000 for audioMotion, and map the */music* URL to a different directory outside its document root.

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

