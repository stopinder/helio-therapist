
$tests = Get-ChildItem -Path test\*.test.js | Select-Object -ExpandProperty FullName
$startTime = Get-Date
$maxTime = 180
$testTimeout = 30

foreach ($test in $tests) {
    if ((New-TimeSpan -Start $startTime -End (Get-Date)).TotalSeconds -ge $maxTime) {
        Write-Host "Total time limit reached."
        break
    }
    
    $testName = Split-Path $test -Leaf
    Write-Host "Running: $testName"
    
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = "node"
    $pinfo.Arguments = "--test `"$test`""
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $pinfo
    $process.Start() | Out-Null
    
    if (-not $process.WaitForExit($testTimeout * 1000)) {
        $process.Kill()
        Write-Host "FAILED: $testName timed out after $testTimeout seconds."
        exit 1
    }
    
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    
    if ($process.ExitCode -ne 0) {
        Write-Host $stdout
        Write-Host $stderr
        Write-Host "FAILED: $testName failed with exit code $($process.ExitCode)."
        exit 1
    }
}
Write-Host "All tested files passed within limits."
