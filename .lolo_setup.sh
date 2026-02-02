apt update -y
apt install libatomic1 iputils-ping -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
. "$HOME/.nvm/nvm.sh"
nvm install 25
node -v
git config --global --add safe.directory /usr/src/springapp
rm package-lock.json
npm install
npm install -D tsx
npx tsx --tsconfig packages/tsconfig.test.json --test packages/ruling/projects/file-for-rules.ruling.test.ts
