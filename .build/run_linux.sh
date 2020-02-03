#!/usr/bin/env bash
set -e

echo $PWD

npm ci
lerna run build > /dev/null 2>&1
FIREFOX_WD_URL=http://localhost:4444/wd/hub CHROME_WD_URL=http://localhost:4445/wd/hub npm test -- --runInBand --ci --bail
lerna run test:e2e
lerna run typedoc
