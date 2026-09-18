Get-ChildItem -Recurse -Filter *.webp | ForEach-Object {
    rembg i $_.FullName "$($_.DirectoryName)\tmp.webp"
    Move-Item -Force "$($_.DirectoryName)\tmp.webp" $_.FullName
}
