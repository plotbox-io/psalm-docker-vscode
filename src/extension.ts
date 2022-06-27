import * as vscode from 'vscode';
import * as child from 'child_process';
import * as net from 'net';
import * as url from 'url';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	StreamInfo
} from 'vscode-languageclient';
var commandExists = require('command-exists').sync;
const ngrok = require('ngrok');

let client: LanguageClient;

/**
 * Called when extension is activated. Extension is activated the
 * very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext) {

	// this has a low priority so it will end up being more towards the right.
	let psalmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	psalmStatusBar.text = ' $(loading~spin) Psalm: starting';
	psalmStatusBar.tooltip = 'Psalm Language Server';
	psalmStatusBar.show();

	const escapeRegExp = (string: string) => {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

	const normalizePath = (path: string) => {
		// Convert any backslashes (\) into forwardslashes
		path = path.replace(/\\/g, '/');

		// remove trailing slash if exists
		if (path.substr(-1) == '/') {
			path = path.slice(0, -1);
		}

		// add preceding if not exists
		if (path[0] != '/') {
			path = '/' + path;
		}

		return path;
	}

	const config = vscode.workspace.getConfiguration('psalm_docker');

	let localDockerComposePaths: Array<string> = config.get('localDockerComposePaths') || [];
	let remotePsalmServerPath: string = config.get('remotePsalmServerPath') || '';
	let localPath: string = normalizePath(config.get('localPath') || '');
	let remotePath: string = normalizePath(config.get('remotePath') || '/var/www/html/');
	let remotePsalmXmlPath: string = config.get('remotePsalmXmlPath') || '/var/www/html/psalm.xml';
	let dockerServiceName: string = config.get('dockerServiceName') || '';
	let dockerHostDomainOrIp: string = config.get('dockerHostDomainOrIp') || 'host.docker.internal';
	let useNgrok: boolean = config.get('ngrok') || false;
	let debug: boolean = config.get('debug') || false;

	let localUriPath = url.format(url.parse('file://' + localPath));
	let remoteUriPath = url.format(url.parse('file://' + remotePath));
	const debugChannel = vscode.window.createOutputChannel("Psalm Docker Debug");

	const fatalError = function (errorMessage: string) {
		psalmStatusBar.text = 'Psalm Docker: ' + errorMessage;
		debugChannel.appendLine(errorMessage);
		throw errorMessage;
	};

	if (debug) {
		vscode.window.showInformationMessage('Starting Server...');

		debugChannel.show();
		debugChannel.appendLine('localUriPath: ' + localUriPath + "\n");
		debugChannel.appendLine('remoteUriPath: ' + remoteUriPath + "\n");

		debugChannel.appendLine('psalm_docker.localDockerComposePaths: ' + localDockerComposePaths + "\n");
		debugChannel.appendLine('psalm_docker.remotePsalmServerPath: ' + remotePsalmServerPath + "\n");
		debugChannel.appendLine('psalm_docker.localPath: ' + localPath + "\n");
		debugChannel.appendLine('psalm_docker.remotePath: ' + remotePath + "\n");
		debugChannel.appendLine('psalm_docker.remotePsalmXmlPath: ' + remotePsalmXmlPath + "\n");
		debugChannel.appendLine('psalm_docker.dockerServiceName: ' + dockerServiceName + "\n");
	}

	let serverOptions = (() => new Promise<StreamInfo>((resolve, reject) => {
		// 'connection' listener
		const server = net.createServer(socket => {
			if (debug) {
				debugChannel.appendLine('Psalm process connected\n');
				socket.on('end', () => {
					debugChannel.appendLine('Psalm process disconnected\n');
				});
				socket.on('data', (data: string) => {
					debugChannel.appendLine(data.toString() + "\n");
				});
			}
			server.close();
			resolve({ reader: socket, writer: socket });
		});

		server.listen(0, '0.0.0.0', async function () {

			const address = server.address();
			if (address === null || typeof address === 'string') {
				debugChannel.appendLine('cannot start listening, server.address() issue\n');
				return;
			}

			var dockerConnectBackHost = dockerHostDomainOrIp;
			var dockerConnectBackPort = address.port;
			if (useNgrok) {
				let ngrokUrlResult;
				try {
					ngrokUrlResult = await ngrok.connect({ proto: 'tcp', addr: address.port });
				}
				catch (e) {
					const error = e as Error;
					debugChannel.appendLine(`${error.message} (${error.name})`);
					if (error.stack) {
						debugChannel.appendLine(error.stack);
					}
					debugChannel.appendLine(`There was an error (${error.name}) initiating ngrok tunnel to random server port ${address.port}`);
					fatalError(`Error initiating ngrok tunnel!`);
				}
				const urlObj = url.parse(ngrokUrlResult);
				dockerConnectBackHost = String(urlObj.host);
				dockerConnectBackPort = Number(urlObj.port);
			}

			if (debug) {
				debugChannel.appendLine('vscode server is listening on 0.0.0.0: ' + address.port + "\n");
			}

			const dockerConfig: string[] = [];

			const dockerComposePathArgs = [];
			localDockerComposePaths.forEach((path) => {
				dockerConfig.push('-f');
				dockerConfig.push(path);
			});

			dockerConfig.push(...[
				'exec',
				'-T',
				dockerServiceName,
				'php',
				'-d xdebug.start_with_request=no',
				'-f',
				remotePsalmServerPath,
				'--',
				'-c',
				remotePsalmXmlPath,
				'-r',
				remotePath,
				'--find-dead-code',
				'--verbose',
				'--tcp=' + dockerConnectBackHost + ':' + dockerConnectBackPort
			]);

			if (!commandExists('docker-compose')) {
				fatalError('Error: docker-compose command not available');
			}

			let serverProcess = child.spawn('docker-compose', dockerConfig);
			serverProcess.on('error', err => {
				fatalError('Error: docker-compose sub-command error ' + err + "\n");
			});
			serverProcess.on('exit', (code, signal) => {
				if (code) {
					fatalError('Error: docker-compose sub-command exited with error code ' + code + "\n");
				} else if (signal) {
					fatalError('Error: docker-compose sub-command was killed with signal ' + signal + "\n");
				}
			});

			if (debug) {
				debugChannel.appendLine('starting psalm server: docker-compose ' + dockerConfig.join(' ') + "\n");

				serverProcess.stdout.on('data', (data) => {
					debugChannel.appendLine(`server process stdout: ${data}\n`);
				});

				serverProcess.stderr.on('data', (data) => {
					debugChannel.appendLine(`server process stderr: ${data}\n`);
				});

				serverProcess.on('close', (code) => {
					debugChannel.appendLine(`server process exited with code ${code}\n`);
				});
			}
		});
	}));

	const convertURI = (uri: string, l2r = true) => {
		// Convert any backslashes (\) into forwardslashes
		uri = uri.replace(/\\/g, '/');

		let fromPath = (l2r ? localUriPath : remoteUriPath);
		let toPath = (l2r ? remoteUriPath : localUriPath);

		// Replace any shorter uri path with toPath if URI matches part of fromPath
		if (uri.length < fromPath.length
			&& fromPath.substr(0, uri.length).toLocaleLowerCase() == uri.toLocaleLowerCase()) {
			return toPath;
		}

		return uri.replace(new RegExp(escapeRegExp(fromPath), 'i'), toPath);
	}

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for php (and maybe HTML) documents
		documentSelector: [
			{
				"scheme": "file",
				"language": "php"
			},
			{
				"scheme": "untitled",
				"language": "php"
			}
		],
		uriConverters: {
			// VS Code by default %-encodes even the colon after the drive letter
			// NodeJS handles it much better
			code2Protocol: uri => {
				let localURI = url.format(url.parse(uri.toString(true)));
				let remoteURI = convertURI(localURI);
				if (debug) {
					debugChannel.appendLine(`Convert Local to Remote Path: ${localURI} ${remoteURI}\n`);
				}
				return remoteURI;
			},
			protocol2Code: str => {
				let remoteURI = str;
				let localURI = convertURI(remoteURI, false);
				if (debug) {
					debugChannel.appendLine(`Convert Remote to Local Path: ${remoteURI} ${localURI}\n`);
				}
				return vscode.Uri.parse(localURI)
			}
		},
		synchronize: {
			// Synchronize the setting section 'psalm' to the server (TODO: server side support)
			//configurationSection: 'psalm',
			fileEvents: [
				//vscode.workspace.createFileSystemWatcher('**/' + psalmConfigPath),
				// this is for when files get changed outside of vscode
				vscode.workspace.createFileSystemWatcher('**/*.php'),
			]
		},
		progressOnInitialization: true,
	};


	// Create the language client and start the client.
	client = new LanguageClient(
		'Psalm Language Server',
		serverOptions,
		clientOptions,
	);


	client.onTelemetry((params) => {
		if (typeof params === 'object' && 'message' in params && typeof params.message === 'string') {
			// each time we get a new telemetry, we are going to check the config, and update as needed
			let hideStatusMessageWhenRunning = false;
			let status = params.message;
			if (params.message.indexOf(':') >= 0) {
				status = params.message.split(':')[0];
			}
			let statusIcon = '';
			switch (status) {
				case 'initializing':
					statusIcon = '$(sync~spin)';
					break;
				case 'initialized':
					statusIcon = '$(zap)';
					break;
				case 'running':
					statusIcon = '$(check)';
					break;
				case 'analyzing':
					statusIcon = '$(sync~spin)';
					break;
				case 'closing':
					statusIcon = '$(issues)';
					break;
				case 'closed':
					statusIcon = '$(error)';
					break;
			}
			psalmStatusBar.text = (statusIcon + ' Psalm: ' + params.message).trim();
			if (hideStatusMessageWhenRunning && status === 'running') {
				psalmStatusBar.hide();
			} else {
				psalmStatusBar.show();
			}
		}
	});

	client.registerProposedFeatures();

	// Start the client. This will also launch the server
	context.subscriptions.push(
		client.start(),
	);
}
