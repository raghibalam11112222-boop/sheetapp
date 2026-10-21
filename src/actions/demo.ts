"use server";

import { withAction, ActionError } from "@/lib/action";
import { requirePermissionOn } from "@/lib/auth/guards";
import { canCreateApp, getOrgPlanId } from "@/lib/billing/limits";
import { prisma } from "@/lib/db";
import type { SchemaSuggestion } from "@/lib/ai";
import { persistSchema } from "@/lib/generation/persist";
import { track } from "@/lib/analytics/track";

const demoSuggestion: SchemaSuggestion = {
  name: "Acme Operations",
  description: "Demo CRM + orders workspace",
  rationale: "Demo dataset shipped with SheetApp",
  tables: [
    {
      key: "customers",
      label: "Customers",
      singularLabel: "Customer",
      sourceSheet: "Demo",
      description: "People and companies who buy from you",
      recordCount: 8,
      fields: [
        { key: "name", label: "Name", type: "TEXT", required: true, unique: false, isTitle: true, sourceColumnIndex: 0 },
        { key: "email", label: "Email", type: "EMAIL", required: false, unique: false, isTitle: false, sourceColumnIndex: 1 },
        { key: "company", label: "Company", type: "TEXT", required: false, unique: false, isTitle: false, sourceColumnIndex: 2 },
        { key: "status", label: "Status", type: "ENUM", required: false, unique: false, isTitle: false, options: ["Lead", "Active", "Churned"], sourceColumnIndex: 3 },
        { key: "lifetime_value", label: "Lifetime Value", type: "CURRENCY", required: false, unique: false, isTitle: false, sourceColumnIndex: 4 },
      ],
    },
    {
      key: "orders",
      label: "Orders",
      singularLabel: "Order",
      sourceSheet: "Demo",
      description: "Purchase orders placed by customers",
      recordCount: 7,
      fields: [
        { key: "order_number", label: "Order #", type: "TEXT", required: true, unique: true, isTitle: true, sourceColumnIndex: 0 },
        { key: "customer", label: "Customer", type: "RELATION", required: false, unique: false, isTitle: false, sourceColumnIndex: 1 },
        { key: "order_date", label: "Order Date", type: "DATE", required: false, unique: false, isTitle: false, sourceColumnIndex: 2 },
        { key: "amount", label: "Amount", type: "CURRENCY", required: false, unique: false, isTitle: false, sourceColumnIndex: 3 },
        { key: "status", label: "Status", type: "ENUM", required: false, unique: false, isTitle: false, options: ["Draft", "Paid", "Shipped", "Cancelled"], sourceColumnIndex: 4 },
      ],
    },
    {
      key: "products",
      label: "Products",
      singularLabel: "Product",
      sourceSheet: "Demo",
      description: "Items in the catalog",
      recordCount: 5,
      fields: [
        { key: "sku", label: "SKU", type: "TEXT", required: true, unique: true, isTitle: true, sourceColumnIndex: 0 },
        { key: "product_name", label: "Product", type: "TEXT", required: false, unique: false, isTitle: false, sourceColumnIndex: 1 },
        { key: "price", label: "Price", type: "CURRENCY", required: false, unique: false, isTitle: false, sourceColumnIndex: 2 },
        { key: "in_stock", label: "In Stock", type: "BOOLEAN", required: false, unique: false, isTitle: false, sourceColumnIndex: 3 },
      ],
    },
    {
      key: "employees",
      label: "Employees",
      singularLabel: "Employee",
      sourceSheet: "Demo",
      description: "People who work here",
      recordCount: 6,
      fields: [
        { key: "name", label: "Name", type: "TEXT", required: true, unique: false, isTitle: true, sourceColumnIndex: 0 },
        { key: "role", label: "Role", type: "TEXT", required: false, unique: false, isTitle: false, sourceColumnIndex: 1 },
        { key: "department", label: "Department", type: "ENUM", required: false, unique: false, isTitle: false, options: ["Sales", "Ops", "Finance", "Engineering"], sourceColumnIndex: 2 },
        { key: "email", label: "Email", type: "EMAIL", required: false, unique: false, isTitle: false, sourceColumnIndex: 3 },
        { key: "salary", label: "Salary", type: "CURRENCY", required: false, unique: false, isTitle: false, sourceColumnIndex: 4 },
      ],
    },
    {
      key: "projects",
      label: "Projects",
      singularLabel: "Project",
      sourceSheet: "Demo",
      description: "Workstreams and delivery status",
      recordCount: 5,
      fields: [
        { key: "project_name", label: "Project", type: "TEXT", required: true, unique: false, isTitle: true, sourceColumnIndex: 0 },
        { key: "owner", label: "Owner", type: "TEXT", required: false, unique: false, isTitle: false, sourceColumnIndex: 1 },
        { key: "status", label: "Status", type: "ENUM", required: false, unique: false, isTitle: false, options: ["Planning", "In progress", "Blocked", "Done"], sourceColumnIndex: 2 },
        { key: "due_date", label: "Due Date", type: "DATE", required: false, unique: false, isTitle: false, sourceColumnIndex: 3 },
        { key: "budget", label: "Budget", type: "CURRENCY", required: false, unique: false, isTitle: false, sourceColumnIndex: 4 },
      ],
    },
  ],
  relationships: [
    { fromTableKey: "orders", fromFieldKey: "customer", toTableKey: "customers", confidence: 0.9, label: "places orders" },
  ],
};

