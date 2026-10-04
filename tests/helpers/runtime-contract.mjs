import assert from 'node:assert/strict';

// This PDF.js interface method resolves embedded CMaps, not HTTP requests.
// Remove only its declaration token: calls inside the body remain scanned.
export function assertNoNetworkCalls(source){
  const calls=source.replace(/class EmbeddedPdfBinaryDataFactory\s*\{\s*async fetch\s*\(/g,'class EmbeddedPdfBinaryDataFactory{async embeddedResource(');
  assert.doesNotMatch(calls,/\bfetch\s*\(|XMLHttpRequest|new\s+(?:WebSocket|EventSource)\s*\(|\bsendBeacon\s*\(/);
  assert.match(source,/connect-src 'none'/);
}
