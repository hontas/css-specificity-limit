css-specificity-limit
=====================
> CSS selectors specificity analyzer

![example screen shot](https://raw.githubusercontent.com/hontas/css-specificity-limit/master/css-spec-limit-min.png "example screen shot")

## Install

```shell
npm install css-specficity-limit --save-dev
```

## Command line usage

```shell
css-specificity-limit [options] [path-to-file(s)]

# list options
css-specificity-limit --help

# example
css-specificity-limit --limit 50 styles/**/*.css
```

## Programatic api

```js
var cssSpecificityLimit = require('css-specificity-limit');
var options = {
    limit: 100,
    files: 'styles/**/*.css'
};

cssSpecificityLimit(options, function(error, results) {});

// or

cssSpecificityLimit(options)
    .then(function(results) {})
    .catch(function(error) {});
```

### options
- **limit** {Number} CSS selector score limit. *Default*: `100`
- **files** {String} Path to file/files. Supports glob pattern. *Required*
- **basePath** {String} For relative file paths. *Default*: `process.cwd()`
- **matchers** {Array} Custom matchers to calculate score
- **reporter** {Function} Custom error reporter

### results array
Array of files containing selectors that were scored higher than the limit

```js
[
    {
        file: 'full/path/to/file'
        result: [
            {
                lineNumber: {Number},
                selector: {String},
                score: {Number}
            }
        ]
    }
]
```

## Calculating selector score
- Count selector parts with [specificity](http://npmjs.com/packages/specificity)
- Multiply by factor
    - ID selectors with 100
    - class/attribute/pseudo-class selectors with 10
    - type and pseudo-element selectors with 1
- Apply custom matchers
- Sum it up

## Custom matchers
Punish CSS selectors in your very own flavour

```js
cssSpecificityLimit({
    matchers: [
        {
            match: /[>+]/g,
            factor: 50
        }
    ]
});
```
This will multiply the number of matches with the factor and add it to the score.

## Custom reporter
Write your own reporter. Gets the results array described above. Will not be called in silent mode.
```js
cssSpecificityLimit({
    reporter: function(results) {
        // your own reporting
    }
});
```


## Less / Sass / Stylus
Just make sure the the parser you need is installed and `css-specificity-limit` takes care of the rest.

### parsers
- Less `npm install less --save-dev`
- Stylus `npm install stylus --save-dev`
- Sass/SCSS `npm install node-sass --save-dev` 

## ToDo

- add support for !important
- add loggger
- use streams
