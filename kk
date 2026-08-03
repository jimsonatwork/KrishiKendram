#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

case "${1:-restart}" in
  restart)
    "$ROOT/tools/kk-restart.sh"
    ;;
  doctor)
    "$ROOT/tools/kk-doctor.sh"
    ;;
  build)
    source "$ROOT/tools/kk-lib.sh"
    build_project
    ;;
  clean)
    source "$ROOT/tools/kk-lib.sh"
    clean_project
    ;;
  status)
    source "$ROOT/tools/kk-lib.sh"
    docker_check
    postgres_check
    git_summary
    ;;
  *)
    cat <<EOF
KK Dev Toolkit

Usage:
  ./kk restart
  ./kk doctor
  ./kk build
  ./kk clean
  ./kk status
EOF
    exit 1
    ;;
esac