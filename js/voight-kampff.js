
/* 

VOIGHT-KAMPFF
Created by KAPITAN! / Lauri-Matti Parppei

An experimentation in music visualization.
Requires the Paper.js and Howler.js libraries.


Version 1.0b
2015-11-04

PLEASE SEE README.MD FOR MORE INFO.
Bad code documented here and there. A pretty good explanation on how the
animations work can be found before the setupAnimations() function (line 366).



Code released under the MIT License (MIT)
Copyright © 2015 Lauri-Matti Parppei / KAPITAN!

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/


/* GENERAL SETTINGS ============================================= */

// Animation trigger cooldown in frames
var keyCooldown = 5;
var keyPresses = 0;

// Miscellaneous state indicators
var musicReady = false;
var musicStarted = false;
var fullscreen = false;

// Animation render queue
var animationQueue = {};
var animLifeCheck = 0; // 

// Animation object
var animations = {};
var animationTable = {};

// Unique animation array
var uniqueAnimations = []; 

// Frame number
var frameNo = 0;
var skipFrame = false;
var lowPerformance = false;

var userAnimationMode = false;

// Grid position updates with the timer. Timer starts with the music and is 
// quantized to the bpm of the song. 
// PLEASE NOTE: BPM value is ms, not BPM due to lack of coding skills.

var gridPos = 0;
var gridFrameSkip = 1; // Every other frame

var frameBPM = 52.75;

var frameTimer = false;
var gridSkipper = 0;

var animationGridDefault = {
    1: 'h',
    2: 'r',
    3: 'v',
    4: 'g',
    5: 'u',
    7: 'g',
    23: 'i',
    24: 'g',
    25: 'r',
    26: 'h',
    28: 'z',
    35: 'h',
    36: 'c',
    40: 'g',
    41: 'u',

    54: 'h',
    55: 'k',
    59: 'd',
    64: 'h',
    105: 'u',
    858: 'h',
    860: 'h',
    861: 'u',
    862: 'u',
    866: 'h',
};

var animationGrid = clone(animationGridDefault);

// Animation default colors that can be manipulated globally
var animColors = {
    magenta: '#d311ba',
    gray: 'rgba(220,220,220,.3)',
    white: '#eeeeee',
    cyan: '#016eac', //2387c0
    black: '#000000',

}
// A backup of the color object to restore original colors when needed.
var animColorsBackup = clone(animColors);

// Global override of animation colors. Animations that switch palette colors
// should check if global override is in action and skip color changing.
var animColorsOverride = false;

// Touch and mouse controls
var screenControls = document.getElementById('controls');

// End credits
var endCredits = document.getElementById('endCredits');

var music = false;
var paused = true;
var ended = false;

var ajaxWaiting = '';


// Instructions
var instructionsUser = document.getElementById('insUser');
var instructionsNormal = document.getElementById('insNormal');
var instructionsUsername = document.getElementById('userName');


/* SOUNDS ============================================= */

function loadSounds () {
    music = new Howl({
        src: ['_music/VK.mp3'],
        buffer: false,
        onload: function () { 
            musicReady = true;
            animationQueue[1].fadeOut();
            console.log('Music loaded / ' + frameNo);
        },
        onend: function () {
            displayEndCredits();
        },
        volume: 1
    });
    paused = true;
}


 /* KEY LISTENER  ============================================= */

function onKeyDown (event) {
    var key = event.key;
    
    // If cooldown time out
    if (keyCooldown == 0 && musicStarted) {
        keyCooldown = 5;

        // Music is playing. We count keypresses to hide
        // instructions from screen after three interactions
        keyPresses += 1;

        var key = event.key;
        var id = animations.animCreateID();

        // Special keys
        if (key == ',') { 
            //key = 'comma'; 
            console.log('Animation history');
            console.log(animationGrid);
        }

        // Let's check that key is a character key
        if (key.match(/^[a-zA-Z]*$/)) {
            if (animationTable[key]) {
                animationQueue[id] = new animations[animationTable[key]](id);

                // We'll save the user input for later use if song is in progress.
                if (musicStarted && frameTimer) {
                    var newKey = '';
                    if (animationGrid[gridPos]) { newKey += '+' + key; } else { newKey = key; }
                    animationGrid[gridPos] = newKey;
                }

            }
        }

        if (key == 'space') { musicPause(); }
    
    // If in start screen
    } else {

        if (key == 'space') {
            if (musicReady) { start(); }
        }

    }
};


/* SAVE & LOAD USER DATA ============================== */

/*
function ajaxSaveLoad(cmd, data) {
    var worker = new Worker('js/ajax-save-load.js');
    worker.addEventListener('message', function (e) {
        if (ajaxWaiting == 'id') {
            displayShareLink(e.data);
        }
    });

    worker.postMessage({ 'cmd': cmd, 'msg': data });
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}

function displayShareLink(id) {
    var link = document.getElementById('shareLink');
    link.innerHTML = 'www.mustavalo.com/vk/?q=' + id;
    fadeIn(link);
}
*/


function checkUserData() {
    if (window.userAnimationData) {
        animationGrid = window.userAnimationData;
        userAnimationMode = true;

        instructionsUsername.innerHTML = 'Tekijä: ' + animationGrid.name;
        instructionsNormal.className = 'hide';
        instructionsUser.className = 'show';
    }
}

function saveUserData() {
    // return dataSaved = ajaxSaveLoad('post', animationGrid);   
}


/* CREATE SCREEN CONTROL ELEMENTS ============================== */

function setupTouch() {

    function touchGrid(limit){
        var i = 0;
        var grid = document.createElement('div');

        grid.className = 'touchGrid';
        var shorthands = [];
        
        for(var index in animationTable) {
            shorthands[i] = index;
            ++i;
        }

        for (var r=0; r<limit; ++r) {
            var cell = grid.appendChild(document.createElement('div'));
            
            cell.setAttribute('name', shorthands[r]);

            cell.addEventListener('click',(function (r) {
                return function () { 
                    //callback(el); 
                    var e = { key: shorthands[r] };
                    onKeyDown(e);
                }
            })(r),false);
        }

        return grid;
    }

    // Predefined amount here, unfortunately.
    // To be honest, this part was slapped on top of the thing
    // just before release.

    var touchControls = touchGrid(24);
    document.body.appendChild(touchControls);
}



/* RENDERING QUEUE ============================================= */


function init () {
    loadSounds();
    setupAnimations();
    checkUserData();
    

    animationQueue[1] = new animations.animLoading;
}

function start() {
    // Clear the play button etc.
    animations.animRemove(animationQueue[1]);
    delete animationQueue[1];

    console.log('Music starts / ' + frameNo);

    // Fade the instructions
    fade(document.getElementById('start'), function () { musicStart(); });
}

function onFrame(event) {
    frameNo += 1;
    animLifeCheck += 1;
    var animCount = 0;

    // Execute render queue. 
    // Also clean up the canvas, if queue is empty and something remains.
    for(var index in animationQueue) { 
        animCount++;
        var ready = animationQueue[index].update(event);
        if (ready) { delete animationQueue[index]; }
    }

    // Key input cooldown decrement per frame
    if (keyCooldown > 0) { keyCooldown -= 1; }

    // For some reason Paper.js sometimes leaves some elements on canvas,
    // even after .remove() method. I haven't figured out the reason for this,
    // but these next to parts try to deal with it: by clearing up the canvas
    // if no active animations remain and checking possible dead animations
    // every 100 frames.
    if (animCount == 0) {
        project.clear();
        view.draw();
    }
    if (animLifeCheck == 100) {
        animLifeCheck = 0;
        animCleanUp();
    }
}

init ();





/* ANIMATIONS ============================================= */

/*

Two functions are used to create an animation. Adding a new animation
to the render queue is done with constructor new animName(id); and
the prototype function animName.update is fired every frame

I could not figure how to move this to another file, outside the
PaperScope. Hence the 2000-line monster.


// Init the animation
animations.animName = function (id) {
    // Apply the basic things. Important.
    animations.animBasics.apply(this);  
    
    // Life in frames. If animation relies on completion, not necessary. 
    // Please kill the animation otherwise then. Explained in update function.
    this.life = 30;

    // Then it's just the basic Paper.js stuff. Associate all elements to this.namespace
    // so the functions can find them to be deleted.
    this.shape = new Path();
}

// Update it every frame
animations.prototype.update = function (event) { 
    // If you want to check how long animation has been running
    var frameNow = frameNo - this.startFrame; 

    // Do something to the elements maybe. (<em>animate</em>, to give life to; fill with life)
    this.shape.fillColor.hue += 1;

    // this.lifeCheck() Returns true if life has run out. 
    // Everything associated with this animation will be deleted and erased automaticly
    // by lifeCheck when life reaches 0. If you have an animation that has a beginning and an en,
    // you can just set this.life to 0 by hand and return lifeCheck(); when animation is finished.

    return this.lifeCheck();
}

Other quirks exists, such as the uniqueAnimations table, which stores the info
that an animation should not be shown if an instance of it is still running.
Set it to animation id, passed to the animation function on init stage AND 
set this.id to that id also.

uniqueAnimations['animName'] = id;
this.id = id;

Now you can check if it already exists. If I'm right, one could just set the uniquity
in init stage and let the animBasics handle checking it. 
Oh well. As said, I'm not a coder.


The animations are added to the render queue object like this:

var id = animations.animCreateID();
animationQueue[id] = new animName(id)

*/

