#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
// Schema for search parameters
const SearchParamsSchema = z.object({
    query: z.string().describe('Search query'),
    api: z.enum(['brave', 'duckduckgo']).optional().default('brave').describe('Which search API to use'),
});
// Integration with Brain state table
const BrainStateSchema = z.object({
    action: z.enum(['get', 'update']),
    key: z.string().optional(),
    value: z.any().optional(),
});
class SearchTrackerServer {
    server;
    constructor() {
        this.server = new Server({
            name: 'mcp-search-tracker',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    // Integration with Brain state would go here
    // For now, using local file tracking as fallback
    async trackUsage(api) {
        // This would integrate with brain:state_get and brain:state_set
        // For now, just log it
        console.error(`[TRACKING] ${api} search executed at ${new Date().toISOString()}`);
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'tracked_search',
                    description: 'Perform a web search with automatic usage tracking. Integrates with Brain state for tracking.',
                    inputSchema: SearchParamsSchema,
                },
                {
                    name: 'search_usage_stats',
                    description: 'Get current search API usage statistics from Brain state',
                    inputSchema: z.object({}),
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                if (name === 'tracked_search') {
                    const { query, api } = SearchParamsSchema.parse(args);
                    // Track the usage
                    await this.trackUsage(api);
                    // Here we would call the actual search API
                    // For now, return tracking confirmation
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    status: 'tracked',
                                    api_used: api,
                                    query: query,
                                    timestamp: new Date().toISOString(),
                                    note: 'Search tracking recorded. Actual search integration pending.',
                                }, null, 2),
                            },
                        ],
                    };
                }
                else if (name === 'search_usage_stats') {
                    // This would query brain:state_get for usage stats
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    note: 'Would retrieve stats from brain:state_get("system", "brave_search_usage")',
                                    placeholder_stats: {
                                        brave: { today: 0, this_month: 0 },
                                        duckduckgo: { today: 0, this_month: 0 },
                                    },
                                }, null, 2),
                            },
                        ],
                    };
                }
                else {
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
                }
                throw error;
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('MCP Search Tracker running on stdio');
    }
}
const server = new SearchTrackerServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map