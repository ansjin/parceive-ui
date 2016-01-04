#!/bin/bash -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

BOOST_ROOT=$DIR/boost

pushd $DIR

wget --output-document=boost.tar.bz2 http://sourceforge.net/projects/boost/files/boost/1.55.0/boost_1_55_0.tar.bz2/download

mkdir -p $BOOST_ROOT
tar jxf boost.tar.bz2 --strip-components=1 -C $BOOST_ROOT

patch -p1 < boost.patch

popd

pushd $BOOST_ROOT

./bootstrap.sh --with-libraries=filesystem,regex,log
./b2 threading=multi --prefix=$BOOST_ROOT -d0 install

popd
