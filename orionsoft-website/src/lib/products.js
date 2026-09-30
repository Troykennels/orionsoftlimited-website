// The built-in product catalogue: what the website shows until the admin
// publishes a product list, and what Admin → Products starts from, so adding
// one product never drops the built-in ones from the site.
import { BRAND } from "./brand.js";

export const DEFAULT_PRODUCTS_CATALOG = [
  { id: "carecore",       name: "CareCore",       tag: "Hospital Management",   color: "#4F8EF7", status: "live",  published: true,  featured: true,  order: 1, soon: false, hasPage: true,
    industries: ["Healthcare"],
    solutions:  ["Go Paperless","Process Automation","Data & Reporting","Enterprise Integration","Training & Adoption"] },
  { id: "schoolcore",     name: "SchoolCore",     tag: "School Management",     color: "#10B981", status: "live",  published: true,  featured: false, order: 2, soon: false, hasPage: true,
    industries: ["Education"],
    solutions:  ["Go Paperless","Training & Adoption"] },
  { id: "compliancecore", name: "ComplianceCore", tag: "Compliance & Risk",     color: "#F59E0B", status: "live",  published: true,  featured: false, order: 3, soon: false, hasPage: true,
    industries: ["Financial Services","Government & NGOs"],
    solutions:  ["Compliance & Audit"] },
  { id: "inventorycore",  name: "InventoryCore",  tag: "Inventory & Supply",    color: "#8B5CF6", status: "live",  published: true,  featured: false, order: 4, soon: false, hasPage: true,
    industries: ["Healthcare","Manufacturing & Retail","Logistics & Fleet"],
    solutions:  ["Process Automation","Data & Reporting"] },
  { id: "financecore",    name: "FinanceCore",    tag: "Finance & Accounting",  color: BRAND.gold, status: "live",  published: true,  featured: false, order: 5, soon: false, hasPage: true,
    industries: ["Education","Financial Services","Faith Organisations","Manufacturing & Retail","Government & NGOs"],
    solutions:  ["Data & Reporting","Compliance & Audit","Enterprise Integration"] },
  { id: "hrcore",         name: "HRCore",         tag: "Human Resources",       color: "#F43F5E", status: "live",  published: true,  featured: false, order: 6, soon: false, hasPage: true,
    industries: ["Education","Financial Services","Manufacturing & Retail","Government & NGOs"],
    solutions:  ["Process Automation","Compliance & Audit","Enterprise Integration"] },
  { id: "churchcore",     name: "ChurchCore",     tag: "Faith Organisations",   color: "#7C3AED", status: "live",  published: true,  featured: false, order: 7, soon: false, hasPage: true,
    industries: ["Faith Organisations"],
    solutions:  ["Go Paperless","Training & Adoption"] },
  { id: "fleetcore",      name: "FleetCore",      tag: "Fleet Management",      color: "#06B6D4", status: "live",  published: true,  featured: false, order: 8, soon: false, hasPage: true,
    industries: ["Logistics & Fleet"],
    solutions:  ["Data & Reporting"] },
  { id: "telehealth",     name: "TeleHealth",     tag: "Telemedicine · Soon",   color: "#4F8EF7", status: "soon",  published: true,  featured: false, order: 9, soon: true,  hasPage: true,
    industries: ["Healthcare"],
    solutions:  [] },
];
