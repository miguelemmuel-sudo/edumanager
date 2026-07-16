$files = Get-ChildItem -Path . -Recurse -Filter *.html

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    # Replace in root folder or other folders (js/supabase.js)
    if ($content -match '<script src="js/supabase.js"></script>') {
        $content = $content -replace '<script src="js/supabase.js"></script>', '<script src="js/config.js"></script>`r`n  <script src="js/security.js"></script>`r`n  <script src="js/supabase.js"></script>'
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated $($file.FullName)"
    }
    # Replace in dashboard folder (../js/supabase.js)
    elseif ($content -match '<script src="\.\./js/supabase\.js"></script>') {
        $content = $content -replace '<script src="\.\./js/supabase\.js"></script>', '<script src="../js/config.js"></script>`r`n  <script src="../js/security.js"></script>`r`n  <script src="../js/supabase.js"></script>'
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated $($file.FullName)"
    }
}
