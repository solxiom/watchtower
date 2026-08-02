import HelloCommand from "./HelloCommand.js";
import ConfigCommand from './ConfigCommand.js';
import ListCommand from './ListCommand.js';
import SkillInstallCommand from './SkillInstallCommand.js';
import StatusCommand from './StatusCommand.js';

export const commandRegistry = [
    ConfigCommand,
    HelloCommand,
    ListCommand,
    SkillInstallCommand,
    StatusCommand
];
