#!/bin/bash
set -euo pipefail

npm ci
npm run build

echo "Build completed successfully!"
