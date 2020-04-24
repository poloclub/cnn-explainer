#!/bin/bash
set -o errexit

# config
git config --global user.email "xiao.hk1997@gmail.com"
git config --global user.name "xiaohk"

# build
git clone git@github.com:poloclub/cnn-explainer.git
cd cnn-explainer

npm install
npm run build

mkdir dist
copy -r ./public/* ./dist
sed -i 's/\/assets/\/cnn-explainer\/assets/g' ./dist/index.html

git add dist
git commit -m "Deploy gh-pages from Travis"
git subtree push --prefix dist origin gh-pages
