FROM ethereum/client-go:v1.9.0 as builder-geth

WORKDIR /
ENV gethRoot /root/.ethereum
COPY genesis.json /geth/genesis.json
COPY keys/* /geth/keys/
RUN echo "" > /geth/password.txt

RUN geth --datadir $gethRoot init /geth/genesis.json
RUN cp /geth/keys/* $gethRoot/keystore/

FROM node:10-alpine as builder-node
ENV gethRoot /root/.ethereum
ENV GETH_MINING_ACCOUNT 0161e041aad467a890839d5b08b138c1e6373072

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

# Now create clean image
FROM alpine:latest
ENV GETH_MINING_ACCOUNT 0161e041aad467a890839d5b08b138c1e6373072
ENV gethRoot /root/.ethereum
LABEL org.livepeer.controller="0x77A0865438f2EfD65667362D4a8937537CA7a5EF"

COPY --from=builder-node /usr/local/bin/geth /usr/local/bin/
COPY --from=builder-node $gethRoot $gethRoot/

COPY start.sh start.sh
RUN chmod +x start.sh

EXPOSE 8545/tcp
EXPOSE 8546/tcp
ENTRYPOINT ./start.sh

# Build Docker image: ./build.sh 
# Run: docker run -d -p 8545:8545 -p 8546:8546 --name geth-with-livepeer-protocol livepeer/geth-with-livepeer-protocol
