# Server modes

audioMotion can run in three different server scenarios:
+ serverless, in [local file mode](#local-file-mode) with limited capabilites;
+ using its own [custom file server](#custom-file-server) (preferred);
+ from a [standard web server](#standard-web-server) like Apache, Lighttpd or Nginx.

## Local file mode

You can run audioMotion in **file mode** by directly opening the `index.html` file located inside the `public` folder.

In this mode you can play individual music files from your computer or from a remote URL and use the microphone input, but the file explorer won't be available.

Due to the security policy of web browsers, JavaScript can only read files via HTTP protocol.
So, in order for audioMotion to read music files from your hard disk, you must have an HTTP server software running in your computer.

## Custom file server

audioMotion's custom file server allows you to easily access music files anywhere in your computer. This is the easiest and preferred way to run audioMotion.

The custom file server is included in the binaries you can download from the project's [releases page](https://github.com/hvianna/audioMotion.js/releases/latest).

Simply double-click the executable to launch audioMotion and you'll be asked for the path to your music folder.

You can also start audioMotion from the command-line to provide the path, by running:

```
audioMotion -m /path/to/music
```

Where `/path/to/music` is the full path to your music folder (in Windows machines the path will look like `c:\user\myUser\music`). Only files inside this folder will be available to audioMotion.

You should then be able to access audioMotion at `localhost:8000` on your web browser.

By default, audioMotion's server will only accept connections from localhost. If you'd like other computers in your network to have access to the server, you can start it with the `-e` argument:

```
audioMotion -e -m /path/to/music
```

⚠ **WARNING:**<br>
Please be aware that the `-e` flag will expose the contents of the mounted folder to anyone in your network (and potentially to the entire internet!) &mdash; use it only if you're in a trusted network and behind a firewall!

### Running from source code

audioMotion's server is written in [node.js](https://nodejs.org). If you have node installed, you can install the required packages by opening a command prompt in audioMotion's directory and running:

```
npm install
```

And then start the server by running:

```
npm start -- -m /path/to/music
```

## Standard web server

You can also use audioMotion with a standard web server, like Apache, Lighttpd or Nginx.

This is an alternative way to play music stored, for example, in older [NAS](https://en.wikipedia.org/wiki/Network-attached_storage) servers not capable of running Node.js.

Just copy the contents of the `public` folder to your server and make the necessary configurations:

* Assign a dedicated listening port to audioMotion so it can be accessed at the server's root, e.g., `http://192.168.0.32:8000` and not in a subdirectory like `http://192.168.0.32/audioMotion`;
* Directory listing must be enabled for the file explorer to work;
* All media files must be located under a main folder, mapped to the `/music` URL at the web server.


### Configuration tips:

**Lighttpd:**

```
$SERVER["socket"] == ":8000" {
    server.document-root = "/mnt/HD/HD_a2/web/audioMotion/"
    dir-listing.activate = "enable"
    alias.url += ( "/music/" => "/mnt/HD/HD_a2/MUSIC/" )
}
```

**Apache:**

```
Listen 8000

<VirtualHost *:8000>
	DocumentRoot "/mnt/HD/HD_a2/web/audioMotion/"
</VirtualHost>

Alias "/music" "/mnt/HD/HD_a2/MUSIC"

<Directory "/mnt/HD/HD_a2/MUSIC">
    Options Indexes FollowSymLinks
</Directory>
```

**Nginx:**

*To do...*

### Apache web server with Docker

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
