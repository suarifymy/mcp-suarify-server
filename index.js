import { FastMCP } from "fastmcp";
import axios, { AxiosError } from "axios";
import { z } from "zod";
import url from "url";

// --- SILENCE STDOUT ---
// MCP uses stdout for communication. Any other output will break the protocol.
const originalError = console.error;

// Redirect all standard console methods to stderr
console.log = (...args) => originalError(...args);
console.info = (...args) => originalError(...args);
console.warn = (...args) => originalError(...args);

// Patch process.stdout.write to ensure ONLY JSON messages (likely from FastMCP) go to stdout
const stdoutWrite = process.stdout.write;
process.stdout.write = function (chunk) {
    const str = chunk.toString();
    if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
        return stdoutWrite.apply(process.stdout, arguments);
    }
    return process.stderr.write.apply(process.stderr, arguments);
};

const BASE_URL = process.env.SUARIFY_BASE_URL || "https://suarify1.my";
const API_KEY = process.env.SUARIFY_API_KEY;

if (!API_KEY) {
    originalError("CRITICAL: SUARIFY_API_KEY environment variable is not set. Please sign up at https://suarify.my/register-new-user to get your API key.");
}

// --- Server Definition ---
const mcp = new FastMCP({
    name: "suarify-mcp-server",
    version: "0.1.3",
    instructions: "This server provides tools for interacting with the Suarify voice calling platform. Use these tools to initiate AI-powered phone calls, manage leads, and configure agent settings. Requires a valid SUARIFY_API_KEY environment variable."
});

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
    },
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const signupMsg = " (API authentication failed. Please ensure your SUARIFY_API_KEY is valid or sign up at https://suarify.my/register-new-user)";
            error.message += signupMsg;
        }
        return Promise.reject(error);
    }
);

// --- Helpers ---
function formatError(error) {
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        const data = error.response?.data;
        let msg = `API Error (${status || 'Network'}): ${error.message}`;
        if (data && typeof data === 'object') {
            msg += ` - ${JSON.stringify(data)}`;
        }
        return {
            content: [{ type: "text", text: msg }],
            isError: true
        };
    }
    const msg = `Unexpected Error: ${error instanceof Error ? error.message : String(error)}`;
    return {
        content: [{ type: "text", text: msg }],
        isError: true
    };
}

/**
 * Formats a successful response for FastMCP.
 * It includes both a human-readable summary and the raw JSON data in the same text block
 * to ensure the LLM has access to all details while satisfying FastMCP's schema.
 */
