# 🚀 LaptopShop Admin - Core Development Instructions

## 1. General Constraints
- **Language:** You MUST communicate, explain, write logs, and summarize ONLY in **Pure Vietnamese (Tiếng Việt)**.
- **Workflow:** Always work in small steps. Use `Graphify` to understand dependencies before modifying files.
- **Modify Over Create (CRITICAL):** Before creating ANY new component, service, or model, ALWAYS check if it already exists in the codebase. If it exists, UPDATE and REFACTOR it to meet new requirements. Do NOT create duplicate files.

## 2. Agent Skills Integration (CRITICAL)
- **Active Skill Usage:** When tasked with transpiling UI, fixing code, or mapping DTOs, you MUST actively leverage relevant installed skills (e.g., `frontend-transpiler`, `dto-to-interface-mapper`, `self-healing-code`).
- Explicitly state which skill you are applying before executing the step.

## 3. Frontend Rules (Angular 17+)
- **Control Flow:** MANDATORY use modern syntax `@if`, `@else`, `@for (item of items; track item.id)`.
  - ❌ NEVER use legacy directives like `*ngIf`, `*ngFor`.
  - ❌ ABSOLUTELY NEVER generate invalid syntax like `*if`.
- **Component Architecture:** All components MUST be `standalone: true`.
- **State Management:** Prioritize using Angular Signals (`signal()`, `computed()`, `effect()`) for UI state.
- **Material UI:** Strictly import necessary Angular Material modules directly into the component `imports` array, can use Taiwind CSS.

## 4. Data Mapping & Backend Integration (Spring Boot)
- **Model Mapping:** NEVER map Angular interfaces directly to Java Database Entities.
- **DTO Strictness:** Angular Models MUST map 1-1 with Backend Request/Response DTOs (`@RequestBody`, `@ModelAttribute`, `@RequestPart`).
- http://localhost:8080/swagger-ui/index.html see APIs backend

## 5. Compound Engineering & Self-Healing Loop
- **Auto-Verification:** After writing or transpiling ANY TypeScript or HTML file, you MUST automatically run `ng build`.
- **Self-Healing:** If compilation fails (e.g., TS2769, template errors), read the error log and fix it immediately.
- **Completion Condition:** NEVER report a task as "DONE" until `ng build` passes with exactly 0 errors.
- **Final Summary & Reporting:** Provide a concise summary of changed files, and explicitly list any pending UI bugs or manual tasks remaining.
