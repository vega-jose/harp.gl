# Rendering Tests

Tests for components that render images. They render images to canvas and compare the result image
with approved reference images.
Tests are run in the browser headless mode, uses `mocha-webdriver-runner` to run `mocha` tests
in browser context.

## What to do first? Where to start?

Before start the work on implementing new features you should run rendering tests first to
generate actual images and store them as reference images to have possibility of making comparison
with right images after doing some changes in code.

### Prerequisites
-   Linux
-   Docker installed

### Tests execution - build and run locally

1. Run command:

```shell
    yarn run-rendering-tests
```
 
2. Local reference images

Now, the problem is that first run skips all tests because there are no reference images.
You need to establish base reference images for your platform (Hint!, it's good to establish them on
clean working copy!).

So, you see that all the tests ran, but you see only that all the tests are skipped and see only
_current_ images in browser window.

Note, that `RenderingTestResultServer` already saved all the images in `rendering-test-results/{PLATFORM}`, so
you have to establish reference images by calling
```bash
$ yarn safe-reference
# it should output stg like
RenderingTestResultCli: rendering-test-results/Chrome-78.0.3904.97-Linux/mapview-geojson-extruded-polygon-flat.reference.png: establishing reference image
RenderingTestResultCli: rendering-test-results/Chrome-78.0.3904.97-Linux/mapview-geojson-extruded-polygon-with-height-color.reference.png: establishing reference image
RenderingTestResultCli: rendering-test-results/Chrome-78.0.3904.97-Linux/mapview-geojson-extruded-polygon-with-height.reference.png: establishing reference image
RenderingTestResultCli: rendering-test-results/Chrome-78.0.3904.97-Linux/mapview-geojson-polygon-fill.reference.png: establishing reference image
RenderingTestResultCli: rendering-test-results/Chrome-78.0.3904.97-Linux/text-canvas-hello-world-path.reference.png: establishing reference image
...
```

Now, you can restart tests by running `yarn run-rendering-tests`, they should find reference images and report successes.

Then you can start coding!

3. Approving changes images

If your tests fail, because you've changed something you can ACK reference images with
```
yarn approve-reference
```
Next text runs, should use these files as reference.

Note, this is only _local_ approve. 

## Interactive mode

1. Run command:

```shell
yarn start-tests
```

Starts `webpack-dev-server` which compiles your rendering tests on fly
and should print port it listens on like this:

```
(...) Project is running at http://localhost:8081/
```

Open `http://localhost:8081/rendering.html`, in favorite browser. Tests will run.

2. If runned first time you should also establish local reference images
 by running command (as described in "Local reference images" section):

```bash
yarn safe-reference
```

After that you can refresh the page: http://localhost:8080/rendering.html and start coding.
