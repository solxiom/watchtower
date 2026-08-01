import HelloCommand from "./HelloCommand.js";
import ConfigCommand from './ConfigCommand.js';
import ListCommand from './ListCommand.js';

export const commandRegistry = [
    ConfigCommand,
    HelloCommand,
    ListCommand
];