function setupAnimations () {


        /* ANIMATION LOOKUP TABLE =============================================

        OK, let me explain (to myself): to allow for different input methods 
        (incl. mobile, possible MIDI etc.) it's nice to have shorthands
        for the animations. Here they are mapped for keyboard. 

        If one wants to be creative, the keyboard input can be swapped
        but the shorthands kept as is. This allows for random keys while
        saved user input still remains the same.


        Animations can be added to queue also by hand:
        var id = animations.animCreateID();
        animationQueue[] = new animations.animName(id);

        */

        animationTable = {
            // ASDF... DONE!!!
            a: 'animBall',
            s: 'animGrid',
            d: 'animDifference',
            f: 'animWave',
            g: 'animArrow',
            h: 'animStrobe',
            j: 'animPlanets',
            k: 'animTracks',
            l: 'animTunnel',

            // ZXCV...  7/7
            z: 'animPaint',
            x: 'animBlocks',
            c: 'animXORball',
            v: 'animVK',
            b: 'animThreeBlocks',
            n: 'animX',
            m: 'animMV',

            // QWERTY... 6/10
            q: 'animBackgroundFade',
            w: 'animSphereCube',
            e: 'animVideoError',
            r: 'animTriangles',
            t: 'animStrokes',
            y: 'animRotatingRect',
            u: 'animPaintStain',
            i: 'animNoisyLines',
            o: 'animBelt',
            p: 'animStarfield',
        };


        animations.animBasics = function (id) {

            // We set up every animation on a different layer.
            // I have no idea if this is CPU intensive or not - in my few tests I
            // could not see much of a difference. It helps keeping the project
            // clean and organizing animations in certain order if needed
            // (i.e. having something always on front or in the background)

            this.layer = new Layer();
            this.layer.activate();
            this.startFrame = frameNo;

            // A common boolean to determine if animation is fading in/out or not.
            // Unfortunately does not work if animation has no method of fading out, 
            // as Paper.js layer opacity is apparently either 0 or 1.
            this.fading = false;
            this.fadingIn = false;

            this.lifeCheck = function () {
                if (this.frameNow() > this.life) {
                    return animations.animRemove(this);
                } else {
                    return false;
                }
            }
            this.frameNow = function () { return (frameNo - this.startFrame); }

            // These are for code readability. This way we can reach some animations
            // from outside without silly ".fading = true;" statements.
            // The day we get working layer opacity or nice way of setting
            // opacity for all children, this will be obsolete.

            this.fadeOut = function () {
                this.fading = true;
            }
            this.fadeIn = function () {
                this.fadingIn = true;
            }
        }

        animations.animLoading = function(id) {
            animations.animBasics.apply(this);
            this.life = 'immortal';
            
            this.heartbeat = new Path();

            this.heartbeat.add(0, view.center.y);
            for (i=0; i<=2; i++) { 
                this.heartbeat.add(i * 25, view.center.y);
                if (i == 2) { this.heartbeat.segments[i].point.y -= 25}
            }
            this.heartbeat.add(view.size.width, view.center.y);

            this.heartbeat.strokeWidth = 13;
            this.heartbeat.strokeColor = animColors['cyan'];
        }
        animations.animLoading.prototype.update = function () {
            this.heartbeat.pivot = view.center;
            this.heartbeat.position.y = view.center.y;
            this.heartbeat.segments[this.heartbeat.segments.length - 1].x = view.size.width;

            for (i=1; i<=3; i++) {
                this.heartbeat.segments[i].point.x += view.size.width / 260;
            }
            if (this.heartbeat.segments[1].point.x >= view.size.width) {
                for (i=1; i<=3; i++) {
                    this.heartbeat.segments[i].point.x = (i-1) * (view.size.width * 0.01);
                }                
            }

            if (this.fading) {
                this.heartbeat.opacity -= 0.05;
            }
            if (this.heartbeat.opacity <= 0) {
                
                animations.animRemove(this);
                this.life = 0;

                animationQueue[1] = new animations.animReady();
                animationQueue[1].fadeIn();
                
            }
        }

        animations.animReady = function (id) {
            animations.animBasics.apply(this);
            this.life = 'immortal';

            this.playButton = new Path.RegularPolygon(view.center, 3, 40);
            this.playButton.fillColor = 'white';
            this.playButton.rotate(90);
            this.playButton.opacity = 0;

            this.playButton.onMouseEnter = function () {
                this.fillColor = animColors['cyan'];
            }
            this.playButton.onMouseLeave = function () {
                this.fillColor = animColors['white'];
            }
            this.playButton.onMouseUp = function () {
                start();
            }
        }
        animations.animReady.prototype.update = function () {
            this.playButton.position = view.center;
            if (this.fadeIn) {
                this.playButton.opacity += 0.1;
                if (this.playButton.opacity >= 1) { this.fadeIn = false; }
            }
        }

        animations.animInstructions = function (id) {

            this.contents = {
                fi: 'OHJAA ANIMAATIOTA KIRJAINNÄPPÄIMILLÄ (A-Z) TAI KOSKEMALLA RUUTUA',
                eng: 'CONTROL ANIMATION WITH CHARACTER KEYS (A-Z) OR TOUCH THE SCREEN',
                fiUser: 'ANIMAATION TEKI ',
                engUser: 'Tee oma versiosi. Ohjaa videota kirjainnäppäimillä (A-Z) tai koske ruutua.',
            };

            animations.animBasics.apply(this);
            this.life = 'immortal';

            this.textFI = new PointText({
                fillColor: animColors['white'],
                fontFamily: 'Raleway',
                fontSize: 25,
                leading: 0,
                fontWeight: 800,
                justification: 'center',
                position: view.center
            });

            this.textENG = this.textFI.clone();
            this.textENG.fontWeight = 400;
            this.textENG.fontSize = 20;
            this.textENG.position.y += 1.05 * this.textFI.fontSize;

            console.log(userAnimationMode);

            if (!userAnimationMode) {

                this.textFI.content = this.contents.fi;
                this.textENG.content = this.contents.eng;
            } else {
                this.textFI.content = this.contents.fiUser + animationGrid.name.toUpperCase();
                this.textENG.content = this.contents.engUser;
            }

            this.texts = new Group(this.textFI, this.textENG);

            var aspect = this.texts.bounds.width / view.size.width;
            var aspectH = this.texts.bounds.height / this.texts.bounds.width; 
            if (aspect > 0.9) {
                this.texts.bounds.width = 0.9 * view.size.width;
                this.texts.bounds.height = aspectH * this.texts.bounds.width;
            }

            /*
            this.text = new Raster({
                source: ('_gfx/instructions.png'),
                position: view.center
            });
            
            this.text.onLoad = function () {
                this.position = new Point(view.center.x, view.size.height / 5 * 4); 
                if (this.bounds.width > view.size.width) {
                    var aspect = (view.size.width * 0.9) / this.bounds.width;
                    this.scale(aspect);
                }
            }
            */
        }
        animations.animInstructions.prototype.update = function (e) {            

            this.texts.position.x = view.center.x;
            this.texts.position.y = view.size.height / 5 * 4;
            this.layer.bringToFront();
            
            if (keyPresses > 3) {
                this.fading = true;
            }

            if (this.fading) {
                this.texts.opacity -= 0.1;
                
                if (this.texts.opacity <= 0) {
                    this.life = 0;
                    return this.lifeCheck();
                }
            }

        }


        animations.animBelt = function (id) {
            animations.animBasics.apply(this);

            this.life = 100;

            this.dots = [];
            this.dotLimit = 20;
            this.dotRows = 8;
            this.radius = 3;

            this.boundsX = view.size.width * 0.25;
            this.boundsY = view.size.height * 0.35;

            var width = view.size.width - this.boundsX * 2;
            var height = view.size.height - this.boundsY * 2;

            var stepX = width / this.dotLimit;
            var stepY = height / (this.dotRows - 1);

            for (i=0; i<this.dotLimit; i++) {
                for (n=0; n<this.dotRows; n++) {
                    var dot = new Path.Circle({
                        radius: this.radius + Math.floor(Math.random() * 5),
                        center: new Point(this.boundsX + i * stepX, this.boundsY + n * stepY),
                        fillColor: animColors['white'],
                        opacity: 0
                    });

                    this.dots.push(dot);
                }
            }
        }
        animations.animBelt.prototype.update = function (id) {
            var base = this.dotRows * (this.frameNow() - 1);

            for (x=0; x<this.dots.length; x++) {
                this.dots[x].scale(Math.random() * 0.26 + 0.85);
            }

            if (!this.fading) {
                for (i=0; i<this.dotRows; i++) {
                    if (this.dots[base + i]) { this.dots[base + i].opacity = 1; }
                }
            } else {
                for (i=0; i<this.dotRows; i++) {
                    if (this.dots[base + i]) { this.dots[base + i].opacity = 0; }
                }
            }


            if (this.dots[this.dots.length - 1].opacity == 1 && !this.fading) { 
                this.fading = true; 
                this.startFrame = frameNo; 
            } else if (this.fading && this.dots[this.dots.length - 1].opacity == 0) {
                this.life = 0;
                return this.lifeCheck();
            }
            
        }


        animations.animPlanets = function (id) {
            animations.animBasics.apply(this);
            this.life = 200;

            var radius = Math.floor(Math.random() * (view.size.width * 0.2) + 40);

            this.orbit = new Path.Circle({
                center: view.center,
                radius: radius,
                strokeWidth: 0,
                strokeColor: animColors['white']
            });

            this.moon = new Path.Circle({
                center: new Point(view.center['x'], view.center['y'] - radius),
                radius: 12,
                strokeWidth: 0,
                strokeColor: animColors['white'],
                pivot: view.center
            });
            this.moon.rotate(Math.random() * 360);

            this.moonPhase = 2;

            this.system = new Group(this.orbit, this.moon);
            this.system.pivot = this.orbit.position;
            
        }
        animations.animPlanets.prototype.update = function(e) {
            this.moon.rotate(this.moonPhase);
            this.system.position = view.center;

            if (this.moon.strokeWidth < 3) {
                this.moon.strokeWidth += 0.1;
                this.orbit.strokeWidth += 0.1;
            }

            if (this.frameNow() / this.life > 0.6 && this.orbit.opacity >= 0) {
                this.orbit.opacity -= 0.1;
                if (this.orbit.opacity < 0) { this.orbit.remove(); }
            }
            if (this.frameNow() / this.life > 0.8) {
                this.moon.opacity -= 0.1;
                if (this.moon.opacity < 0) { this.moon.remove(); }
            }

            return this.lifeCheck();
            
        }

        animations.animGrid = function (id) {
            // Dear gods.all[yours], this next code is horrible.
            // I am sorry, libraries of the world. You hold such wisdom, and I did not bother to learn.
            // TO ANYONE READING THIS: Tread at your own risk and abandon hope all.

            animations.animBasics.apply(this);

            this.life = 110;
            this.grids = [];

            // Prototype grid
            this.gridPrototype = new Path();

            this.strokes = {};
            this.strokesMid = {};

            this.random = Math.floor(Math.random() * (view.size.height / 5) + (view.size.height * 0.1));;
            this.gridPrototype.add(view.center.x - this.random, view.center.y);
            this.gridPrototype.add(view.center.x, view.center.y - this.random * 1.7);
            this.gridPrototype.add(view.center.x + this.random, view.center.y);
            this.gridPrototype.add(view.center.x, view.center.y + this.random * 1.7);
            this.gridPrototype.add(this.gridPrototype.segments[0].point);
            this.gridPrototype.progress = 0;

            // Uh... let's copy the middle rectangle and scale it to set the segments to correct order
            this.grid1 = this.gridPrototype.clone();
            this.grid1.position.x = view.center.x - this.gridPrototype.bounds.width / 2;
            this.grid1.scale(0.6, -0.6);
            this.grid1.progress = 0;

            // Once again.
            this.grid2 = this.gridPrototype.clone();
            this.grid2.position.x = view.center.x + this.gridPrototype.bounds.width / 2;
            this.grid2.scale(-0.6, -0.6);
            this.grid2.progress = 0;

            this.grids.push(this.grid1, this.grid2);

            this.gridsDone = 0;
            this.group = {};

        }
        animations.animGrid.prototype.update = function (e) {
            // We'll first draw the identical twins with a sort of a over-complicated for loop. 
            // One could maybe calculate the segments, now that I think about it and deduce the 
            // progression from there. I didn't. One could actually just draw all the mirror
            // images at once. I DIDN'T. I think I was drunk while writing this - and probably this 
            // would be worse otherwise.

            for (i=0; i<this.grids.length; i++) {
                var grid = this.grids[i];

                if (grid.progress <= 2) {
                    if (!this.strokes[i]) {
                        this.strokes[i] = [];

                        for (n=0; n<2; n++) {
                            //if (n == 1) { var color ='cyan'; } else { var color = 'magenta'; }
                            var stroke = new Path({ strokeColor: animColors['white'], opacity: 0.3, strokeWidth: 2 });
                        
                            stroke.add(grid.segments[0].point);
                            stroke.add(stroke.lastSegment.point);
                            
                            this.strokes[i].push(stroke);
                        }

                        grid.progress += 1;

                    } else {
                    
                        var stroke = this.strokes[i][0];
                        var stroke2 = this.strokes[i][1];
                        if (grid.progress == 1) {
                            var vector = grid.segments[grid.progress].point - stroke.lastSegment.point;
                            var vector2 = grid.segments[4 - grid.progress].point - stroke2.lastSegment.point;
                        } else {
                            var vector = grid.segments[2].point - stroke.lastSegment.point;
                            var vector2 = grid.segments[2].point - stroke2.lastSegment.point;
                        }
                        
                        if (vector.length <= 1) {
                            stroke.add(stroke.lastSegment.point);
                            stroke.add(stroke.lastSegment.point);
                            stroke2.add(stroke2.lastSegment.point);
                            stroke2.add(stroke2.lastSegment.point);

                            grid.progress += 1;
                        } 

                        stroke.lastSegment.point += vector / 5;
                        stroke2.lastSegment.point += vector2 / 5;
                    }
                } else {
                    this.gridsDone += 1;
                }
            }
            
            var gridProto = this.gridPrototype;
            if (!this.strokesMid[0]) {
                
                // My brain is hurting. What is this? Are you some kind of hypnotist.
                for (i=0; i<4; i++) {
                    var stroke = new Path();
                    stroke.strokeColor = animColors['white'];
                    stroke.strokeWidth = 2;
                    if (i<2) { 
                        stroke.add(gridProto.segments[0].point); 
                        stroke.add(gridProto.segments[0].point); 
                    } else {
                        stroke.add(gridProto.segments[2].point);
                        stroke.add(gridProto.segments[2].point);
                    }
                    this.strokesMid[i] = stroke;
                }
            }

            if (gridProto.progress == 0 && this.strokesMid[0]) {
                for (i=0; i<4; i++) {
                    if (i == 0 || i == 2) {
                        var vector = gridProto.segments[1].point - this.strokesMid[i].lastSegment.point;
                    } else {
                        var vector = gridProto.segments[3].point - this.strokesMid[i].lastSegment.point;
                    }

                    this.strokesMid[i].lastSegment.point += vector / 20;
                    if (vector.length < 5) { gridProto.progress += 1;  }
                }
            } 
                    
            return this.lifeCheck();
        }

        // Simple zooming ball animation
        animations.animBall = function(id) {
            animations.animBasics.apply(this);

            this.life = 20;
            this.ball = new Path.Circle({
                center: view.center,
                radius: 60,
                strokeWidth: 35,
                strokeColor: animColors['cyan'],
            });
        }
        animations.animBall.prototype.update = function() {
            this.ball.scale(1.15);
            return this.lifeCheck();
        }

        // Waveform animation
        animations.animWave = function(id) {
            animations.animBasics.apply(this);
            this.life = 70;

            this.amount = 12;
            this.height = 120;

            this.waveHeight = 2.4;

            this.path = new Path({
                strokeColor: animColors['cyan'],
                strokeWidth: 8,
            });

            for (var i = 0; i <= this.amount; i++) { 
                this.path.add(new Point(i / this.amount, 1) * view.size);
            }
        }
        animations.animWave.prototype.update = function (event) {
            this.waveHeight -= 0.05;
            for (var i = 0; i <= this.amount; i++) {
                var segment = this.path.segments[i];
                
                
                var sinus = Math.sin(event.time * 15 + i);
                segment.point.y =   sinus * 
                                    (this.height * (Math.random() * this.waveHeight + 0.2)) + 
                                    view.size['height'] / 2;
            }
            //this.path.smooth();   
            return this.lifeCheck();
            
        }

        // A rotating rectangle
        animations.animRotatingRect = function (id) {
            animations.animBasics.apply(this);

            this.rect = new Path.Rectangle({
                point: [view.size['height'] * 0.3, view.size['height'] * 0.3],
                size: [20, 20],
                center: view.center,
                fillColor: animColors['cyan']
            });
        }
        animations.animRotatingRect.prototype.update = function (e) {
            if ((frameNo - this.startFrame) > 70) {
                return animations.animRemove(this);
            }
            if ((frameNo - this.startFrame) > 15) {
                this.rect.scale(0.9);
            } else { this.rect.scale(1.4); }
            this.rect.rotate(14);

            return this.lifeCheck();
        }

        animations.animStrobe = function (id) {
            animations.animBasics.apply(this);

            this.life = 12;

            this.strobe = new Path.Rectangle(view.bounds);
            this.strobe.fillColor = animColors['white'];
            this.strobe.fillColor.brightness = 0;
        }
        animations.animStrobe.prototype.update = function (e) {
            var frameNow = frameNo - this.startFrame;

            if (isOdd(frameNow)) {
                this.strobe.fillColor.brightness = 0;
            } else {
                this.strobe.fillColor.brightness = 1;
            }

            return this.lifeCheck();
        }

        animations.animTunnel = function (id) {
            animations.animBasics.apply(this);

            this.life = 120;

            this.circleLimit = 36;
            this.circles = [];

            for (i=0; i<this.circleLimit; i++) {
                var circle = new Path.Circle({
                    radius: 0.3,
                    center: new Point(view.center.x - view.size.width * 0.01, view.center.y),
                    fillColor: animColors['white'],
                });

                circle.position = rotatePoint(circle.position, view.center, (i+1) * 360 / this.circleLimit);

                this.circles.push(circle);
            }
            this.circleGroup = new Group(this.circles);
            this.circleGroup.pivot = view.center;
            this.circleGroup.rotate(Math.floor(Math.random() * 360));

        }
        animations.animTunnel.prototype.update = function (e) {
            for (i=0; i<this.circles.length; i++) {
                var circle = this.circles[i];
                if (circle) {

                    circle.pivot = view.center;

                    var n = this.circles.length - i / 3;
                    circle.scale(1 + n * 0.0025);

                    var cpoint = circle.segments[0].point;

                    if (!cpoint.isInside(view.getBounds())) {
                        circle.remove();
                        delete this.circles[i];
                    }

                }
            }
            this.circleGroup.pivot = view.center;
            this.circleGroup.rotate(-4);

            return this.lifeCheck();
        }


        animations.animXORball = function (id) {
            if (!uniqueAnimations['animXORball']) {

                uniqueAnimations['animXORball'] = id;


                animations.animBasics.apply(this);

                this.life = 80;
                this.id = id;

                this.circle = new Path.Circle({
                    radius: view.size.height * 0.2,
                    center: view.center,
                    fillColor: animColors.white,
                });

                this.background = new Path.Rectangle(view.center.x, 0, 8, view.size.height);
                //this.background.blendMode = 'xor';
                this.background.fillColor = animColors.white;

                this.group = new Group([this.background, this.circle]);
                this.group.clipped = true;
                this.group.blendMode = 'xor';
            }
        }
        animations.animXORball.prototype.update = function (e) {
            if (uniqueAnimations['animXORball'] == this.id) {

                var frameNow = frameNo - this.startFrame;

                if (this.background.bounds.width < view.size.width) {
                    this.background.scale(1.4,1);
                }
                // Strobe if towards the end of animation
                if ((this.life - frameNow) / this.life < 0.2) {
                    if (isOdd(frameNow)) { this.group.opacity = 0; }
                    else { this.group.opacity = 1; }
                }
                if (this.lifeCheck()) {
                    uniqueAnimations['animXORball'] = false;
                    return this.lifeCheck();
                }
            }
        }


        // White difference (or actually xor) effect with rotating hexagon
        animations.animDifference = function(id) {
            animations.animBasics.apply(this);

            this.life = 80;

            this.hexagon = new Path();
            this.hexagon.strokeColor = animColors['white'];
            this.hexagon.strokeWidth = 7; 
            var points = 6; var radius = view.size['height'] * (Math.random() * 0.4 + 0.05);
            var angle = ((2 * Math.PI) / points);
            for (i=0; i <= points; i++) {
                this.hexagon.add(new Point(
                    radius * Math.cos(angle * i),
                    radius * Math.sin(angle * i)
                ));
            }
            this.hexagon.position.x = view.size['width'] / 2;
            this.hexagon.position.y = view.size['height'] / 2;

            this.rect = new Path.Rectangle({
                point: [0, 0],
                size: [view.size['width'], view.size['height']],
                center: view.center,
                fillColor: animColors['white']
            });
            this.direction = 'up';
            this.rect.opacity = 0;
            this.rect.blendMode = 'xor';

        }
        animations.animDifference.prototype.update = function(e) {
            if (this.rect.opacity < 1 && this.direction == 'up') {
                this.rect.opacity += 0.25;
            } else {
                this.direction = 'down';
                this.rect.opacity -= 0.05;
            }
            this.hexagon.rotate(-3);
            if (this.rect.opacity < 0) {
                return animations.animRemove(this);
            }
        }


        // Small X's that turn and scale
        animations.animX = function (id) {
            animations.animBasics.apply(this);


            this.Xamount = 3;
            this.X = [];

            this.life = 45;

            for (i=0; i<this.Xamount; i++) {
                var width = view.size.width * (Math.random() * 0.02 + 0.01);
                var position = Point.random() * view.size;

                var shape = new Path();
                shape.strokeColor = animColors['white'];
                shape.strokeWidth = Math.floor(0.08 * width);
                shape.add(position);
                shape.add(position.x + width, position.y);
                shape.position = position;

                var shape2 = shape.clone();
                shape2.rotate(90);

                var X = new Group([shape, shape2]);
                X.behaviour = 0;
                X.strobe = 0;
                X.opacity = 0;
                X.behaviour = Math.floor(Math.random() * 2);
                X.rotate(45);

                X.behaviourFrames = [];
                X.behaviourFrames = [
                    Math.floor(Math.random() * this.life + 2 * this.Xamount), 
                    Math.floor(Math.random() * this.life + 2 * this.Xamount)
                ];

                this.X.push(X);
                
            }           
        }
        animations.animX.prototype.update = function (e) {
            for (i=0; i<this.Xamount; i++) {

                var x = this.X[i];

                if (this.frameNow() > (i * 2) && x.opacity == 0) { 
                    x.opacity = 1; 
                }

                if (this.frameNow() == x.behaviourFrames[0] || this.frameNow() == x.behaviourFrames[1]) {
                    switch (x.behaviour) {
                        case 0:
                            x.rotate(45); break;
                        case 1:
                            x.scale(Math.random() * 1 + 0.7);
                            x.strokeWidth = Math.floor(0.15 * x.bounds.width);
                            break;
                        case 2:
                            x.strobe = 6; break;
                        case 3: 
                            x.strokeColor = animColors['cyan']; break;
                    }
                }

                if (x.strobe > 0) {
                    if (isOdd(this.frameNow())) { 
                        x.opacity = 0; 
                    } else { 
                        x.opacity = 1; 
                    }
                    x.strobe -= 1;
                }
            }

            return this.lifeCheck();
        }


        // Scan lines and errors
        animations.animVideoError = function (id) {
            animations.animBasics.apply(this);

            this.life = 15;

            this.errors = 40;

            this.colors = [animColors['magenta'], '#21cf90', animColors['cyan']];
            this.modes = ['screen', 'xor', 'multiply'];
            this.blocks = [];

            for (i=0; i<this.errors; i++) {
                var errorStyle = Math.floor(Math.random() * 10);

                if (errorStyle < 8) {
                    var rect = new Rectangle(Point.random() * view.size, view.size.height * 0.02);
                    var errorBlock = new Path.Rectangle(rect);

                    errorBlock.opacity = 0;
                    errorBlock.fillColor = this.colors[Math.floor(Math.random() * (this.colors.length))];
                    errorBlock.blendMode = this.modes[Math.floor(Math.random() * (this.modes.length))];
                    
                } else if (errorStyle == 9) {

                    var errorBlock = new Raster({
                        source: '_gfx/error.png',
                        position: new Point(view.center.x, Math.floor(Math.random() * view.size.height))
                    });
                    
                    var scaling = view.size.width / errorBlock.bounds.width;
                    if (scaling > 1) { errorBlock.scale(scaling, 0.8); }

                } else {

                    //Scanline

                    var size = new Size(view.size.width, Math.floor(Math.random() * (view.size.height * 0.5)));
                    var position = new Point(0, Math.floor(Math.random() * view.size.height));
                    var rect = new Rectangle(position, size);
                    var errorBlock = new Path.Rectangle(rect);
                    
                    errorBlock.errorType = 'scanline';

                    errorBlock.fillColor = '#00ff00';
                    errorBlock.fillColor = this.colors[Math.floor(Math.random() * (this.colors.length-1) + 1)];
                    errorBlock.blendMode = 'screen';
                    errorBlock.opacity = 0.1;
                }
        
                errorBlock.startFrame = Math.floor(Math.random() * this.life);
                errorBlock.life = Math.floor(Math.random() * (this.life - errorBlock.startFrame));

                errorBlock.visible = false;
                this.blocks.push(errorBlock); 
            }
        }
        animations.animVideoError.prototype.update = function (id) {
            for (i=0; i<this.errors; i++) {
                var error = this.blocks[i];

                if (error.startFrame == this.frameNow()) {
                    error.opacity = Math.random() * 0.3 + 0.7;
                    error.visible = true;
                }
                if (error.visible) {
                    error.life -= 1;

                }
                if (error.life == 0) {
                    error.remove()
                }
            }
            return this.lifeCheck();
        }



        // A row of blocks animation
        animations.animBlocks = function(id) {
            animations.animBasics.apply(this);

            var boundaries = [
                view.size['width'] * 0.2 / 2,
                view.size['height'] * 0.5 / 2
            ];

            this.rects = [];
            var rect = false;
            var rectSpace = ((view.size['width'] * 0.7) - (view.size['width'] * 0.06)) / 6;

            this.life = 30;

            for (i=0; i <= 6; i++) {
                var left = i * rectSpace;
                rect = new Path.Rectangle({
                    point: [boundaries[0] + left, boundaries[1]],
                    size: [view.size['width'] * 0.06, view.size['height'] * 0.5],
                    fillColor: animColors.white
                });
                rect.opacity = 0;

                this.rects.push(rect);
            }
        }
        animations.animBlocks.prototype.update = function(e) {
            var frameNow = frameNo - this.startFrame;

            for (i=0; i <= 6; i++) {
                //this.rects[i].fillColor.hue += 1;

                if (frameNow == (2 * i)) {
                    this.rects[i].opacity = 1;
                }

                if (frameNow == this.life - i * 2) {
                    this.rects[(6-i)].opacity = 0;
                }
            }

            return this.lifeCheck();
        }


        // Paint the background
        animations.animPaint = function (id) {
            animations.animBasics.apply(this);

            this.holdFrames = 35;

            this.rect = new Path.Rectangle(0,0,0, view.size.height);

            this.rect.pivot = new Point(0,0);
            this.layer.sendToBack();

            if (!animColorsOverride) {
                animColors = clone(animColorsBackup);
                this.rect.fillColor = animColors.magenta;
                
                animColors.magenta = '#000000';
                animColors.cyan = '#000000';
            } else {
                this.rect.fillColor = animColors['black'];
            }


            this.startSegment = 2;

        }
        animations.animPaint.prototype.update = function () {
            this.rect.segments[this.startSegment].point.x += view.size.width * 0.09;
            this.rect.segments[this.startSegment + 1].point.x += view.size.width * 0.09;
            
            if (this.rect.segments[this.startSegment].point.x >= view.size.width) {
                // Let's just stay for awhile
                if (this.holdFrames >= 0 && this.startSegment != 0) {
                    this.holdFrames -= 1;
                    return;
                }

                // Let's kill it when it has finished
                if (this.startSegment == 0 && this.holdFrames <= 0) {
                    animColors = clone(animColorsBackup);
                    this.life = 0; return this.lifeCheck();
                } else if (this.holdFrames <= 0 && this.startSegment !=0) {
                     this.startSegment = 0;
                }

                
            }
        }



        animations.animMV = function (id) {
            animations.animBasics.apply(this);

            this.life = 50;

            this.progress = { m: 0, v: 0 };

            //this.width = view.size.width * (Math.random() * 0.8 + 0.6);
            this.width = view.size.width;
            this.height = this.width * (Math.random() * 0.12 + 0.05);

            var bounds = {
                left: (view.size.width - this.width) / 2,
                top: (view.size.height - this.height) / 2
            };
            var jump = { right: this.width / 7, down: this.height };

            this.waypointsM = [];

            this.waypointsM.push(new Point(bounds.left, bounds.top + jump.down));
            this.waypointsM.push(new Point(bounds.left + jump.right, bounds.top));
            this.waypointsM.push(new Point(bounds.left + jump.right * 2, bounds.top + jump.down));
            this.waypointsM.push(new Point(bounds.left + jump.right * 3, bounds.top));
            this.waypointsM.push(new Point(bounds.left + jump.right * 4, bounds.top + jump.down));
            this.waypointsM.push(new Point(bounds.left + jump.right * 5, bounds.top));
            this.waypointsM.push(new Point(bounds.left + jump.right * 6, bounds.top + jump.down));
            this.waypointsM.push(new Point(bounds.left + jump.right * 7, bounds.top));

            this.M = new Path({ strokeColor: animColors['magenta'], strokeWidth: 8, blendMode: 'screen' });
            //this.V = new Path({ strokeColor: animColors['magenta'], strokeWidth: 8 });

            this.M.add(this.waypointsM[0]);
            this.M.add(this.waypointsM[0]);

        }
        animations.animMV.prototype.update = function (id) {    
            var vector = this.waypointsM[this.progress.m + 1] - this.M.lastSegment.point;
            // this.points[i].position += vector / 2;
            this.M.lastSegment.point += vector / 2;

  
            if (vector.length < 10) {   
                this.progress.m += 1;
                this.M.add(this.M.lastSegment.point);
                this.M.add(this.M.lastSegment.point);
            }
  
            return this.lifeCheck();
        }


        // VOIGHT-KAMPFF text animation
        animations.animVK = function (id) {
            if (!uniqueAnimations['animVK']) {
                uniqueAnimations['animVK'] = id;
                animations.animBasics.apply(this);

                this.id = id;

                this.text = 'MUSTA VALO / / / VOIGHT-KAMPF F';
                this.character = 0;
                this.chr = '';
                this.framesVisible = 0;

                this.vectorChr = new PointText(new Point(view.center));
                this.vectorChr.fillColor = animColors['white'];
                this.vectorChr.fontFamily = 'Roboto';
                this.vectorChr.fontSize = 350;
                this.vectorChr.leading = 0;
                this.vectorChr.justification = 'center';
                this.vectorChr.pivot = this.vectorChr.center;
                this.vectorChr.position.y = this.vectorChr.position.y + this.vectorChr.fontSize * 0.33;

                this.vectorChr.content = this.text.substr(0,1);

            } else {
                delete animationQueue[id];
            }
        }
        animations.animVK.prototype.update = function (e) {
            if (uniqueAnimations['animVK'] == this.id) {
                if (this.framesVisible >= 4) {                   
                    this.character += 1;

                    if (this.character >= this.text.length) {
                        uniqueAnimations['animVK'] = false;
                        this.life = 0;
                        return this.lifeCheck();
                    }

                    var chr = this.text.substr(this.character, 1);
                    this.vectorChr.content = chr;
                    this.framesVisible = 0;
                } else {
                    this.framesVisible += 1;
                }
            }
        }


        // A line that appears to be a sound wave
        animations.animNoisyLines = function (id) {
            if (!uniqueAnimations['animNoisyLines']) {
                uniqueAnimations['animNoisyLines'] = id;

                animations.animBasics.apply(this); 

                this.life = 90;
                this.id = id;

                this.lineCount = 1;
                this.lines = [];
                this.oddFrame = 0;
                this.pulsate = 0;


                var start = new Point(0, view.size.height / 2);
                this.line = new Path({
                    strokeColor: animColors['white'],
                    strokeWidth: 3
                });

                this.line.strokeColor.brightness = 1;

                this.line.add(start);


            } else {
                delete animationQueue[id];
            }
        }
        animations.animNoisyLines.prototype.update = function (event) {
            if (uniqueAnimations['animNoisyLines'] == this.id) {
                var frameNow = frameNo - this.startFrame;
                this.oddFrame += 1;
                this.pulsate += 1;

                if (this.oddFrame == 2) {
                    this.oddFrame = 0; 

                    var lineBrightness = this.line.strokeColor.brightness;
                    var lastPoint = this.line.segments[this.line.segments.length-1].point;

                    if (lastPoint.x > view.size.width) {
                        this.life = 0;
                        this.lifeCheck(); 
                        uniqueAnimations['animNoisyLines'] = false;
                        return true;
                    }

                    // One in six times do a random hickup in line
                    var dieCast = Math.floor(Math.random() * 5);
                    if (dieCast == 1) {
                        var newY = this.line.segments[0].point.y - (Math.floor(Math.random() * 65 - 26)) * lineBrightness;
                    } else {
                        var newY = this.line.segments[0].point.y;
                    }

                    var newPoint = new Point(lastPoint.x + view.size.width * 0.01 * lineBrightness, newY);
                    
                    this.line.add(newPoint);
                    this.line.smooth();

                }

                if (this.pulsate > 20) {
                    for (var i = 0; i < this.line.segments.length; i++) {
                        var segment = this.line.segments[i];
                        
                        var sinus = Math.sin(event.time * 15 + i);
                        segment.point.y = sinus * ((Math.random() * view.size.height / 20 - 6)) + view.size['height'] / 2;
                    }
                    if (this.pulsate > 25) { this.pulsate = 0; }
                }
            }
        }

        // Fades the background to a color
        animations.animBackgroundFade = function (id) {
            if (!uniqueAnimations['animBackgroundFade']) {
                uniqueAnimations['animBackgroundFade'] = id;
                animations.animBasics.apply(this);

                this.id = id;

                this.fading = false;
                this.hold = 120; 

                this.backgroundRect = new Path.Rectangle(view.bounds);
                this.backgroundRect.fillColor = animColorsBackup['cyan'];
                this.backgroundRect.fillColor.brightness = 0;
                this.backgroundRect.parent.sendToBack();

                animColors['magenta'] = '#000000';
                animColors['cyan'] = '#000000';

            } else {
                delete animationQueue[id];
            }
        }
        animations.animBackgroundFade.prototype.update = function(e) {
            if (uniqueAnimations['animBackgroundFade'] == this.id) {
                var frameNow = frameNo - this.startFrame;
                
                if (!this.fading) {
                    this.backgroundRect.fillColor.brightness += 0.03;
                    if (this.backgroundRect.fillColor.brightness >= 1) {
                        this.fading = true;
                    }
                } else {
                    if (this.hold < 0) { this.backgroundRect.fillColor.brightness -= 0.05; } 
                    else { this.hold -= 1; }
                }

                if (this.backgroundRect.fillColor.brightness <= 0) {
                    uniqueAnimations['animBackgroundFade'] = false;
                    if (!animColorsOverride) {
                        animColors = clone(animColorsBackup);
                    }
                    this.life = 0;
                    return this.lifeCheck();
                }
            }
        }


        // Flying "arrow"
        animations.animArrow = function (id) {
            animations.animBasics.apply(this);
            this.life = 30;

            this.arrow = new Path({
                strokeColor: animColors['cyan'],
                strokeWidth: 3
            });

            this.destinations = [];
            this.currentSegment = 0;

            // There is probably an easier way to do this. I want our "arrow" to fly
            // from some side of the screen to the exact opposite. Some high level math
            // for me, thanks to StackOverflow and Rob Mayoff

            var angle = Math.floor(Math.random() * 360);
            var radians = angle * (Math.PI/180);

            var xRadius = view.size.width / 2;
            var yRadius = view.size.height / 2;
            var intersectTop = (-yRadius / Math.tan(angle), -yRadius);
            var intersectRight = (xRadius, xRadius * Math.tan(angle));

            var pointRelativeToCenter;
            var tangent = Math.tan(radians);
            var y = xRadius * tangent;

            if (Math.abs(y) <= yRadius) {
                if (radians < (Math.PI / 2) || radians > (Math.PI + Math.PI / 2)) {
                    pointRelativeToCenter = new Point(xRadius, y);
                } else {
                    pointRelativeToCenter = new Point(-xRadius, -y);
                }
            } else {
                var x = yRadius / tangent;
                if (radians < Math.PI) {
                    pointRelativeToCenter = new Point(x, yRadius);
                } else {
                    pointRelativeToCenter = new Point(-x, -yRadius);
                }
            }

            var pointStart = new Point(
                pointRelativeToCenter.x + view.center.x,
                pointRelativeToCenter.y + view.center.y
            );
            var pointEnd = new Point(
                view.size.width - pointStart.x,
                view.size.height - pointStart.y
            );
            
            // Push points to array for the next step
            this.destinations.push(pointStart); this.destinations.push(pointEnd);

            // Randomly select direction, and reverse start and end if needed
            var direction = Math.floor(Math.random() * 1);
            if (direction == 1) { this.destinations.reverse(); }

            this.arrow.add(this.destinations[0]);
            this.arrow.add(this.destinations[0]);

            this.vector = 0;
            this.vector = this.destinations[1] - this.destinations[0];
        }
        animations.animArrow.prototype.update = function (e) {
            
            var closingVector = this.destinations[1] - this.arrow.segments[this.currentSegment].point;
            this.arrow.segments[this.currentSegment].point += this.vector * 0.1;


            if (closingVector.length < 2) {
                this.currentSegment = 1;
            }

            return this.lifeCheck();
            
        }


        // A "starfield" of random lines
        animations.animStarfield = function (id) {
            if (!uniqueAnimations['animStarfield']) {
                uniqueAnimations['animStarfield'] = id;

                animations.animBasics.apply(this);
                this.life = 180;
                this.id = id;

                this.starCount = 70;
                this.stars = [];
                this.starsOrigW = [];

                if (animColors['cyan'] == animColorsBackup['cyan']) { this.blendMode = 'screen'; } else { this.blendMode = 'multiply'; }

                for (i = 0; i < this.starCount; i++) {
                    var center = Point.random() * view.size;
                    var newStar = new Path({
                        position: center,
                        
                        height: 6,
                        strokeColor: animColors['cyan'],
                        strokeWidth: 2,
                        blendMode: this.blendMode
                    });
                    

                    this.starsOrigW[i] = Math.floor(Math.random() * 300 + 40);
                    newStar.add(new Point(center.x, center.y));
                    newStar.add(new Point(center.x + this.starsOrigW[i], center.y));


                    newStar.strokeColor.brightness = Math.random() * 0.8 + 0.2;
                    newStar.opacity = 0;

                    this.stars.push(newStar);

                }
            } else {
                delete animationQueue[id];
            }
        }
        animations.animStarfield.prototype.update = function(e) {
            if (uniqueAnimations['animStarfield'] == this.id) {
                var frameNow = frameNo - this.startFrame;

                for (i = 0; i < this.starCount; i++) {
                    this.stars[i].position.x +=  this.stars[i].bounds.height / 20;
                    
                    // One in thousand times make a new segment
                    var dieCast = Math.floor(Math.random() * 500);
                    if (dieCast == 2) {
                        var newY = this.stars[i].segments[0].point.y - (Math.floor(Math.random() * 30 - 15));
                        this.stars[i].add(this.stars[i].lastSegment.point.x + 5, newY);
                        this.stars[i].add(this.stars[i].lastSegment.point.x + 5, this.stars[i].segments[0].point.y);
                        this.stars[i].add(this.stars[i].lastSegment.point.x, this.stars[i].lastSegment.point.y);
                    }

                    if (animColors['cyan'] != animColorsBackup['cyan']) {
                        this.stars[i].blendMode = 'multiply';
                        this.stars[i].strokeColor = animColors['cyan'];
                    } else {
                        this.stars[i].blendMode = 'screen';
                        this.stars[i].strokeColor = animColors['cyan'];
                    }

                    this.stars[i].lastSegment.point.x += this.starsOrigW[i] / 40;
                    

                    if (this.stars[i].opacity < 1) { this.stars[i].opacity += .1; }
/*
                    if (this.stars[i].bounds.left > view.size.height) {
                        this.stars[i].position.y = -this.stars[i].bounds.height;
                    }
*/
                    if (frameNow > this.life - this.life * 0.3) {
                        this.stars[i].opacity -= 0.2 - this.stars[i].bounds.height * 0.005;
                        if (this.stars[i].opacity <= 0) {
                            this.stars[i].remove();
                        }
                    }

                }

                if (this.lifeCheck()) {
                    uniqueAnimations['animStarfield'] = false;
                    return true;
                }
            }
        }


        // Triangles from center
        animations.animTriangles = function (id) {
            if (!uniqueAnimations['animTriangles']) {
                uniqueAnimations['animTriangles'] = id;
                this.id = id;

                animations.animBasics.apply(this);

                this.triangleLimit = 5;
                this.triangles = [];
                this.fading = false;
                this.trianglesFading = [];

                for (i=0; i<this.triangleLimit; i++) {
                    var triangle = new Path.RegularPolygon(view.center, 3, view.size.height / 8);
                    triangle.strokeColor = animColors['white'];
                    triangle.strokeWidth = 2 + i * 2;
                    triangle.opacity = 0;
                    triangle.scale(0.8 * i + 1);
                    triangle.pivot = view.center;
                    triangle.position.y -= 0.01 * triangle.bounds.height * i;
                    this.triangles.push(triangle);

                }
            }
        }
        animations.animTriangles.prototype.update = function (id) {
            if (uniqueAnimations['animTriangles'] == this.id) {
                var frameNow = frameNo - this.startFrame;
                var faded = 0;

                for (i=0; i<this.triangleLimit; i++) {
                    var triangle = this.triangles[i];
                    if (!this.trianglesFading[i]) {
                        if (triangle.opacity < 1 && frameNow > i*10) {
                            triangle.opacity += 0.04;
                        } else if (triangle.opacity >= 1) {
                            this.trianglesFading[i] = true;
                        }

                    } else {
                        if (triangle.opacity >= 0.05) { triangle.opacity -= 0.05; }
                        else { faded += 1; triangle.remove(); }
                    }
                }

                if (faded == this.triangleLimit) {
                    this.life = 0;
                    uniqueAnimations['animTriangles'] = false;
                    return true;
                }
            }
        }

        animations.animSphereCube = function (id) {
            animations.animBasics.apply(this);

            this.life = 80;

            this.pause = 15;
            this.paused = 0;
            //this.life = view.size.width * 0.1;
            this.flatten = 40;
            this.shrink = false;

            this.shape = new Path.Circle({
                center: view.center,
                radius: view.size['height'] * (Math.random() * 0.4 + 0.05),
                fillColor: animColors['white'],
                blendMode: 'xor'
            });
        }
        animations.animSphereCube.prototype.update = function (e) {
            this.paused += 1;

            if (this.paused == this.pause) {
                var n = this.shape.flatten(this.flatten);
                this.flatten = this.flatten * 2;
                this.shape.pivot = view.center;
                if (this.shape.segments.length <= 4) { 
                    this.shrink = true;
                }
                this.paused = 0;
                return;
            }

            if (this.shrink) {
                this.shape.opacity -= 0.2
                if (this.shape.opacity <= 0) {
                    this.life = 0; return this.lifeCheck(); 
                }
            }


            this.shape.rotate(-1);
            return this.lifeCheck();
        }

        // "Race tracks" going round
        animations.animTracks = function (id) {
            animations.animBasics.apply(this);
            this.life = 80;
            this.tracksNo = 6
            this.tracks = [];
            //this.appearing = true;

            var track;
            var rotation = Math.floor((Math.random() * 350) + 1);

            for (i=0; i<this.tracksNo; i++) {
                track = new Path.Circle({
                    center: view.center,
                    radius: view.size['height'] * 0.09 + (45 * i),
                    strokeColor: animColors.gray,
                    strokeWidth: 0,
                    closed: false,
                    pivot: view.center
                });
                if (animColors.gray != '#000000') { track.strokeColor.brightness = Math.random() * 0.8 + 0.2; }
                track.segments[0].remove();
                track.rotate(rotation);
                this.tracks.push(track);

            }
        }
        animations.animTracks.prototype.update = function (e) {
            for (i=0; i<this.tracksNo; i++) {
                if (animColors.gray != this.tracks[i].strokeColor) { this.tracks[i].strokeColor = animColors.gray; }
                this.tracks[i].rotate(5+i);
                if ((frameNo - this.startFrame) > 15) {
                    this.tracks[i].strokeWidth -= 0.5
                    if (this.tracks[i].strokeWidth <= 0) { this.life = 0; }
                } else {
                    this.tracks[i].strokeWidth += 1.75;
                }
            }
            return this.lifeCheck();
        }



        animations.animStrokes = function(id) {
            animations.animBasics.apply(this);
            this.life = 120;
            
            this.points = [];
            this.pointLimit = 3;
            this.destinations = [];
            this.movements = [];
            this.movementLimit = 3;

            this.nextDestination = [];

            // Strokes only on this radius from the center
            this.radius = view.size.height * 0.3;


            for (i=0; i<this.pointLimit; i++) {
                this.destinations[i] = [];

                var newDestinations = [];
                for (n=0; n < this.movementLimit; n++) {
                    // Now for some recursive fun in many levels!
                    newDestinations.push(this.newDestination(newDestinations[n-1]));
                    
                    var c = new Path.Circle({
                        fillColor: animColors['white'],
                        radius: 2,
                        center: newDestinations[n]
                    });
                }
                newDestinations.push(newDestinations[0]);

                this.destinations[i].push(newDestinations);
                this.nextDestination[i] = 1;

                var point = new Path.Circle({
                    point: this.destinations[i][0][0],
                    center: this.destinations[i][0][0],
                    fillColor: animColors['white'],
                    radius: 5
                });

                this.points.push(point);
            }

            this.triangles = [];

            for (i=0; i<this.pointLimit; i++) {
                var triangle = new Path({
                    strokeColor: animColors['white'],
                    closed: false,
                    strokeWidth: 1,
                });

                triangle.add(this.points[i].position);
                triangle.add(this.points[i].position);

                this.triangles.push(triangle);
            }

            this.frameSpace = 2;
        }
        animations.animStrokes.prototype.newDestination = function (prevDestination) {
            var destination = Point.random() * view.size;

            if (!in_circle(destination.x, destination.y, view.center.x, view.center.y, this.radius)) {
                return this.newDestination(prevDestination);
            } else if (prevDestination) {
                
                var vector = prevDestination - destination;
                if (vector.length < 190) {
                    return this.newDestination(prevDestination);
                }
            } 

            return destination;
        }
        animations.animStrokes.prototype.update = function (e) {
            for (i=0; i < this.points.length; i++) {
                var next = this.nextDestination[i];
                var vector = this.destinations[i][0][next] - this.points[i].position;

                if (next < this.destinations[i][0].length) {
                    this.points[i].position += vector / 6;
                    this.triangles[i].lastSegment.point = this.points[i].position;

                    if (vector.length < 5) {
                        this.triangles[i].add(this.points[i].position);
                        this.triangles[i].add(this.points[i].position);

                        this.nextDestination[i] += 1;
                    }
                } else {
                    if (this.triangles[i].segments.length) {
                        this.triangles[i].segments[0].remove();
                    } else {
                        this.triangles[i].remove();
                        this.points[i].remove();
                        this.life = 0;
                    }
                }
            }

            return this.lifeCheck();
        }


        animations.animPaintStain = function (id) {
            animations.animBasics.apply(this);

            this.life = 80;
            this.stainVisible = 0;

            this.stains = ['_gfx/paint_1.jpg','_gfx/paint_2.jpg', '_gfx/paint_3.jpg', '_gfx/paint_5.jpg', '_gfx/paint_6.jpg'];
        }
        animations.animPaintStain.prototype.update = function (e) {

            if (!this.stain) {
                var random = Math.floor(Math.random() * this.stains.length);

                this.stain = new Raster({
                    source: this.stains[random],
                    blendMode: 'screen',
                    position: Point.random() * view.size,
                });
                this.stain.loaded = false;
                this.stain.rotate(Math.floor(Math.random() * 359));
                this.stain.onLoad = function () { this.loaded = true; }
            } else {
                if (this.stain.loaded) { this.stainVisible += 1; }
                if (this.stainVisible == 3) {
                    this.stainVisible = 0;
                    this.stain.remove();
                    this.stain = false;
                }
            }

            if (this.lifeCheck()) {
                if (this.stain) { this.stain.remove(); }
                return true;
            }
        }

        animations.animTexture = function (id) {
            animations.animBasics.apply(this);
            this.life = 'immortal';

            this.texture = new Raster({
                source: '_gfx/texture.jpg',
                position: view.center,
                blendMode: 'screen'
            });
            this.texture.loaded = false;

            this.texture.onLoad = function () {
                this.loaded = true;
                if (view.size.height > view.size.width) {
                    var aspect = view.size.height / this.bounds.height;
                } else {
                    var aspect = view.size.width / this.bounds.width;
                }
                this.scale(aspect);
            }
            this.prevSize = view.size;
        }
        animations.animTexture.prototype.update = function (e) {
            this.texture.opacity = Math.random() * 0.45 + 0.05;
            this.texture.parent.bringToFront();

            if (this.texture.loaded && (this.prevSize.width != view.size.width || this.prevSize.height != view.size.height))         {
                if (view.size.height > view.size.width) {
                    var aspect = view.size.height / this.texture.bounds.height;
                } else {
                    var aspect = view.size.width / this.texture.bounds.width;
                }
                this.texture.position = view.center;
                this.texture.scale(aspect);
            }
        }


        /* ANIMATION HELPER FUNCTIONS */

        animations.animPause = function(id) {
            if (id == 0) { id = 10001; }

            animations.animBasics.apply(this);

            this.width = 200;
            this.height = 200;

            var blockWidth = this.width / 5;
            
            this.rect1 = new Path.Rectangle({
                point: [view.size['width'] / 2 - this.width / 2, view.size['height'] / 2 - this.height / 2],
                size: [blockWidth * 2, this.height],
                fillColor: 'white'
            });
            this.rect2 = new Path.Rectangle({
                point: [(view.size['width'] / 2 - this.width / 2) + (blockWidth * 3), view.size['height'] / 2 - this.height / 2],
                size: [blockWidth * 2, this.height],
                fillColor: 'white'
            });

            this.pauseIcon = new Group([this.rect1, this.rect2]);
        }
        animations.animPause.prototype.update = function(e) {
            this.pauseIcon.scale(1.01);
            this.pauseIcon.opacity -= 0.03;

            if (this.pauseIcon.opacity <= 0) { return animations.animRemove(this); }
        }

        // Create animation id
        animations.animCreateID = function () {
            var id = Math.floor((Math.random() * 600) + 1);
            if (animationQueue[id]) { id = animations.animCreateID(); }
            return id;
        }

        // Removal of any animation layer and its children
        animations.animRemove = function (anim) {
            if (anim) { 
                anim.layer.activate();
                anim.layer.removeChildren();
                anim.layer.remove();
                return true;
            }
        }
}



