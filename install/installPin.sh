#!/bin/bash -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

PIN_ROOT=$DIR/pin

wget --output-document=$DIR/pin.tar.gz http://software.intel.com/sites/landingpage/pintool/downloads/pin-2.14-71313-gcc.4.4.7-linux.tar.gz

mkdir -p $PIN_ROOT
tar xfz $DIR/pin.tar.gz  --strip-components=1 -C $PIN_ROOT
