Add-Type -AssemblyName System.Drawing

$sportsDir = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports\client\public\images\sports"
$pngs = Get-ChildItem -Path $sportsDir -Filter "*.png"

$encoder = [System.Drawing.Imaging.Encoder]::Quality
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 82L)
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }

foreach ($p in $pngs) {
    $jpgName = $p.BaseName + ".jpg"
    $jpgPath = Join-Path $sportsDir $jpgName
    if (-not (Test-Path $jpgPath)) {
        try {
            $img = [System.Drawing.Image]::FromFile($p.FullName)
            $w = $img.Width
            $h = $img.Height
            if ($w -gt 800) {
                $scale = 800.0 / $w
                $w = 800
                $h = [int]($h * $scale)
            }
            $bmp = New-Object System.Drawing.Bitmap($w, $h)
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($img, 0, 0, $w, $h)
            $g.Dispose()
            $img.Dispose()
            $bmp.Save($jpgPath, $jpegCodec, $encoderParams)
            $bmp.Dispose()
            Write-Host "Converted: $($p.Name) -> $jpgName" -ForegroundColor Green
        } catch {
            Write-Host "Failed: $($p.Name) : $_" -ForegroundColor Red
        }
    }
}

Write-Host "Sports images optimization completed!" -ForegroundColor Cyan
