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
"psalm_docker.dockerServiceName": "php",
"psalm_docker.localDockerComposePaths": [
    "/your/host/path/docker-compose.override.yml",
    "/your/host/path/docker-compose.yml"
],
"psalm_docker.remotePsalmServerPath": "vendor/bin/psalm-language-server",
"psalm_docker.localPath": "/your/host/path",
"psalm_docker.remotePath": "/app",
"psalm_docker.remotePsalmXmlPath": "/app/psalm.xml"
```

## Troubleshooting

Set debug mode to true to get debug output to diagnose problems:

```
"psalm_docker.debug": true
```

## Current Assumptions

- Xdebug v3 is installed in your PHP container
- Special domain `host.docker.internal` can be used to reach back to host (see https://stackoverflow.com/a/62431165 on how this can be achieved)

## Contributing

You can build and test locally in Visual Studio this locally using `npm`:

```
npm install
npm run build
```