function formatSuccess(message, data) {
    const text = `${message}\n\n### Raw Data (JSON):\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    return {
        content: [{ type: "text", text }]
    };
}

// --- Handlers ---
export const handlers = {
    setupInboundSettings: async (args) => {
        try {
            const response = await apiClient.post("/inbound-phone-settings", args);
            return formatSuccess(`Inbound settings configured for ${args.phonenumber}`, response.data);
        } catch (e) { return formatError(e); }
    },
    getInboundSettings: async (args) => {
        try {
            const response = await apiClient.get("/inbound-phone-settings", { params: args });
            return formatSuccess("Retrieved inbound call settings.", response.data);
        } catch (e) { return formatError(e); }
    },
    setupPhoneConfiguration: async (args) => {
        try {
            const response = await apiClient.post("/api/phone-configuration", args);
            return formatSuccess(`Phone configuration upserted for token: ${args.tokenid}`, response.data);
        } catch (e) { return formatError(e); }
    },
    getPhoneConfiguration: async (args) => {
        try {
            const response = await apiClient.get("/api/phone-configuration", { params: args });
            return formatSuccess("Retrieved phone configurations.", response.data);
        } catch (e) { return formatError(e); }
    },
    initiateCall: async (args) => {
        try {
            const response = await apiClient.post("/api/call", args);
            return formatSuccess("Call initiated successfully.", response.data);
        } catch (e) { return formatError(e); }
    },
    doOutboundCall: async (args) => {
        try {
            const response = await apiClient.post("/do-outbound-phone-call", args);
            return formatSuccess("Outbound call executed.", response.data);
        } catch (e) { return formatError(e); }
    },
    getOutboundCallLogs: async (args) => {
        try {
            const response = await apiClient.get("/api/outbound-call-logs", { params: args });
            return formatSuccess(`Retrieved ${response.data?.length || 0} outbound logs.`, response.data);
        } catch (e) { return formatError(e); }
    },
    getInboundCallLogs: async (args) => {
        try {
            const response = await apiClient.get("/api/inbound-call-logs", { params: args });
            return formatSuccess(`Retrieved ${response.data?.length || 0} inbound logs.`, response.data);
        } catch (e) { return formatError(e); }
    },
    listUserAgents: async (args) => {
        try {
            const response = await apiClient.get("/api/user-agents", { params: args });
            return formatSuccess(`Retrieved ${response.data?.length || 0} user agents.`, response.data);
        } catch (e) { return formatError(e); }
    },
    getUserAgent: async (args) => {
        try {
            const { id, ...params } = args;
            const response = await apiClient.get(`/api/user-agents/${id}`, { params });
            return formatSuccess(`Details for user agent ${id}.`, response.data);
        } catch (e) { return formatError(e); }
    },
    deleteUserAgent: async (args) => {
        try {
            const { id, ...params } = args;
            const response = await apiClient.delete(`/api/user-agents/${id}`, { params });
            return formatSuccess(`User agent ${id} deleted.`, response.data);
        } catch (e) { return formatError(e); }
    },
    createLead: async (args) => {
        try {
            const response = await apiClient.post("/api/user-leads", args);
            return formatSuccess(`Lead created for ${args.receipient_name}`, response.data);
        } catch (e) { return formatError(e); }
    },
    bulkUploadLeads: async (args) => {
        try {
            const response = await apiClient.post("/api/user-leads/bulk", args);
            return formatSuccess("Bulk upload processed.", response.data);
        } catch (e) { return formatError(e); }
    },
    listLeads: async (args) => {
        try {
            const response = await apiClient.get("/api/user-leads", { params: args });
            return formatSuccess(`Retrieved ${response.data?.length || 0} leads.`, response.data);
        } catch (e) { return formatError(e); }
    },
    getLead: async (args) => {
        try {
            const response = await apiClient.get(`/api/user-leads/${args.id}`);
            return formatSuccess(`Details for lead ${args.id}.`, response.data);
        } catch (e) { return formatError(e); }
    },
    updateLead: async (args) => {
        try {
            const { id, ...data } = args;
            const response = await apiClient.patch(`/api/user-leads/${id}`, data);
            return formatSuccess(`Lead ${id} updated.`, response.data);
        } catch (e) { return formatError(e); }
    },
    deleteLead: async (args) => {
        try {
            const response = await apiClient.delete(`/api/user-leads/${args.id}`);
            return formatSuccess(`Lead ${args.id} deleted.`, response.data);
        } catch (e) { return formatError(e); }
    },
};

// --- Inbound Phone Settings ---

mcp.addTool({
    name: "suarify_setup_inbound_settings",
    description: "Configure the AI agent behavior, voice, and prompts for inbound calls on a specific phone number. This setup is stored as 'inbound-<phonenumber>'. Requires Suarify API Key.",
    parameters: z.object({
        phonenumber: z.string().describe("The phone number to configure (e.g., 015487666768)"),
        params: z.string().describe("JSON string containing main_voice, start_time, owner_email, start_message, system_prompt, planned_call_id, transfer_message"),
        openai_key: z.string().optional().describe("Optional OpenAI API key override"),
    }),
    execute: handlers.setupInboundSettings,
});

mcp.addTool({
    name: "suarify_get_inbound_settings",
    description: "Get the current inbound call settings for the authenticated user's default phone number.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Owner email (required if using system API key)"),
    }),
    execute: handlers.getInboundSettings,
});

// --- Generic Phone Configuration ---

mcp.addTool({
    name: "suarify_setup_phone_configuration",
    description: "Upsert general phone configuration in the call_params table. Use this for custom tokenized configurations.",
    parameters: z.object({
        tokenid: z.string().describe("Unique token identifier for this configuration"),
        params: z.any().describe("Configuration parameters object or JSON string"),
        openai_key: z.string().optional().describe("Optional OpenAI API key override"),
    }),
    execute: handlers.setupPhoneConfiguration,
});

mcp.addTool({
    name: "suarify_get_phone_configuration",
    description: "Retrieve a specific phone configuration by tokenid, or list all configurations.",
    parameters: z.object({
        tokenid: z.string().optional().describe("Specific token ID to retrieve. If omitted, returns all (max 100)."),
    }),
    execute: handlers.getPhoneConfiguration,
});

// --- Outbound Calls ---

mcp.addTool({
    name: "suarify_initiate_call",
    description: "Initiate an outbound AI voice call using simple or enhanced parameters.",
    parameters: z.object({
        phone_number: z.string().optional().describe("Target phone number (simple format)"),
        system_prompt: z.string().optional().describe("System prompt for AI (simple format)"),
        start_message: z.string().optional().describe("Initial greeting message (simple format)"),
        voice: z.string().optional().describe("Voice selection (simple format)"),
        receipient_phone: z.string().optional().describe("Target phone number (enhanced format)"),
        agent_prompt: z.string().optional().describe("AI instructions (enhanced format)"),
    }),
    execute: handlers.initiateCall,
});

mcp.addTool({
    name: "suarify_do_outbound_call",
    description: "Make an outbound phone call with full validation (balance check, user profile). Required for production calls.",
    parameters: z.object({
        owner_email: z.string().describe("Owner's email address"),
        password: z.string().describe("Must be 'LIVE' to execute the call"),
        receipient_phone: z.string().describe("Target phone number (international format)"),
        agent_voice: z.string().optional().describe("Voice selection"),
        agent_prompt: z.string().optional().describe("System prompt"),
        agent_start_message: z.string().optional().describe("First message agent speaks"),
    }),
    execute: handlers.doOutboundCall,
});

// --- Call Logs ---

mcp.addTool({
    name: "suarify_get_outbound_call_logs",
    description: "Get all outbound call logs with optional filters and record limit.",
    parameters: z.object({
        current_phone_number: z.string().describe("Filter by the outbound phone number used"),
        totalNumberOfRecords: z.number().optional().default(50).describe("Number of records to return"),
    }),
    execute: handlers.getOutboundCallLogs,
});

mcp.addTool({
    name: "suarify_get_inbound_call_logs",
    description: "Get all inbound call logs with optional filters and record limit.",
    parameters: z.object({
        current_phone_number: z.string().describe("Filter by the inbound phone number"),
        totalNumberOfRecords: z.number().optional().default(50).describe("Number of records to return"),
    }),
    execute: handlers.getInboundCallLogs,
});

// --- User Agents ---

mcp.addTool({
    name: "suarify_list_user_agents",
    description: "Retrieve all AI agents for the authenticated user.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Owner email filter"),
        limit: z.number().optional().default(100),
    }),
    execute: handlers.listUserAgents,
});

mcp.addTool({
    name: "suarify_get_user_agent",
    description: "Retrieve a single AI agent by ID.",
    parameters: z.object({
        id: z.string().describe("The ID of the user agent"),
    }),
    execute: handlers.getUserAgent,
});

// --- Leads Management ---

mcp.addTool({
    name: "suarify_create_lead",
    description: "Create a single lead record with detailed recipient information.",
    parameters: z.object({
        owner_email: z.string().describe("Owner's email address"),
        receipient_name: z.string().describe("Name of the recipient"),
        receipient_phone: z.string().describe("Phone number of the recipient"),
    }),
    execute: handlers.createLead,
});

mcp.addTool({
    name: "suarify_list_leads",
    description: "Retrieve a list of leads with optional filtering and pagination.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Filter by owner email"),
        limit: z.number().optional().default(100),
    }),
    execute: handlers.listLeads,
});

mcp.addTool({
    name: "suarify_delete_lead",
    description: "Remove a lead record from the database.",
    parameters: z.object({
        id: z.string().describe("The ID of the lead record"),
    }),
    execute: handlers.deleteLead,
});

export { mcp, apiClient };

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    mcp.start({
        transportType: "stdio",
    });
}
