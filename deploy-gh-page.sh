npm run build
cp -r ./public/assets ./dist
cp -r ./public/bundle* ./dist
cp -r ./public/global.css ./dist
npx gh-pages -m "Deploy $(git log '--format=format:%H' master -1)" -d ./dist