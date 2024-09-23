# Check that git is installed, else warn using stderr and exit
if ! command -v git &> /dev/null
then
    echo "git could not be found! Please install git and try again." 1>&2
    exit
fi

export PATH="/usr/local/bin:$PATH"  # important to use npm executable

# Check that npm is installed, else warn using stderr and exit
NPM_PATHS=("npm" "/usr/local/bin/npm" "/opt/homebrew/bin/npm")

for NPM in "${NPM_PATHS[@]}"; do
if $NPM -v > /dev/null 2>&1; then
    echo "npm is installed, using NPM=$NPM"
    break
  fi
done

if ! $NPM -v > /dev/null 2>&1; then
    echo "NPM executable is not valid!"
    exit 1
  fi


REPO_PATH=https://github.com/XInTheDark/raycast-g4f

# cd to source_code folder, replacing it if already exists
rm -rf ./source_code
mkdir ./source_code
cd ./source_code || exit 1

echo "Downloading from GitHub..."

# Clone the repo, forcefully replacing existing files
git clone --depth 1 $REPO_PATH ./source_code || exit 1

echo "Download success! Installing..."

# -------- Installation --------

cd source_code || exit 1

echo "Installing dependencies via npm..."

# install dependencies
$NPM ci --production || exit 1

# build
$NPM run build || exit 1

echo "Installation success!"
exit 0