const ContainerSpawner = require('../ContainerSpawner');

describe('Container Spawner Initilization', () => {
  test('rejects empty config', () => {
    const config = {};

    expect(() => {
      const containerSpawner = new ContainerSpawner(config); // eslint-disable-line
    }).toThrowError();
  });

  test('accepts config with required properties', () => {
    const config = {
      image: 'ubuntu',
      port: 22,
      containerPort: 22,
    };

    expect(() => {
      const containerSpawner = new ContainerSpawner(config); // eslint-disable-line
    }).not.toThrowError();
  });
});
