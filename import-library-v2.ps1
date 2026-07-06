param(
    [Parameter(Mandatory = $true)]
    [string]$LibraryFile
)

$ApiUrl = "https://cloud-database-gta-traffic.timphillips17.workers.dev/api/library/import-v2"
$BatchSize = 50

if (-not (Test-Path $LibraryFile)) {
    Write-Error "Library file not found: $LibraryFile"
    exit 1
}

Write-Host "Reading library export..." -ForegroundColor Cyan

$library = Get-Content `
    -Path $LibraryFile `
    -Raw |
    ConvertFrom-Json

if ($library.format -ne "gta-traffic-vehicle-library") {
    Write-Error "This is not a GTA Traffic Vehicle Library export."
    exit 1
}

$vehicles = @($library.vehicles)
$handlingProfiles = @($library.handlingProfiles)

Write-Host "Vehicles found: $($vehicles.Count)"
Write-Host "Handling profiles found: $($handlingProfiles.Count)"

function Send-Batches {
    param(
        [array]$Items,
        [string]$PropertyName
    )

    for ($start = 0; $start -lt $Items.Count; $start += $BatchSize) {
        $end = [Math]::Min(
            $start + $BatchSize - 1,
            $Items.Count - 1
        )

        $batch = @($Items[$start..$end])

        $payload = @{
            vehicles = @()
            handlingProfiles = @()
        }

        $payload[$PropertyName] = $batch

        $json = $payload |
            ConvertTo-Json -Depth 100

        $batchNumber = [Math]::Floor(
            $start / $BatchSize
        ) + 1

        Write-Host `
            "Sending $PropertyName batch $batchNumber ($($batch.Count) records)..." `
            -ForegroundColor Yellow

        $response = Invoke-RestMethod `
            -Method Post `
            -Uri $ApiUrl `
            -ContentType "application/json" `
            -Body $json

        Write-Host `
            "Imported successfully." `
            -ForegroundColor Green
    }
}

Send-Batches `
    -Items $vehicles `
    -PropertyName "vehicles"

Send-Batches `
    -Items $handlingProfiles `
    -PropertyName "handlingProfiles"

Write-Host "Library migration completed." -ForegroundColor Green