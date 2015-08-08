
var canvas;
var gl;
var blockArray = [];
var blocksPositionsInBuffer = [];
var removedBlocks = [];
var stickmanArray = [];
var vBuffer, cBuffer, lBuffer, wireBuffer;
var index = 0;
var cIndex = 0;
var iIndex = 0;
var iIndices = [];
var worldWidth = 10;
var worldHeight = 10;
var worldDepth = 10;
var numberOfBlocks = worldWidth*worldHeight*worldDepth;
var numberOfActiveBlocks = 0;
var groundLevel = worldHeight/2;
var waterLevel = worldWidth/1.4;
var newMousePosition = [];
var prevMousePosition = [];
var program;
var changeBlock = false;
var deleteBlock = false;
var addBlock = false;
var chosenBLockType = "Air";
var lastKeyPress;
var mousePressed = false;
var mvMatrix;
var fovy = 60.0;
var aspect = 1;
var near = 0.5;
var far = 5.0;
var colorArray = [];
var pointArray = [];

// World grid variables
var worldGrid = [];
var wireFrames = [];

// Uniform variable locations
var firstCorner, secondCorner, clickPos, waveLength, isSpecial, offset, thetaLoc, modelView, projectionMatrix, projectionLoc;
var theta =  [-35, 45, 0];

// Shader attributes locations
var vPosition, vColor;

// Variables used for shaders
var waveRadius = 0.5;

// Stickman variables
var stickmanStartXBlock = 1;
var stickmanStartYBlock = 1;
var stickManInitialIndex = (worldHeight*stickmanStartXBlock + groundLevel + stickmanStartYBlock);
var stickManOffset = [0.0, 0.0];
var stickmanX = 0.0;
var stickmanY = 0.0;

//Block material colors
var colors = [
    vec4(0.8, 0.8, 1.0, 1.0), // Air
    vec4(0.7, 0.5, 0.0, 1.0), // Dirt
    vec4(0.0, 0.8, 0.0, 1.0), // Grass
    vec4(0.8, 0.0, 0.0, 1.0), // Lava
    vec4(0.5, 0.5, 0.5, 1.0), // Stone
    vec4(0.8, 0.8, 0.8, 1.0), // Metal
    vec4(0.1, 0.3, 0.8, 1.0), // Water
    vec4(0.0, 0.0, 0.0, 1.0), // Border color
    vec4(0.0, 0.0, 0.0, 1.0)  // Stickman color
];

// The block function object
function Block(blockType, vecIndices, appearance)
{
    this.blockType = blockType;
    this.vecIndices = vecIndices;
    this.appearance = appearance;
}

window.onload = function Init() {
	// Initialize the canvas and GL context
    canvas = document.getElementById( "gl-canvas" );

    var Ogl = WebGLUtils.setupWebGL( canvas );
    gl = WebGLDebugUtils.makeDebugContext(Ogl);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspect = canvas.width/canvas.height;
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    gl.enable(gl.DEPTH_TEST);

    // Initialize the coordinate system
    //initializeCoordSystem(worldWidth,worldHeight);
    Initialize3DCoordSystem(worldWidth, worldHeight, worldDepth);
    HandleBufferContent();

    updateWireframe();

    // Load shaders
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

	// Uniform resource locations
    firstCorner = gl.getUniformLocation(program,"corner1");
    secondCorner = gl.getUniformLocation(program,"corner2");
    clickPos = gl.getUniformLocation(program,"clickPos");
    waveLength = gl.getUniformLocation(program,"waveLength");
    isSpecial = gl.getUniformLocation(program,"isSpecial"); //1.0 air, 2.0 stickman
    offset = gl.getUniformLocation(program,"offset");
    thetaLoc = gl.getUniformLocation(program,"theta");
    projectionLoc = gl.getUniformLocation(program, "projectionMatrix");

    // Attribute resource locations
	vPosition = gl.getAttribLocation( program, "vPosition");
	vColor = gl.getAttribLocation( program, "vColor");

	// Initial buffer creation and initial attribute assignment
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorArray), gl.STATIC_DRAW );
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(iIndices), gl.STATIC_DRAW);

    //Handle the buffer with both the border and color
    //HandleBuffer();
	
	//Initialize wireframe

	
    //handleStickmanBuffer();



    //Adds eventListeners
    AddEvents();

    //console.log("cIndex: " + cIndex);
    //console.log("worldGrid.length: " + worldGrid.length);
    console.log("iIndices.length: " + iIndices.length);
    //console.log("iIndices: " + iIndices);
    //console.log("iIndex: " + iIndex);
    //console.log("pointArray.length: " + pointArray.length);
    //console.log("pointArray: " + pointArray);
    //console.log("colorArray.length: " + colorArray.length);
    //console.log(iIndices.length - (24*numberOfBlocks)+24);


    Render();
};

