param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$mcpRepoRoot = Split-Path $PSScriptRoot -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path (Split-Path $mcpRepoRoot -Parent) 'ARIA-ChatGPT-Plugin-Packages' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($mcpPackage in @('aria-hub-opportunity-repair', 'dev-6ac792ce1c048191afcd5c15b08d9f06')) {
    $mcpPackagePath = Join-Path $mcpRepoRoot "plugins/$mcpPackage"
    $mcpManifest = Get-Content -LiteralPath (Join-Path $mcpPackagePath 'plugin.json') -Raw | ConvertFrom-Json
    if ($mcpManifest.name -ne $mcpPackage) { throw 'Package identity mismatch' }
    if ($mcpManifest.extensions.'com.openai'.interface.shortDescription.Length -gt 30) { throw 'Plugin subtitle exceeds 30 characters' }
    $mcpArchivePath = Join-Path $OutputDirectory "$mcpPackage-$($mcpManifest.version).zip"
    if (Test-Path -LiteralPath $mcpArchivePath) { Remove-Item -LiteralPath $mcpArchivePath }
    [IO.Compression.ZipFile]::CreateFromDirectory($mcpPackagePath, $mcpArchivePath, [IO.Compression.CompressionLevel]::Optimal, $true)
    $mcpZip = [IO.Compression.ZipFile]::OpenRead($mcpArchivePath)
    try {
        if (!$mcpZip.Entries.Count) { throw 'Empty plugin archive' }
        if ($mcpZip.Entries.FullName | Where-Object { $_ -match '(^|/)(\.env|node_modules|credentials)(/|$)' }) { throw 'Unexpected private or runtime file in plugin archive' }
    } finally { $mcpZip.Dispose() }
    Write-Output $mcpArchivePath
}
