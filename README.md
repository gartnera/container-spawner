container-spawner allows you spawn ephemeral docker containers for each TCP connection.

It's typically used with [ctf-sshd](https://github.com/gartnera/ctf-sshd) to serve CTF challenges somewhat securely. The main goal is to prevent users from breaking the system for other users.

## Docker usage example

```
docker run -it -d --name container-spawner --network=host -v $(pwd)/config.json:/config/config.json -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/gartnera/container-spawner:master
```

You must use the `--network=host` so the process will see the correct remote address for the rate limiting and reuse features.

## Config options

### `image`

Which docker image should be started. This image should already exist on system. It will not be automatically pulled from a remote.

### `port`

Which port to listen on for external connections

### `containerPort`

Which port to connect to on the container.

### `timeout` (optional)

The maximum lifetime of the container in milliseconds. This is useful if you want to introduce a time sensitive aspect into a challenge.

### `rateLimit` (optional)

The minimum time interval (in milliseconds) that must pass before a remote IP address can create another container. The connection will be held open until this interval has passed.

This option is ignored when running in `reuse: true` mode.

### `reuse` (optional)

Create a container per remote IP not per connection. Multiple connections from the same remote IP will be routed to the same container.

### `idleTimeout` (optional)

How long the container should remain after the final connection closes in `reuse: true` mode. This is useful because it allow the user to serially disconnect and reconnect without the overhead of recreating the container.
