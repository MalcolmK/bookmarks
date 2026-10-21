Option Explicit

Dim fso, scriptFolder, iconsFolder, outputPath, iconPaths
Set fso = CreateObject("Scripting.FileSystemObject")
scriptFolder = fso.GetParentFolderName(WScript.ScriptFullName)
iconsFolder = fso.BuildPath(scriptFolder, "icons")
outputPath = fso.BuildPath(scriptFolder, "icons.js")

If Not fso.FolderExists(iconsFolder) Then
    WScript.Echo "De map icons is niet gevonden: " & iconsFolder
    WScript.Quit 1
End If

Set iconPaths = CreateObject("Scripting.Dictionary")
IndexFolder fso.GetFolder(iconsFolder), ""

Dim output, i, stream, iconPath
output = "const availableIcons = ["
For Each iconPath In iconPaths.Keys
    If i > 0 Then output = output & ","
    output = output & vbCrLf & "  " & JsonString(CStr(iconPath))
    i = i + 1
Next
If i > 0 Then output = output & vbCrLf
output = output & "];" & vbCrLf

' Write UTF-8 so icon paths with international characters remain intact.
Set stream = CreateObject("ADODB.Stream")
stream.Type = 2
stream.Charset = "utf-8"
stream.Open
stream.WriteText output
stream.SaveToFile outputPath, 2
stream.Close

WScript.Echo "Klaar: " & iconPaths.Count & " iconen geïndexeerd in " & outputPath

Sub IndexFolder(folder, relativeFolder)
    Dim file, childFolder, extension, relativePath
    For Each file In folder.Files
        extension = LCase(fso.GetExtensionName(file.Name))
        If IsIconExtension(extension) Then
            relativePath = relativeFolder & file.Name
            relativePath = Replace(relativePath, "\", "/")
            If Not iconPaths.Exists(relativePath) Then iconPaths.Add relativePath, True
        End If
    Next
    For Each childFolder In folder.SubFolders
        IndexFolder childFolder, relativeFolder & childFolder.Name & "/"
    Next
End Sub

Function IsIconExtension(extension)
    Select Case extension
        Case "svg", "png", "jpg", "jpeg", "gif", "webp", "ico"
            IsIconExtension = True
        Case Else
            IsIconExtension = False
    End Select
End Function

Function JsonString(value)
    value = Replace(value, Chr(92), Chr(92) & Chr(92))
    value = Replace(value, Chr(34), Chr(92) & Chr(34))
    value = Replace(value, vbCr, Chr(92) & "r")
    value = Replace(value, vbLf, Chr(92) & "n")
    value = Replace(value, vbTab, Chr(92) & "t")
    JsonString = Chr(34) & value & Chr(34)
End Function
