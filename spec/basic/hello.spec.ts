import {createCli} from "../../src/run.js";

describe("HelloCommand", function () {

    it("creates a CLI instance successfully", async function () {
        const cli = await createCli();
        expect(cli).toBeTruthy();
    });

    it("creates a CLI instance with a truthy run method", async function () {
        const cli = await createCli();
        expect(typeof (cli as any).run).toEqual('function');
    });
});
