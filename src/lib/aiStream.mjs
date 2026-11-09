import {createParser} from 'eventsource-parser';

// The site owns JSON event semantics; the library owns SSE framing and fields.
export function createAiStreamParser() {
  let events = [];
  const parser = createParser({onEvent(message) {
    if (!message.event || message.data === '[DONE]') return;
    try { events.push({type: message.event, data: JSON.parse(message.data), ...(message.id ? { id: Number(message.id) } : {})}); }
    catch { events.push({type: 'error', data: {code: 'invalid_stream_event'}}); }
  }});
  return {feed(chunk) { events = []; parser.feed(chunk); return events; }, reset() {parser.reset();}};
}

// Compatibility for consumers of the old stateless adapter. Runtime readers use
// one parser per response, so split CRLF and multiline data are handled upstream.
export function parseAiStreamChunk(chunk, previousRemainder = '') {
  const raw = previousRemainder + chunk;
  const trailingCR = raw.endsWith('\r') && !raw.endsWith('\r\r');
  const input = (trailingCR ? raw.slice(0, -1) : raw).replace(/\r\n?/g, '\n');
  const boundary = input.lastIndexOf('\n\n');
  const stream = createAiStreamParser();
  const events = stream.feed(input);
  return {events, remainder: input.slice(boundary < 0 ? 0 : boundary + 2) + (trailingCR ? '\r' : '')};
}

// Keep the cursor local to this turn. A new connection always starts with a
// fresh parser, and only complete events advance the cursor.
export async function* readChatEvents(initial, { signal, resume, stillCurrent = () => true }) {
  let response = initial;
  let cursor = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    if (attempt) response = await resume(cursor);
    if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
      const detail = await response.json().catch(() => null);
      const code = detail?.error?.code || (response.status === 429 ? 'rate_limited' : 'gateway_unavailable');
      throw Object.assign(new Error(code), { chatCode: code });
    }
    const reader = response.body.getReader();
    const parser = createAiStreamParser();
    const decoder = new TextDecoder();
    try {
      while (stillCurrent()) {
        const { value, done } = await reader.read();
        if (!stillCurrent()) return;
        if (done) break;
        let reconnect = false;
        for (const event of parser.feed(decoder.decode(value, { stream: true }))) {
          if (event.id !== undefined) {
            if (event.id <= cursor) continue;
            cursor = event.id;
          }
          if (event.type === 'error' && !event.id && event.data.code === 'stream_interrupted') {
            reconnect = true;
            break;
          }
          yield event;
          if (['done', 'error', 'challenge_required', 'login_required'].includes(event.type)) return;
        }
        if (reconnect) break;
      }
    } catch (error) {
      signal.throwIfAborted();
      if (attempt === 2) throw error;
    } finally {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    if (!stillCurrent()) return;
  }
  throw Object.assign(new Error('stream_interrupted'), { chatCode: 'stream_interrupted' });
}
