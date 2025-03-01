const process = require('process');
const fs = require('fs');

const Logger = require('logplease');
const ContainerSpawner = require('./src/ContainerSpawner');

const logger = Logger.create('index');

let configPath = 'config.json';

if ('CONFIG_PATH' in process.env) {
  configPath = process.env.CONFIG_PATH;
}

if (!fs.existsSync(configPath)) {
  throw new Error(`Config file ${configPath} does not exist`);
}

logger.debug(`config path is ${configPath}`);

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const containerSpawner = new ContainerSpawner(config);

containerSpawner.start();
