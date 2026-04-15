● Bash(file build_production.sh)
  ⎿  build_production.sh: Bourne-Again shell script, Unicode text, UTF-8 text executable, with CRLF line terminators

● 问题找到了！脚本文件使用了Windows的CRLF行终止符，导致Linux无法正确执行。需要转换为Unix格式。

● Bash(dos2unix build_production.sh)
  ⎿  Error: /bin/bash: line 1: dos2unix: command not found

● Bash(sed -i 's/\r$//' build_production.sh)
  ⎿  (No content)

sed -i 's/\r$//' start_unified.sh
sed -i 's/\r$//' start.sh
sed -i 's/\r$//' begin.sh
sed -i 's/\r$//' bk_begin_local.sh