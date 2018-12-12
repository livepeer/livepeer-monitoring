# can't use geth 1.8 - it doesn't retain state inside docker container
FROM ethereum/client-go:v1.7.3 as builder-geth

WORKDIR /
ENV gethRoot /root/.ethereum
COPY genesis.json /geth/genesis.json
COPY keys/* /geth/keys/
COPY start.sh start.sh
RUN echo "" > /geth/password.txt

RUN chmod +x start.sh
RUN geth --datadir $gethRoot init /geth/genesis.json
RUN cp /geth/keys/* $gethRoot/keystore/

FROM node:8-alpine as builder-node
ENV gethRoot /root/.ethereum
ENV GET_MINING_ACCOUNT 87da6a8c6e9eff15d703fc2773e32f6af8dbe301

RUN apk add --no-cache \
        libstdc++ \
    && apk add --no-cache \
        binutils-gold curl g++ gcc gnupg \
        libgcc linux-headers make git python bash


COPY build-protocol.sh build-protocol.sh
RUN chmod +x build-protocol.sh

COPY --from=builder-geth /usr/local/bin/geth /usr/local/bin/
COPY --from=builder-geth /geth /geth/
COPY --from=builder-geth $gethRoot $gethRoot/
RUN echo "" > $gethRoot/password.txt

COPY start.sh start.sh
RUN chmod +x start.sh

RUN ./build-protocol.sh

EXPOSE 8545/tcp
EXPOSE 8546/tcp
ENTRYPOINT ./start.sh

# Now create clean image
FROM alpine:latest
ENV GET_MINING_ACCOUNT 87da6a8c6e9eff15d703fc2773e32f6af8dbe301
ENV gethRoot /root/.ethereum
LABEL org.livepeer.controller="0x93ad00a63b14492386df9f1cc123d785705bdf99"

COPY --from=builder-node /usr/local/bin/geth /usr/local/bin/
COPY --from=builder-node $gethRoot $gethRoot/

COPY start.sh start.sh
RUN chmod +x start.sh

EXPOSE 8545/tcp
EXPOSE 8546/tcp
ENTRYPOINT ./start.sh

# Build Docker image: docker build -t geth-dev .
# Run: docker run -d -p 8545:8545 -p 8546:8546 --name geth-dev geth-dev