/* PAUSE FUNCTION ============================================= */

document.onclick = function () {
    // if (musicStarted) { musicPause(); }
};

function musicPause () {
    if (paused == false && !ended) {
        music.pause(); paused = true;
        var animation = new animations.animPause();
        animationQueue[10001] = animation;
        frameTimer.cancel();
        frameTimer = false;
    }
    else if (!ended) {
        frameTimer = accurateInterval(frameBPM, gridUpdate);
        music.play(); paused = false;
        return animations.animRemove[animationQueue[10001]];
    }
}

function musicStart () {
    musicStarted = true;
    paused = true;
    musicPause();
    setupTouch();

    // displayEndCredits();

    animationQueue[9998] = new animations.animInstructions(9998);

    // Only display this on desktop computers?
    if (!lowPerformance) { animationQueue[10000] = new animations.animTexture(10000); } 
}


/* END CREDITS ================================================= */

function displayEndCredits () {
    ended = true;
    frameTimer.cancel();

    document.body.className = 'endCredits';

    fadeIn(endCredits,
        function () {
            document.getElementById('shareName').focus();
        }
    );
}

// UHHHHH. Sorry about this, future me.

document.getElementById('shareOK').onclick = function () {
    var name = document.getElementById('shareName');
    var ok = document.getElementById('shareOK');

    if (name.value) {
        animationGrid.name = name.value;
        
        saveUserData();
        ajaxWaiting = 'id';

        name.style.display = 'none';
        ok.style.display = 'none';

        /*
        fade(ok);
        fade(name,
            function() {
                name.parentNode.removeChild(name);
                ok.parentNode.removeChild(ok);
            }
        ); 
        */
    }
}


