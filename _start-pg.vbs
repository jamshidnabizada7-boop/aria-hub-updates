Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\ARIA HUB UPDATE 09 13 2026\workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)"
sh.Run "cmd /c node scripts\pg-boot-local.cjs >> scripts\pg-local.log 2>&1", 0, False