// ********************************************
// Coordinate system and buffer initializers
// ********************************************
function Initialize3DCoordSystem(columnSize, rowSize, depthSize)
{
    var cWidth = 2; //canvas.width in clip coords;
    var cHeight = 2; //canvas.height in clip coords;
    var cDepth = 2;

    var xPixels = cWidth/columnSize;
    var yPixels = cHeight/rowSize;
    var zPixels = cDepth/depthSize;

    var xBlockIndex = xPixels;
    var yBlockIndex = yPixels;
    var zBlockIndex = zPixels;
    //console.log(yPixels);
    for (var z = 0 ; z <= depthSize ; z++) {
        for (var y = 0 ; y <= rowSize ; y++) {
            for (var x = 0 ; x <= columnSize ; x++) {
                var vertice = vec3(xPixels*x - 1, yPixels*y - 1, zPixels*z - 1);
                worldGrid.push(vertice);

                if(z != depthSize && y != rowSize && x != columnSize) {
                    var newBlock = new Block("Dirt", getBlockVertices(x, y, z), "Solid");
                    blockArray.push(newBlock);
                    blocksPositionsInBuffer.push(numberOfActiveBlocks);
                    numberOfActiveBlocks++;
                }
            }
        }
    }
    //console.log(worldGrid);
}

function getBlockVertices(x, y, z) {

    var x0y0z0 = x + y*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x1y0z0 = x+1 + y*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x0y1z0 = x + (y+1)*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x1y1z0 = x+1 + (y+1)*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x0y0z1 = x + y*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);
    var x1y0z1 = x+1 + y*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);
    var x0y1z1 = x + (y+1)*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);
    var x1y1z1 = x+1 + (y+1)*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);


    return [x0y0z0, x1y0z0, x0y1z0, x1y1z0, x0y0z1, x1y0z1, x0y1z1, x1y1z1];
}


function HandleBufferContent() {
    //console.log("blockArray.length: " + blockArray.length);

    /*var p0 = worldGrid[blockArray[0].vecIndices[3]];
    var p1 = worldGrid[blockArray[0].vecIndices[5]];
    var p2 = worldGrid[blockArray[0].vecIndices[7]];
    console.log(p0);
    console.log(p1);
    console.log(p2);

    console.log(cross(subtract(p2, p0), subtract(p1, p0)));
*/



    blockArray.forEach(function (entry) {

       // handleTrianglePointsAndColor(AddColor("1"), entry, 3, 2, 2);
       // handleTrianglePointsAndColor(AddColor("1"), entry, 0, 2, 2);

        handleTrianglePointsAndColor(entry, 0, 1, 1);
        handleTrianglePointsAndColor(entry, 1, 1, 1);
        handleTrianglePointsAndColor(entry, 4, 1, 1);
        handleTrianglePointsAndColor(entry, 5, 1, 1);

        handleTrianglePointsAndColor(entry, 0, 2, 2);
        handleTrianglePointsAndColor(entry, 2, 2, 2);
        handleTrianglePointsAndColor(entry, 1, 2, 2);
        handleTrianglePointsAndColor(entry, 3, 2, 2);

        handleTrianglePointsAndColor(entry, 0, 1, 3);
        handleTrianglePointsAndColor(entry, 1, 3, 1);
        handleTrianglePointsAndColor(entry, 2, 1, 3);
        handleTrianglePointsAndColor(entry, 3, 3, 1);
        //console.log("TEST");
    });
    //console.log("pointArray.length: " + pointArray.length);
    //console.log(pointArray);
    //console.log("colorArray.length: " + colorArray.length);
    //console.log(blockArray);
}

function handleTrianglePointsAndColor(block, start, firstIncrease, secondIncrease) {
    var p1 = worldGrid[block.vecIndices[start]];
    var p2 = worldGrid[block.vecIndices[start + firstIncrease]];
    var p3 = worldGrid[block.vecIndices[start + firstIncrease + secondIncrease]];

    var normalColor = AddColor(p1, p2, p3);

    pointArray.push(p1);
    pointArray.push(p2);
    pointArray.push(p3);
    colorArray.push(normalColor);
    colorArray.push(normalColor);
    colorArray.push(normalColor);
    iIndices.push(iIndex);
    iIndices.push(iIndex+1);
    iIndices.push(iIndex+2);
    iIndex += 3;
}

