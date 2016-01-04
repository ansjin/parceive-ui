#!/bin/bash -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

GIT_LFS_DIR=$DIR/git-lfs

wget --output-document=$DIR/git-lfs.tar.gz https://github.com/github/git-lfs/releases/download/v1.0.1/git-lfs-linux-amd64-1.0.1.tar.gz

mkdir -p $GIT_LFS_DIR
tar xfz $DIR/git-lfs.tar.gz --strip-components=1 -C $GIT_LFS_DIR
