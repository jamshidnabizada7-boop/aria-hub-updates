#!/bin/bash
set -e
REL=/opt/aria-hub/releases/20261005-0919-6b3005b   # migrations folder = final HEAD (amend added no migrations)
cd $REL
set -a; . /etc/aria-hub/web.env; set +a
bunx prisma migrate deploy 2>&1 | tail -12