//Calculates the clip coords of the vertices of the stickman
function handleStickmanBuffer()
{
    //console.log(stickManInitialIndex);
    var blockOfLowerBody = blockArray[stickManInitialIndex];
    var blockOfUpperBody = blockArray[stickManInitialIndex+1];

    var v1 = blockOfLowerBody.v1;
    var v2 = blockOfLowerBody.v2;
    var v3 = mix(blockOfLowerBody.v3, blockOfLowerBody.v4, 0.5);
    var v4 = mix(blockOfUpperBody.v3, blockOfUpperBody.v4, 0.5);
    v4[1] -= 0.005; //gets a smaller neck, which result in that the stickman is 2 blocks high
    var v5 = mix(blockOfUpperBody.v1, blockOfUpperBody.v3, 0.5);
    var v6 = mix(blockOfUpperBody.v2, blockOfUpperBody.v4, 0.5);
    stickmanArray = [v1, v2, v4, v5, v6];

    var lowerBody = new Block("Stickman", v1, v3, v2, v3);
    var upperBody = new Block("Stickman", v4, v3, v5, v6);

    var stickmanIndex = (blockArray.length + 1) * 4;

    //Allocates the stickman positions in the buffers
    allocateToBuffer(lowerBody, stickmanIndex);
    allocateToBuffer(upperBody, stickmanIndex + 4);
    var color = vec4(0.0, 0.0, 0.0, 1.0);
    allocateToCBuffer(color, stickmanIndex + 4);
    allocateToCBuffer(color, stickmanIndex + 8);
}

function HandleBuffer() {

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    //Positions for blocks
    worldGrid.forEach(function(entry) {
        gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(entry));
        index++;
    });
    //Positions for the wireframes
    worldGrid.forEach(function(entry) {
        gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(entry));
        index++;
    });

    //console.log(worldGrid.length);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    //console.log(blockArray[0].vecIndices);
    //console.log(blockArray[1].vecIndices);
    //handleTriangle(cIndex, AddColor("0"), blockArray[0], 0, 1, 1);
    //handleTriangle(cIndex, AddColor("0"), blockArray[1], 0, 1, 1);

    //handleTriangle(cIndex, AddColor("2"), blockArray[0], 0, 1, 3);
    //console.log(AddColor("0"));
    blockArray.forEach(function(entry) {

         handleTriangle(cIndex, AddColor("0"), entry, 0, 1, 1);
         handleTriangle(cIndex, AddColor("0"), entry, 1, 1, 1);
         handleTriangle(cIndex, AddColor("0"), entry, 4, 1, 1);
         handleTriangle(cIndex, AddColor("0"), entry, 5, 1, 1);

        handleTriangle(cIndex, AddColor("1"), entry, 0, 2, 2);
        handleTriangle(cIndex, AddColor("1"), entry, 2, 2, 2);
        handleTriangle(cIndex, AddColor("1"), entry, 1, 2, 2);
        handleTriangle(cIndex, AddColor("1"), entry, 3, 2, 2);
        


        handleTriangle(cIndex, AddColor("2"), entry, 0, 1, 3);
        handleTriangle(cIndex, AddColor("2"), entry, 1, 3, 1);
        handleTriangle(cIndex, AddColor("2"), entry, 2, 1, 3);
        handleTriangle(cIndex, AddColor("2"), entry, 3, 3, 1);




    });

    //.log(iIndices);
    //console.log(worldGrid);
   // console.log(blockArray[4].vecIndices);
    for (var i = 0 ; i < 8 ; i++) {
        //console.log(worldGrid[blockArray[4].vecIndices[i]]);
    }
}

function handleTriangle(currentIndex, color, block, start, firstIncrease, secondIncrease) {
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*currentIndex, flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex+1), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex+2), flatten(color));
    cIndex += 3;
    iIndices.push(block.vecIndices[start]);
    iIndices.push(block.vecIndices[start + firstIncrease]);
    iIndices.push(block.vecIndices[start + firstIncrease + secondIncrease]);
}

function allocateToBuffer(entry, currentIndex) {
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*currentIndex, flatten(entry));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(currentIndex+1), flatten(entry));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(currentIndex+2), flatten(entry));
}

function allocateToCBuffer(color,currentIndex) {
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex-3), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex-2), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex-1), flatten(color));
}

