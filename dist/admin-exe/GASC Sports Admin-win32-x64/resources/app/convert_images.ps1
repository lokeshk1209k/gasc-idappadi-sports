Add-Type -AssemblyName System.Drawing

$brainDirs = @(
  'C:\Users\ELCOT\.gemini\antigravity-ide\brain\db6e7fc0-378c-47b6-83e6-072595d4c1bf\.user_uploaded',
  'C:\Users\ELCOT\.gemini\antigravity-ide\brain\3c75f128-f237-441e-a405-973e8ee3b68a\.user_uploaded'
)

# Verified source photos from 'C:\Users\ELCOT\Pictures\website photo'
$photoSourceDir = 'C:\Users\ELCOT\Pictures\website photo'
$namedMappings = @{
  'Football.png'           = 'football.png'
  'volley ball.png'        = 'volleyball.png'
  'Basketball  image.png'  = 'basketball.png'
  'Cricket.png'            = 'cricket.png'
  'badminton.png'          = 'badminton.png'
  'Kabaddi.png'            = 'kabaddi.png'
  'Boxing.png'             = 'boxing.png'
  'chess.png'              = 'chess.png'
  'Carrom.png'             = 'carrom.png'
  'Handball.png'           = 'handball.png'
  'Hockey.png'             = 'hockey.png'
  'throw ball.png'         = 'throwball.png'
  'kho kho.png'            = 'kho_kho.png'
  'tennis.png'             = 'tennis.png'
  'Running.png'            = 'running.png'
  'Relay.png'              = 'relay.png'
  'Marathon.png'           = 'marathon.png'
  'Long Jump.png'          = 'long_jump.png'
  'High Jump.png'          = 'high_jump.png'
  'Triple Jump.png'        = 'triple_jump.png'
  'Shot Put.png'           = 'shot_put.png'
  'Discus Throw.png'       = 'discus_throw.png'
  'Tournament Legacy.png'  = 'tournament.png'
}

$destDirs = @(
  'c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports\client\public\images\sports',
  'c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports\student-client\public\images\sports',
  'c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports\student-client\dist\images\sports',
  'C:\Users\ELCOT\Downloads\GASC Sports Admin Portal\resources\app\client\public\images\sports',
  'C:\Users\ELCOT\Downloads\GASC Sports Admin Portal\resources\app\student-client\dist\images\sports'
)

foreach ($dir in $destDirs) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

foreach ($key in $mappings.Keys) {
  $srcFile = $null
  foreach ($bd in $brainDirs) {
    $candidate = Join-Path $bd $key
    if (Test-Path $candidate) {
      $srcFile = $candidate
      break
    }
  }
  $targetName = $mappings[$key]

  if ($srcFile -and (Test-Path $srcFile)) {
    Write-Host "Processing: $key -> $targetName"
    try {
      $img = [System.Drawing.Image]::FromFile($srcFile)
      $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
      $g.Dispose()
      $img.Dispose()

      foreach ($destDir in $destDirs) {
        $outPng = Join-Path $destDir $targetName
        $bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)

        $jpgName = $targetName -replace '\.png$', '.jpg'
        $outJpg = Join-Path $destDir $jpgName
        $bmp.Save($outJpg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      }
      $bmp.Dispose()
      Write-Host "  Successfully converted & saved: $targetName"
    } catch {
      Write-Host "  Error processing $key : $_"
    }
  } else {
    Write-Host "  Missing source file: $srcFile"
  }
}
