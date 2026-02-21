import { handlers, apiClient } from "./index.js";
import MockAdapter from "axios-mock-adapter";

const mock = new MockAdapter(apiClient);

describe("Suarify MCP Server Handlers", () => {
    beforeEach(() => {
        mock.reset();
    });

    test("setupInboundSettings handler calls the correct endpoint", async () => {
        const testData = {
            phonenumber: "0123456789",
            params: JSON.stringify({ main_voice: "alloy" })
        };

        mock.onPost("/inbound-phone-settings").reply(200, { success: true });

        const result = await handlers.setupInboundSettings(testData);
        expect(result).toEqual({ success: true });
        expect(mock.history.post[0].data).toBe(JSON.stringify(testData));
    });

    test("getInboundSettings handler calls the correct endpoint", async () => {
        const testArgs = { owner_email: "test@example.com" };
        mock.onGet("/inbound-phone-settings").reply(200, { settings: {} });

        const result = await handlers.getInboundSettings(testArgs);
        expect(result).toEqual({ settings: {} });
        expect(mock.history.get[0].params).toEqual(testArgs);
    });

    test("initiateCall handler calls the correct endpoint", async () => {
        const testData = { phone_number: "0123456789", system_prompt: "hello" };
        mock.onPost("/api/call").reply(200, { callId: "123" });

        const result = await handlers.initiateCall(testData);
        expect(result).toEqual({ callId: "123" });
        expect(mock.history.post[0].data).toBe(JSON.stringify(testData));
    });

    test("listLeads handler handles pagination", async () => {
        const testArgs = { limit: 10, offset: 20 };
        mock.onGet("/api/user-leads").reply(200, { leads: [] });

        const result = await handlers.listLeads(testArgs);
        expect(result).toEqual({ leads: [] });
        expect(mock.history.get[0].params).toEqual(testArgs);
    });

    test("deleteLead handler calls the correct delete endpoint", async () => {
        const id = "lead123";
        mock.onDelete(`/api/user-leads/${id}`).reply(200, { deleted: true });

        const result = await handlers.deleteLead({ id });
        expect(result).toEqual({ deleted: true });
        expect(mock.history.delete[0].url).toBe(`/api/user-leads/${id}`);
    });
});
