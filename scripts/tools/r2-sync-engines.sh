#!/usr/bin/env bash
set -euo pipefail

# Sync all engine assets from local public/engines to a Cloudflare R2 bucket
# and set proper HTTP metadata (Content-Type + Cache-Control).
#
# Requirements:
# - wrangler (npm i -g wrangler) and wrangler login completed.
#
# Usage:
#   scripts/tools/r2-sync-engines.sh [--bucket BUCKET] [--root DIR] [--prefix PREFIX] [--dry-run]
#
# Defaults:
#   BUCKET = stockfish
#   ROOT   = public/engines
#   PREFIX = engines   (object keys will be PREFIX/<relative-path-under-ROOT>)
#   CACHE_CONTROL = "public, max-age=31536000, immutable"
#
# Example:
#   scripts/tools/r2-sync-engines.sh
#   scripts/tools/r2-sync-engines.sh --bucket stockfish --root public/engines --prefix engines
#   scripts/tools/r2-sync-engines.sh --dry-run

BUCKET="stockfish"
ROOT="public/engines"
PREFIX="engines"
CACHE_CONTROL="public, max-age=31536000, immutable"
DRY_RUN=false
AWS_ENDPOINT=""
FORCE_AWS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket)
      BUCKET="$2"; shift 2 ;;
    --root)
      ROOT="$2"; shift 2 ;;
    --prefix)
      PREFIX="$2"; shift 2 ;;
    --endpoint)
      AWS_ENDPOINT="$2"; shift 2 ;;
    --force-aws)
      FORCE_AWS=true; shift ;;
    --dry-run|-n)
      DRY_RUN=true; shift ;;
    *)
      echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if ! command -v wrangler >/dev/null 2>&1; then
  echo "Error: wrangler not found. Install with: npm i -g wrangler" >&2
  exit 1
fi

if [[ ! -d "$ROOT" ]]; then
  echo "Error: ROOT directory not found: $ROOT" >&2
  exit 1
fi

echo "Bucket........: $BUCKET"
echo "Local root....: $ROOT"
echo "R2 prefix.....: $PREFIX"
echo "Dry run.......: $DRY_RUN"
[[ -n "$AWS_ENDPOINT" ]] && echo "AWS endpoint..: $AWS_ENDPOINT"
echo

# Find all .js and .wasm under ROOT (macOS default bash 3.2 compatible)
# Note: Avoid mapfile/-print0 to support older bash on mac.
FILES_LIST=$(find "$ROOT" -type f \( -name "*.js" -o -name "*.wasm" \) | sort)

if [[ -z "$FILES_LIST" ]]; then
  echo "No .js/.wasm files found under $ROOT"
  exit 0
fi

detect_wrangler_support() {
  local help
  help=$(wrangler r2 object put --help 2>&1 || true)
  if grep -qi -- "--http-metadata" <<<"$help"; then
    echo "http-metadata"
    return 0
  fi
  if grep -qi -- "--cache-control" <<<"$help" && grep -qi -- "--content-type" <<<"$help"; then
    echo "flags"
    return 0
  fi
  echo "none"
}

WRANGLER_MODE=$(detect_wrangler_support)
if [[ -n "$AWS_ENDPOINT" || "$FORCE_AWS" == true ]]; then
  WRANGLER_MODE="aws"
fi
echo "Wrangler mode.: $WRANGLER_MODE"

upload_one() {
  local f="$1"
  local rel
  rel="${f#$ROOT/}"
  local key="$PREFIX/$rel"

  local ct
  case "$f" in
    *.js) ct="application/javascript" ;;
    *.wasm) ct="application/wasm" ;;
    *) echo "Skip unknown type: $f"; return ;;
  esac

  echo "-> $f  ->  r2://$BUCKET/$key"
  if [[ "$DRY_RUN" == true ]]; then
    case "$WRANGLER_MODE" in
      http-metadata)
        echo "   wrangler r2 object put $BUCKET/$key --file=\"$f\" --http-metadata '{\"contentType\":\"$ct\",\"cacheControl\":\"$CACHE_CONTROL\"}'" ;;
      flags)
        echo "   wrangler r2 object put $BUCKET/$key --file=\"$f\" --content-type $ct --cache-control '$CACHE_CONTROL'" ;;
      aws)
        if [[ -z "$AWS_ENDPOINT" ]]; then echo "   (missing --endpoint https://<accountid>.r2.cloudflarestorage.com)"; else
          echo "   aws s3 cp \"$f\" \"s3://$BUCKET/$key\" --endpoint-url \"$AWS_ENDPOINT\" --content-type $ct --cache-control '$CACHE_CONTROL'"; fi ;;
      none)
        if command -v aws >/dev/null 2>&1 && [[ -n "$AWS_ENDPOINT" ]]; then
          local s3="s3://$BUCKET/$key"
          echo "   aws s3 cp \"$f\" \"$s3\" --endpoint-url \"$AWS_ENDPOINT\" --content-type $ct --cache-control '$CACHE_CONTROL'"
        else
          echo "   (no supported flags in wrangler; install awscli and pass --endpoint to use S3 API)" ;
        fi ;;
    esac
    return
  fi

  case "$WRANGLER_MODE" in
    http-metadata)
      # Prefer single JSON flag
      wrangler r2 object put "$BUCKET/$key" --file="$f" --http-metadata "{\"contentType\":\"$ct\",\"cacheControl\":\"$CACHE_CONTROL\"}" >/dev/null || {
        echo "wrangler put with --http-metadata failed; consider upgrading wrangler or use --endpoint with awscli" >&2
        return 1
      }
      ;;
    flags)
      # Fallback: explicit flags
      wrangler r2 object put "$BUCKET/$key" --file="$f" --content-type "$ct" --cache-control "$CACHE_CONTROL" >/dev/null || {
        echo "wrangler put with flags failed; consider using awscli fallback" >&2
        return 1
      }
      ;;
    aws)
      if [[ -z "$AWS_ENDPOINT" ]]; then
        echo "Missing --endpoint https://<accountid>.r2.cloudflarestorage.com for aws mode" >&2; return 1
      fi
      aws s3 cp "$f" "s3://$BUCKET/$key" --endpoint-url "$AWS_ENDPOINT" --content-type "$ct" --cache-control "$CACHE_CONTROL" >/dev/null || {
        echo "aws s3 cp failed" >&2; return 1;
      }
      ;;
    none)
      if command -v aws >/dev/null 2>&1 && [[ -n "$AWS_ENDPOINT" ]]; then
        aws s3 cp "$f" "s3://$BUCKET/$key" --endpoint-url "$AWS_ENDPOINT" --content-type "$ct" --cache-control "$CACHE_CONTROL" >/dev/null || {
          echo "aws s3 cp failed" >&2; return 1;
        }
      else
        echo "Your wrangler doesn't support metadata flags and awscli not configured. Install awscli and pass --endpoint https://<accountid>.r2.cloudflarestorage.com" >&2
        return 1
      fi
      ;;
  esac
}

# Check jq for JSON construction; fallback to manual string if missing
# jq optional note kept but no need to redefine upload_one now.

COUNT=0
OLDIFS="$IFS"; IFS=$'\n'
for f in $FILES_LIST; do
  [[ -z "$f" ]] && continue
  upload_one "$f"
  COUNT=$((COUNT+1))
done
IFS="$OLDIFS"

echo
echo "Done. Processed $COUNT files."
echo "Verify one example (add your domain as Origin to test CORS):"
echo "  curl -I -H 'Origin: https://chess-analysis.org' https://cacle.chess-analysis.org/$PREFIX/stockfish-17/stockfish-17.js"
