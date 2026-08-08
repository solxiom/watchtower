import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {CoordinatorReadService} from '../../foundation/lane/index.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {parseEventsOptions} from './eventsCommandOptions.js';
export default class EventsCommand extends BaseCommand implements Command {
    name = 'events'; description = 'Read validated durable coordinator events without advancing a cursor.'; usage = 'events <tail|latest> [--batch=<id>] [--since=<event-id>] [--limit=<1-200>] [--json]'; group = 'basic'; keywords = ['events', 'read-only'];
    constructor(private readonly service: CoordinatorReadService = new CoordinatorReadService()) { super(); }
    run(): void { const options = parseEventsOptions(this.args); const query = {cwd: this.originalCwd, workspace: options.workspace, lane: options.lane, environment: process.env}; const data = this.service.events(query, options.action, options.batch, options.since, options.limit); presentReadCommand(`events ${options.action}`, data, options); }
}
