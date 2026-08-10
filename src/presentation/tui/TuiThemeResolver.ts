import type {TuiCapabilities} from '../../contracts/tuiAdapter.js';
import type {TuiDisplayPreferences, TuiSemanticToken, TuiTheme} from '../../contracts/tuiShell.js';

const DARK = {surface: '#101216', surfaceRaised: '#1b1f27', border: '#464b57', borderFocused: '#8ab4ff', text: '#e6e8ed', textMuted: '#9aa2b1', textStrong: '#ffffff', accent: '#8ab4ff', info: '#72d4ff', success: '#7bd88f', warning: '#f6c76e', danger: '#ff8181', operator: '#d5a8ff', watchtower: '#8ab4ff', provisional: '#9aa2b1', stale: '#f6c76e', disabled: '#626979'} as const;
const LIGHT = {...DARK, surface: '#ffffff', surfaceRaised: '#f1f3f6', border: '#a1a8b3', text: '#20242b', textMuted: '#5d6572', textStrong: '#000000'} as const;
export class TuiThemeResolver {
    resolve(capabilities: TuiCapabilities, preferences: TuiDisplayPreferences): TuiTheme {
        const name = preferences.theme === 'system' ? 'dark' : preferences.theme;
        const source = name === 'light' ? LIGHT : DARK;
        const tokens = preferences.noColor ? monochrome(source) : preferences.highContrast ? highContrast(source) : source;
        return Object.freeze({name, colorMode: preferences.noColor ? 'monochrome' : capabilities.color, highContrast: preferences.highContrast, tokens});
    }
}
function monochrome(tokens: Record<TuiSemanticToken, string>): Record<TuiSemanticToken, string> { return Object.fromEntries(Object.keys(tokens).map((key) => [key, key === 'text' || key === 'textStrong' ? 'white' : 'black'])) as Record<TuiSemanticToken, string>; }
function highContrast(tokens: Record<TuiSemanticToken, string>): Record<TuiSemanticToken, string> { return {...tokens, borderFocused: '#ffffff', text: '#ffffff', textStrong: '#ffffff', danger: '#ff0000', warning: '#ffff00'}; }
