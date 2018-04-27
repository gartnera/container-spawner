const net = require('net');

const ContainerSpawner = require('../src/ContainerSpawner');
const Docker = require('dockerode');
const SSH = require('node-ssh');
const delay = require('delay');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

afterEach(async () => {
  // we have to wait between tests for the tcp server to shutdown...
  await delay(1500);
});

describe('ContainerSpawner initilization', () => {
  const config = {
    image: 'sshd',
    port: 1337,
    containerPort: '22/tcp',
  };

  let s;

  beforeEach(() => {
    s = new ContainerSpawner(config);
  });

  afterEach(async () => {
    s.stop();
  });

  test('start()', () => {
    expect(() => s.start()).not.toThrowError();
  });
});

describe('Container creation', () => {
  const config = {
    image: 'sshd',
    port: 1234,
    containerPort: '22/tcp',
  };

  let s;

  beforeEach(async () => {
    s = new ContainerSpawner(config);
    s.start();
  });

  afterEach(async () => {
    s.stop();
  });

  test('connection is not rejected', (done) => {
    const client = new net.Socket();
    client.connect(config.port, '127.0.0.1', () => {
      client.end();
      done();
    });
  });

  test('connection creates new container', async (done) => {
    const startingContainers = await docker.listContainers();
    const startingContainerCount = startingContainers.length;

    const client = new net.Socket();
    client.connect(config.port, '127.0.0.1', async () => {
      // wait for container to be created
      await delay(1000);

      const currentContainers = await docker.listContainers();
      const currentContainerCount = currentContainers.length;
      expect(currentContainerCount).toEqual(startingContainerCount + 1);

      client.end();
      done();
    });
  });
});

describe('SSH proxy tests', () => {
  const config = {
    image: 'sshd',
    port: 1234,
    containerPort: '22/tcp',
  };

  let s;

  beforeEach(async () => {
    s = new ContainerSpawner(config);
    s.start();
  });

  afterEach(async () => {
    s.stop();
  });

  test('can connect', async (done) => {
    const ssh = new SSH();
    await ssh.connect({
      host: '127.0.0.1',
      port: config.port,
      user: 'ctf',
      tryKeyboard: true,
    });
    ssh.dispose();
    done();
  });

  test('can run command', async (done) => {
    const ssh = new SSH();
    await ssh.connect({
      host: '127.0.0.1',
      port: config.port,
      user: 'ctf',
      tryKeyboard: true,
    });

    const res = await ssh.execCommand('id');
    expect(res.stdout).toContain('ctf');
    ssh.dispose();
    done();
  });
});
