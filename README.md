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
// simply use the IP address '172.17.0.1' (see https://bit.ly/3bjvFuu for more)
"psalm_docker.dockerHostDomainOrIp": "host.docker.internal"
```

## Troubleshooting

Set debug mode to true to get debug output to diagnose problems. The output will
appear in your 'Output' tool window under an output channel named 'Psalm Docker Debug'

```
"psalm_docker.debug": true
```

## Current Assumptions

- Xdebug v3 is installed in your PHP container

## Contributing

You can build and test locally in Visual Studio this locally using `npm`:

```
npm install
npm run build
```
