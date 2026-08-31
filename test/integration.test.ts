import axios from "axios";
import { loadConfig } from "../src/config";
import { Logger } from "../src/util/logger";
import { AuthManager } from "../src/auth/authManager";
import { ApiClient } from "../src/http/apiClient";
import { listWorkOrders } from "../src/tools/listWorkOrders";
import { createWorkOrder } from "../src/tools/createWorkOrder";
import { getWorkOrder } from "../src/tools/getWorkOrder";
import { updateWorkOrder } from "../src/tools/updateWorkOrder";
import { changeWorkOrderStatus } from "../src/tools/changeWorkOrderStatus";
import { listAssets } from "../src/tools/listAssets";
import { getAsset } from "../src/tools/getAsset";

/**
 * Exercises the tools against a real running Atlas API. Requires
 * API_BASE_URL, API_EMAIL, API_PASSWORD to point at a live instance with
 * that account already signed up (see the cmms repo's CLAUDE.md for how to
 * boot the API locally and create a service account via /auth/signup).
 * Skips entirely when those aren't set, so `npm test` stays runnable
 * without a live backend.
 */
const canRunIntegration = !!(process.env.API_BASE_URL && process.env.API_EMAIL && process.env.API_PASSWORD);
const maybeDescribe = canRunIntegration ? describe : describe.skip;

maybeDescribe("Atlas API integration", () => {
  let apiClient: ApiClient;
  let authManager: AuthManager;
  let createdWorkOrderId: number;

  beforeAll(() => {
    const config = loadConfig();
    const logger = new Logger("ERROR");
    const signinHttp = axios.create({ baseURL: config.apiBaseUrl, timeout: 15000 });
    authManager = new AuthManager(config, logger, signinHttp);
    apiClient = new ApiClient(config, logger, authManager);
  });

  it("signs in and obtains a JWT", async () => {
    const token = await authManager.getToken();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // header.payload.signature
  });

  it("lists work orders", async () => {
    const result = await listWorkOrders(apiClient, {
      pageNum: 0,
      pageSize: 5,
      sortField: "id",
      direction: "ASC",
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.pagination).toBeDefined();
    expect(Array.isArray(parsed.workOrders)).toBe(true);
  });

  it("creates a work order with minimal fields", async () => {
    const result = await createWorkOrder(apiClient, {
      title: `MCP integration test ${Date.now()}`,
      description: "Created by the Atlas MCP integration test suite.",
      priority: "NONE",
      requiredSignature: false,
      status: "OPEN",
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(typeof parsed.id).toBe("number");
    createdWorkOrderId = parsed.id;
  });

  it("gets the created work order, including discrepancies as an empty array", async () => {
    const result = await getWorkOrder(apiClient, { workOrderId: createdWorkOrderId });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(createdWorkOrderId);
    expect(parsed.status).toBe("OPEN");
    // A brand-new work order has no discrepancies yet.
    expect(Array.isArray(parsed.discrepancies)).toBe(true);
    expect(parsed.discrepancies).toHaveLength(0);
  });

  it("updates the work order", async () => {
    const result = await updateWorkOrder(apiClient, {
      workOrderId: createdWorkOrderId,
      title: "MCP integration test (updated)",
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.current.title).toBe("MCP integration test (updated)");
  });

  it("changes the work order status", async () => {
    const result = await changeWorkOrderStatus(apiClient, {
      workOrderId: createdWorkOrderId,
      newStatus: "IN_PROGRESS",
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("IN_PROGRESS");
  });

  it("lists assets", async () => {
    const result = await listAssets(apiClient, {
      pageNum: 0,
      pageSize: 5,
      sortField: "id",
      direction: "ASC",
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.pagination).toBeDefined();
    expect(Array.isArray(parsed.assets)).toBe(true);
  });

  it("gets an asset by id when one exists", async () => {
    const list = await listAssets(apiClient, {
      pageNum: 0,
      pageSize: 1,
      sortField: "id",
      direction: "ASC",
    });
    const { assets } = JSON.parse(list.content[0].text);
    if (assets.length === 0) {
      return; // No assets seeded in this environment — nothing to fetch.
    }
    const result = await getAsset(apiClient, { assetId: assets[0].id });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(assets[0].id);
    expect(typeof parsed.name).toBe("string");
  });

  afterAll(async () => {
    if (createdWorkOrderId) {
      // No delete endpoint exists on this API; archive instead so test runs don't
      // accumulate visible open work orders.
      await updateWorkOrder(apiClient, { workOrderId: createdWorkOrderId, archived: true });
    }
  });
});
