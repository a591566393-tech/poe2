param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$rootPath = [System.IO.Path]::GetFullPath($Root)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
$listener.Start()

function Get-MimeType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".js" { "application/javascript; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".svg" { "image/svg+xml"; break }
    default { "application/octet-stream" }
  }
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$StatusText,
    [byte[]]$Body,
    [string]$MimeType = "text/plain; charset=utf-8"
  )

  $headers = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $MimeType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $buffer = New-Object byte[] 8192
    $read = $stream.Read($buffer, 0, $buffer.Length)
    if ($read -le 0) {
      continue
    }

    $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
    $firstLine = ($request -split "`r?`n", 2)[0]
    $parts = $firstLine -split " "
    if ($parts.Length -lt 2 -or $parts[0] -ne "GET") {
      Send-Response $stream 405 "Method Not Allowed" ([System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed"))
      continue
    }

    $urlPath = [Uri]::UnescapeDataString(($parts[1] -split "\?", 2)[0])
    if ($urlPath -eq "/") {
      $urlPath = "/index.html"
    }

    $relative = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $target = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootPath, $relative))
    if (-not $target.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      Send-Response $stream 403 "Forbidden" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden"))
      continue
    }

    if (-not [System.IO.File]::Exists($target)) {
      Send-Response $stream 404 "Not Found" ([System.Text.Encoding]::UTF8.GetBytes("Not Found"))
      continue
    }

    $body = [System.IO.File]::ReadAllBytes($target)
    Send-Response $stream 200 "OK" $body (Get-MimeType $target)
  }
  catch {
    $body = [System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")
    Send-Response $stream 500 "Internal Server Error" $body
  }
  finally {
    $client.Close()
  }
}
