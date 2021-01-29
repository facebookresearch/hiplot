import os
import subprocess
import shlex

# CI release
if "CIRCLE_TAG" in os.environ:
    python_version = npm_version = os.environ['CIRCLE_TAG']
else:
    last_tag = subprocess.check_output(shlex.split("git describe --tags --abbrev=0 master"), encoding="utf-8")
    last_tag = [int(s) for s in last_tag.split(".")]
    assert len(last_tag) == 3
    last_tag[-1] += 1
    num_commits = int(subprocess.check_output(shlex.split("git rev-list --count HEAD")))
    last_tag = ".".join(str(s) for s in last_tag)
    python_version = f"{last_tag}rc{num_commits}"
    npm_version = f"{last_tag}-rc.{num_commits}"

print(f'export HIPLOT_VERSION_PYPI={shlex.quote(python_version)}')
print(f'export HIPLOT_VERSION_NPM={shlex.quote(npm_version)}')
