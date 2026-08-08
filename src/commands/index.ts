import DoctorCommand from './doctor/DoctorCommand.js';
import ConfigCommand from './read/ConfigCommand.js';
import ListCommand from './read/ListCommand.js';
import SkillInstallCommand from './skill/SkillInstallCommand.js';
import StatusCommand from './status/StatusCommand.js';
import UpgradeCommand from './upgrade/UpgradeCommand.js';
import VersionCommand from './version/VersionCommand.js';
import CoordinatorCommand from './coordinator/CoordinatorCommand.js';
import EventsCommand from './events/EventsCommand.js';
import BatchCommand from './batch/BatchCommand.js';

export const commandRegistry = [
    ConfigCommand,
    CoordinatorCommand,
    EventsCommand,
    BatchCommand,
    DoctorCommand,
    ListCommand,
    SkillInstallCommand,
    StatusCommand,
    UpgradeCommand,
    VersionCommand
];
