# MTGMeta-TS

🃏 Determine the MTG metagame using [k-means++](https://en.wikipedia.org/wiki/K-means%2B%2B) clustering

Uses [K-Means-TS](https://github.com/GoldinGuy/K-Means-TS) as a submodule

## Development setup

Simply clone the repository, then run

```
--ts-config init
```

This will create a `tsconfig.json` file. Ensure you have the following settings:

```
"target": "ES6"
"module": "commonjs"
"downlevelIteration": true
```

If you are using VSCode, enter `Ctrl-Shift-B` and then `tsc:watch`, which will auto-compile TS to JS

## Usage - Node.js

You can run this project in the terminal with `node metagame.js`

Alternatively, you can install the awesome VSCode extension [Code Runner](https://marketplace.visualstudio.com/items?itemName=formulahendry.code-runner), which is very convenient

## Contributing

1. Fork K-Means-TS [here](https://github.com/GoldinGuy/MTGMeta-TS/fork)
2. Create a feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

## Meta

Adapted from [MTGMeta-PY](https://github.com/GoldinGuy/MTGMeta-PY) by [@GoldinGuy](https://github.com/GoldinGuy) (which itself is based on [@StrikingLoo's](https://github.com/StrikingLoo) [MTG-Recommender](https://github.com/StrikingLoo/MtGRecommender)
