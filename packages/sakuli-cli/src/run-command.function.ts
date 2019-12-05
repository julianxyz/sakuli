import { Argv, CommandModule } from "yargs";
import { CommandModuleProvider, SakuliCoreProperties, SakuliInstance, TestExecutionContext } from "@sakuli/core";
import { ensure, ensurePath, ifPresent, invokeIfPresent, isPresent, Maybe, LogLevel } from "@sakuli/commons";
import chalk from "chalk";
import { testExecutionContextRenderer } from "./cli-utils/test-execution-context-renderer.function";
import { createLogConsumer } from "./create-log-consumer.function";
import { join } from "path";
import { inspect } from "util";
import { writeFileSync } from "fs";

async function renderError(e: Error) {
    console.error(chalk.red(e.toString()));
    if (e.stack) {
        console.error(chalk.gray(e.stack.replace(e.toString(), '').trim()));
    }
}

export const runCommand: CommandModuleProvider = (sakuli: SakuliInstance): CommandModule => {
    function findErrors(testExecutionContext: TestExecutionContext) {
        return testExecutionContext.entities.filter(e => {
            const hasError = isPresent(e.error);
            console.log(`ENTITY: ${e.kind}:${e.id} has error: ${e.error ? "YES" : 'NO'}`)
            return hasError;
        });
    }

    return ({
        command: 'run [path]',
        describe: 'Runs a Sakuli Suite',
        builder(argv: Argv) {
            return argv.positional('path', {
                describe: 'path to Sakuli suite'
            }).demandOption('path');
        },

        async handler(runOptions: any) {

            const rendering = testExecutionContextRenderer(sakuli.testExecutionContext);
            let cleanLogConsumer: Maybe<() => void>;
            try {
                const project = await sakuli.initializeProject(runOptions);
                const coreProps = project.objectFactory(SakuliCoreProperties);

                console.log(chalk`Initialized Sakuli with {bold ${project.testFiles.length.toString()}} Testcases\n`);
                const logLevel = LogLevel[coreProps.logLevel.toUpperCase() as keyof typeof LogLevel];
                sakuli.testExecutionContext.logger.logLevel = ifPresent(logLevel,
                    () => logLevel,
                    () => LogLevel.INFO
                );
                const logPath = ensure<string>(coreProps.sakuliLogFolder, '');
                await ensurePath(logPath);
                const logFile = join(logPath, 'sakuli.log');
                console.log(chalk`Writing logs to: {bold.gray ${logFile}}`);
                cleanLogConsumer = createLogConsumer(
                    sakuli.testExecutionContext.logger,
                    logFile
                );

                await sakuli.run(project);
                await rendering;
                await ifPresent(sakuli.testExecutionContext.error, async error => {
                    console.log(chalk`Error during Execution: \n`);
                    await renderError(error);
                }, () => Promise.resolve());

                const errors = findErrors(sakuli.testExecutionContext);
                for(let errorEntity of errors) {
                    const e = errorEntity.error;
                    if(isPresent(e)) {
                        console.log(chalk`\n{underline Failed to successfully finish {yellow ${errorEntity.kind}} {yellow.bold ${errorEntity.id || ''}}}:\n`);
                        await renderError(e);
                    }
                }
            } catch (e) {
                await renderError(e);
            } finally {
                invokeIfPresent(cleanLogConsumer);
                process.exit(sakuli.testExecutionContext.resultState)
            }
        }
    })
};
