$files = Get-ChildItem -Path . -Recurse -Filter *.html
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$win1252 = [System.Text.Encoding]::GetEncoding("Windows-1252")

foreach ($file in $files) {
    if ($file.Name -eq "index_fixed.html") { continue }
    
    $content = [System.IO.File]::ReadAllText($file.FullName, $utf8NoBom)
    
    # Check if there is mojibake (e.g., Ã, â, ð)
    if ($content -match 'Ã' -or $content -match 'â' -or $content -match 'ð') {
        try {
            $bytesWin1252 = $win1252.GetBytes($content)
            $fixedContent = $utf8NoBom.GetString($bytesWin1252)
            
            [System.IO.File]::WriteAllText($file.FullName, $fixedContent, $utf8NoBom)
            Write-Host "Fixed $($file.FullName)"
        } catch {
            Write-Host "Error fixing $($file.FullName)"
        }
    }
}
