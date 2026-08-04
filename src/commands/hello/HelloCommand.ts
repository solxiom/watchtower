import {BaseCommand} from "@nirvana/base/cli/basic";
import {Command} from "@nirvana/base/cli/contracts";

export default class HelloCommand extends BaseCommand implements Command {

    name: string = 'hello';

    description: string = 'Say hello from watchtower.';

    usage: string = 'hello [--name=<name>]';

    group: string = 'basic';

    async run(): Promise<void> {
        const name = this.args.getFlag('name', true) || 'world';
        this.tView.row(`Hello, ${name}! This is watchtower.`, {color: 'green'});
        this.tView.render();
    }
}
