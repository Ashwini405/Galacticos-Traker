cd "c:\Users\hp\OneDrive\Desktop\cityHub\recruitment-tracker-mysql\server"
node --check index.js
if ($LASTEXITCODE -eq 0) {
    Write-Host "Server syntax is valid"
} else {
    Write-Host "Server has syntax errors"
}

