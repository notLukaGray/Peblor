#!/bin/bash
# Fix code style before committing. Does not run check/build — pre-push and CI do that.

set -e

npm run fix
