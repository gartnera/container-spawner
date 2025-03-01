const net = require('net');

const ContainerSpawner = require('../src/ContainerSpawner');
const Docker = require('dockerode');
const SSH = require('node-ssh');
const {setTimeout: delay} = require('node:timers/promises');
const exec = require('async-exec').default;

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

let beforeContainerCount;

beforeAll(async () => {
  const beforeContainers = await docker.listContainers();
  beforeContainerCount = beforeContainers.length;
});

['reuse=false', 'reuse=true'].forEach(mode => {
  const config = {
    image: 'ghcr.io/gartnera/ctf-sshd',
    port: 1337,
    containerPort: 22,
    idleTimeout: 1,
    reuse: mode === 'reuse=true'
  };

  describe(`ContainerSpawner initialization (${mode})`, () => {
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

  describe(`Container creation (${mode})`, () => {
    let s;

    beforeEach(async () => {
      s = new ContainerSpawner(config);
      await s.start();
    });

    afterEach(async () => {
      await s.stop();
    });

    test('connection creates new container', async () => {
      const startingContainers = await docker.listContainers();
      const startingContainerCount = startingContainers.length;

      return new Promise((resolve) => {
        const client = new net.Socket();
        client.connect(config.port, '127.0.0.1', async () => {
          // wait for container to be created
          await delay(1000);

          const currentContainers = await docker.listContainers();
          const currentContainerCount = currentContainers.length;
          expect(currentContainerCount).toEqual(startingContainerCount + 1);

          client.end();
          resolve();
        });
      });
    });
  });

  describe(`SSH proxy tests (${mode})`, () => {
    let s;

    beforeEach(async () => {
      s = new ContainerSpawner(config);
      await s.start();
    });

    afterEach(async () => {
      await s.stop();
    });

    test('can connect', async () => {
      const ssh = new SSH();
      await ssh.connect({
        host: '127.0.0.1',
        port: config.port,
        user: 'ctf',
        tryKeyboard: true,
      });
      ssh.dispose();
    });

    test('can run command', async () => {
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
    });
  });

  describe(`Quirks (${mode})`, () => {
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

    test('nmap connect scan', async () => {
      const startingContainers = await docker.listContainers();
      const startingContainerCount = startingContainers.length;

      await exec(`nmap -sT -p ${config.port} localhost`);

      // wait for containers to be deleted
      await delay(1000);
      const currentContainers = await docker.listContainers();
      const currentContainerCount = currentContainers.length;
      expect(currentContainerCount).toEqual(startingContainerCount);
    });

    test('nmap spam', async () => {
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
    });
  });
});

describe('Final tests', () => {
  // wait for final containers to be cleaned up.
  beforeEach(async () => {
    await delay(1000);
  });

  test('no leftover containers', async () => {
    const currentContainers = await docker.listContainers();
    const currentContainerCount = currentContainers.length;
    expect(currentContainerCount).toEqual(beforeContainerCount);
  });
});
