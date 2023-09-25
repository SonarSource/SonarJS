# Tips for windows users

Read below if you are building SonarJS on Windows.

## Windows configuration

You should give yourself permissions to create symbolic links (required by PathWalkerTest.java) or run the build script with Admin rights

- run `gpedit.msc` (Edit Group Policy)
- Computer Configuration → Windows Settings → Security Settings → Local Policies → User Rights Assignment → Create symbolic links
- Add yourself (or Users group)
- restart the machine

## Git configuration

- `git config --system core.autocrlf input`
- `git config --system core.longpaths true`
