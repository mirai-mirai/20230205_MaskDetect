
New-Item -Force -Path "./" -Name "docs" -ItemType "directory"
Copy-Item -Force -Recurse dist/* docs

$file_contents = $(Get-Content "docs\index.html") -replace "/assets/","assets/"
$file_contents > "docs\index.html"
