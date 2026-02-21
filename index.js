import { FastMCP } from "fastmcp";
import axios from "axios";
import { z } from "zod";
import url from "url";

// --- SILENCE STDOUT ---
// MCP uses stdout for communication. Any other output will break the protocol.
const originalLog = console.log;
const originalError = console.error;

// Redirect all standard console methods to stderr
console.log = (...args) => originalError(...args);
console.info = (...args) => originalError(...args);
console.warn = (...args) => originalError(...args);

// Patch process.stdout.write to ensure ONLY JSON messages (likely from FastMCP) go to stdout
const stdoutWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
    const str = chunk.toString();
    // FastMCP messages are JSON objects or arrays
    if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
        return stdoutWrite.apply(process.stdout, arguments);
    }
    // Everything else goes to stderr
    return process.stderr.write.apply(process.stderr, arguments);
};

const BASE_URL = process.env.SUARIFY_BASE_URL || "https://suarify1.my";
const API_KEY = process.env.SUARIFY_API_KEY;

if (!API_KEY) {
    originalError("CRITICAL: SUARIFY_API_KEY environment variable is not set.");
}
// ----------------------

const mcp = new FastMCP("Suarify MCP Server");

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
    },
});

// --- Handlers for Testing ---
export const handlers = {
    setupInboundSettings: async (args) => {
        const response = await apiClient.post("/inbound-phone-settings", args);
        return response.data;
    },
    getInboundSettings: async (args) => {
        const response = await apiClient.get("/inbound-phone-settings", { params: args });
        return response.data;
    },
    setupPhoneConfiguration: async (args) => {
        const response = await apiClient.post("/api/phone-configuration", args);
        return response.data;
    },
    getPhoneConfiguration: async (args) => {
        const response = await apiClient.get("/api/phone-configuration", { params: args });
        return response.data;
    },
    initiateCall: async (args) => {
        const response = await apiClient.post("/api/call", args);
        return response.data;
    },
    doOutboundCall: async (args) => {
        const response = await apiClient.post("/do-outbound-phone-call", args);
        return response.data;
    },
    getOutboundCallLogs: async (args) => {
        const response = await apiClient.get("/api/outbound-call-logs", { params: args });
        return response.data;
    },
    getInboundCallLogs: async (args) => {
        const response = await apiClient.get("/api/inbound-call-logs", { params: args });
        return response.data;
    },
    listUserAgents: async (args) => {
        const response = await apiClient.get("/api/user-agents", { params: args });
        return response.data;
    },
    getUserAgent: async (args) => {
        const { id, ...params } = args;
        const response = await apiClient.get(`/api/user-agents/${id}`, { params });
        return response.data;
    },
    deleteUserAgent: async (args) => {
        const { id, ...params } = args;
        const response = await apiClient.delete(`/api/user-agents/${id}`, { params });
        return response.data;
    },
    createLead: async (args) => {
        const response = await apiClient.post("/api/user-leads", args);
        return response.data;
    },
    bulkUploadLeads: async (args) => {
        const response = await apiClient.post("/api/user-leads/bulk", args);
        return response.data;
    },
    listLeads: async (args) => {
        const response = await apiClient.get("/api/user-leads", { params: args });
        return response.data;
    },
    getLead: async (args) => {
        const response = await apiClient.get(`/api/user-leads/${args.id}`);
        return response.data;
    },
    updateLead: async (args) => {
        const { id, ...data } = args;
        const response = await apiClient.patch(`/api/user-leads/${id}`, data);
        return response.data;
    },
    deleteLead: async (args) => {
        const response = await apiClient.delete(`/api/user-leads/${args.id}`);
        return response.data;
    },
};

// --- Inbound Phone Settings ---

mcp.addTool({
    name: "setupInboundSettings",
    description: "Configure the AI agent behavior, voice, and prompts for inbound calls on a specific phone number. This setup is stored as 'inbound-<phonenumber>'.",
    parameters: z.object({
        phonenumber: z.string().describe("The phone number to configure (e.g., 015487666768)"),
        params: z.string().describe("JSON string containing main_voice, start_time, owner_email, start_message, system_prompt, planned_call_id, transfer_message"),
        openai_key: z.string().optional().describe("Optional OpenAI API key override"),
    }),
    execute: handlers.setupInboundSettings,
});

mcp.addTool({
    name: "getInboundSettings",
    description: "Get the current inbound call settings for the authenticated user's default phone number.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Owner email (required if using system API key)"),
    }),
    execute: handlers.getInboundSettings,
});

// --- Generic Phone Configuration (call_params) ---

mcp.addTool({
    name: "setupPhoneConfiguration",
    description: "Upsert general phone configuration in the call_params table. Use this for custom tokenized configurations.",
    parameters: z.object({
        tokenid: z.string().describe("Unique token identifier for this configuration"),
        params: z.any().describe("Configuration parameters object or JSON string"),
        openai_key: z.string().optional().describe("Optional OpenAI API key override"),
    }),
    execute: handlers.setupPhoneConfiguration,
});

