# Security Specification for Factori Firestore Security Rules

## 1. Data Invariants
*   Only signed-in system users can perform database queries and operations.
*   Data entries must conform to defined schema constraints (e.g., matching types, string lengths, positive numbers). All numeric attributes (such as prices, total amounts, quantities) must be >= 0.
*   Identifiers must be valid string IDs that meet basic character and size limits.
*   Timestamps must be validated correctly.

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads are designed to challenge the Access Control rules:

1.  **Anonymous/Unsigned-in Attempt**: Read/write from outside the client application context.
2.  **ID Injection**: Attempting to write a document with an ID exceeding 128 characters or containing hazardous character patterns.
3.  **Invalid Numeric Quantities**: Registering negative stock, negative prices, or negative totals.
4.  **Malicious String Payload**: Sending 10MB text strings inside descriptive fields to cause memory or resource exhaustion.
5.  **Role Escalation**: Attempting to update or insert roles/permissions with expanded privilege levels.
6.  **Immutable Constraint Bypass**: Trying to change immutable field values (e.g. `createdAt`, `id`).
7.  **Unauthorized List Scrapers**: Attempting blanket listing of highly secure corporate data without filter guidelines.
8.  **Status Skip**: Updating a workflow status from terminal outcomes.
9.  **Orphaned Foreign Key creation**: Inserting referenced objects with invalid formats.
10. **Shadow Fields**: Appending unregistered attributes (like `isVerified: true`) to target schemas.
11. **Spoofed Ownership**: Claiming another user's identity under created profiles.
12. **Improper Timestamp Assertion**: Providing custom, client-generated past or future dates instead of server timestamps.

## 3. The Test Cases
All tests expect permission denied on spoofed operations.
- `Allow` is granted only when requests are authenticated and schemas resolve beautifully.
