FROM ubuntu:16.04
MAINTAINER Yondon Fu "yondon@livepeer.org"

RUN apt-get update && apt-get install -y curl git build-essential

# Install Node.js 8.x
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs

# Install ffmpeg-static
RUN curl -L -O https://raw.githubusercontent.com/livepeer/ffmpeg-static/master/bin/linux/x64/ffmpeg
RUN chmod 755 ffmpeg
RUN mv ffmpeg /usr/local/bin/ffmpeg

# Install IPFS
RUN curl -L -O https://dist.ipfs.io/go-ipfs/v0.4.11/go-ipfs_v0.4.11_linux-amd64.tar.gz
RUN tar xvfz go-ipfs_v0.4.11_linux-amd64.tar.gz
RUN mv go-ipfs/ipfs /usr/local/bin/ipfs
