import { SakuliRunner } from ".";
import { SakuliExecutionContextProvider } from "./test-execution-context/sakuli-execution-context-provider.class";
import { ContextProvider } from "./context-provider.interface";
import { TestScriptExecutor } from "./test-script-executor.interface";
import * as t from '@sakuli/commons'
//import {createInMemoryFs, restoreFsLayout, mockFsLayout} from '@sakuli/commons'
import mockFs from 'mock-fs'


//jest.mock('fs', createInMemoryFs);

describe('SakuliRunner', () => {

    const createContextProviderMock = (): jest.Mocked<ContextProvider> => ({
        tearUp: jest.fn(),
        tearDown: jest.fn(),
        getContext: jest.fn()
    })

    const createScriptexecutorMock = (): jest.Mocked<TestScriptExecutor> => ({
        execute: jest.fn()
    })

    describe('basic execution flow', () => {
        let sakuliRunner: SakuliRunner;
        let ctxProvider1: jest.Mocked<ContextProvider>;
        let ctxProvider2: jest.Mocked<ContextProvider>;
        let scriptExecutor: jest.Mocked<TestScriptExecutor>
        const projectWithThreeTestFiles = {
            rootDir: 'somedir',
            testFiles: [
                { path: 'root/test1.js' },
                { path: 'root/test2.js' },
                { path: 'root/test3.js' }
            ]
        }
        beforeEach(() => {
            ctxProvider1 = createContextProviderMock();
            ctxProvider2 = createContextProviderMock();
            scriptExecutor = createScriptexecutorMock();
            sakuliRunner = new SakuliRunner(
                [ctxProvider1, ctxProvider2],
                scriptExecutor
            );
            /*
            const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
            mockReadFileSync.mockImplementation(() => {
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                return "// test 3"
            })
            */
            
            mockFs({
                root: {
                    'test1.js': '// test 1',
                    'test2.js': '// test 2',
                    'test3.js': '// test 3',
                } 
            })
        })

        it('should tearUp all providers for each test', () => {
            sakuliRunner.execute(projectWithThreeTestFiles)

            expect(ctxProvider1.tearUp).toHaveBeenNthCalledWith(1, projectWithThreeTestFiles)
            expect(ctxProvider1.tearUp).toHaveBeenNthCalledWith(2, projectWithThreeTestFiles)
            expect(ctxProvider1.tearUp).toHaveBeenNthCalledWith(3, projectWithThreeTestFiles)

            expect(ctxProvider2.tearUp).toHaveBeenNthCalledWith(1, projectWithThreeTestFiles)
            expect(ctxProvider2.tearUp).toHaveBeenNthCalledWith(2, projectWithThreeTestFiles)
            expect(ctxProvider2.tearUp).toHaveBeenNthCalledWith(3, projectWithThreeTestFiles)
        });

        it('should tearDown all providers for each test', () => {
            sakuliRunner.execute(projectWithThreeTestFiles);

            expect(ctxProvider1.tearDown).toHaveBeenCalledTimes(3);
            expect(ctxProvider2.tearDown).toHaveBeenCalledTimes(3);
        })

        it('should execute with a merged context object from all contextproviders', () => {
            ctxProvider1.getContext.mockReturnValue({ctx1: 'ctx1', common: 'ignore'})
            ctxProvider2.getContext.mockReturnValue({ctx2: 'ctx2', common: 'overridden'})
            sakuliRunner.execute(projectWithThreeTestFiles)
            const matchContext = () => expect.objectContaining({
                ctx1: 'ctx1',
                ctx2: 'ctx2',
                common: 'overridden'
            })
            expect(scriptExecutor.execute).toHaveBeenNthCalledWith(1, '// test 1', matchContext());
            expect(scriptExecutor.execute).toHaveBeenNthCalledWith(2, '// test 2', matchContext());
            expect(scriptExecutor.execute).toHaveBeenNthCalledWith(3, '// test 3', matchContext());
        })

        afterEach(() => {
            mockFs.restore()
        })
    })



});
