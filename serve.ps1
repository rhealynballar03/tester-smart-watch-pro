# Simple static file server on http://localhost:3000
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Stop:   press Ctrl+C in this window

$root = $PSScriptRoot
$port = 3000
$prefix = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving '$root' at $prefix" -ForegroundColor Green
Write-Host "Open: ${prefix}product.html   (Ctrl+C to stop)" -ForegroundColor Cyan

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
  ".ogg"  = "video/ogg"
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    try {
      $isHead = $req.HttpMethod -eq "HEAD"
      $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }

      $path = Join-Path $root $rel

      if (Test-Path $path -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($path).ToLower()
        $ct = $mime[$ext]
        if (-not $ct) { $ct = "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $total = $bytes.Length
        $res.ContentType = $ct
        $res.Headers.Add("Accept-Ranges", "bytes")

        # ---- HTTP Range support (enables smooth video seeking) ----
        $range = $req.Headers["Range"]
        if ($range -and $range -match "bytes=(\d*)-(\d*)") {
          $startStr = $matches[1]; $endStr = $matches[2]
          if ($startStr -eq "") {
            # suffix range: last N bytes
            $len = [int64]$endStr
            $start = [Math]::Max(0, $total - $len)
            $end = $total - 1
          } else {
            $start = [int64]$startStr
            $end = if ($endStr -ne "") { [int64]$endStr } else { $total - 1 }
          }
          if ($end -ge $total) { $end = $total - 1 }
          if ($start -le $end) {
            $count = $end - $start + 1
            $res.StatusCode = 206
            $res.Headers.Add("Content-Range", "bytes $start-$end/$total")
            $res.ContentLength64 = $count
            if (-not $isHead) { $res.OutputStream.Write($bytes, [int]$start, [int]$count) }
            Write-Host ("206  /{0}  [{1}-{2}/{3}]" -f $rel, $start, $end, $total)
          } else {
            $res.StatusCode = 416
            $res.Headers.Add("Content-Range", "bytes */$total")
            Write-Host ("416  /{0}" -f $rel) -ForegroundColor Yellow
          }
        } else {
          $res.ContentLength64 = $total
          if (-not $isHead) { $res.OutputStream.Write($bytes, 0, $total) }
          Write-Host ("200  /{0}" -f $rel)
        }
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: /$rel")
        $res.ContentLength64 = $msg.Length
        if (-not $isHead) { $res.OutputStream.Write($msg, 0, $msg.Length) }
        Write-Host ("404  /{0}" -f $rel) -ForegroundColor Yellow
      }
    } catch {
      Write-Host ("ERR  {0}" -f $_.Exception.Message) -ForegroundColor Red
    } finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
