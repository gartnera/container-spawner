const process = require('process');
const fs = require('fs');

const ContainerSpawner = require('./src/ContainerSpawner');

let configPath = 'config.json';

if ('CONFIG_PATH' in process.env) {
  configPath = process.env.CONFIG_PATH;
}

if (!fs.existsSync(configPath)) {
  throw new Error(`Config file ${configPath} does not exist`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const containerSpawner = new ContainerSpawner(config);

containerSpawner.start();
