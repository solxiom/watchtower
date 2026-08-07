/** Captured OpenCode 1.18.14 `--format json` stdout (2026-08-07, deepseek-v4-flash-free). */
export const OPENCODE_11814_VERSION = '1.18.14';

export const OPENCODE_11814_SUCCESS_STREAM = [
    '{"type":"step_start","timestamp":1786100526626,"sessionID":"ses_0241cdabbffeWjrWIUTn4zKWF4","part":{"id":"prt_fdbe32e1f001q1W0raR3S4JXOQ","messageID":"msg_fdbe3269f001e4E62QagIvyfDC","sessionID":"ses_0241cdabbffeWjrWIUTn4zKWF4","type":"step-start"}}',
    '{"type":"text","timestamp":1786100528598,"sessionID":"ses_0241cdabbffeWjrWIUTn4zKWF4","part":{"id":"prt_fdbe332510010NHbqQt9QuEf2y","messageID":"msg_fdbe3269f001e4E62QagIvyfDC","sessionID":"ses_0241cdabbffeWjrWIUTn4zKWF4","type":"text","text":"{\\"decision\\":\\"hold\\"}","time":{"start":1786100527697,"end":1786100528582}}}',
    '{"type":"step_finish","timestamp":1786100528598,"sessionID":"ses_0241cdabbffeWjrWIUTn4zKWF4","part":{"id":"prt_fdbe335ca001ljvoRE0QViuS1V","reason":"stop","messageID":"msg_fdbe3269f001e4E62QagIvyfDC","sessionID":"ses_0241cdabbffeWjrWIUTn4zKWF4","type":"step-finish","tokens":{"total":7918,"input":7878,"output":6,"reasoning":34,"cache":{"write":0,"read":0}},"cost":0}}'
].join('\n');

export const OPENCODE_11814_ERROR_STREAM = '{"type":"error","timestamp":1786100494219,"sessionID":"ses_0241d51f4ffeymK6zadBV8egIV","error":{"name":"UnknownError","data":{"message":"Unexpected server error. Check server logs for details.","ref":"err_64f781eb"}}}';

export const OPENCODE_11814_TRUNCATED_STREAM = '{"type":"step_start","timestamp":1786100526626,"sessionID":"ses_trunc","part":{"id":"prt_x","messageID":"msg_x","sessionID":"ses_trunc","type":"step-start"}}';

export const OPENCODE_11814_TEXT_ONLY_STREAM = [
    '{"type":"step_start","timestamp":1786100526626,"sessionID":"ses_text","part":{"id":"prt_x","messageID":"msg_x","sessionID":"ses_text","type":"step-start"}}',
    '{"type":"text","timestamp":1786100528598,"sessionID":"ses_text","part":{"id":"prt_y","messageID":"msg_x","sessionID":"ses_text","type":"text","text":"{\\"decision\\":\\"hold\\"}"}}'
].join('\n');

export const OPENCODE_11814_UNKNOWN_EVENT_STREAM = [
    '{"type":"step_start","timestamp":1786100526626,"sessionID":"ses_bad","part":{"id":"prt_x","messageID":"msg_x","sessionID":"ses_bad","type":"step-start"}}',
    '{"type":"bogus","timestamp":1786100528598,"sessionID":"ses_bad"}',
    '{"type":"text","timestamp":1786100528598,"sessionID":"ses_bad","part":{"id":"prt_y","messageID":"msg_x","sessionID":"ses_bad","type":"text","text":"{\\"decision\\":\\"hold\\"}"}}',
    '{"type":"step_finish","timestamp":1786100528598,"sessionID":"ses_bad","part":{"id":"prt_z","reason":"stop","messageID":"msg_x","sessionID":"ses_bad","type":"step-finish"}}'
].join('\n');

export const OPENCODE_11814_MALFORMED_TEXT_STREAM = [
    '{"type":"step_start","timestamp":1786100526626,"sessionID":"ses_mal","part":{"id":"prt_x","messageID":"msg_x","sessionID":"ses_mal","type":"step-start"}}',
    '{"type":"text","timestamp":1786100528598,"sessionID":"ses_mal","part":{"id":"prt_y","messageID":"msg_x","sessionID":"ses_mal","type":"text","text":"not-json"}}',
    '{"type":"step_finish","timestamp":1786100528598,"sessionID":"ses_mal","part":{"id":"prt_z","reason":"stop","messageID":"msg_x","sessionID":"ses_mal","type":"step-finish"}}'
].join('\n');

export function oversizedDecisionLine(bytes: number): string {
    const decision = `{"decision":"${'x'.repeat(Math.max(0, bytes - 20))}"}`;
    return [
        '{"type":"step_start","sessionID":"ses_big","part":{"type":"step-start"}}',
        `{"type":"text","part":{"type":"text","text":${JSON.stringify(decision)}}}`,
        '{"type":"step_finish","sessionID":"ses_big","part":{"type":"step-finish","reason":"stop"}}'
    ].join('\n');
}

export function emptyLineFlood(emptyLines: number): string {
    const events = OPENCODE_11814_SUCCESS_STREAM;
    return `${Array(Math.max(0, emptyLines)).fill('').join('\n')}\n${events}`;
}
