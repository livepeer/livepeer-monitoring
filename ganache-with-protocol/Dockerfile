FROM node:10-alpine as builder-node
# USER root
WORKDIR /

ENV GANACHE_DB_PATH /ganache_db

RUN apk add --no-cache git python bash make g++

COPY build-ganache.sh build-ganache.sh
RUN chmod +x build-ganache.sh

# RUN GANACHE
RUN ./build-ganache.sh

FROM node:10-alpine
ENV GANACHE_DB_PATH /ganache_db

RUN apk add --no-cache git python bash make g++
RUN npm i ganache-cli -g

COPY --from=builder-node /ganache_db /ganache_db

EXPOSE 8545/tcp

ENTRYPOINT ganache-cli -k istanbul -l 0x7A1200 -h 0.0.0.0 -a 310 -i 54321 -d --db $GANACHE_DB_PATH