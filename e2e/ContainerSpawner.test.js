const net = require('net');

const ContainerSpawner = require('../src/ContainerSpawner');
const Docker = require('dockerode');
const SSH = require('node-ssh');
const delay = require('delay');
const exec = require('async-exec').default;

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

let beforeContainerCount;

beforeAll(async () => {
  const beforeContainers = await docker.listContainers();
  beforeContainerCount = beforeContainers.length;
});

const config = {
  image: 'agartner/ctf-sshd',
  port: 1337,
  containerPort: '22/tcp',
};

describe('ContainerSpawner initilization', () => {
  let s;

  beforeEach(() => {
    s = new ContainerSpawner(config);
  });

  afterEach(async () => {
    await s.stop();
  });

  test('start()', async () => {
    await expect(s.start()).resolves.toBe(undefined);
  });
});

describe('Container creation', () => {
  let s;

  beforeEach(async () => {
    s = new ContainerSpawner(config);
    await s.start();
  });

  afterEach(async () => {
    await s.stop();
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
  let s;

  beforeEach(async () => {
    s = new ContainerSpawner(config);
    await s.start();
  });

  afterEach(async () => {
    await s.stop();
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

describe('Quirks', () => {
  let s;

  beforeAll(async () => {
    // wait for previous containers to be destroyed
    await delay(1000);
  });

  beforeEach(async () => {
    s = new ContainerSpawner(config);
    await s.start();
  });

  afterEach(async () => {
    await s.stop();
  });

  test('nmap connect scan', async (done) => {
    const startingContainers = await docker.listContainers();
    const startingContainerCount = startingContainers.length;

    await exec(`nmap -sT -p ${config.port} localhost`);

    // wait for containers to be deleted
    await delay(1000);
    const currentContainers = await docker.listContainers();
    const currentContainerCount = currentContainers.length;
    expect(currentContainerCount).toEqual(startingContainerCount);
    done();
  });

  test('nmap spam', async (done) => {
    const startingContainers = await docker.listContainers();
    const startingContainerCount = startingContainers.length;

    await exec(`nmap -sT -p ${config.port} localhost`);
    await exec(`nmap -sT -p ${config.port} localhost`);
    await exec(`nmap -sT -p ${config.port} localhost`);
    await exec(`nmap -sT -p ${config.port} localhost`);

    // wait for containers to be deleted
    await delay(1000);
    const currentContainers = await docker.listContainers();
    const currentContainerCount = currentContainers.length;
    expect(currentContainerCount).toEqual(startingContainerCount);
    done();
  });
});

describe('Final tests', () => {
  // wait for final containers to be cleaned up.
  beforeEach(async () => {
    await delay(1000);
  });

  test('no leftover containers', async (done) => {
    const currentContainers = await docker.listContainers();
    const currentContainerCount = currentContainers.length;
    expect(currentContainerCount).toEqual(beforeContainerCount);
    done();
  });
});
