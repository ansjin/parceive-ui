#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export LD_LIBRARY_PATH=$DIR/boost/lib
export PATH=$PATH:$DIR/git-lfs:$DIR/pin
