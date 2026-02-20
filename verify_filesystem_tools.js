const FileSystemTools = require('./src/tools/FileSystemTools');

async function testFileSystemTools() {
    console.log('--- Verifying FileSystemTools ---');

    // Mock the context that would usually be passed
    const execute = async (args) => {
        console.log(`[INFO] Executing tool: filesystem_tools`, args);
        try {
            return await FileSystemTools.execute(args);
        } catch (error) {
            console.error(`[ERROR] Tool execution failed:`, error);
            return error.message;
        }
    };

    // 1. Test List
    console.log('\n[Test 1] List Directory (src)');
    const listResult = await execute({ action: 'list', path: 'src' });
    console.log(listResult);

    // 2. Test Write
    console.log('\n[Test 2] Write File (temp_test.txt)');
    const writeResult = await execute({
        action: 'write',
        path: 'temp_test.txt',
        content: 'Hello World'
    });
    console.log(writeResult);

    // 3. Test Read
    console.log('\n[Test 3] Read File');
    const readResult = await execute({ action: 'read', path: 'temp_test.txt' });
    console.log(`Content: "${readResult}"`);

    // 4. Test Append
    console.log('\n[Test 4] Append File');
    const appendResult = await execute({
        action: 'append',
        path: 'temp_test.txt',
        content: '\nAppended Text'
    });
    console.log(appendResult);

    // 5. Verify Append
    const finalRead = await execute({ action: 'read', path: 'temp_test.txt' });
    console.log(`Final Content: "${finalRead}"`);

    // 6. Test Search (Content & Filename)
    console.log('\n[Test 6] Search for "FileSystemTools" and "Aries"');
    const searchResult = await execute({ action: 'search', path: 'src', content: 'filesystemtools' }); // Lowercase search
    console.log('--- Content Search (Case Insensitive) ---');
    console.log(searchResult);

    const fileSearchResult = await execute({ action: 'search', path: 'src', content: 'aries.js' }); // Lowercase search
    console.log('--- Filename Search (Case Insensitive) ---');
    console.log(fileSearchResult);

    // 7. Test Safety (Directory Traversal)
    console.log('\n[Test 7] Safety Check (..)');
    const safetyResult = await execute({ action: 'list', path: '../' });
    console.log(safetyResult);

    // Cleanup
}

testFileSystemTools();
