[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ImageFolder,

    [string]$ApiBaseUrl = "https://cloud-database-gta-traffic.timphillips17.workers.dev",

    [switch]$DryRun,

    [switch]$SkipExisting,

    [switch]$Recurse,

    [int]$MaxFiles = 0
)

$ErrorActionPreference = "Stop"
$ApiBaseUrl = $ApiBaseUrl.TrimEnd("/")

$contentTypes = @{
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
}

$maxFileSize = 10MB
$results = @()

if (-not (Test-Path -LiteralPath $ImageFolder -PathType Container)) {
    throw "Image folder not found: $ImageFolder"
}

Write-Host "Reading vehicle model names from D1..." -ForegroundColor Cyan

$vehicleLookup = @{}
$offset = 0
$limit = 500
$total = 0

do {
    $uri = "$ApiBaseUrl/api/vehicles?limit=$limit&offset=$offset"
    $page = Invoke-RestMethod -Method Get -Uri $uri

    if (-not $page.ok) {
        throw "The vehicle API returned an error."
    }

    $pageVehicles = @($page.vehicles)

    foreach ($vehicle in $pageVehicles) {
        $modelName = [string]$vehicle.modelName

        if (-not [string]::IsNullOrWhiteSpace($modelName)) {
            $vehicleLookup[$modelName.ToLowerInvariant()] = $modelName
        }
    }

    $total = [int]$page.total
    $offset += $pageVehicles.Count

} while ($offset -lt $total -and $pageVehicles.Count -gt 0)

Write-Host "Loaded $($vehicleLookup.Count) vehicle model names." -ForegroundColor Green

$existingImages = @{}

if ($SkipExisting) {
    Write-Host "Reading existing R2 images..." -ForegroundColor Cyan

    $imageResponse = Invoke-RestMethod `
        -Method Get `
        -Uri "$ApiBaseUrl/api/vehicle-images"

    foreach ($image in @($imageResponse.images)) {
        $modelName = [string]$image.modelName

        if (-not [string]::IsNullOrWhiteSpace($modelName)) {
            $existingImages[$modelName.ToLowerInvariant()] = $true
        }
    }

    Write-Host "Found $($existingImages.Count) existing R2 images." -ForegroundColor Green
}

if ($Recurse) {
    $allFiles = Get-ChildItem `
        -LiteralPath $ImageFolder `
        -File `
        -Recurse
}
else {
    $allFiles = Get-ChildItem `
        -LiteralPath $ImageFolder `
        -File
}

$imageFiles = @(
    $allFiles |
    Where-Object {
        $contentTypes.ContainsKey(
            $_.Extension.ToLowerInvariant()
        )
    }
)

Write-Host "Found $($imageFiles.Count) supported image files." -ForegroundColor Cyan

# Keep only one file for each model name.
# The newest file wins when duplicates exist.
$selectedFiles = @(
    $imageFiles |
    Group-Object {
        $_.BaseName.ToLowerInvariant()
    } |
    ForEach-Object {
        $_.Group |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    } |
    Sort-Object BaseName
)

if ($MaxFiles -gt 0) {
    $selectedFiles = @(
        $selectedFiles |
        Select-Object -First $MaxFiles
    )
}

Write-Host "Files selected: $($selectedFiles.Count)" -ForegroundColor Cyan

$uploadToken = ""

if (-not $DryRun) {
    $uploadToken = Read-Host "Enter the IMAGE_UPLOAD_TOKEN"

    if ([string]::IsNullOrWhiteSpace($uploadToken)) {
        throw "The upload token cannot be empty."
    }
}

$current = 0

foreach ($file in $selectedFiles) {
    $current++

    Write-Progress `
        -Activity "Processing vehicle images" `
        -Status "$current of $($selectedFiles.Count): $($file.Name)" `
        -PercentComplete (($current / $selectedFiles.Count) * 100)

    $lookupName = $file.BaseName.ToLowerInvariant()
    $sizeMB = [math]::Round($file.Length / 1MB, 2)

    if (-not $vehicleLookup.ContainsKey($lookupName)) {
        $results += [pscustomobject]@{
            Status    = "Unmatched"
            ModelName = $file.BaseName
            FileName  = $file.Name
            FullPath  = $file.FullName
            SizeMB    = $sizeMB
            Message   = "No matching D1 vehicle model."
        }

        continue
    }

    $modelName = $vehicleLookup[$lookupName]

    if ($file.Length -gt $maxFileSize) {
        $results += [pscustomobject]@{
            Status    = "TooLarge"
            ModelName = $modelName
            FileName  = $file.Name
            FullPath  = $file.FullName
            SizeMB    = $sizeMB
            Message   = "File is larger than 10 MB."
        }

        continue
    }

    if (
        $SkipExisting -and
        $existingImages.ContainsKey(
            $modelName.ToLowerInvariant()
        )
    ) {
        $results += [pscustomobject]@{
            Status    = "ExistingSkipped"
            ModelName = $modelName
            FileName  = $file.Name
            FullPath  = $file.FullName
            SizeMB    = $sizeMB
            Message   = "An R2 image already exists."
        }

        continue
    }

    $extension = $file.Extension.ToLowerInvariant()
    $contentType = $contentTypes[$extension]

    if ($DryRun) {
        $results += [pscustomobject]@{
            Status    = "Ready"
            ModelName = $modelName
            FileName  = $file.Name
            FullPath  = $file.FullName
            SizeMB    = $sizeMB
            Message   = "Ready to upload as $contentType."
        }

        continue
    }

    $encodedModelName = [uri]::EscapeDataString($modelName)
    $uploadUri = "$ApiBaseUrl/api/vehicle-images/$encodedModelName"

    try {
        $response = Invoke-RestMethod `
            -Method Put `
            -Uri $uploadUri `
            -Headers @{
                "X-Upload-Token" = $uploadToken
            } `
            -ContentType $contentType `
            -InFile $file.FullName

        if (-not $response.ok) {
            throw "The API did not confirm the upload."
        }

        $results += [pscustomobject]@{
            Status    = "Uploaded"
            ModelName = $modelName
            FileName  = $file.Name
            FullPath  = $file.FullName
            SizeMB    = $sizeMB
            Message   = "Vehicle image uploaded."
        }

        Write-Host "Uploaded: $($file.Name) -> $modelName" -ForegroundColor Green
    }
    catch {
        $message = $_.Exception.Message

        if (
            $_.ErrorDetails -and
            -not [string]::IsNullOrWhiteSpace(
                $_.ErrorDetails.Message
            )
        ) {
            $message = $_.ErrorDetails.Message
        }

        $results += [pscustomobject]@{
            Status    = "Failed"
            ModelName = $modelName
            FileName  = $file.Name
            FullPath  = $file.FullName
            SizeMB    = $sizeMB
            Message   = $message
        }

        Write-Host "Failed: $($file.Name)" -ForegroundColor Red
        Write-Host $message -ForegroundColor Red
    }
}

Write-Progress -Activity "Processing vehicle images" -Completed

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path `
    -Path (Get-Location) `
    -ChildPath "vehicle-image-upload-$timestamp.csv"

$results |
    Export-Csv `
        -LiteralPath $logPath `
        -NoTypeInformation `
        -Encoding UTF8

Write-Host ""
Write-Host "Upload summary" -ForegroundColor Cyan

$results |
    Group-Object Status |
    Sort-Object Name |
    ForEach-Object {
        Write-Host "$($_.Name): $($_.Count)"
    }

Write-Host ""
Write-Host "Log saved to:" -ForegroundColor Cyan
Write-Host $logPath