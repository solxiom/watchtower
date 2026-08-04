import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {
    confirmationRequiredError, resolveHostAdapter, resolveKnowledgeRoot, terminalReplaceConfirmation,
    type ReplaceConfirmationPort
} from '../../foundation/hostAdapters/index.js';
import {resolveWatchtowerDataHome, validateWatchtowerDataHome} from '../../foundation/paths/index.js';
import type {PreviewResult} from '../../foundation/hostAdapters/index.js';
import {parseSkillInstallOptions, type SkillInstallOptions} from './skillInstallOptions.js';
import {presentSkillInstallResult} from './skillInstallPresenter.js';

export type {ReplaceConfirmationPort} from '../../foundation/hostAdapters/index.js';

export default class SkillInstallCommand extends BaseCommand implements Command {
    name = 'skill';
    description = 'Preview or install the bundled Watchtower coordinator knowledge pack for a host.';
    usage = 'skill install <codex|cursor|claude> [--scope=<skill-only|guides-only|full>] [--replace] [--dry-run] [--json] [--no-color]';
    group = 'basic';
    keywords = ['skill', 'install', 'knowledge', 'codex', 'cursor', 'claude'];

    constructor(private readonly confirmation: ReplaceConfirmationPort = terminalReplaceConfirmation) { super(); }

    async run(): Promise<void> {
        const options = parseSkillInstallOptions(this.args);
        const adapter = resolveHostAdapter(options.host);
        const pack = resolveKnowledgeRoot(validateWatchtowerDataHome(resolveWatchtowerDataHome()));
        const preview = adapter.preview(pack, options.scope);
        if (options.dryRun) return presentSkillInstallResult(preview, options);
        const replace = await this.resolveReplace(options, preview);
        if (!replace) return presentSkillInstallResult(preview, options);
        presentSkillInstallResult(adapter.install(pack, options.scope, {replace: true}), options);
    }

    private async resolveReplace(options: SkillInstallOptions, preview: PreviewResult): Promise<boolean> {
        if (options.replace) return true;
        if (!preview.destinationExists) return false;
        const confirmed = this.confirmation.isInteractive(options.json)
            ? await this.confirmation.confirm(
                `Install ${preview.host} knowledge pack to ${preview.destination}, replacing the existing installation?`
            )
            : false;
        if (!confirmed) throw confirmationRequiredError(preview.destination);
        return true;
    }
}
