#Requires -Version 7
<#
.SYNOPSIS
  Opens a CSV file in Excel as a person would, and saves it in Excel's CSV formats, for two
  Windows settings: English (list separator ",", code page 1252) and Romanian (";", 1250).

.DESCRIPTION
  Excel takes the list separator and the code page from the Windows settings, which this script
  does not change. Whatever matches this machine's settings comes from Excel itself. The rest is
  emulated, and marked as emulated in the manifest:

  - Opening with another list separator: a copy of the file with a "sep=" first line, which Excel
    follows with its own CSV reader. Excel then ignores the byte-order mark, so only the columns
    of an emulated opening can be compared, not the letters.
  - Saving with another list separator or code page: Excel saves "Unicode Text" (tab separated,
    UTF-16, lossless), and ConvertTo-Csv-As-Excel writes that table again with the separator,
    quoting and code page Excel would use. Before any emulated file is written, the same function
    must reproduce Excel's own "CSV UTF-8" and "CSV" files from this machine byte for byte;
    otherwise the script stops.

  Writes to OutDir: the files, and manifest.json listing them. Needs Excel for Windows.

.EXAMPLE
  pwsh -NoProfile -File tests/interop/excel.ps1 -In export.csv -OutDir out
#>
param(
  [Parameter(Mandatory)] [string] $In,
  [Parameter(Mandatory)] [string] $OutDir
)
$ErrorActionPreference = 'Stop'

# Excel's file formats (XlFileFormat).
$xlCSV = 6
$xlUnicodeText = 42
$xlCSVUTF8 = 62
$xlListSeparator = 5

$Setups = @(
  @{ name = 'en'; separator = ','; codePage = 1252 },
  @{ name = 'ro'; separator = ';'; codePage = 1250 }
)

# Reads Excel's "Unicode Text": tab separated; a value with a tab, a quote or a line break is in
# quotes, with its quotes doubled; rows end with CRLF, a line break inside a value is kept as is.
function Read-ExcelUnicodeText([string] $Path) {
  $text = [IO.File]::ReadAllText($Path, [Text.Encoding]::Unicode)
  $rows = [Collections.Generic.List[object]]::new()
  $row = [Collections.Generic.List[string]]::new()
  $value = [Text.StringBuilder]::new()
  $quoted = $false
  for ($i = 0; $i -lt $text.Length; $i++) {
    $c = $text[$i]
    if ($quoted) {
      if ($c -eq '"' -and $i + 1 -lt $text.Length -and $text[$i + 1] -eq '"') { [void]$value.Append('"'); $i++ }
      elseif ($c -eq '"') { $quoted = $false }
      else { [void]$value.Append($c) }
    }
    elseif ($c -eq '"' -and $value.Length -eq 0) { $quoted = $true }
    elseif ($c -eq "`t") { $row.Add($value.ToString()); [void]$value.Clear() }
    elseif ($c -eq "`r" -and $i + 1 -lt $text.Length -and $text[$i + 1] -eq "`n") {
      $row.Add($value.ToString()); [void]$value.Clear()
      $rows.Add($row.ToArray()); $row = [Collections.Generic.List[string]]::new(); $i++
    }
    else { [void]$value.Append($c) }
  }
  if ($value.Length -gt 0 -or $row.Count -gt 0) { $row.Add($value.ToString()); $rows.Add($row.ToArray()) }
  return , $rows.ToArray()
}

# A table as Excel saves it as CSV: the separator between values, a value with the separator, a
# quote or a line break in quotes, CRLF after each row. Code page 65001 is "CSV UTF-8", with a
# byte-order mark; any other is "CSV" in that code page, a character it lacks written as "?".
function ConvertTo-Csv-As-Excel([object[]] $Rows, [string] $Separator, [int] $CodePage) {
  $needsQuotes = [char[]]@($Separator, '"', "`r", "`n")
  $lines = foreach ($r in $Rows) {
    (@($r | ForEach-Object {
          if ($_.IndexOfAny($needsQuotes) -ge 0) { '"' + $_.Replace('"', '""') + '"' } else { $_ }
        }) -join $Separator) + "`r`n"
  }
  $text = -join $lines
  if ($CodePage -eq 65001) { return [byte[]](@(0xEF, 0xBB, 0xBF) + [Text.Encoding]::UTF8.GetBytes($text)) }
  $encoding = [Text.Encoding]::GetEncoding($CodePage, [Text.EncoderReplacementFallback]::new('?'), [Text.DecoderFallback]::ReplacementFallback)
  return $encoding.GetBytes($text)
}

