#!/bin/bash

if [ -z "${TEST_SCENARIO:-}" ]; then
    echo 'Required variable TEST_SCENARIO not set'
    exit 1
fi

if [ "$1" = "--build" ]; then
    BUILD_ONLY=1
elif [ -n "$1" ]; then
    echo 'Usage: run.sh [--build]' >&2
    exit 1
fi

set -o pipefail
set -eux

export LANG=C.UTF-8
export MAKEFLAGS="-j $(nproc)"

# Running the tests normally takes under 20 minutes.  Sometimes the build or
# (more usually) the tests will wedge.  After 18 minutes, print out some
# information about the running processes in order to give us a better chance
# of tracking down problems.
( set +x
  sleep 18m
  echo ===== 18 mins ====================
  ps auxwfe
  echo
  top -b -n1
  echo ===== 18 mins ====================
)&

# copy host's source tree to avoid changing that, and make sure we have a clean tree
if [ ! -e /source/.git ]; then
    echo "This container must be run with --volume <host cockpit source checkout>:/source:ro" >&2
    exit 1
fi
git clone /source /tmp/source
if [ -d /source/node_modules ]; then
    cp -r /source/node_modules /tmp/source/
fi
cd /tmp/source

containers/unit-tests/build.sh

if [ -n "${BUILD_ONLY:-}" ]; then
    exit 0
fi

containers/unit-tests/scenario-${TEST_SCENARIO}.sh
