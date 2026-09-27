# LifeOS Mobile-v2 Android Brand Asset Generator
# Generates all density buckets for Android adaptive icons, launcher icons, and splash screens
# from source brand assets copied from mobile/assets/

param(
    [string]$AssetsDir = "$PSScriptRoot/../assets",
    [string]$ResDir = "$PSScriptRoot/../android/app/src/main/res"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "LifeOS Mobile-v2 Asset Generation Starting..." -ForegroundColor Cyan
Write-Host "Assets Dir: $AssetsDir"
Write-Host "Res Dir:    $ResDir"
Write-Host "============================================="

$iconSrc = Join-Path $AssetsDir "icon.png"
$adaptiveSrc = Join-Path $AssetsDir "adaptive-icon.png"
$splashSrc = Join-Path $AssetsDir "splash-icon.png"

if (-not (Test-Path $iconSrc)) { throw "Missing icon.png in $AssetsDir" }
if (-not (Test-Path $adaptiveSrc)) { throw "Missing adaptive-icon.png in $AssetsDir" }
if (-not (Test-Path $splashSrc)) { throw "Missing splash-icon.png in $AssetsDir" }

# Helper to resize an image with high quality bicubic interpolation
function Resize-Image {
    param(
        [System.Drawing.Image]$SourceImage,
        [int]$Width,
        [int]$Height,
        [string]$OutputPath,
        [bool]$ClipCircle = $false
    )

    $destBmp = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($ClipCircle) {
        $g.Clear([System.Drawing.Color]::Transparent)
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddEllipse(0, 0, $Width, $Height)
        $g.SetClip($path)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $ia = [System.Drawing.Imaging.ImageAttributes]::new()
    $ia.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $g.DrawImage($SourceImage, [System.Drawing.Rectangle]::new(0, 0, $Width, $Height), 0, 0, $SourceImage.Width, $SourceImage.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)

    $parent = Split-Path $OutputPath -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }

    $destBmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $ia.Dispose()
    $g.Dispose()
    $destBmp.Dispose()
    Write-Host "  -> Generated: $OutputPath ($Width x $Height)" -ForegroundColor Green
}

# Helper to generate a splash screen canvas with centered logo
function Generate-Splash {
    param(
        [System.Drawing.Image]$SplashSource,
        [int]$CanvasWidth,
        [int]$CanvasHeight,
        [string]$OutputPath,
        [System.Drawing.Color]$BgColor
    )

    $destBmp = [System.Drawing.Bitmap]::new($CanvasWidth, $CanvasHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear($BgColor)

    # Scale splash image to ~70% of the shortest canvas dimension
    $shortSide = [Math]::Min($CanvasWidth, $CanvasHeight)
    $logoSize = [int]($shortSide * 0.72)
    $posX = [int](($CanvasWidth - $logoSize) / 2)
    $posY = [int](($CanvasHeight - $logoSize) / 2)

    $ia = [System.Drawing.Imaging.ImageAttributes]::new()
    $ia.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $g.DrawImage($SplashSource, [System.Drawing.Rectangle]::new($posX, $posY, $logoSize, $logoSize), 0, 0, $SplashSource.Width, $SplashSource.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)

    $parent = Split-Path $OutputPath -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }

    $destBmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $ia.Dispose()
    $g.Dispose()
    $destBmp.Dispose()
    Write-Host "  -> Splash: $OutputPath ($CanvasWidth x $CanvasHeight, logo $logoSize x $logoSize)" -ForegroundColor Green
}

# 1. Load source images
$imgAdaptive = [System.Drawing.Bitmap]::FromFile($adaptiveSrc)
$imgIcon = [System.Drawing.Bitmap]::FromFile($iconSrc)
$imgSplash = [System.Drawing.Bitmap]::FromFile($splashSrc)

try {
    # 2. Adaptive Icon Foreground Layers
    # Standard Android adaptive icon density dimensions (108dp * density)
    Write-Host "`n[1/3] Generating Android Adaptive Icon Foregrounds (from adaptive-icon.png)..." -ForegroundColor Yellow
    $adaptiveBuckets = @(
        @{ Density = "mdpi";    Size = 108 },
        @{ Density = "hdpi";    Size = 162 },
        @{ Density = "xhdpi";   Size = 216 },
        @{ Density = "xxhdpi";  Size = 324 },
        @{ Density = "xxxhdpi"; Size = 432 }
    )

    foreach ($b in $adaptiveBuckets) {
        $outPath = Join-Path $ResDir "mipmap-$($b.Density)\ic_launcher_foreground.png"
        Resize-Image -SourceImage $imgAdaptive -Width $b.Size -Height $b.Size -OutputPath $outPath
    }
    # Also update drawable/ic_launcher_foreground.png as 1024x1024 reference
    Resize-Image -SourceImage $imgAdaptive -Width 1024 -Height 1024 -OutputPath (Join-Path $ResDir "drawable\ic_launcher_foreground.png")

    # 3. Legacy Launcher Icons (ic_launcher.png and ic_launcher_round.png)
    Write-Host "`n[2/3] Generating Legacy Launcher Icons (from icon.png)..." -ForegroundColor Yellow
    $legacyBuckets = @(
        @{ Density = "mdpi";    Size = 48 },
        @{ Density = "hdpi";    Size = 72 },
        @{ Density = "xhdpi";   Size = 96 },
        @{ Density = "xxhdpi";  Size = 144 },
        @{ Density = "xxxhdpi"; Size = 192 }
    )

    foreach ($b in $legacyBuckets) {
        $outSquare = Join-Path $ResDir "mipmap-$($b.Density)\ic_launcher.png"
        Resize-Image -SourceImage $imgIcon -Width $b.Size -Height $b.Size -OutputPath $outSquare

        $outRound = Join-Path $ResDir "mipmap-$($b.Density)\ic_launcher_round.png"
        Resize-Image -SourceImage $imgIcon -Width $b.Size -Height $b.Size -OutputPath $outRound -ClipCircle $true
    }

    # 4. Splash Screens (drawable-port-* and drawable-land-* and drawable/splash.png)
    Write-Host "`n[3/3] Generating Splash Screens with #ffffff background (from splash-icon.png)..." -ForegroundColor Yellow
    $white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

    $splashBuckets = @(
        # Portrait
        @{ Folder = "drawable-port-mdpi";    W = 320;  H = 480 },
        @{ Folder = "drawable-port-hdpi";    W = 480;  H = 800 },
        @{ Folder = "drawable-port-xhdpi";   W = 720;  H = 1280 },
        @{ Folder = "drawable-port-xxhdpi";  W = 960;  H = 1600 },
        @{ Folder = "drawable-port-xxxhdpi"; W = 1280; H = 1920 },
        # Landscape
        @{ Folder = "drawable-land-mdpi";    W = 480;  H = 320 },
        @{ Folder = "drawable-land-hdpi";    W = 800;  H = 480 },
        @{ Folder = "drawable-land-xhdpi";   W = 1280; H = 720 },
        @{ Folder = "drawable-land-xxhdpi";  W = 1600; H = 960 },
        @{ Folder = "drawable-land-xxxhdpi"; W = 1920; H = 1280 },
        # Default drawable
        @{ Folder = "drawable";              W = 1024; H = 1024 }
    )

    foreach ($s in $splashBuckets) {
        $outSplash = Join-Path $ResDir "$($s.Folder)\splash.png"
        Generate-Splash -SplashSource $imgSplash -CanvasWidth $s.W -CanvasHeight $s.H -OutputPath $outSplash -BgColor $white
    }

    Write-Host "`n=============================================" -ForegroundColor Cyan
    Write-Host "All Android Brand Assets Generated Successfully!" -ForegroundColor Cyan
    Write-Host "============================================="
} finally {
    $imgAdaptive.Dispose()
    $imgIcon.Dispose()
    $imgSplash.Dispose()
}