function updateWireframe(buffer)
{

	var p0, p1, p2, p3, p4, p5, p6, p7;
    var frameColor = vec4(0.0, 0.0, 0.0, 1.0);
    blockArray.forEach(function(entry) {
        p0 = worldGrid[entry.vecIndices[0]];
        p1 = worldGrid[entry.vecIndices[1]];
        p2 = worldGrid[entry.vecIndices[2]];
        p3 = worldGrid[entry.vecIndices[3]];
        p4 = worldGrid[entry.vecIndices[4]];
        p5 = worldGrid[entry.vecIndices[5]];
        p6 = worldGrid[entry.vecIndices[6]];
        p7 = worldGrid[entry.vecIndices[7]];

        //console.log([p0,p1,p2,p3,p4,p5,p6,p7]);
        pointArray.push(p0, p1, p1, p3, p3, p2, p2, p0,
                        p4, p5, p5, p7, p7, p6, p6, p4,
                        p4, p0, p5, p1, p7, p3, p6, p2);


        //console.log(pointArray);

        for (var i = 0 ; i < 24 ; i++) {
            colorArray.push(frameColor);
            iIndices.push(iIndex + i);
        }
        iIndex += 24;

                           //console.log(wireFrames);


/*
                           gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                           for (var i = 0; i < 24; i++)
                           {
                               gl.bufferSubData(gl.ARRAY_BUFFER, 16 * cIndex, flatten(frameColor));
                               cIndex++;
                           }*/
    });

    //console.log(pointArray);
/*
    //console.log(iIndices.length);
    blockArray.forEach(function(entry)
	{
        /*
		//Front-facing square
		p1 = entry.vecIndices[0];
		p2 = entry.vecIndices[1];
		p3 = entry.vecIndices[3];
		p4 = entry.vecIndices[2];
		wireFrames.push(makeSquare(p1,p2,p3,p4));

		//left-facing square
		p1 = entry.vecIndices[0];
		p2 = entry.vecIndices[4];
		p3 = entry.vecIndices[6];
		p4 = entry.vecIndices[2];
		wireFrames.push(makeSquare(p1,p2,p3,p4));
		
		//right-facing square
		p1 = entry.vecIndices[1];
		p2 = entry.vecIndices[5];
		p3 = entry.vecIndices[7];
		p4 = entry.vecIndices[3];
		wireFrames.push(makeSquare(p1,p2,p3,p4));
		
		//back-facing square
		p1 = entry.vecIndices[5];
		p2 = entry.vecIndices[4];
		p3 = entry.vecIndices[6];
		p4 = entry.vecIndices[7];
		wireFrames.push(makeSquare(p1,p2,p3,p4));
		
		//top-facing square
		p1 = entry.vecIndices[2];
		p2 = entry.vecIndices[3];
		p3 = entry.vecIndices[7];
		p4 = entry.vecIndices[6];
		wireFrames.push(makeSquare(p1,p2,p3,p4));
		
		//bottom-facing square
		p1 = entry.vecIndices[0];
		p2 = entry.vecIndices[1];
		p3 = entry.vecIndices[5];
		p4 = entry.vecIndices[4];
		wireFrames.push(makeSquare(p1,p2,p3,p4));

	});
*/
	//gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    //gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(wireFrames), gl.STATIC_DRAW);

    //console.log(wireFrames);
}

