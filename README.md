# Psalm Docker VS Code

Visual Studio Code plugin for Psalm. This extension allows for the Psalm server to run inside the docker container. It works by having a docker-compose run the psalm server. Next, it translates the file paths between the host OS and the docker container. This extension is based on the official psalm-vscode-plugin extension.

## Features

- Runs [Psalm's analysis](https://getpsalm.org) when opening and saving files using the Language Server Protocol for communication.


## Installation & Configuration

1. Have a working docker container with docker-compose. It is important for the project code which the Psalm will analyze to be accessible inside the docker.
2. Inside the docker container with the code install psalm: `composer require --dev vimeo/psalm` and generate the psalm.xml file `./vendor/bin/psalm --init`
3. Configure this extension accordingly.


## Contributing

You can build and test locally in Visual Studio this locally using `npm`:

```
npm install
npm run build
```
