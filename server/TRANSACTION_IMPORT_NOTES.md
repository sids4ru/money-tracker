# Transaction Import Notes

## Dummy Transaction Cleanup (July 3, 2025)

### Issue
Test/dummy transactions were accidentally imported into the production database. These were identified by the "DUMMY" keyword in their transaction descriptions. The test scripts were running during the import process and inserting test data directly into the production database.

### Resolution
1. Created a cleanup script (`src/clean-dummy-transactions.ts`) that identified and removed 24 dummy transactions from the database.
2. Enhanced the CSV import functionality in `transactionController.ts` to automatically filter out transactions containing "DUMMY" or "TEST TRANSACTION" in their descriptions.
3. Moved all test scripts from the server root directory to the `server/tests/integration/` directory.
4. Added test database isolation to prevent any test scripts from affecting the production database.
5. Implemented a proper test runner with environment checks to ensure tests only run in test mode.

### Running the Cleanup Script
If dummy transactions are ever found in the database again, the cleanup script can be run using:

```bash
cd server
npx ts-node src/clean-dummy-transactions.ts
```

### Test Isolation Changes
The following changes were made to improve test isolation:

1. Moved test scripts to dedicated directories:
   - `test-csv-import.js` → `tests/integration/csv-import.test.js`
   - `test-e2e-import.js` → `tests/integration/e2e-import.test.js`

2. Added environment checks that prevent test scripts from running in production mode.

3. Created a proper test runner (`run-tests.js`) to execute tests safely:
   ```bash
   # Run unit tests
   cd server
   node run-tests.js unit
   
   # Run integration tests
   node run-tests.js integration
   
   # Run a specific integration test
   node run-tests.js integration csv-import
   ```

4. Implemented a test-specific database connector (`testDbIntegration.js`) that:
   - Creates an isolated test database
   - Overrides database connections during testing
   - Cleans up after tests complete

### Future Prevention
The transaction import functionality now contains:

1. A filter that automatically detects and skips transactions with descriptions containing:
   - "DUMMY"
   - "TEST TRANSACTION"

2. Safety checks in test scripts that prevent them from running in production mode

## Recommended Practices
When testing import functionality:

1. Always use the proper test runner: `node server/run-tests.js integration`
2. Never run test scripts directly in a production environment
3. Set `NODE_ENV=test` when developing or testing new import functionality
4. Always store test CSV files in `server/tests/fixtures/` directory
5. Use clearly marked test data with prefixes like "TEST_" in filenames
6. After testing, verify the database doesn't contain any test data
7. Add clear "TEST" or "DUMMY" markers in test data descriptions so the import filter can catch them
