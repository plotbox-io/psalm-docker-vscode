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


// docker-compose -f C:/maqe/capcito/capcito-docker/docker-compose.yml exec -T app php -d xdebug.remote_autostart=0 -d xdebug.remote_enable=0 -d xdebug_profiler_enable=0 -f ./vendor/bin/psalm-language-server -- -c /var/www/html/psalm.xml -r /var/www/html/ --find-dead-code --verbose --tcp=host.docker.internal:57010
// ps -auxww
// netstat -anp tcp

let client: LanguageClient;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// this has a low priority so it will end up being more towards the right.
	let psalmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	psalmStatusBar.text = ' $(loading~spin) Psalm: starting';
	psalmStatusBar.tooltip = 'Psalm Language Server';
	psalmStatusBar.show();

	// TODO REMOVE
	const phpProcessPath = 'C:/maqe/capcito/php.exe';
	const psalmLanguageServerPath = './vendor/bin/psalm-language-server';


	const escapeRegExp = (string: string) => {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

	const normalizePath = (path: string) => {
		// Convert any backslashes (\) into forwardslashes
		path = path.replace(/\\/g,'/');

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
	let debug: boolean = config.get('debug') || false;

	let localUriPath = url.format(url.parse('file://' + localPath));
	let remoteUriPath = url.format(url.parse('file://' + remotePath));

	if (debug) {
		vscode.window.showInformationMessage('Starting Server...');

		console.log('localUriPath', localUriPath);
		console.log('remoteUriPath', remoteUriPath);

		console.log('psalm_docker.localDockerComposePaths', localDockerComposePaths);
		console.log('psalm_docker.remotePsalmServerPath', remotePsalmServerPath);
		console.log('psalm_docker.localPath', localPath);
		console.log('psalm_docker.remotePath', remotePath);
		console.log('psalm_docker.remotePsalmXmlPath', remotePsalmXmlPath);
		console.log('psalm_docker.dockerServiceName', dockerServiceName);
	}

	let serverOptions = (() => new Promise<StreamInfo>((resolve, reject) => {// host.docker.internal
		// 'connection' listener
		const server = net.createServer(socket => {
			if (debug) {
				console.log('Psalm process connected');
				socket.on('end', () => {
					console.log('Psalm process disconnected');
				});
				socket.on('data', (data: string) => {
					console.log(data.toString());
				});
			}
			server.close();
			resolve({reader: socket, writer: socket});
		});

		server.listen(0, '0.0.0.0', function() {
			const address = server.address();
			if (address === null || typeof address === 'string') {
				console.log('cannot start listening, server.address() issue');
				return;
			}
			
			if (debug) {
				console.log('vscode server is listening on 127.0.0.1:' + address.port);
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
				'-d xdebug.remote_autostart=0',
				'-d xdebug.remote_enable=0',
				'-d xdebug_profiler_enable=0',
				'-f',
				remotePsalmServerPath,
				'--',
				'-c',
				remotePsalmXmlPath,
				'-r',
				remotePath,
				'--find-dead-code',
				'--verbose',
				'--tcp=host.docker.internal:'+  address.port
			];

			let serverProcess = child.spawn('docker-compose', dockerConfig);

			if (debug) {
				console.log('starting psalm server: docker-compose ' + dockerConfig.join(' '));

				serverProcess.stdout.on('data', (data) => {
					console.log(`server process stdout: ${data}`);
				});
				  
				serverProcess.stderr.on('data', (data) => {
					console.error(`server process stderr: ${data}`);
				});
				
				serverProcess.on('close', (code) => {
					console.error(`server process exited with code ${code}`);
				});
			}
		});
	}));

	const convertURI = (uri: string, l2r = true) => {
		// Convert any backslashes (\) into forwardslashes
		uri = uri.replace(/\\/g,'/');

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
				let localURI =  url.format(url.parse(uri.toString(true)));
				let remoteURI = convertURI(localURI);
				if (debug) {
					console.log('l2r', localURI, remoteURI);
				}
				return remoteURI;
			},
			protocol2Code: str => {
				let remoteURI = str;
				let localURI = convertURI(remoteURI, false);
				if (debug) {
					console.log('r2l', remoteURI, localURI);
				}
				return vscode.Uri.parse(localURI)}
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
			let hideStatusMessageWhenRunning =  false;
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
