# geth-with-protocol

A private, single-node (Geth) PoA Ethereum network with the Livepeer protocol contracts deployed. This project should only be used for testing. 

## Usage

```
docker run -d -p 8545:8545 -p 8546:8546 --name geth-with-livepeer-protocol livepeer/geth-with-livepeer-protocol:pm
```

This command will download the latest version of the `livepeer/geth-with-livepeer-protocol:pm` container hosted on [DockerHub](https://hub.docker.com/r/livepeer/geth-with-livepeer-protocol).

## Build

```
./build.sh
```

This command will build the Docker image locally.