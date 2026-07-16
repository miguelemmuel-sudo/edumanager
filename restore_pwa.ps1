$files = Get-ChildItem -Path . -Recurse -Filter *.html
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    $isDashboard = $file.FullName -match 'dashboard'
    $manifestPath = if ($isDashboard) { '../manifest.json' } else { 'manifest.json' }
    $swPath = if ($isDashboard) { '../sw.js' } else { 'sw.js' }

    $modified = $false

    if ($content -notmatch 'rel="manifest"') {
        $content = $content -replace '</head>', "  <link rel=`"manifest`" href=`"$manifestPath`" />`r`n</head>"
        $modified = $true
    }

    if ($content -notmatch 'serviceWorker') {
        $swScript = "`r`n<script>`r`n  if ('serviceWorker' in navigator) {`r`n    navigator.serviceWorker.register('$swPath');`r`n  }`r`n</script>`r`n"
        $content = $content -replace '</body>', "$swScript</body>"
        $modified = $true
    }

    if ($modified) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        Write-Host "Updated $($file.Name)"
    }
}