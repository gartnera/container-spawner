const net = require('net');

const delay = require('delay');
const Docker = require('dockerode');
const getPort = require('get-port');

class ContainerSpawner {
  constructor(config) {
    ContainerSpawner.validateConfig(config);
    this.config = config;

    // ip -> time
    this.rateLimitMap = {};

    // container => timeout id
    this.containerTimeoutMap = {};

    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  static validateConfig(config) {
    const requiredProperties = ['image', 'port', 'containerPort'];
    for (const prop of requiredProperties) {
      if (!(prop in config)) {
        throw new Error(`Required property ${prop} not found in config`);
      }
    }
  }

  async _handleRateLimit(client) {
    if (this.config.rateLimit <= 0) {
      return;
    }

    const addr = client.remoteAddress;
    const now = new Date().getTime();
    let nextTime = now + this.config.rateLimit;

    if (addr in this.rateLimitMap) {
      const lastTime = this.rateLimitMap[addr];
      const waitTime = lastTime - now;
      if (waitTime > 0) {
        nextTime += waitTime;
        await delay(waitTime);
      }
    }

    this.rateLimitMap[addr] = nextTime;
  }

  async _setupContainer() {
    const avaliablePort = await getPort({ host: '127.0.0.1' });
    const container = await this.docker.createContainer({
      Image: this.config.image,
      PidsLimit: 20,
      PortBindings: {
        [this.config.containerPort]: [
          {
            HostIP: '127.0.0.1',
            HostPort: avaliablePort.toString(),
          },
        ],
      },
    });

    await container.start();

    // wait slightly longer for container to start. Otherwise connection may randomly get reset.
    await delay(200);

    return { container, avaliablePort };
  }

  _doTcpProxy(client, port) {
    return new Promise((resolve) => {
      const service = new net.Socket();

      service.connect(port, '127.0.0.1', () => {
        client.pipe(service);
        service.pipe(client);
      });

      /*
      const endFunction = () => {
        if (!service.destroyed) {
          service.end();
        }
        if (!client.destroyed) {
          client.end();
        }
        resolve();
      };
      */

      service.on('error', resolve);
      service.on('close', resolve);
      client.on('error', resolve);
      client.on('close', resolve);

      if (this.config.timeout) {
        setTimeout(resolve, this.config.timeout);
      }
    });
  }

  static async _cleanupContainer(container) {
    await container.stop();
    await container.remove();
  }

  async _clientHandler(client) {
    await this._handleRateLimit(client);
    const { container, avaliablePort } = await this._setupContainer();

    await this._doTcpProxy(client, avaliablePort);
    await ContainerSpawner._cleanupContainer(container);
  }

  start() {
    this.server = net.createServer(this._clientHandler.bind(this));
    this.server.listen(this.config.port, '0.0.0.0');
  }
}

module.exports = ContainerSpawner;