/* FULL SCREEN FUNCTION ============================================= */

// Thank you, David Walsh, for your full screen function article!

document.getElementById('fullscreen').onclick = function () { launchIntoFullscreen(document.documentElement); }

function launchIntoFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
    document.getElementById('fullscreen').onclick = exitFullscreen;
}

function exitFullscreen() {
    if(document.exitFullscreen) {
        document.exitFullscreen();
    } else if(document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if(document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    }

    document.getElementById('fullscreen').onclick = function () { launchIntoFullscreen(document.documentElement); }
}


/* MUTE FUNCTION ============================================= */

document.getElementById('volume').onclick = function () {
    var button = document.getElementById('volume');
    
    if (music.volume() == 1) {

        music.volume(0);
        button.className = 'muted';
    } else {
        music.volume(1);
        button.className = '';
    }
};


/* INFO FUNCTION ============================================= */

document.getElementById('infobutton').onclick = function () {
    var info = document.getElementById('info');
    if (info.className == 'visible') {
        info.className = '';
    } else {
        info.className = 'visible';
    }
};



/* ADDITIONAL FUNCTIONS ============================================= */
    

// Accurate interval by Squeegy
// https://gist.github.com/Squeegy
(function() {
    window.accurateInterval = function(time, fn) {
        var cancel, nextAt, timeout, wrapper, _ref;
        nextAt = new Date().getTime() + time;
        timeout = null;
        
        if (typeof time === 'function') _ref = [time, fn], fn = _ref[0], time = _ref[1];
        
        wrapper = function() {
          nextAt += time;
          timeout = setTimeout(wrapper, nextAt - new Date().getTime());
          return fn();
        };

        cancel = function() {
          return clearTimeout(timeout);
        };

        timeout = setTimeout(wrapper, nextAt - new Date().getTime());
        return {
            cancel: cancel
        };
    };
}).call(this);



// This controls the animation grid.
function gridUpdate () {

    // Update position.
    if (gridSkipper != gridFrameSkip && gridFrameSkip > 0) {
        gridSkipper += 1;
        return;
    } else { gridSkipper = 0; }
    
    gridPos += 1;

    // If animation grid has an animation at this frame, add it to render queue.
    // References are made through the animationTable key shorthands
    if (animationGrid[gridPos]) {
        var id = animations.animCreateID();
        var animName = animationTable[animationGrid[gridPos]];
        if (animName) { animationQueue[id] = new animations[animName](id); }
    }
}

function animCleanUp() {
    for (var index in animationQueue) {
        var result = animationQueue[index];
        var lifeline = frameNo - animationQueue[index].startFrame;
        if (lifeline > 250 && animationQueue[index].life != 'immortal') {
            console.log('Possible dead animation found ('+index+') - killing.');
            console.log(animationQueue[index]);

            animationQueue[index].layer.removeChildren();
            animationQueue[index].layer.remove();
            delete animationQueue[index];
        }
    }

}




/* VERY, VERY ADDITIONAL FUNCTION STUFF ========================== */


function fade(element, fn) {
    var op = 1;  
    var timer = setInterval(function () {
        if (op <= 0.1){
            clearInterval(timer);
            element.style.display = 'none';
            if (fn) { fn(); }
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.30;
    }, 50);
}

function fadeIn(element, fn) {
    element.style.display = 'block';

    var op = 0;
    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
            if (fn) { fn(); }
        }
        element.style.opacity = op;
        //element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += 0.05;
    }, 50);
}

