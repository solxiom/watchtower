import DoctorCommand from './doctor/DoctorCommand.js';
import ConfigCommand from './read/ConfigCommand.js';
import ListCommand from './read/ListCommand.js';
import SkillInstallCommand from './skill/SkillInstallCommand.js';
import StatusCommand from './status/StatusCommand.js';
import UpgradeCommand from './upgrade/UpgradeCommand.js';
import VersionCommand from './version/VersionCommand.js';

export const commandRegistry = [
    ConfigCommand,
    DoctorCommand,
    ListCommand,
    SkillInstallCommand,
    StatusCommand,
    UpgradeCommand,
    VersionCommand
];
