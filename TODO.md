# Excel API Validation Integration TODO

## Step 1: ✅ COMPLETED - Added `/excel-api-validate` endpoint to server/routes/candidateRoutes.js
- Import: `validateExcelImport, normalizeRow` added
- POST /excel-api-validate with exact task snippet implemented
- Validates headers/rows → normalizes → batch DB insert (no FK resolve, DB errors handled)
- Handles FK errors, responds with imported count
- Existing /excel-bulk preserved (file upload)

## Step 2: ✅ CLIENT VALIDATION FIXED - Synced client name validation with server
- Added full LOCATION_KEYWORDS array to client/src/pages/Candidates.jsx
- Updated name regex/check to match server exactly
- "Hyderabad Bangcok" now rejected as expected

## Test Steps:
- Client preview: Upload Excel with "Hyderabad Bangcok" → should show error
- Server endpoint: POST /api/candidates/excel-api-validate with bad data → 400 error
- Restart server: `node server/index.js`
- Test with curl/Postman: POST /api/candidates/excel-api-validate 
```
{
  "headers": ["Name", "Email", "Experience"],
  "rows": [["John Doe", "john@example.com", "5"]]
}
```
- Verify validation pass → import success

## Step 3: Client integration (optional)
- Add to client/src/services/api.js or pages/Candidates.jsx
- Use xlsx lib → parse file → POST to new endpoint

## Step 4: [PENDING]

