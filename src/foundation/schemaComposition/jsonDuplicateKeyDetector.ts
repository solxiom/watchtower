function skipWhitespace(text: string, start: number): number {
    let index = start;
    while (index < text.length && /\s/u.test(text[index])) {
        index += 1;
    }
    return index;
}

function stringEnd(text: string, start: number): number {
    let index = start + 1;
    while (index < text.length) {
        if (text[index] === '\\') {
            index += 2;
        } else if (text[index] === '"') {
            return index + 1;
        } else {
            index += 1;
        }
    }
    return text.length;
}

function scalarEnd(text: string, start: number): number {
    let index = start;
    while (index < text.length && !/[\s,\]}]/u.test(text[index])) {
        index += 1;
    }
    return index;
}

interface DetectorState {
    readonly text: string;
    duplicate: boolean;
}

function parseValue(state: DetectorState, start: number): number {
    const index = skipWhitespace(state.text, start);
    if (state.text[index] === '{') {
        return parseObject(state, index);
    }
    if (state.text[index] === '[') {
        return parseArray(state, index);
    }
    return state.text[index] === '"' ? stringEnd(state.text, index) : scalarEnd(state.text, index);
}

function parseArray(state: DetectorState, start: number): number {
    let index = skipWhitespace(state.text, start + 1);
    while (index < state.text.length && state.text[index] !== ']') {
        index = skipWhitespace(state.text, parseValue(state, index));
        if (state.text[index] === ',') {
            index = skipWhitespace(state.text, index + 1);
        }
    }
    return index + 1;
}

function parseObject(state: DetectorState, start: number): number {
    const keys = new Set<string>();
    let index = skipWhitespace(state.text, start + 1);
    while (index < state.text.length && state.text[index] !== '}') {
        const end = stringEnd(state.text, index);
        const parsedKey: unknown = JSON.parse(state.text.slice(index, end));
        if (typeof parsedKey === 'string') {
            state.duplicate = state.duplicate || keys.has(parsedKey);
            keys.add(parsedKey);
        }
        index = skipWhitespace(state.text, end);
        index = skipWhitespace(state.text, parseValue(state, index + 1));
        if (state.text[index] === ',') {
            index = skipWhitespace(state.text, index + 1);
        }
    }
    return index + 1;
}

export function hasDuplicateJsonObjectKey(text: string): boolean {
    const state: DetectorState = {text, duplicate: false};
    parseValue(state, 0);
    return state.duplicate;
}