// ********************************************
// Event listening functions
// ********************************************
function AddEvents()
{
    var bP = document.getElementById("gl-canvas");
    var iP = document.getElementById("inputPanel");

    bP.addEventListener("mousedown", function(event) {
        prevMousePosition = vec2(event.clientX, event.clientY);
        //PixelToClip(event.clientX, event.clientY);
        //console.log(prevMousePosition);
        mousePressed = true;
    });

    bP.addEventListener("mouseup", function(event) {
        mousePressed = false;
    });

    bP.addEventListener("mousemove", function(event) {
        //Converting from window coordinates to clip coordinates
        if (mousePressed) {
            newMousePosition = vec2(event.clientX, event.clientY);
            //console.log(newMousePosition);
            theta = [theta[0] + prevMousePosition[1] - newMousePosition[1], theta[1] + prevMousePosition[0] - newMousePosition[0], theta[2] + 0];
			prevMousePosition = newMousePosition;
        }
    });

    bP.addEventListener("mousewheel", function(event) {
        if (fovy-event.wheelDelta/10 < 10)
        //Go to 1. person view
            fovy = 10;
        else if (fovy-event.wheelDelta/10 > 120)
            fovy = 120;
        else
            fovy -= event.wheelDelta/10;
    });

    iP.addEventListener("mousedown", function(event) {
        if (event.target.id == "removeBlock")
            deleteBlock = true;
        if (event.target.id == "addBlock")
            addBlock = true;
    });

    /*
        var m = document.getElementById("blockMenu");
        var bP = document.getElementById("inputPanel");

        //Create eventListener for the menu
        m.addEventListener("click", function() {
            cIndex = m.selectedIndex;
            chosenBLockType = m.value;
        });

        bP.addEventListener("mousedown", function(event) {
            moveStickMan(event)
        });

        bP.addEventListener("mouseup", function(event) {
            stopStickMan(event)
        });

        canvas.addEventListener("mousedown", function(event) {
            changeBlock = true;
            var clipPos = pixel_to_clip(event.clientX, event.clientY);

            waveRadius = 0.0;

            gl.uniform2f(clickPos,clipPos[0],clipPos[1]);
            gl.uniform1f(waveLength,waveRadius);
        });

        canvas.addEventListener("mousemove", function(event) {
            //Converting from window coordinates to clip coordinates
            mousePosition = pixel_to_clip(event.clientX,event.clientY);
        });

        document.addEventListener("keydown", function(event) {
            moveStickMan(event);
        });

        document.addEventListener("keyup", function (event) {
            stopStickMan(event);
        });*/
}

function moveStickMan(event)
{
    if ((event.keyCode === 87 && lastKeyPress != 87) || event.target.id == "upButton") { // W
        // Jump. Can air jump too :)
        lastKeyPress = 87;
        stickmanY = 0.02;
    }
    if (event.keyCode === 65 || event.target.id == "leftButton")
    // A
    // Move left
        stickmanX = -0.01;
    if (event.keyCode === 83) {} // S
    // Not Implemented yet
    // Swim?
    if (event.keyCode === 68 || event.target.id == "rightButton")
    // D
    // Move right
        stickmanX = 0.01;
}

function stopStickMan(event)
{
    if (event.keyCode === 87 || event.target.id == "upButton") { // W
        stickmanY = 0;
        lastKeyPress = 0;
    }
    if (event.keyCode === 65 || event.keyCode === 68
        || event.target.id == "leftButton"
        || event.target.id == "rightButton")  // A or D
    // Stop moving
        stickmanX = 0;
    if (event.keyCode === 83) {} // S
    // Not Implemented yet
    // Swim?
}

