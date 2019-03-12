# Docker file for building ffmpeg dependency
FROM debian:stretch as builder

ENV PKG_CONFIG_PATH /root/compiled/lib/pkgconfig
WORKDIR /root

RUN apt update \
    && apt install -y build-essential pkg-config autoconf gnutls-dev git

COPY install_ffmpeg.sh install_ffmpeg.sh
RUN ./install_ffmpeg.sh


FROM debian:stretch-slim
ENV PKG_CONFIG_PATH /root/compiled/lib/pkgconfig
WORKDIR /root
COPY --from=builder /root/compiled /root/compiled/

# Build Docker image: docker build -t ffmpeg-base .