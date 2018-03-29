FROM ubuntu:16.04
MAINTAINER Yondon Fu "yondon@livepeer.org"

RUN apt-get update && apt-get install -y curl git build-essential autoconf autotools-dev pkg-config

# Install Node.js 8.x
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs

# Install IPFS
RUN curl -L -O https://dist.ipfs.io/go-ipfs/v0.4.11/go-ipfs_v0.4.11_linux-amd64.tar.gz
RUN tar xvfz go-ipfs_v0.4.11_linux-amd64.tar.gz
RUN mv go-ipfs/ipfs /usr/local/bin/ipfs

ENV BASEDIR=$HOME/src
ENV PATH="$BASEDIR/compiled/bin":$PATH
ENV PKG_CONFIG_PATH=$BASEDIR/compiled/lib/pkgconfig
WORKDIR $BASEDIR

# Install nasm
RUN git clone -b nasm-2.13.02 http://repo.or.cz/nasm.git "$BASEDIR/nasm"
WORKDIR $BASEDIR/nasm
RUN ./autogen.sh
RUN ./configure --prefix="$BASEDIR/compiled"
RUN make
RUN make install || echo "Installing docs fails but should be OK otherwise"

# Install x264
RUN git clone http://git.videolan.org/git/x264.git "$BASEDIR/x264"
WORKDIR $BASEDIR/x264
RUN ./configure --prefix="$BASEDIR/compiled" --enable-pic --enable-static
RUN make
RUN make install-lib-static

# Install ffmpeg
RUN git clone https://git.ffmpeg.org/ffmpeg.git "$BASEDIR/ffmpeg" || echo "FFmpeg dir already exists"
WORKDIR $BASEDIR/ffmpeg
RUN ./configure --disable-doc --disable-sdl2 --disable-iconv \
--disable-muxers --disable-demuxers --disable-parsers --disable-protocols \
--disable-encoders --disable-decoders --disable-filters --disable-bsfs \
--disable-postproc --disable-lzma \
--enable-libx264 --enable-gpl \
--enable-protocol=rtmp,file \
--enable-muxer=mpegts,hls,segment --enable-demuxer=flv,mpegts \
--enable-bsf=h264_mp4toannexb,aac_adtstoasc,h264_metadata,h264_redundant_pps \
--enable-parser=aac,aac_latm,h264 \
--enable-filter=abuffer,buffer,abuffersink,buffersink,afifo,fifo,aformat \
--enable-filter=aresample,asetnsamples,fps,scale \
--enable-encoder=aac,libx264 \
--enable-decoder=aac,h264 \
--prefix="$BASEDIR/compiled"
RUN make
RUN make install