// ********************************************
// Rendering
// ********************************************
function Render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
/*
    const at = vec3(0.0, 0.0, 0.0);
    const up = vec3(0.0, 1.0, 0.0);

    var radius = 0.05;
    var test = theta[0] * Math.PI/180.0;
    var test2 = theta[1] * Math.PI/180.0;
    var eye = vec3(radius*Math.sin(test)*Math.cos(test2),
                   radius*Math.sin(test)*Math.sin(test2),
                   radius*Math.cos(test));

    mvMatrix = lookAt(eye, at, up);*/
    if (deleteBlock) {
        removeSelectedBlock(993);
        removeSelectedBlock(995);
        removeSelectedBlock(996);
        deleteBlock = false;
        console.log(iIndices.length);
    }

    if (addBlock) {

        addSelectedBlock(995);
        addSelectedBlock(993);
        addSelectedBlock(996);

        addBlock = false;
        console.log(iIndices.length);
    }


    projectionMatrix = perspective(fovy, aspect, near, far);

    //gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projectionLoc, false, flatten(projectionMatrix));
    gl.uniform3fv(thetaLoc, theta);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);

    //console.log("TEST");

	//Render boxes
    gl.drawElements(gl.TRIANGLES, iIndices.length - (24*numberOfActiveBlocks), gl.UNSIGNED_SHORT, 0);
    //console.log("TEST2");

	//Render wireframes
    gl.drawElements(gl.LINES, 24*numberOfActiveBlocks, gl.UNSIGNED_SHORT, 2*(iIndices.length - 24*numberOfActiveBlocks));

    //console.log("TEST3");
    //gl.bindBuffer(gl.ELEMENT_AR    RAY_BUFFER, wireBuffer);
    //gl.vertexAttribPointer(vPosition,3,gl.FLOAT,false,0,0);
    //gl.clearColor(0.0,0.0,0.0,1.0);
    //gl.drawElements(gl.LINES, wireFrames.length, gl.UNSIGNED_BYTE, 0);

    /*
     var blockIndex = 0;
     gl.clear( gl.COLOR_BUFFER_BIT );
     for(var i = 0; i<index; i+=4)
     {
     var currentBlock = blockArray[i/4];

     gl.uniform2f(firstCorner,currentBlock.v2[0],currentBlock.v2[1]);
     gl.uniform2f(secondCorner,currentBlock.v3[0],currentBlock.v3[1]);

     //Avoid gradient on air blocks.
     if(currentBlock.blockType == "Air")
     gl.uniform1f(isSpecial, 1.0);
     else
     gl.uniform1f(isSpecial,0.0);

     gl.drawArrays(gl.TRIANGLE_STRIP, i, 4);

     //Reallocate to the buffer, where to render a border around the box, which the mouse is over
     if (mousePosition[0] >= currentBlock.v1[0] && mousePosition[1] >= currentBlock.v1[1]
     && mousePosition[0] < currentBlock.v4[0] && mousePosition[1] < currentBlock.v4[1])
     {
     blockIndex = i/4;

     var tempBlock = new Block("Border", currentBlock.v1, currentBlock.v2, currentBlock.v4, currentBlock.v3);
     var tempIndex = index;
     index = blockArray.length*4;
     allocateToBuffer(tempBlock, index);
     index += 4;
     var borderColor = vec4(0.0, 0.0, 0.0, 1.0);
     allocateToCBuffer(borderColor, index);
     index = tempIndex;
     }
     }

     //Checks if it is possible to build a block
     if (checkBlockTypesAround(blockIndex))
     {
     //If changeblock is true, it replaces the block with the one chosen in the menu
     if (changeBlock) {

     var bType = blockArray[blockIndex].blockType;

     //Removes block if the chosen block is the same as the selected block from the menu
     if (bType == chosenBLockType) {
     blockArray[blockIndex].blockType = "Air";
     blockArray[blockIndex].appearance = assignBlockAppearance("Air");
     var newColor = AddColor();
     }
     else {
     blockArray[blockIndex].blockType = chosenBLockType;
     blockArray[blockIndex].appearance = assignBlockAppearance(chosenBLockType);
     var newColor = AddColor();
     }
     allocateToCBuffer(newColor, blockIndex*4 + 4);
     }
     gl.drawArrays(gl.LINE_LOOP, blockArray.length*4, 4);
     }

     //Draw the stickman
     //renderStickman();

     //Handle rippling effect
     if(waveRadius < 0.5)
     {
     waveRadius += 0.02;
     gl.uniform1f(waveLength,waveRadius);
     }

     changeBlock = false;*/
    window.requestAnimFrame(Render);
}

function removeSelectedBlock(blockNumber) {

    var blockPos = blocksPositionsInBuffer.indexOf(blockNumber-1);
    //console.log(blockPos);
    var pointStartIndex = 36*(blockPos);
    var wireframeStartIndex = 36*numberOfActiveBlocks + 24*(blockPos);

    blocksPositionsInBuffer.splice(blockPos,1);

    var removedWireframe = iIndices.splice(wireframeStartIndex, 24); // Deleting wireframe points
    var removedBlock = iIndices.splice(pointStartIndex, 36); // Deleting block points

	removedBlocks.push(removedWireframe);
	removedBlocks.push(removedBlock);
	
    numberOfActiveBlocks--;

    //console.log(blocksPositionsInBuffer);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(iIndices), gl.STATIC_DRAW);
}

function addSelectedBlock(blockNumber) {


    //var newBlock = getBlockIndices(blockArray[blockNumber-1]);
    //var pointIndices = [];
    //var wireframeIndices = [];
    var pointStartIndex = 36*numberOfActiveBlocks;
    var wireframeStartIndex = 36*numberOfActiveBlocks + 24*numberOfActiveBlocks;
    var pIndex = 36*(blockNumber-1);
    var wIndex = 36*(numberOfBlocks) + 24*(blockNumber-1);
    //console.log("wIndex: " + wIndex);
    //console.log("pIndex: " + pIndex);
    //console.log("wireframeStartIndex: " + wireframeStartIndex);
    for (var i = 0 ; i < 24 ; i++) {

        iIndices.splice(wireframeStartIndex + i, 0, wIndex + i);
        //wireframeIndices.push(wireframeStartIndex + i);
    }

    for (var j = 0 ; j < 36 ; j++) {
        iIndices.splice(pointStartIndex + j, 0, pIndex + j);
        //pointIndices.push(pointStartIndex + i);
    }

    blocksPositionsInBuffer[numberOfActiveBlocks] = blockNumber-1;

    //console.log(blocksPositionsInBuffer);

    //console.log(pIndex);
    //console.log(wIndex);
    //console.log(pointStartIndex);
    //console.log(wireframeStartIndex);
    //console.log("iIndices.length: " + iIndices.length);
    //console.log(pointIndices.length);
    //console.log(wireframeIndices.length);

    //console.log(iIndices.length);

   // iIndices.splice(wireframeStartIndex, 0, 1); // Adding wireframe points
    //iIndices.splice(pointStartIndex, 0, "1"); // Adding block points
    //console.log(iIndices.length);

    numberOfActiveBlocks++;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(iIndices), gl.STATIC_DRAW);
}

