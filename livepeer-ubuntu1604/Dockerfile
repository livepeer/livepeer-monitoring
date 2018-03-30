FROM ubuntu:16.04
MAINTAINER Yondon Fu "yondon@livepeer.org"

RUN apt-get update && apt-get install -y curl git build-essential autoconf autotools-dev pkg-config

# Install Node.js 8.x
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs

# Install Go 1.9
ENV GOROOT /opt/go
ENV GOPATH /root/go
RUN cd /opt && curl -O https://dl.google.com/go/go1.9.4.linux-amd64.tar.gz && \
    tar -xvf go1.9.4.linux-amd64.tar.gz && \
    ln -s /opt/go/bin/go /usr/bin/ && \
    mkdir $GOPATH

# Install ffmpeg
ADD install_ffmpeg.sh /install_ffmpeg.sh
RUN ./install_ffmpeg.sh