// Object cloner
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function isEven(n) {
   return isNumber(n) && (n % 2 == 0);
}
function isOdd(n) {
   return isNumber(n) && (Math.abs(n) % 2 == 1);
}
function isNumber(n) {
    return n == parseFloat(n);
}


// MATH FUNCTIONS

function in_circle(x, y, center_x, center_y, radius) {
    if (Math.abs(center_x - x) < radius && Math.abs(center_y - y) < radius) {
        var distance = Math.sqrt(Math.pow(center_x - x, 2) + Math.pow(center_y - y, 2));
        if (distance <= radius) {
            var result = true;
        } else { result = false; }
    }
    return result;
}

function rotatePoint (point, center, angle) {
    angle = (angle ) * (Math.PI/180); // Convert to radians

    var rotatedX = Math.cos(angle) * 
                    (point['x'] - center['x']) - 
                    Math.sin(angle) * 
                    (point['y'] - center['y']) + center['x'];
    var rotatedY = Math.sin(angle) * (point['x'] - center['x']) + Math.cos(angle) * (point['y'] - center['y']) + center['y'];
     
    return new Point (rotatedX,rotatedY);
}


/*

Syksyn viimeisenä kauniina päivänä
ei enää ole meitä
pidä huolta minusta
pidä huolta hänestä
kun ei enää ole meitä.

*/