function getBlockIndices(block) {

    p0 = worldGrid[block.vecIndices[0]];
    p1 = worldGrid[block.vecIndices[1]];
    p2 = worldGrid[block.vecIndices[2]];
    p3 = worldGrid[block.vecIndices[3]];
    p4 = worldGrid[block.vecIndices[4]];
    p5 = worldGrid[block.vecIndices[5]];
    p6 = worldGrid[block.vecIndices[6]];
    p7 = worldGrid[block.vecIndices[7]];

    var pointPos = []
    pointPos.push(p0, p1, p1, p3, p3, p2, p2, p0,
                  p4, p5, p5, p7, p7, p6, p6, p4,
                  p4, p0, p5, p1, p7, p3, p6, p2);


    return 42;
}

function renderStickman()
{
	//Checks collision
    var collisionBlock = checkCollision();

	//Handle collisions
	var blockAppearance = collisionBlock.appearance;
	var blockY = 2.0;
	
	if(blockAppearance == "Dangerous") //Lava
		stickmanY = 0.02;
    else if(blockAppearance == "Solid") //Ground
    {
		blockY = collisionBlock.v1[1];
		stickmanY = 0.0;
	}
	else if(blockAppearance == "Liquid") //Water
		stickmanY -= 0.00005;
    else if(blockAppearance == "Border") //At the border of the map
    {

        stickManOffset[0] = 0.0 - collisionBlock.v1;
        stickManOffset[1] = 0.0 + collisionBlock.v2;
        stickmanX = 0.0;
        stickmanY = 0.0;
    }
	else //Gravity
		stickmanY -= 0.001;

	//set offset in the vertex shader
	if(blockY != 2.0)
	{
 		stickManOffset = [stickManOffset[0]+stickmanX, blockY];
		gl.uniform4f(offset,stickManOffset[0],stickManOffset[1],0.0,0.0);
	}
	else if(stickmanX > 0.000005 || stickmanX < 0.000005)
	{
		stickManOffset = [stickManOffset[0]+stickmanX, stickManOffset[1]+stickmanY];
		gl.uniform4f(offset,stickManOffset[0],stickManOffset[1],0.0,0.0);
	}
	gl.uniform1f(isSpecial,2.0);
	
	//render the stickman
    var stickmanIndex = (blockArray.length+1)*4;
    gl.drawArrays(gl.LINES, stickmanIndex, 8);
}

// ********************************************
// Helper functions
// ********************************************
function PixelToClip(x, y)
{
		//Converting from window coordinates to clip coordinates
        var xPos = -1 + (2*x)/canvas.clientWidth;
        var yPos = -1 + (2*(canvas.clientHeight - y))/canvas.clientHeight;
        return vec2(xPos,yPos);
}

//Returns the color of the given blockType, calculated out from the norm of the plane
function AddColor(p1, p2, p3) {
/*
    console.log(p1);
    console.log(p2);
    console.log(p3);
*/

    var normal = cross(subtract(p3, p1), subtract(p2, p1));
    var colorFactor = 10;
    normal = [colorFactor*Math.abs(normal[0]), colorFactor*Math.abs(normal[1]), colorFactor*Math.abs(normal[2])];

    //console.log(normal);

    return vec4(normal, 1.0);

   /* switch (axis) {
        case "0" :
            return vec4(1.0, 0.0, 0.0, 1.0);
            break;
        case "1" :
            return vec4(0.0, 1.0, 0.0, 1.0);
            break;
        case "2" :
            return vec4(0.0, 0.0, 1.0, 1.0);
            break;

    }
    switch (blockType)
    {
        case "Air" :
            return colors[0];
            break;
        case "Dirt" :
            return colors[1];
            break;
        case "Grass" :
            return colors[2];
            break;
        case "Lava" :
            return colors[3];
            break;
		case "Stone" :
            return colors[4];
            break;
		case "Metal" :
            return colors[5];
            break;
		case "Water" :
            return colors[6];
            break;
		case "Border" :
            return colors[7];
            break;
        case "Stickman" :
            return colors[8];
            break;
    }*/
}

