import { handlers, apiClient } from "./index.js";
import MockAdapter from "axios-mock-adapter";

const mock = new MockAdapter(apiClient);

describe("Suarify MCP Server Handlers (Modernized)", () => {
    beforeEach(() => {
        mock.reset();
    });

    test("suarify_setup_inbound_settings handler returns structured content", async () => {
        const testData = {
            phonenumber: "0123456789",
            params: JSON.stringify({ main_voice: "alloy" })
        };

        mock.onPost("/inbound-phone-settings").reply(200, { success: true });

        const result = await handlers.setupInboundSettings(testData);
        expect(result.structuredContent).toEqual({ success: true });
        expect(result.content[0].text).toContain("Inbound settings configured");
    });

    test("suarify_get_inbound_settings handler returns resource data", async () => {
        const testArgs = { owner_email: "test@example.com" };
        mock.onGet("/inbound-phone-settings").reply(200, { settings: { voice: "alloy" } });

        const result = await handlers.getInboundSettings(testArgs);
        expect(result.structuredContent).toEqual({ settings: { voice: "alloy" } });
        expect(result.content[0].text).toContain('"voice": "alloy"');
    });

    test("suarify_initiate_call handler returns call info", async () => {
        const testData = { phone_number: "0123456789", system_prompt: "hello" };
        mock.onPost("/api/call").reply(200, { callId: "123" });

        const result = await handlers.initiateCall(testData);
        expect(result.structuredContent).toEqual({ callId: "123" });
        expect(result.content[0].text).toContain("Call initiated");
    });

    test("apiClient interceptor adds signup recommendation on 401", async () => {
        mock.onGet("/api/user-leads").reply(401, { error: "Unauthorized" });

        try {
            await handlers.listLeads({});
            throw new Error("Should have thrown an error");
        } catch (error) {
            // Note: In the new implementation, formatError catches the error and returns a result object
            // but the interceptor still modifies the error message before it's caught.
            // Our handler catches it and puts it into text/structuredContent
        }

        // Let's verify via the handler's return instead of catch
        const result = await handlers.listLeads({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("https://suarify.my/register-new-user");
    });
});
