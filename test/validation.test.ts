import { z } from "zod";
import { createWorkOrderShape } from "../src/tools/createWorkOrder";
import { updateWorkOrderShape } from "../src/tools/updateWorkOrder";
import { listWorkOrdersShape } from "../src/tools/listWorkOrders";

describe("tool input validation", () => {
  it("rejects create-work-order missing required fields", () => {
    const schema = z.object(createWorkOrderShape);
    const result = schema.safeParse({ title: "Fix pump" }); // no description
    expect(result.success).toBe(false);
  });

  it("rejects a malformed dueDate on create-work-order", () => {
    const schema = z.object(createWorkOrderShape);
    const result = schema.safeParse({
      title: "Fix pump",
      description: "Leaking seal",
      dueDate: "next tuesday",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid ISO 8601 dueDate on create-work-order", () => {
    const schema = z.object(createWorkOrderShape);
    const result = schema.safeParse({
      title: "Fix pump",
      description: "Leaking seal",
      dueDate: "2026-09-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid priority enum value", () => {
    const schema = z.object(createWorkOrderShape);
    const result = schema.safeParse({
      title: "Fix pump",
      description: "Leaking seal",
      priority: "URGENT", // not a real value — real ones are NONE/LOW/MEDIUM/HIGH
    });
    expect(result.success).toBe(false);
  });

  it("caps assignedToUserIds at a sane size", () => {
    const schema = z.object(createWorkOrderShape);
    const tooMany = Array.from({ length: 500 }, (_, i) => i + 1);
    const result = schema.safeParse({
      title: "Fix pump",
      description: "Leaking seal",
      assignedToUserIds: tooMany,
    });
    expect(result.success).toBe(false);
  });

  it("requires workOrderId on update-work-order", () => {
    const schema = z.object(updateWorkOrderShape);
    const result = schema.safeParse({ title: "New title" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty filter set on list-work-orders (defaults apply)", () => {
    const schema = z.object(listWorkOrdersShape);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });
});
