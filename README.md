# Psalm Docker VS Code

This plugin is a fork made from the psalm-docker-vscode extension by Ignas2526 (here https://github.com/Ignas2526/psalm-docker-vscode). It solves some problems with that extension to make it useable:

- Allows multiple docker-compose.yml files (i.e., allow for override file + default file together)
- Updates the xdebug command line disabling feature to use xdebug v3 rather than xdebug v2
- Adds some examples to the readme so there's less guess work :)

-------

Visual Studio Code plugin for Psalm. This extension allows for the Psalm server to run inside the docker container. It works by having a docker-compose run the psalm server. Next, it translates the file paths between the host OS and the docker container. This extension is based on the official [Psalm VS Code Extension](https://github.com/psalm/psalm-vscode-plugin) extension.

## Features

- Runs [Psalm's analysis](https://getpsalm.org) when opening and saving files using the Language Server Protocol for communication.


## Installation & Configuration

1. Have a working docker container with docker-compose. It is important for the project code which the Psalm will analyze to be accessible inside the docker.
2. Inside the docker container with the code install psalm: `composer require --dev vimeo/psalm` and generate the psalm.xml file `./vendor/bin/psalm --init`
3. Configure this extension accordingly (example below)

```
// The name of your PHP service in your docker compose configuration (i.e., the
// first YAML label/indentation beneath outer 'services:' indentation level)
"psalm_docker.dockerServiceName": "php",

// Array of either 1 or 2 absolute paths to the docker compose Yaml files on your
// host filesystem. Always put your override path first (if applicable)
"psalm_docker.localDockerComposePaths": [
    "/your/host/path/docker-compose.override.yml",
    "/your/host/path/docker-compose.yml"
],

// Absolute path to the psalm-language-server binary (path inside the container!)
"psalm_docker.remotePsalmServerPath": "/app/vendor/bin/psalm-language-server",

// Absolute path of your project/repo for your host filesystem
"psalm_docker.localPath": "/your/host/path",

// Absolute path of your project/repo inside your docker filesystem
"psalm_docker.remotePath": "/app",

// Absolute path to your psalm XML config file inside your docker filesystem
"psalm_docker.remotePsalmXmlPath": "/app/psalm.xml",

// Domain or IP address where the container can reach back to your host. 
// See https://stackoverflow.com/a/62431165 on how you can configure 'host.docker.internal'
// or alternatively, if you are using default networking, you should be able to
// simply use the IP address '172.17.0.1'
// (Note: this is ignored if psalm_docker.ngrok is set to true. See below)
"psalm_docker.dockerHostDomainOrIp": "host.docker.internal",

// An alternative to the 'dockerHostDomainOrIp' setting. Set this to true to make
// the extension use ngrok to bypass the need for the docker image to reach the
// host via a local network port. Instead, it will use an ngrok dynamic domain
// to go via an internet tunnel
"psalm_docker.ngrok": false,
// Signup for free at https://dashboard.ngrok.com/login for token to allow TCP tunnels
// @see https://dashboard.ngrok.com/get-started/your-authtoken
"psalm_docker.ngrokAuthToken": "ABC123"
```

See https://dev.to/natterstefan/docker-tip-how-to-get-host-s-ip-address-inside-a-docker-container-5anh#:~:text=On%20Docker%20for%20Linux,%20the,you%20are%20using%20default%20networking. for more info on how
to access the host from inside the docker container

## Troubleshooting

**Debug Output**

Set debug mode to true to get debug output to diagnose problems. The output will
appear in your 'Output' tool window under an output channel named 'Psalm Docker Debug'

```
"psalm_docker.debug": true
```

**Using ngrok Tunnel**

If you have a non-standard docker configuration or are having issues with the docker container
communicating back to the vscode host, you can set the config option `psalm_docker.ngrok` to true as well as adding your ngrok auth token to `psalm_docker.ngrokAuthToken`.
This will mean ngrok is utilised to go via an internet tunnel rather than directly through the local network

See https://dashboard.ngrok.com/get-started/your-authtoken

## Contributing

You can build and test locally in Visual Studio this locally using `npm`:

```
npm install
npm run build
```
