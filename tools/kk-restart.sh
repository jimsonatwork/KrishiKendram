#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/tools/kk-lib.sh"

section "KK Restart"

kill_nest
clean_project

"$ROOT/tools/kk-doctor.sh"

build_project

start_project