//Assign a blockType to a given spot in the blockArray, depending on
//the specification of the map level.
function assignBlockType(i,j)
{
    if (j > groundLevel)
       return "Air";
    else if (j === groundLevel && i <= waterLevel)
        return "Grass";
    else if (i > waterLevel)
        return "Water";
    else
        return "Dirt";
}

//Return the appearance of a block, depended on its blockType
function assignBlockAppearance(blockType)
{
    if (blockType == "Air")
        return "Air";
    if (blockType == "Lava")
        return "Dangerous";
    if (blockType == "Water")
        return "Liquid";
    if (blockType == "Dirt" || blockType == "Grass" || blockType == "Metal" ||  blockType == "Stone")
        return "Solid";
}

//Returns false if there is only air around the block in the blockArray
// of the given index.
function checkBlockTypesAround(blockIndex)
{
    var topBool,leftBool,rightBool;
    var airCounter = 0;
    var numberOfPossibleAir = 4;

    if (blockIndex % worldHeight == 0 || blockArray[blockIndex].blockType != "Air")
        return true;

    if (blockIndex % worldHeight == worldHeight-1) {
        topBool = true;
        numberOfPossibleAir--;
    }

    if (blockIndex + worldHeight > blockArray.length) {
        rightBool = true;
        numberOfPossibleAir--;
    }

    if (blockIndex - worldHeight < 0) {
        leftBool = true;
        numberOfPossibleAir--;
    }

    if (blockArray[blockIndex-1].blockType == "Air")
        airCounter++;

    if (!topBool && blockArray[blockIndex+1].blockType == "Air")
        airCounter++;

    if (!rightBool && blockArray[blockIndex+worldHeight].blockType == "Air")
        airCounter++;

    if (!leftBool && blockArray[blockIndex-worldHeight].blockType == "Air")
        airCounter++;

    return airCounter != numberOfPossibleAir;
}

function checkCollision()
{
    var priorityNumber = 100;
    var currentCollisionBlock;
    var finalCollisionBlock = new Block("Air");
    //Finds the blocks the vertices is in and check for appearance of these blocks
        stickmanArray.some(function(entry) {
            var tempEntry = [entry[0] + stickManOffset[0], entry[1] + stickManOffset[1]];
            currentCollisionBlock = getCell(tempEntry);

            if (currentCollisionBlock.appearance == "Border")
                return finalCollisionBlock = currentCollisionBlock;

            if (currentCollisionBlock.appearance == "Dangerous") {
                finalCollisionBlock = currentCollisionBlock;
                priorityNumber = 1;
            }

            if (currentCollisionBlock.appearance == "Solid" && priorityNumber > 2) {
                finalCollisionBlock = currentCollisionBlock;
                priorityNumber = 2;
            }
            else if (currentCollisionBlock.appearance == "Liquid" && priorityNumber > 3) {
                finalCollisionBlock = currentCollisionBlock;
                priorityNumber = 3;
            }
        });
    return finalCollisionBlock;
}

function getCell(vec)
{
    var blockWidth = 2/worldWidth;
    var blockHeight = 2/worldHeight;
    var xPos = Math.ceil((vec[0]+1)/blockWidth)*worldHeight - worldHeight;
    var yPos = Math.floor((vec[1]+1)/blockHeight);
    var blockIndex = xPos + yPos;
    if(blockIndex > blockArray.length)
    if(blockIndex > blockArray.length)
        return new Block("Border",
                         2/worldWidth * stickmanStartXBlock - 0.001, //Values of the new stickman position
                         stickManOffset[1],
                         0.0, 0.0, "Border");

    if(blockIndex < 0)
        return new Block("Border",
                         2/worldWidth * (stickmanStartXBlock - worldWidth + 1) + 0.001, //Values of the new stickman position
                         stickManOffset[1],
                         0.0, 0.0, "Border");
    return blockArray[blockIndex];
}

function calculatePos(x, y, z) {
    return x + y*worldWidth + z*worldWidth*worldHeight;
}

//Arranges for gl.LINES to draw square
function makeSquare(p1,p2,p3,p4)
{
	var x = [];
	x.push(p1,p2,p2,p3,p3,p4,p4,p1);
	return x;
}