mcp.addTool({
    name: "getPhoneConfiguration",
    description: "Retrieve a specific phone configuration by tokenid, or list all configurations.",
    parameters: z.object({
        tokenid: z.string().optional().describe("Specific token ID to retrieve. If omitted, returns all (max 100)."),
    }),
    execute: handlers.getPhoneConfiguration,
});

// --- Outbound Calls ---

mcp.addTool({
    name: "initiateCall",
    description: "Initiate an outbound AI voice call. Supports both old simple parameters (phone_number, system_prompt) and new enhanced parameters (receipient_phone, agent_prompt, etc.).",
    parameters: z.object({
        phone_number: z.string().optional().describe("Target phone number (simple format)"),
        system_prompt: z.string().optional().describe("System prompt for AI (simple format)"),
        start_message: z.string().optional().describe("Initial greeting message (simple format)"),
        voice: z.string().optional().describe("Voice selection (simple format)"),

        // Enhanced parameters
        owner_email: z.string().optional().describe("Owner's email address"),
        id: z.string().optional().describe("Unique call ID"),
        password: z.string().optional().describe("Must be 'LIVE' for enhanced calls"),
        receipient_phone: z.string().optional().describe("Target phone number (enhanced format)"),
        agent_prompt: z.string().optional().describe("AI instructions (enhanced format)"),
        agent_start_message: z.string().optional().describe("Initial greeting (enhanced format)"),
        agent_voice: z.string().optional().describe("Voice selection (enhanced format)"),
        status: z.string().optional().describe("Must be 'LIVE' for enhanced calls"),
        planned_datetime: z.string().optional().describe("Schedule the call (ISO format)"),
        conversation_goal: z.string().optional(),
        receipient_goal: z.string().optional(),
        lead_name_receipient_name: z.string().optional(),
        from_phone_number: z.string().optional(),
    }),
    execute: handlers.initiateCall,
});

mcp.addTool({
    name: "doOutboundCall",
    description: "Make an outbound phone call with full validation (balance check, user profile). Required for production calls using user accounts.",
    parameters: z.object({
        owner_email: z.string().describe("Owner's email address"),
        id: z.string().optional().describe("Unique call ID"),
        planned_call_id: z.string().optional().describe("ID of the planned call"),
        password: z.string().describe("Must be 'LIVE' to execute the call"),
        agent_voice: z.string().optional().describe("Voice to use (e.g., alloy, sage, verse/<openai-voice>)"),
        agent_prompt: z.string().optional().describe("System prompt for the AI agent"),
        agent_start_message: z.string().optional().describe("First message the agent speaks"),
        planned_call_name: z.string().optional().describe("Human-readable name for the call"),
        lead_ai_agent_id: z.string().optional().describe("ID of the AI agent model"),
        lead_ai_agent: z.string().optional().describe("Name of the AI agent model"),
        planned_datetime: z.string().optional().describe("ISO datetime for when the call should happen"),
        receipient_phone: z.string().describe("Target phone number (international format)"),
        lead_name_receipient_name: z.string().optional().describe("Name of the recipient"),
        receipient_goal: z.string().optional().describe("Information about what the recipient wants"),
        lead_receipient_id: z.string().optional().describe("ID of the lead record"),
        conversation_goal: z.string().optional().describe("Goal for the voice agent to achieve during the call"),
        vendor_tools_url: z.string().optional().nullable().describe("URL for external tools integration"),
        status: z.string().default("LIVE").describe("Call status (e.g., LIVE)"),
        vendor_tools_schema: z.array(z.any()).optional().describe("Schema for vendor tools"),
        from_phone_number: z.string().optional().describe("Caller ID number to use"),
        is_notification_agent: z.boolean().optional().describe("Whether this is a notification-only call"),
        notification_voice_style: z.string().optional().describe("Style of the notification voice"),
        notification_file_url: z.string().optional().describe("URL to a PCM/WAV file for notification"),
        notification_voice_message: z.string().optional().describe("TTS message if notification_file_url is empty"),
        end_voice_message: z.string().optional().describe("Message to play before hanging up"),
        end_voice_style: z.string().optional().describe("Style of the ending voice"),
        end_voice_url: z.string().optional().describe("URL to a PCM/WAV file for the end message"),
        transfer_voice_url: z.string().optional().describe("URL to a PCM/WAV file for the transfer message"),
        transfer_voice_message: z.string().optional().describe("Message to play before transferring"),
        transfer_voice_style: z.string().optional().describe("Style of the transfer voice"),
        loading_voice_url: z.string().optional().describe("URL to a PCM/WAV file to play while loading"),
    }),
    execute: handlers.doOutboundCall,
});

