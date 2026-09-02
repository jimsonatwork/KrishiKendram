#!/usr/bin/env bash

# KK Dev Toolkit - Shared Library

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="$ROOT/reports"

mkdir -p "$REPORTS_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info(){ echo -e "${BLUE}[INFO]${NC} $*"; }
ok(){ echo -e "${GREEN}[ OK ]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
fail(){ echo -e "${RED}[FAIL]${NC} $*"; }

section(){
  echo
  echo "=================================================="
  echo "$1"
  echo "=================================================="
}

git_branch(){ git branch --show-current 2>/dev/null; }

git_summary(){
  section "Git"
  echo "Branch : $(git_branch)"
  git status --short
}

docker_check(){
  section "Docker"
  if docker info >/dev/null 2>&1; then
    ok "Docker running"
  else
    fail "Docker not running"
    return 1
  fi
}

postgres_check(){
  section "PostgreSQL"
  if docker ps --format '{{.Names}}' | grep -q '^krishikendram-postgres$'; then
    ok "krishikendram-postgres is running"
  else
    fail "PostgreSQL container not running"
  fi
}

clean_project(){
  section "Clean"
  rm -rf "$ROOT/dist"
  rm -f "$ROOT/tsconfig.tsbuildinfo"
  find "$ROOT" -type f -name "*.log" -delete
  ok "Temporary files removed"
}

build_project(){
  section "Build"
  (cd "$ROOT" && npm run build)
}

start_project(){
  section "Start"
  (cd "$ROOT" && npm run start:dev)
}

kill_nest(){
  pkill -f "nest start" 2>/dev/null || true
  pkill -f "node.*dist" 2>/dev/null || true
  pkill -f "node.*start:dev" 2>/dev/null || true
}

duplicate_report() {
    section "Duplicate Files"

    tmp=$(mktemp)

    find "$ROOT/src" -type f -name "*.ts" -printf "%s|%p\n" |
    sort -n |
    awk -F'|' '
    {
        size[$1]=size[$1] "\n" $2
        count[$1]++
    }
    END{
        for(i in count)
            if(count[i]>1)
                printf "%s", size[i]
    }' > "$tmp"

files=()

while IFS= read -r file
do
    [ -n "$file" ] && files+=("$file")
done < "$tmp"

for ((i=0; i<${#files[@]}; i++))
do
    for ((j=i+1; j<${#files[@]}; j++))
    do
        f1="${files[$i]}"
        f2="${files[$j]}"

        h1=$(sha256sum "$f1" | cut -d' ' -f1)
        h2=$(sha256sum "$f2" | cut -d' ' -f1)

        if [ "$h1" = "$h2" ]; then
            if cmp -s "$f1" "$f2"; then
                echo
                fail "IDENTICAL"
                echo "$f1"
                echo "$f2"
            fi
        fi
    done
done

    rm -f "$tmp"
}

empty_file_report(){
  section "Empty Files"
  find "$ROOT/src" -type f -empty || true
}