# The cells of the first sheet, as Excel holds them (Formula: the text typed or read).
function Get-Cells($Workbook) {
  $sheet = $Workbook.Worksheets.Item(1)
  $used = $sheet.UsedRange
  $values = $used.Formula
  $rows = for ($r = 1; $r -le $used.Rows.Count; $r++) {
    , @(for ($c = 1; $c -le $used.Columns.Count; $c++) { [string]$values[$r, $c] })
  }
  return , @($rows)
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$In = (Resolve-Path $In).Path
$OutDir = (Resolve-Path $OutDir).Path
$machineCodePage = [int](Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Nls\CodePage').ACP

$excel = New-Object -ComObject Excel.Application
try {
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $machineSeparator = [string]$excel.International($xlListSeparator)

  # Excel's own files, from opening the file as a double-click does on this machine.
  $book = $excel.Workbooks.Open($In)
  $book.SaveAs((Join-Path $OutDir 'excel-unicode.txt'), $xlUnicodeText)
  $book.SaveAs((Join-Path $OutDir 'excel-csv-utf8.csv'), $xlCSVUTF8)
  $book.SaveAs((Join-Path $OutDir 'excel-csv-ansi.csv'), $xlCSV)
  $book.Close($false)

  # The emulation must give Excel's own files before it may stand in for Excel.
  $table = Read-ExcelUnicodeText (Join-Path $OutDir 'excel-unicode.txt')
  foreach ($check in @(@{ file = 'excel-csv-utf8.csv'; codePage = 65001 }, @{ file = 'excel-csv-ansi.csv'; codePage = $machineCodePage })) {
    $real = [IO.File]::ReadAllBytes((Join-Path $OutDir $check.file))
    $emulated = ConvertTo-Csv-As-Excel $table $machineSeparator $check.codePage
    if ([Convert]::ToBase64String($real) -ne [Convert]::ToBase64String($emulated)) {
      throw "The emulation does not reproduce Excel's $($check.file); no emulated file is trustworthy."
    }
  }

  $manifest = foreach ($setup in $Setups) {
    $name = $setup.name
    # Opening: as a double-click does, or emulated with a "sep=" line.
    $openedEmulated = $setup.separator -ne $machineSeparator
    $source = $In
    if ($openedEmulated) {
      $source = Join-Path $OutDir "$name-sep.csv"
      # The byte-order mark stays first, the "sep=" line after it.
      $bytes = [IO.File]::ReadAllBytes($In)
      $bom = [byte[]]@(0xEF, 0xBB, 0xBF)
      $hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
      $body = if ($hasBom) { $bytes[3..($bytes.Length - 1)] } else { $bytes }
      [IO.File]::WriteAllBytes($source, [byte[]]$(if ($hasBom) { $bom } else { @() }) + [Text.Encoding]::ASCII.GetBytes("sep=$($setup.separator)`r`n") + [byte[]]$body)
    }
    $book = $excel.Workbooks.Open($source)
    $cells = Get-Cells $book
    $book.Close($false)
    $opened = "$name-opened.json"
    ConvertTo-Json -InputObject $cells -Depth 4 | Set-Content -Path (Join-Path $OutDir $opened) -Encoding utf8

    # Saving, in each CSV format Excel offers.
    $saves = @(
      @{ format = 'Unicode Text'; file = 'excel-unicode.txt'; emulated = $false }
    )
    foreach ($format in @(@{ format = 'CSV UTF-8'; codePage = 65001; real = 'excel-csv-utf8.csv' }, @{ format = 'CSV'; codePage = $setup.codePage; real = 'excel-csv-ansi.csv' })) {
      $isMachine = $setup.separator -eq $machineSeparator -and ($format.codePage -eq 65001 -or $format.codePage -eq $machineCodePage)
      if ($isMachine) {
        $saves += @{ format = $format.format; file = $format.real; emulated = $false }
      }
      else {
        $file = "$name-$($format.codePage).csv"
        [IO.File]::WriteAllBytes((Join-Path $OutDir $file), (ConvertTo-Csv-As-Excel $table $setup.separator $format.codePage))
        $saves += @{ format = $format.format; file = $file; emulated = $true }
      }
    }
    [ordered]@{ setup = $name; separator = $setup.separator; codePage = $setup.codePage; opened = $opened; openedEmulated = $openedEmulated; saves = $saves }
  }
  ConvertTo-Json -InputObject @($manifest) -Depth 5 | Set-Content -Path (Join-Path $OutDir 'manifest.json') -Encoding utf8
  Write-Output "Excel $($excel.Version), list separator '$machineSeparator', code page $machineCodePage. Wrote $OutDir\manifest.json."
}
finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
