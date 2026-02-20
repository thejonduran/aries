const fs = require('fs');
const path = require('path');

const FileSystemTools = {
    name: 'filesystem_tools',
    description: 'Safe file management tool. Use "search" to find files or code. Use "list" to explore. Read/write/append as needed. Restricted to project root.',
    parameters: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['read', 'write', 'append', 'list', 'search'],
                description: 'The action to perform.'
            },
            path: {
                type: 'string',
                description: 'Relative path to the file or directory. Example: "./src/file.js" or "src".'
            },
            content: {
                type: 'string',
                description: 'Content to write or append. Required for "write" and "append" actions.'
            }
        },
        required: ['action', 'path']
    },
    execute: async ({ action, path: relativePath, content }) => {
        const projectRoot = path.resolve(__dirname, '../../');
        const targetPath = path.resolve(projectRoot, relativePath);

        // Security Check: Verify target is within project root
        if (!targetPath.startsWith(projectRoot)) {
            return `Error: Access denied. You can only access files within ${projectRoot}.`;
        }

        try {
            switch (action) {
                case 'read':
                    if (!fs.existsSync(targetPath)) {
                        return `Error: File not found at ${relativePath}`;
                    }
                    const stats = fs.statSync(targetPath);
                    if (stats.isDirectory()) {
                        return `Error: ${relativePath} is a directory. Use "list" action instead.`;
                    }
                    return fs.readFileSync(targetPath, 'utf8');

                case 'write':
                    if (!content && content !== '') {
                        return 'Error: "content" parameter is required for write action.';
                    }
                    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                    fs.writeFileSync(targetPath, content, 'utf8');
                    return `Successfully wrote to ${relativePath}`;

                case 'append':
                    if (!content && content !== '') {
                        return 'Error: "content" parameter is required for append action.';
                    }
                    if (!fs.existsSync(targetPath)) {
                        return `Error: File not found at ${relativePath}. Use "write" to create a new file first.`;
                    }
                    fs.appendFileSync(targetPath, content, 'utf8');
                    return `Successfully appended to ${relativePath}`;

                case 'list':
                    if (!fs.existsSync(targetPath)) {
                        return `Error: Directory not found at ${relativePath}`;
                    }
                    if (!fs.statSync(targetPath).isDirectory()) {
                        return `Error: ${relativePath} is not a directory.`;
                    }
                    const files = fs.readdirSync(targetPath, { withFileTypes: true });
                    const listing = files.map(dirent => {
                        const type = dirent.isDirectory() ? 'DIR' : 'FILE';
                        return `[${type}] ${dirent.name}`;
                    });
                    return listing.join('\n') || 'Directory is empty.';

                case 'search':
                    if (!content) {
                        return 'Error: "content" parameter is required for search action.';
                    }
                    const searchTerm = content.toLowerCase(); // Normalized search term
                    const results = [];

                    const searchRecursive = (dir) => {
                        const entries = fs.readdirSync(dir, { withFileTypes: true });
                        for (const entry of entries) {
                            const resPath = path.resolve(dir, entry.name);
                            const relPath = path.relative(projectRoot, resPath);

                            // Check filename match (case-insensitive)
                            if (entry.name.toLowerCase().includes(searchTerm)) {
                                results.push(`[FILE] ${relPath}`);
                            }

                            // Skip specific directories
                            if (entry.isDirectory()) {
                                if (['node_modules', '.git'].includes(entry.name)) continue;
                                searchRecursive(resPath);
                            } else {
                                // Simple binary check extension mostly
                                const ext = path.extname(entry.name).toLowerCase();
                                if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.exe', '.bin'].includes(ext)) continue;

                                try {
                                    const fileContent = fs.readFileSync(resPath, 'utf8');
                                    const lines = fileContent.split('\n');
                                    for (let i = 0; i < lines.length; i++) {
                                        const line = lines[i];
                                        if (line.toLowerCase().includes(searchTerm)) {
                                            // Limit line length for display
                                            const displayLine = line.trim().substring(0, 100);
                                            results.push(`[${relPath}:${i + 1}] ${displayLine}`);
                                        }
                                    }
                                } catch (err) {
                                    // Ignore read errors
                                }
                            }
                            // Hard limit on results to prevent context overflow
                            if (results.length >= 50) return;
                        }
                    };
                    searchRecursive(targetPath);
                    if (results.length === 0) return 'No matches found.';
                    return results.join('\n') + (results.length >= 50 ? '\n... (Results truncated at 50)' : '');

                default:
                    return `Error: Unknown action "${action}"`;
            }
        } catch (error) {
            return `Error executing ${action} on ${relativePath}: ${error.message}`;
        }
    }
};

module.exports = FileSystemTools;
