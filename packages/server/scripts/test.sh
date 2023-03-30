#!/bin/bash
set -e

if [[ -n $CI ]]
then
  # --runInBand performs better in ci where resources are limited
  echo "jest --coverage --runInBand"
  jest --coverage --runInBand --forceExit src/api/routes/tests/alwaysFail.spec.ts
else
  # --maxWorkers performs better in development
  echo "jest --coverage --maxWorkers=2"
  jest --coverage --maxWorkers=2 --forceExit
fi