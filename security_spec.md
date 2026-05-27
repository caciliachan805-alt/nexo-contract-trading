# Security Specification - NEXO Exchange

## 1. Data Invariants

- **Transaction Integrity**: A transaction cannot be created with a status other than 'pending' by a regular user.
- **Ownership**: Users can only read and write their own data (profiles, transactions, trades, alerts).
- **KYC Isolation**: KYC documents are private and only visible to the owner and admins.
- **Balance Lock**: Users cannot directly modify their own `availableBalance` or `portfolioValue`. These are updated via system actions or admin approval.
- **Admin Supremacy**: Admins (defined in the `admins` collection) have read access to all user data and write access to status fields.
- **Asset Validation**: Transactions and trades must use valid asset symbols or IDs.

## 2. The "Dirty Dozen" Payloads (Attack Vectors)

1. **Identity Spoofing**: Attempt to create a transaction with `userId` of another user.
2. **Privilege Escalation**: Attempt to update own user profile to set `role: 'admin'`.
3. **Ghost Balance**: Attempt to update own user profile to increment `availableBalance`.
4. **Terminal Status Bypass**: Attempt to update a 'failed' or 'approved' transaction to change the amount.
5. **PII Leak**: Attempt to read another user's `kycDocument`.
6. **ID Poisoning**: Attempt to create a document with a massive string as ID (>128 chars).
7. **Type Mismatch**: Attempt to send a string for a `amountTo` field.
8. **Shadow Field Injection**: Attempt to add an `isAdmin: true` field to a transaction.
9. **Referral Fraud**: Attempt to increment own `referrals` count in user profile.
10. **Unverified Write**: Attempt to submit KYC if the user is suspended.
11. **Query Scraping**: Attempt to list ALL transactions without a `userId` filter.
12. **Status Shortcutting**: Attempt to create a deposit with status 'approved' directly.

## 3. Test Runner Requirements

The `firestore.rules` must ensure that all payloads above result in `PERMISSION_DENIED`.
Rules must enforce:
- `isValidId(id)` for all path variables.
- `isValid[Entity]` for all creations and updates.
- `affectedKeys().hasOnly()` for split-action updates.
- `request.auth.uid == data.userId` for ownership.
