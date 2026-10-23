#!/bin/sh
# Usage: scripts/shoot.sh file.html out.png [height]  (headless Chrome full-page capture, 900 px wide)
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$C" --headless=new --disable-gpu --hide-scrollbars --window-size=900,${3:-14400} --screenshot="$2" "file://$1" 2>&1 | grep -v TASK_SUPPRESSION | tail -1
