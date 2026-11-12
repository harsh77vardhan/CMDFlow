# CMDFlow initialization template for PowerShell

function global:__cmdflow_run {
    $directive_file = [System.IO.Path]::GetTempFileName()
    & cmdflow.exe __run powershell --directive-file "$directive_file" -- $args
    $exit_code = $LASTEXITCODE
    if (Test-Path "$directive_file") {
        $content = Get-Content -Raw "$directive_file"
        if ($content) {
            Invoke-Expression $content
        }
        Remove-Item -Force "$directive_file"
    }
    return $exit_code
}

function global:cmdflow {
    param([Parameter(ValueFromRemainingArguments)]$Args)
    if ($Args.Count -gt 0 -and ($Args[0] -in @('alias','project','flow','context','profile'))) {
        & cmdflow.exe $Args
        Invoke-Expression (& cmdflow.exe init powershell | Out-String)
    } else {
        & cmdflow.exe $Args
    }
}

Set-Alias -Name cf -Value cmdflow -Scope Global
Set-Alias -Name flow -Value cmdflow -Scope Global