// --- Call Logs ---

mcp.addTool({
    name: "getOutboundCallLogs",
    description: "Get all outbound call logs with optional filters and record limit.",
    parameters: z.object({
        current_phone_number: z.string().describe("Filter by the outbound phone number used"),
        fromDatetime: z.string().optional().describe("Filter logs starting from this ISO datetime"),
        toDatetime: z.string().optional().describe("Filter logs until this ISO datetime"),
        totalNumberOfRecords: z.number().optional().default(50).describe("Number of records to return"),
        owner_email: z.string().optional().describe("Filter by owner email"),
        token_id: z.string().optional().describe("Filter by specific token ID"),
    }),
    execute: handlers.getOutboundCallLogs,
});

mcp.addTool({
    name: "getInboundCallLogs",
    description: "Get all inbound call logs with optional filters and record limit.",
    parameters: z.object({
        current_phone_number: z.string().describe("Filter by the inbound phone number"),
        fromDate: z.string().optional().describe("Filter logs starting from this date (YYYY-MM-DD or ISO)"),
        toDate: z.string().optional().describe("Filter logs until this date (YYYY-MM-DD or ISO)"),
        totalNumberOfRecords: z.number().optional().default(50).describe("Number of records to return"),
        owner_email: z.string().optional().describe("Filter by owner email"),
        token_id: z.string().optional().describe("Filter by specific token ID"),
    }),
    execute: handlers.getInboundCallLogs,
});

// --- User Agents ---

mcp.addTool({
    name: "listUserAgents",
    description: "Retrieve all AI agents for the authenticated user.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Required if using system API key to list a specific user's agents"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
    }),
    execute: handlers.listUserAgents,
});

mcp.addTool({
    name: "getUserAgent",
    description: "Retrieve a single AI agent by ID.",
    parameters: z.object({
        id: z.string().describe("The ID of the user agent"),
        owner_email: z.string().optional().describe("Required if using system API key"),
    }),
    execute: handlers.getUserAgent,
});

mcp.addTool({
    name: "deleteUserAgent",
    description: "Remove an AI agent by ID.",
    parameters: z.object({
        id: z.string().describe("The ID of the user agent"),
        owner_email: z.string().optional().describe("Required if using system API key"),
    }),
    execute: handlers.deleteUserAgent,
});

// --- Leads Management ---

mcp.addTool({
    name: "createLead",
    description: "Create a single lead record with detailed recipient information and conversation goals.",
    parameters: z.object({
        owner_email: z.string().describe("Owner's email address"),
        lead_name: z.string().optional().describe("Name of the lead campaign/category"),
        receipient_name: z.string().describe("Name of the recipient"),
        receipient_phone: z.string().describe("Phone number of the recipient"),
        receipient_info: z.string().optional().describe("Additional info about the recipient"),
        conversation_goal: z.string().optional().describe("Goal for the conversation"),
        goal_value: z.number().optional().describe("Monetary or performance value of the goal"),
    }),
    execute: handlers.createLead,
});

mcp.addTool({
    name: "bulkUploadLeads",
    description: "Upload multiple leads (max 30 records per request).",
    parameters: z.object({
        leads: z.array(z.object({
            owner_email: z.string().describe("Owner's email address"),
            lead_name: z.string().optional().describe("Name of the lead campaign/category"),
            receipient_name: z.string().describe("Name of the recipient"),
            receipient_phone: z.string().describe("Phone number of the recipient"),
            receipient_info: z.string().optional().describe("Additional info about the recipient"),
            conversation_goal: z.string().optional().describe("Goal for the conversation"),
            goal_value: z.number().optional().describe("Value of the goal"),
        })),
    }),
    execute: handlers.bulkUploadLeads,
});

mcp.addTool({
    name: "listLeads",
    description: "Retrieve a list of leads with optional filtering and pagination.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Filter by owner email"),
        lead_name: z.string().optional().describe("Filter by lead campaign name"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
    }),
    execute: handlers.listLeads,
});

mcp.addTool({
    name: "getLead",
    description: "Retrieve details for a single lead by its ID.",
    parameters: z.object({
        id: z.string().describe("The ID of the lead record"),
    }),
    execute: handlers.getLead,
});

mcp.addTool({
    name: "updateLead",
    description: "Update one or more fields of an existing lead.",
    parameters: z.object({
        id: z.string().describe("The ID of the lead record"),
        lead_name: z.string().optional(),
        receipient_name: z.string().optional(),
        receipient_phone: z.string().optional(),
        receipient_info: z.string().optional(),
        conversation_goal: z.string().optional(),
        goal_value: z.number().optional(),
    }),
    execute: handlers.updateLead,
});

mcp.addTool({
    name: "deleteLead",
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
