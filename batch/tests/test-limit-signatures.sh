#!/usr/bin/env bash
# test-limit-signatures.sh — pins the spend-limit signature matcher (Phase SQ D1).
#
# Run from the career-ops root:  bash batch/tests/test-limit-signatures.sh
# Exits 0 only if every assertion passes; nonzero on the first failure.
#
# Part A (this file, Step 1): asserts the D1 ERE directly, applied case-insensitively
# via `grep -Eiq`, against the recorded spend/session/usage-limit strings plus two
# negative anchors (a green-build line and the adjacent transient rate-limit class).
#
# Self-test (D1 / plan Done-when): deleting the `spend` alternation from SESSION_LIMIT_ERE
# below makes positives #1 and #2 ("...monthly spend limit") stop matching, so the run
# exits nonzero — i.e. the test can go red. Part B (Step 2) extends this with a
# function-level smoke against the real is_session_limit_log() in batch/batch-runner.sh.

set -u

# The D1 signature matcher, shared with /build-queue's spend canary/park and with
# is_session_limit_log() in batch/batch-runner.sh. Update all copies together.
SESSION_LIMIT_ERE='(session|usage|spend)[[:space:]]+limit|limit[[:space:]]+reached|resets [0-9:]+[ap]m'

fail=0

# match EXPECTED STRING — assert grep -Eiq result against the ERE.
#   EXPECTED = "match"    -> string MUST match the ERE
#   EXPECTED = "no-match" -> string MUST NOT match the ERE
match() {
  local expected="$1"; shift
  local str="$1"
  if printf '%s' "$str" | grep -Eiq "$SESSION_LIMIT_ERE"; then
    got="match"
  else
    got="no-match"
  fi
  if [ "$got" != "$expected" ]; then
    printf 'FAIL: expected %-8s got %-8s for: %s\n' "$expected" "$got" "$str" >&2
    fail=1
  else
    printf 'ok  : %-8s : %s\n' "$got" "$str"
  fi
}

# --- Positive set (recorded spend/session/usage-limit signatures) ---
match match 'All 4 Step-3 review subagents failed with "You'\''ve hit your monthly spend limit" (claude.ai/settings/usage).'
match match "You've hit your monthly spend limit"
match match "Session limit reached - resets 3pm"
match match "You have reached your usage limit"
match match "limit  reached"        # double space exercises [[:space:]]+
match match "resets 4:30pm"

# --- Negative anchors ---
match no-match "test suite passed; 125 tests green, merged cleanly"          # red-on-garbage anchor
match no-match "rate limit exceeded, too many requests (429)"                # adjacent class: is_rate_limit_log's jurisdiction

# --- Part B (Step 2): function-level smoke against the REAL is_session_limit_log() ---
# Extract the function from batch-runner.sh WITHOUT sourcing it (the script ends with an
# unguarded `main "$@"`). Strip CR first so extraction is robust to a CRLF working-tree copy
# (career-ops has core.autocrlf=true). Resolve the runner relative to this script so the smoke
# works from any cwd, not only the career-ops root.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/../batch-runner.sh"
func_src="$(tr -d '\r' < "$RUNNER" | sed -n '/^is_session_limit_log() {$/,/^}$/p')"
if [ -z "$func_src" ]; then
  echo "FAIL(fn): could not extract is_session_limit_log() from $RUNNER" >&2
  fail=1
else
  eval "$func_src"
fi

# match_fn EXPECTED STRING — write STRING to a temp file and assert the extracted function's result.
#   EXPECTED = "match" -> is_session_limit_log MUST return 0; "no-match" -> MUST return nonzero.
match_fn() {
  local expected="$1"; shift
  local str="$1"
  local tmp; tmp="$(mktemp)"
  printf '%s\n' "$str" > "$tmp"
  if is_session_limit_log "$tmp"; then got="match"; else got="no-match"; fi
  rm -f "$tmp"
  if [ "$got" != "$expected" ]; then
    printf 'FAIL(fn): expected %-8s got %-8s for: %s\n' "$expected" "$got" "$str" >&2
    fail=1
  else
    printf 'ok(fn): %-8s : %s\n' "$got" "$str"
  fi
}

if [ -n "$func_src" ]; then
  match_fn match 'All 4 Step-3 review subagents failed with "You'\''ve hit your monthly spend limit" (claude.ai/settings/usage).'
  match_fn match "You've hit your monthly spend limit"
  match_fn match "Session limit reached - resets 3pm"
  match_fn match "You have reached your usage limit"
  match_fn match "limit  reached"
  match_fn match "resets 4:30pm"
  match_fn no-match "test suite passed; 125 tests green, merged cleanly"
  match_fn no-match "rate limit exceeded, too many requests (429)"
fi

if [ "$fail" -ne 0 ]; then
  echo "test-limit-signatures.sh: FAILED" >&2
  exit 1
fi
echo "test-limit-signatures.sh: all signature assertions passed"
exit 0