const demoRecords: Record<string, Record<string, unknown>[]> = {
  customers: [
    { name: "Acme Corp", email: "billing@acme.com", company: "Acme Corp", status: "Active", lifetime_value: 48200 },
    { name: "Globex", email: "ap@globex.io", company: "Globex", status: "Active", lifetime_value: 31500 },
    { name: "Initech", email: "hello@initech.com", company: "Initech", status: "Lead", lifetime_value: 0 },
    { name: "Umbrella", email: "ops@umbrella.net", company: "Umbrella", status: "Churned", lifetime_value: 12750 },
    { name: "Stark Industries", email: "finance@stark.com", company: "Stark Industries", status: "Active", lifetime_value: 96000 },
    { name: "Wayne Enterprises", email: "ap@wayne.co", company: "Wayne Enterprises", status: "Active", lifetime_value: 74300 },
    { name: "Soylent", email: "team@soylent.co", company: "Soylent", status: "Lead", lifetime_value: 0 },
    { name: "Hooli", email: "billing@hooli.xyz", company: "Hooli", status: "Active", lifetime_value: 58100 },
  ],
  orders: [
    { order_number: "ORD-1001", customer: "Acme Corp", order_date: "2026-08-14", amount: 12400, status: "Paid" },
    { order_number: "ORD-1002", customer: "Globex", order_date: "2026-08-21", amount: 5600, status: "Shipped" },
    { order_number: "ORD-1003", customer: "Stark Industries", order_date: "2026-09-01", amount: 22100, status: "Paid" },
    { order_number: "ORD-1004", customer: "Wayne Enterprises", order_date: "2026-09-05", amount: 9800, status: "Draft" },
    { order_number: "ORD-1005", customer: "Hooli", order_date: "2026-09-11", amount: 4300, status: "Cancelled" },
    { order_number: "ORD-1006", customer: "Acme Corp", order_date: "2026-09-18", amount: 15900, status: "Paid" },
    { order_number: "ORD-1007", customer: "Umbrella", order_date: "2026-09-20", amount: 7200, status: "Shipped" },
  ],
  products: [
    { sku: "SKU-001", product_name: "Widget Pro", price: 49, in_stock: true },
    { sku: "SKU-002", product_name: "Widget Lite", price: 19, in_stock: true },
    { sku: "SKU-003", product_name: "Gadget X", price: 129, in_stock: false },
    { sku: "SKU-004", product_name: "Gadget Mini", price: 79, in_stock: true },
    { sku: "SKU-005", product_name: "Service Plan", price: 999, in_stock: true },
  ],
  employees: [
    { name: "Jane Doe", role: "Sales Lead", department: "Sales", email: "jane@acme.com", salary: 92000 },
    { name: "John Smith", role: "Account Manager", department: "Sales", email: "john@acme.com", salary: 78000 },
    { name: "Priya Nair", role: "Ops Manager", department: "Ops", email: "priya@acme.com", salary: 96000 },
    { name: "Marco Ruiz", role: "Controller", department: "Finance", email: "marco@acme.com", salary: 105000 },
    { name: "Ana Kim", role: "Engineer", department: "Engineering", email: "ana@acme.com", salary: 128000 },
    { name: "Tom Weber", role: "Fulfillment", department: "Ops", email: "tom@acme.com", salary: 64000 },
  ],
  projects: [
    { project_name: "Q3 Renewals", owner: "Jane Doe", status: "In progress", due_date: "2026-10-15", budget: 24000 },
    { project_name: "Warehouse Move", owner: "Priya Nair", status: "Planning", due_date: "2026-11-01", budget: 48000 },
    { project_name: "Billing Migration", owner: "Marco Ruiz", status: "Blocked", due_date: "2026-10-30", budget: 15000 },
    { project_name: "Portal Redesign", owner: "Ana Kim", status: "In progress", due_date: "2026-12-12", budget: 60000 },
    { project_name: "ISO Prep", owner: "Tom Weber", status: "Done", due_date: "2026-09-01", budget: 9000 },
  ],
};

export async function createDemoWorkspaceAction() {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");

    const existing = await prisma.application.findFirst({
      where: { organizationId: ctx.orgId, name: "Acme Operations" },
      select: { id: true },
    });
    if (existing) return { applicationId: existing.id };

    const planId = await getOrgPlanId(ctx.orgId);
    const appCount = await prisma.application.count({
      where: { organizationId: ctx.orgId },
    });
    const appCheck = canCreateApp(planId, appCount);
    if (!appCheck.ok) throw new ActionError(appCheck.message ?? "App limit reached.", "LIMIT");

    const { applicationId } = await persistSchema({
      orgId: ctx.orgId,
      userId: ctx.userId,
      dataSourceId: null,
      suggestion: demoSuggestion,
      appName: "Acme Operations",
      status: "READY",
    });

    const tables = await prisma.generatedTable.findMany({
      where: { applicationId },
      include: { fields: { orderBy: { position: "asc" } } },
    });

    let count = 0;
    for (const table of tables) {
      // Suggestion keys are plural ("customers") but persisted names are
      // singular ("Customer") — resolve through the stored plural label.
      const rows =
        demoRecords[table.pluralName.toLowerCase()] ??
        demoRecords[table.name.toLowerCase()] ??
        [];
      if (!rows.length) continue;
      const data = rows.map((row) => ({
        organizationId: ctx.orgId,
        applicationId,
        tableId: table.id,
        data: row as object,
        createdById: ctx.userId,
      }));
      await prisma.record.createMany({ data });
      count += rows.length;
    }

    await track("app_generated", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      metadata: { demo: true, applicationId, tables: tables.length, records: count },
    });
    await track("records_imported", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      metadata: { count, demo: true },
    });

    return { applicationId };
  });
}
