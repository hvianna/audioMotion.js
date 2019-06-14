audioMotion server options
==========================

## Custom file server (requires nodeJS)

audioMotion's custom file server allows you to easily access music files anywhere in your computer. This option requires [Node.js](https://nodejs.org) installed in the server machine.

To install the required packages, open a command prompt in audioMotion's directory and run:

```
npm install
```

To start audioMotion's file server, run:

```
npm start
```

By the default, audioMotion's server will only accept connections from localhost. If other computers in your network to have access to the server, you can start it with the `-e` parameter:

```
npm start -- -e
```

**WARNING!** Please note that the server will completely expose all of its hard drive(s) contents, so only do this if you're in a trusted network and behind a firewall!!


## Standard web server mode

You can also run audioMotion from a standard web server like Apache, Lighttpd or Nginx.

* Server must be configured to listen on a dedicated port so audioMotion can be accessed at the server's root, e.g., `http://192.168.0.32:8000` and not in a subdirectory like `http://192.168.0.32/audioMotion`;
* Directory listing must be enabled for the file explorer to work;
* All media files must be located under a main folder, mapped to the `/music` directory at the web server.

If you have Docker installed, you can open a command prompt in audioMotion's directory and run:

```
docker-compose up -d
```

And you should be able to access audioMotion at `localhost:8000`. By default, the listening port is set to `8000` and the `/music` folder is mapped under your user's home directory. You can change these in the `docker-compose.yml` file.

If you already have a web server running somewhere else, say in a NAS device in your local network, you just need to copy the contents of the `public` folder to your server and configure it, following the tips below:

### Configuration tips:

For Lighttpd:

```
$SERVER["socket"] == ":8000" {
    server.document-root = "/mnt/HD/HD_a2/web/audioMotion/"
    dir-listing.activate = "enable"
    alias.url += ( "/music/" => "/mnt/HD/HD_a2/MUSIC/" )
}
```

For Apache:

```
Listen 8000

<VirtualHost *:8000>
	DocumentRoot "/mnt/HD/HD_a2/web/audioMotion/"
</VirtualHost>

<Directory /files>
    Options Indexes FollowSymLinks
</Directory>
```

For Nginx:

???
