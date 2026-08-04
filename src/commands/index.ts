import HelloCommand from './hello/HelloCommand.js';
import ConfigCommand from './read/ConfigCommand.js';
import ListCommand from './read/ListCommand.js';
import SkillInstallCommand from './skill/SkillInstallCommand.js';
import StatusCommand from './status/StatusCommand.js';
import UpgradeCommand from './upgrade/UpgradeCommand.js';

export const commandRegistry = [
    ConfigCommand,
    HelloCommand,
    ListCommand,
    SkillInstallCommand,
    StatusCommand,
    UpgradeCommand
];
