$ErrorActionPreference = "Continue"
Set-Location "F:\kamitsubaki-wiki-site"
pnpm build *> "F:\kamitsubaki-wiki-site\final-build.log"
$code = $LASTEXITCODE
"EXIT_CODE=$code" | Add-Content "F:\kamitsubaki-wiki-site\final-build.log"
